using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Adpa.Orchestrator.Models.Governance;

namespace Adpa.Orchestrator.Services;

public interface ITaskApprovalGate
{
    /// <summary>Returns <c>null</c> when the request may proceed; otherwise an HTTP result to return immediately.</summary>
    IActionResult? EnsureJitApproval(string expectedScope, string taskId, TaskApprovalAttestation? approval);
}

/// <summary>
/// Validates JIT human attestations when configuration <c>Governance:ApprovalsEnforced</c> is enabled.
/// </summary>
public sealed class TaskApprovalGate(IConfiguration configuration, ILogger<TaskApprovalGate> logger) : ITaskApprovalGate
{
    public const int MaxJitWindowMinutes = 30;

    public IActionResult? EnsureJitApproval(string expectedScope, string taskId, TaskApprovalAttestation? approval)
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

        logger.LogInformation(
            "JIT approval accepted: scope={Scope} taskId={TaskId} humanDecisionId={Decision} decidedBy={DecidedBy}",
            expectedScope,
            taskId,
            approval.HumanDecisionId,
            approval.DecidedBy);

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
    }
}
