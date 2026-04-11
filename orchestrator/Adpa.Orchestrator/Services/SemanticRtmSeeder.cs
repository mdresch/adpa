using Adpa.Orchestrator.Data;
using Adpa.Orchestrator.Models.Rituals;
using Microsoft.EntityFrameworkCore;

namespace Adpa.Orchestrator.Services;

public interface ISemanticRtmSeeder
{
    Task SeedFromBusinessCaseAsync(string businessCaseId, CancellationToken ct = default);
}

public class SemanticRtmSeeder(GovernanceDbContext db, ILogger<SemanticRtmSeeder> logger) : ISemanticRtmSeeder
{
    public async Task SeedFromBusinessCaseAsync(string businessCaseId, CancellationToken ct = default)
    {
        // 1. Fetch & Validate Scope Integrity
        var bc = await db.BusinessCases.FirstOrDefaultAsync(x => x.Id == businessCaseId, ct);
        if (bc == null || bc.CoreRequirements.Count == 0)
        {
            logger.LogWarning("Seeding Aborted: No business case or core requirements found for ID {BusinessCaseId}", businessCaseId);
            return;
        }

        // Governance Invariant: Only APPROVED cases can seed the RTM
        if (bc.ApprovalStatus != "APPROVED")
        {
            logger.LogWarning("Governance Violation: Attempted to seed RTM from non-approved Business Case {BusinessCaseId} (Status: {Status})", businessCaseId, bc.ApprovalStatus);
            return;
        }

        foreach (var reqDescription in bc.CoreRequirements)
        {
            // 2. Idempotency Check: Prevent duplicate requirements for the same Business Case
            var exists = await db.RequirementsTraceabilityMatrix
                .AnyAsync(r => r.BusinessCaseId == bc.Id && r.Description == reqDescription, ct);
            
            if (exists)
            {
                logger.LogDebug("Idempotency: Requirement already exists in RTM for BusinessCase {BusinessCaseId}. Skipping.", bc.Id);
                continue;
            }

            // 3. Lineage Enrichment
            var domain = InferDomain(reqDescription);
            
            var rtmEntry = new RtmRequirement
            {
                BusinessCaseId = bc.Id,
                Description = reqDescription,
                Domain = domain,
                SourceVersion = bc.Version, // Preserving version lineage
                Status = "SEED_SUCCESS"
            };

            db.RequirementsTraceabilityMatrix.Add(rtmEntry);
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Successfully processed RTM seeding for BusinessCase {BusinessCaseId} (Version: {Version})", bc.Id, bc.Version);
    }

    private string InferDomain(string description)
    {
        if (description.Contains("data", StringComparison.OrdinalIgnoreCase) || 
            description.Contains("system", StringComparison.OrdinalIgnoreCase)) return "TECHNICAL";
        
        if (description.Contains("process", StringComparison.OrdinalIgnoreCase) || 
            description.Contains("workflow", StringComparison.OrdinalIgnoreCase)) return "BABOK_PROCESS";

        return "PMBOK_GENERAL";
    }
}
