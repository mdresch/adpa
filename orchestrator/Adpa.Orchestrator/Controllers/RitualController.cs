using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Adpa.Orchestrator.Clients;
using Adpa.Orchestrator.Data;
using Adpa.Orchestrator.Models.Rituals;
using Adpa.Orchestrator.Services;

namespace Adpa.Orchestrator.Controllers;

public record IngestionRequest(string Filename, string Content);

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

public record ApplyAmendmentRequest(
    string AmendmentId,
    string Actor);

[ApiController]
[Route("api/[controller]")]
public class RitualController(
    IntelligenceClient intelligence,
    GovernanceDbContext db, 
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
    public async Task<IActionResult> ApproveBusinessCase([FromBody] string businessCaseId)
    {
        try
        {
            logger.LogInformation("Attempting to approve Business Case: {BusinessCaseId}", businessCaseId);

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

            // 2. Update Governance State
            bc.ApprovalStatus = "APPROVED";
            await db.SaveChangesAsync();

            // 3. Trigger Semantic RTM Seeding (Post-Approval Ritual)
            logger.LogInformation("Business Case {BusinessCaseId} approved. Triggering Semantic RTM Seeder.", businessCaseId);
            await rtmSeeder.SeedFromBusinessCaseAsync(businessCaseId);

            return Ok(new { 
                Status = "APPROVED", 
                RtmSeeding = "COMPLETED", 
                BusinessCaseId = businessCaseId 
            });
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
}
