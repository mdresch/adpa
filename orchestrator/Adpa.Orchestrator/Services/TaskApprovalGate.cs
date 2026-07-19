using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Adpa.Orchestrator.Clients;
using Adpa.Orchestrator.Models.Governance;

namespace Adpa.Orchestrator.Services;

public interface ITaskApprovalGate
{
    /// <summary>Returns <c>null</c> when the request may proceed; otherwise an HTTP result to return immediately.</summary>
    Task<IActionResult?> EnsureJitApproval(string expectedScope, string taskId, TaskApprovalAttestation? approval, ClaimsPrincipal user);
}

/// <summary>
/// Validates JIT human attestations when configuration <c>Governance:ApprovalsEnforced</c> is enabled.
/// Also validates (ADR-005 Phase 2) that the authenticated caller is an active member — for the
/// exact <c>portfolio_id</c>, not department name alone — of the target module's declared
/// <c>functionalOwnerDepartment</c> in capability_registry.
/// </summary>
public sealed class TaskApprovalGate(
    IConfiguration configuration,
    ILogger<TaskApprovalGate> logger,
    CapabilityRegistryClient capabilityRegistry) : ITaskApprovalGate
{
    public const int MaxJitWindowMinutes = 30;

    public async Task<IActionResult?> EnsureJitApproval(string expectedScope, string taskId, TaskApprovalAttestation? approval, ClaimsPrincipal user)
    {
        var enforced = configuration.GetValue("Governance:ApprovalsEnforced", true);
        if (!enforced)
            return null;

        if (!configuration.GetValue("Governance:SovereignApiRequired", true))
        {
            logger.LogCritical("Governance:ApprovalsEnforced is true but SovereignApiRequired is false.");
            return new ObjectResult(new
            {
                error = "Governance misconfiguration: ApprovalsEnforced requires SovereignApiRequired=true."
            })
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };
        }

        if (approval is null)
        {
            return new BadRequestObjectResult(new
            {
                error = "JIT approval attestation is required when Governance:ApprovalsEnforced is true.",
                scope = expectedScope,
                taskId
            });
        }

        if (!string.Equals(approval.Scope, expectedScope, StringComparison.Ordinal))
        {
            return new BadRequestObjectResult(new
            {
                error = "Attestation scope does not match this endpoint.",
                expectedScope,
                actualScope = approval.Scope
            });
        }

        if (!string.Equals(approval.TaskId, taskId, StringComparison.Ordinal))
        {
            return new BadRequestObjectResult(new
            {
                error = "Attestation taskId must match the task being executed.",
                expectedTaskId = taskId,
                actualTaskId = approval.TaskId
            });
        }

        if (string.IsNullOrWhiteSpace(approval.HumanDecisionId) || string.IsNullOrWhiteSpace(approval.DecidedBy))
        {
            return new BadRequestObjectResult(new
            {
                error = "humanDecisionId and decidedBy are required on the JIT approval attestation."
            });
        }

        if (!approval.ExpiresAt.HasValue)
        {
            return new BadRequestObjectResult(new { error = "expiresAt is required for JIT approvals." });
        }

        var now = DateTimeOffset.UtcNow;
        if (approval.ExpiresAt.Value <= now)
        {
            return new BadRequestObjectResult(new { error = "JIT approval has expired (expiresAt must be in the future)." });
        }

        if (approval.ExpiresAt.Value > now.AddMinutes(MaxJitWindowMinutes))
        {
            return new BadRequestObjectResult(new
            {
                error = $"JIT approval expiresAt must be within {MaxJitWindowMinutes} minutes of server UTC time."
            });
        }

        // ---------------------------------------------------------------------------
        // ADR-005 Phase 2: department-aware check. The caller's own claimed department
        // membership (from the validated JWT's "departments" claim) is what's trusted
        // here — approval.DecidedBy above is a display label, never the security check.
        // Both portfolioId and department must match the target module's capability_registry
        // row: department name alone is not sufficient once a department can exist
        // identically-named across multiple portfolios (ADR-005 Phase 0 note).
        // ---------------------------------------------------------------------------

        var portfolioId = configuration["Governance:PortfolioId"];
        if (string.IsNullOrWhiteSpace(portfolioId))
        {
            logger.LogCritical("Governance:PortfolioId is not configured; department-aware approval cannot be evaluated.");
            return new ObjectResult(new
            {
                error = "Governance misconfiguration: Governance:PortfolioId is required for department-aware approval."
            })
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };
        }

        CapabilityRegistryEntry? capability;
        try
        {
            capability = await capabilityRegistry.GetAsync(expectedScope, portfolioId);
        }
        catch (Exception ex)
        {
            // Fail closed: a lookup failure (timeout, 5xx, network) must deny, not silently
            // fall through to the pre-Phase-2 behavior — the whole point of this check is
            // defeated if its own unavailability becomes a way to bypass it.
            logger.LogError(ex, "Capability registry lookup failed for module={ModuleId} portfolio={PortfolioId}", expectedScope, portfolioId);
            return new BadRequestObjectResult(new
            {
                error = "Unable to resolve the module's functional owner department; approval denied.",
                scope = expectedScope
            });
        }

        if (capability is null || string.IsNullOrWhiteSpace(capability.FunctionalOwnerDepartment))
        {
            // Default-deny: no registry row, or a row with no owner assigned yet (Phase 1
            // task 3 — ownership assignment is a business decision, never guessed) — same
            // shape as today's missing-attestation case.
            return new BadRequestObjectResult(new
            {
                error = "This module has no assigned functional owner department; approval denied.",
                scope = expectedScope,
                portfolioId
            });
        }

        var claims = DepartmentClaimsReader.Read(user);
        if (!DepartmentClaimsReader.HasMatchingMembership(claims, capability.PortfolioId, capability.FunctionalOwnerDepartment))
        {
            return new BadRequestObjectResult(new
            {
                error = "The approver is not an active member of this module's functional owner department for this portfolio.",
                scope = expectedScope,
                requiredDepartment = capability.FunctionalOwnerDepartment,
                requiredPortfolioId = capability.PortfolioId
            });
        }

        logger.LogInformation(
            "JIT approval accepted: scope={Scope} taskId={TaskId} humanDecisionId={Decision} decidedBy={DecidedBy} department={Department} portfolioId={PortfolioId}",
            expectedScope,
            taskId,
            approval.HumanDecisionId,
            approval.DecidedBy,
            capability.FunctionalOwnerDepartment,
            capability.PortfolioId);

        return null;
    }

    public static void ValidateConfigurationAtStartup(IConfiguration configuration)
    {
        var enforced = configuration.GetValue("Governance:ApprovalsEnforced", true);
        var sovereign = configuration.GetValue("Governance:SovereignApiRequired", true);
        if (enforced && !sovereign)
        {
            throw new InvalidOperationException(
                "Governance:ApprovalsEnforced is true but Governance:SovereignApiRequired is false. " +
                "Singular authority and JIT approvals require the sovereign governance API.");
        }

        if (enforced && string.IsNullOrWhiteSpace(configuration["Governance:PortfolioId"]))
        {
            throw new InvalidOperationException(
                "Governance:ApprovalsEnforced is true but Governance:PortfolioId is not configured. " +
                "Department-aware approval (ADR-005 Phase 2) requires a configured portfolio scope.");
        }
    }
}
