using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Adpa.Orchestrator.Clients;
using Adpa.Orchestrator.Data;
using Adpa.Orchestrator.Models.Rituals;
using Adpa.Orchestrator.Services;
using Adpa.Orchestrator.Models.System;
using Adpa.Orchestrator.Models.Exceptions;
using Adpa.Orchestrator.Models.Governance;
using System.Diagnostics;
using System.Net.Http;

namespace Adpa.Orchestrator.Controllers;

public record AmendmentProposalRequest(
    string TargetRequirementId, 
    string ProposedDescription, 
    string Justification,
    string Requester,
    string? AmendmentType = "REPLACEMENT",
    string? AmendmentSubType = "FULL_REPLACEMENT");

public record AmendmentDecisionRequest(
    string AmendmentId,
    string Status, // APPROVED or REJECTED
    string DecidedBy,
    string? DecisionNotes);

public sealed class ApplyAmendmentRequest
{
    [JsonPropertyName("amendment_id")]
    public string AmendmentId { get; set; } = string.Empty;

    [JsonPropertyName("actor")]
    public string Actor { get; set; } = string.Empty;

    [JsonPropertyName("approval")]
    public TaskApprovalAttestation? Approval { get; set; }
}

public record MsrfValidationInput(
    string ProjectId,
    string Title,
    string Concept);

[ApiController]
[Route("api/[controller]")]
public class RitualController(
    IntelligenceClient intelligence,
    GovernanceDbContext db,
    GovernanceApiClient governance,
    IConfiguration configuration,
    ITaskApprovalGate approvalGate,
    ILogger<RitualController> logger,
    ISemanticRtmSeeder rtmSeeder,
    IRtmExecutionService executionService) : ControllerBase
{
    // ---------------------------------------------------------------------------
    // Phase 0: Ideation & Business Case
    // ---------------------------------------------------------------------------

    [HttpPost("phase0/ingest")]
    public async Task<ActionResult<IdeationSummary>> IngestIdeation([FromBody] IngestionRequest request)
    {
        try
        {
            logger.LogInformation("Starting Ideation Ingestion ritual for: {Filename}", request.Filename);
            
            var summary = await intelligence.IngestIdeationAsync(request.Filename, request.Content);
            
            if (summary == null)
            {
                return BadRequest("Failed to generate ideation summary from the provided input.");
            }

            // Persist to Governance Ledger
            db.IdeationSummaries.Update(summary);
            await db.SaveChangesAsync();

            return Ok(summary);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: phase0/ingest");
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPost("msrf/validate")]
    public async Task<ActionResult<MsrfEvaluation>> ValidateMsrf([FromBody] MsrfValidationInput input)
    {
        try
        {
            logger.LogInformation("Starting MSRF Validation ritual for: {Title}", input.Title);
            
            var evaluation = await intelligence.ValidateMsrfAsync(input.ProjectId, input.Title, input.Concept);
            
            if (evaluation == null)
            {
                return BadRequest("Failed to perform MSRF validation ritual.");
            }

            // Persist to Governance Ledger
            db.MsrfEvaluations.Update(evaluation);
            await db.SaveChangesAsync();

            return Ok(evaluation);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: msrf/validate");
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPost("phase0/business-case")]
    public async Task<ActionResult<BusinessCase>> GenerateBusinessCase([FromBody] string ideationTitle)
    {
        try
        {
            logger.LogInformation("Starting Business Case generation ritual for summary: {Title}", ideationTitle);

            // 1. Fetch from Ledger
            var summary = await db.IdeationSummaries.FirstOrDefaultAsync(s => s.Title == ideationTitle);
            if (summary == null)
            {
                return NotFound($"Ideation summary with title '{ideationTitle}' not found in the Governance Ledger.");
            }

            // 2. Trigger Intelligence Ritual
            var businessCase = await intelligence.GenerateBusinessCaseAsync(summary);
            if (businessCase == null)
            {
                return BadRequest("Failed to generate business case from the ideation summary.");
            }

            // 3. Persist Business Case
            db.BusinessCases.Update(businessCase);
            await db.SaveChangesAsync();

            return Ok(businessCase);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: phase0/business-case");
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPost("phase0/approve")]
    public async Task<IActionResult> ApproveBusinessCase([FromBody] ApproveBusinessCaseRequest body)
    {
        var businessCaseId = body.BusinessCaseId;
        try
        {
            logger.LogInformation("Attempting to approve Business Case: {BusinessCaseId}", businessCaseId);

            var gate = approvalGate.EnsureJitApproval(TaskApprovalScopes.Phase0Approve, businessCaseId, body.Approval);
            if (gate is not null)
                return gate;

            // 1. Fetch and Validate
            var bc = await db.BusinessCases.FirstOrDefaultAsync(x => x.Id == businessCaseId);
            if (bc == null)
            {
                return NotFound($"Business Case {businessCaseId} not found.");
            }

            if (bc.ApprovalStatus == "APPROVED")
            {
                return BadRequest("Business Case is already approved.");
            }

            // 2. Law-bound approval: sovereign RPAS.Governance.Api (shared PostgreSQL) or local fallback (dev only)
            var sovereignRequired = configuration.GetValue("Governance:SovereignApiRequired", true);
            if (sovereignRequired)
            {
                object payload = body.Approval is { } jit
                    ? new
                    {
                        justification = "phase0/approve via Adpa.Orchestrator (JIT attested)",
                        humanDecisionId = jit.HumanDecisionId,
                        decidedBy = jit.DecidedBy,
                        expiresAt = jit.ExpiresAt
                    }
                    : new { justification = "phase0/approve via Adpa.Orchestrator" };

                await governance.ValidateStateTransitionAsync(new ValidationPetition
                {
                    EntityType = "BusinessCase",
                    EntityId = businessCaseId,
                    Action = "MarkApproved",
                    Payload = payload
                });
            }
            else
            {
                bc.ApprovalStatus = "APPROVED";
                await db.SaveChangesAsync();
            }

            await db.Entry(bc).ReloadAsync();

            // 3. Trigger Semantic RTM Seeding (Post-Approval Ritual)
            logger.LogInformation("Business Case {BusinessCaseId} approved. Triggering Semantic RTM Seeder.", businessCaseId);
            await rtmSeeder.SeedFromBusinessCaseAsync(businessCaseId);

            return Ok(new { 
                Status = "APPROVED", 
                RtmSeeding = "COMPLETED", 
                BusinessCaseId = businessCaseId 
            });
        }
        catch (RpasLawViolationException ex)
        {
            logger.LogWarning(ex, "RPAS law blocked approval for {BusinessCaseId}", businessCaseId);
            return Conflict(new { error = ex.Message, rule = ex.RuleName });
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Governance API unreachable during approval for {BusinessCaseId}", businessCaseId);
            return StatusCode(503, new { Error = "Governance authority unreachable.", Detail = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: phase0/approve for ID {BusinessCaseId}", businessCaseId);
            return StatusCode(500, new { Error = "Approval ritual failed.", Detail = ex.Message });
        }
    }

    [HttpGet("ledger/ideation")]
    public async Task<ActionResult<List<IdeationSummary>>> GetIdeationLedger()
    {
        return await db.IdeationSummaries.ToListAsync();
    }

    [HttpGet("ledger/rtm")]
    public async Task<ActionResult<List<RtmRequirement>>> GetRtmLedger()
    {
        return await db.RequirementsTraceabilityMatrix.ToListAsync();
    }

    // ---------------------------------------------------------------------------
    // Phase 4: RTM Amendments & AI Research
    // ---------------------------------------------------------------------------

    [HttpPost("rtm/research-advice/{targetId}")]
    public async Task<ActionResult<ResearchAdvice>> GetRtmResearchAdvice(string targetId)
    {
        try
        {
            logger.LogInformation("RPAS-CM AI Research ritual triggered for Requirement: {TargetId}", targetId);

            // 1. Fetch Full Historical Ledger for Context (RPAS-CM Certified)
            // AI requires evolution history to make high-integrity suggestions.
            var ledger = await db.RequirementsTraceabilityMatrix.ToListAsync();
            
            // 2. Trigger Intelligence Ritual (Advisory Mode)
            var advice = await intelligence.GetRtmResearchAdviceAsync(targetId, ledger);
            
            if (advice == null)
            {
                return BadRequest("Failed to generate AI research advice.");
            }

            return Ok(advice);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: rtm/research-advice");
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPost("rtm/propose-amendment")]
    public async Task<IActionResult> ProposeRtmAmendment([FromBody] AmendmentProposalRequest request)
    {
        try
        {
            logger.LogInformation("Proposing RTM Amendment for Requirement: {TargetId}", request.TargetRequirementId);

            // 1. Validate Target Requirement
            var target = await db.RequirementsTraceabilityMatrix
                .FirstOrDefaultAsync(r => r.Id == request.TargetRequirementId);
            
            if (target == null)
            {
                return NotFound($"Target RTM Requirement {request.TargetRequirementId} not found.");
            }

            // 2. Create Amendment Proposal (PENDING)
            var amendment = new RtmAmendment
            {
                TargetRequirementId = target.Id,
                OriginalDescription = target.Description, // Snapshot the current state
                ProposedDescription = request.ProposedDescription,
                Justification = request.Justification,
                Requester = request.Requester ?? "SYSTEM",
                ApprovalStatus = "PENDING", // Enforce PENDING state for ritual start
                AmendmentType = request.AmendmentType ?? "REPLACEMENT",
                AmendmentSubType = request.AmendmentSubType ?? "FULL_REPLACEMENT",
                SourceVersion = target.SourceVersion // Maintain lineage to source version
            };

            db.RtmAmendments.Add(amendment);
            await db.SaveChangesAsync();

            logger.LogInformation("Amendment Proposal {AmendmentId} recorded for Requirement {TargetId}", amendment.Id, target.Id);

            return Ok(new { 
                Status = "PROPOSED", 
                AmendmentId = amendment.Id,
                TargetId = target.Id 
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: rtm/propose-amendment");
            return StatusCode(500, new { Error = "Amendment proposal failed.", Detail = ex.Message });
        }
    }

    [HttpPost("rtm/decide-amendment")]
    public async Task<IActionResult> DecideRtmAmendment([FromBody] AmendmentDecisionRequest request)
    {
        try
        {
            logger.LogInformation("Deciding RTM Amendment {AmendmentId} - Result: {Status}", request.AmendmentId, request.Status);

            // 1. Fetch Amendment
            var amendment = await db.RtmAmendments
                .FirstOrDefaultAsync(a => a.Id == request.AmendmentId);
            
            if (amendment == null)
            {
                return NotFound($"RTM Amendment {request.AmendmentId} not found.");
            }

            // 2. Validate Transitions (G4 - Determinism)
            if (amendment.ApprovalStatus != "PENDING")
            {
                return BadRequest($"Amendment {request.AmendmentId} has already been decided (Status: {amendment.ApprovalStatus}).");
            }

            // 3. Update Decision Metadata (G3 - Evidence & Lineage)
            amendment.ApprovalStatus = request.Status.ToUpper(); // APPROVED or REJECTED
            amendment.DecidedBy = request.DecidedBy;
            amendment.DecidedAt = DateTime.UtcNow;
            amendment.DecisionNotes = request.DecisionNotes;

            await db.SaveChangesAsync();

            logger.LogInformation("Amendment {AmendmentId} decision recorded: {Status}", amendment.Id, amendment.ApprovalStatus);

            return Ok(new { 
                Status = amendment.ApprovalStatus, 
                AmendmentId = amendment.Id 
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: rtm/decide-amendment");
            return StatusCode(500, new { Error = "Amendment decision failed.", Detail = ex.Message });
        }
    }

    [HttpPost("rtm/apply-amendment")]
    public async Task<IActionResult> ApplyRtmAmendment([FromBody] ApplyAmendmentRequest request)
    {
        try
        {
            var gate = approvalGate.EnsureJitApproval(TaskApprovalScopes.RtmApplyAmendment, request.AmendmentId, request.Approval);
            if (gate is not null)
                return gate;

            var result = await executionService.ApplyAmendmentAsync(request.AmendmentId, request.Actor);
            
            if (!result.Success)
            {
                return BadRequest(result.Message);
            }

            return Ok(new { Message = result.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ritual Failure: rtm/apply-amendment");
            return StatusCode(500, new { Error = "Amendment application failed.", Detail = ex.Message });
        }
    }

    // ---------------------------------------------------------------------------
    // System Integrity & Observability
    // ---------------------------------------------------------------------------

    [HttpGet("system/health")]
    public async Task<ActionResult<SystemHealthResult>> GetSystemHealth()
    {
        try
        {
            var dbHealthy = await db.Database.CanConnectAsync();
            
            // Basic intelligence health check
            bool intelligenceHealthy = await intelligence.CheckHealthAsync();

            // Active rituals count (simplified for health reporting)
            var activeRituals = 0;
            try {
                activeRituals = await db.IdeationSummaries.CountAsync();
            } catch (Exception ex) {
                logger.LogWarning("Health check failed to count rituals: {Msg}", ex.Message);
            }

            var result = new SystemHealthResult(
                DbHealthy: dbHealthy,
                MessagingHealthy: true, // Simplified for this baseline; would normally check MassTransit bus health
                IntelligenceHealthy: intelligenceHealthy,
                ActiveRituals: activeRituals,
                EnvironmentBaseline: "CSR-42-ADPA-ORCHESTRATOR",
                Uptime: TimeSpan.FromMilliseconds(Environment.TickCount64)
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Integrity Failure: system/health");
            return StatusCode(500, ex.Message);
        }
    }
}
