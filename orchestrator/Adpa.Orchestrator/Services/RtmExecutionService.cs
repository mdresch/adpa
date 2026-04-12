using Adpa.Orchestrator.Data;
using Adpa.Orchestrator.Models.Rituals;
using Microsoft.EntityFrameworkCore;

namespace Adpa.Orchestrator.Services;

public interface IRtmExecutionService
{
    Task<(bool Success, string Message)> ApplyAmendmentAsync(string amendmentId, string actor);
}

public class RtmExecutionService(GovernanceDbContext db, ILogger<RtmExecutionService> logger) : IRtmExecutionService
{
    public async Task<(bool Success, string Message)> ApplyAmendmentAsync(string amendmentId, string actor)
    {
        try
        {
            logger.LogInformation("Execution: Applying RTM Amendment {AmendmentId}", amendmentId);

            // 1. Fetch Amendment with Governance Check (G1)
            var amendment = await db.RtmAmendments
                .FirstOrDefaultAsync(a => a.Id == amendmentId);

            if (amendment == null) return (false, "Amendment not found.");
            if (amendment.ApprovalStatus != "APPROVED") return (false, "Amendment is not in APPROVED state.");
            
            // 2. Idempotency Check (G4)
            if (amendment.AppliedAt.HasValue) 
                return (false, $"Amendment was already applied on {amendment.AppliedAt:yyyy-MM-dd HH:mm}.");

            // 3. Fetch Target Requirement
            var target = await db.RequirementsTraceabilityMatrix
                .FirstOrDefaultAsync(r => r.Id == amendment.TargetRequirementId);

            if (target == null) return (false, "Target Requirement not found in the matrix.");

            // 4. Execute Branching Semantics (Replacement vs Expansion)
            RtmRequirement newRequirement;
            var executionTime = DateTimeOffset.UtcNow;
            var csrStamp = $"v{target.SourceVersion}+CSR.{executionTime:yyyy-MM-ddTHH:mmZ}";

            if (amendment.AmendmentType == "REPLACEMENT")
            {
                logger.LogInformation("Semantics: REPLACEMENT execution with CSR {CsrVersion}", csrStamp);

                // Supersede original (G3 Lineage)
                target.Status = "SUPERSEDED";
                
                // Create new version
                newRequirement = new RtmRequirement
                {
                    BusinessCaseId = target.BusinessCaseId,
                    Description = amendment.ProposedDescription,
                    Domain = target.Domain,
                    Priority = target.Priority,
                    Status = "ACTIVE",
                    SourceVersion = target.SourceVersion, 
                    AmendmentId = amendment.Id,
                    CsrVersion = csrStamp,
                    ExecutedAt = executionTime
                };
            }
            else // EXPANSION
            {
                logger.LogInformation("Semantics: EXPANSION execution with CSR {CsrVersion}", csrStamp);

                newRequirement = new RtmRequirement
                {
                    BusinessCaseId = target.BusinessCaseId,
                    Description = amendment.ProposedDescription,
                    Domain = target.Domain,
                    Priority = target.Priority,
                    Status = "ACTIVE",
                    SourceVersion = target.SourceVersion, 
                    AmendmentId = amendment.Id,
                    CsrVersion = csrStamp,
                    ExecutedAt = executionTime
                };
            }

            // 5. Commit Execution Record (Atomic)
            db.RequirementsTraceabilityMatrix.Add(newRequirement);
            
            amendment.AppliedAt = DateTime.UtcNow;
            amendment.AppliedBy = actor;
            amendment.ResultingRequirementId = newRequirement.Id;

            await db.SaveChangesAsync();

            logger.LogInformation("Execution Complete: Amendment {AmendmentId} -> Requirement {NewId}", amendment.Id, newRequirement.Id);
            return (true, $"Amendment applied successfully. New Requirement ID: {newRequirement.Id}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Execution Failure: rtm/apply-amendment/{AmendmentId}", amendmentId);
            return (false, $"System Failure: {ex.Message}");
        }
    }
}
