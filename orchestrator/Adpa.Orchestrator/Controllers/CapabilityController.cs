using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Adpa.Orchestrator.Clients;

namespace Adpa.Orchestrator.Controllers;

/// <summary>
/// ADR-005 Phase 6 (write-endpoint half), extended by Phase 2 task 4 (override) and
/// Phase 3 task 6 (break-glass): a thin proxy to Node's authenticated capability_registry
/// endpoints. Distinct from RitualController, which handles the older BusinessCase/
/// RtmAmendment ritual/JIT-approval concept -- this controller has no relationship to
/// TaskApprovalGate's JIT approval flow at all.
///
/// Deliberately not [Authorize]-decorated -- following the same reasoning already
/// documented for RitualController's phase0/approve/rtm/apply-amendment ([Authorize]
/// would be enforced by ASP.NET Core's middleware before any downstream check could run,
/// and this codebase has never actually exercised attribute-based authorization). The
/// real check is downstream: this proxy relays whatever Authorization header the caller
/// presented (or none) straight through to Node, and Node's authenticateToken middleware
/// is the actual, already-real enforcement point -- a missing/invalid token fails there
/// with 401, the same fail-closed-by-construction shape TaskApprovalGate already uses.
///
/// Every action here follows the same shape: relay the caller's bearer token, call one
/// Node endpoint, pass its raw (status code, JSON body) straight back -- Node is the one
/// system that defines what success/failure looks like for these, not two.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class CapabilityController(
    CapabilityRegistryClient capabilityRegistry,
    ILogger<CapabilityController> logger) : ControllerBase
{
    [HttpPost("{moduleId}/{portfolioId}/promote")]
    public Task<IActionResult> Promote(
        string moduleId, string portfolioId,
        [FromBody] CapabilityRegistryClient.PromoteRequest request,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "promote",
            token => capabilityRegistry.PromoteAsync(moduleId, portfolioId, request, token, cancellationToken));

    [HttpPost("{moduleId}/{portfolioId}/override/request")]
    public Task<IActionResult> RequestOverride(
        string moduleId, string portfolioId,
        [FromBody] CapabilityRegistryClient.OverrideRequestBody request,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "override/request",
            token => capabilityRegistry.RequestOverrideAsync(moduleId, portfolioId, request, token, cancellationToken));

    [HttpPost("{moduleId}/{portfolioId}/override/{requestId}/approve")]
    public Task<IActionResult> ApproveOverride(
        string moduleId, string portfolioId, string requestId,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "override/approve",
            token => capabilityRegistry.ApproveOverrideAsync(moduleId, portfolioId, requestId, token, cancellationToken));

    [HttpPost("{moduleId}/{portfolioId}/override/{requestId}/deny")]
    public Task<IActionResult> DenyOverride(
        string moduleId, string portfolioId, string requestId,
        [FromBody] CapabilityRegistryClient.DenyRequestBody request,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "override/deny",
            token => capabilityRegistry.DenyOverrideAsync(moduleId, portfolioId, requestId, request, token, cancellationToken));

    [HttpPost("{moduleId}/{portfolioId}/exceptions/request")]
    public Task<IActionResult> RequestException(
        string moduleId, string portfolioId,
        [FromBody] CapabilityRegistryClient.OverrideRequestBody request,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "exceptions/request",
            token => capabilityRegistry.RequestExceptionAsync(moduleId, portfolioId, request, token, cancellationToken));

    [HttpPost("{moduleId}/{portfolioId}/exceptions/{exceptionId}/reviews/{reviewId}/decide")]
    public Task<IActionResult> DecideExceptionReview(
        string moduleId, string portfolioId, string exceptionId, string reviewId,
        [FromBody] CapabilityRegistryClient.ExceptionDecisionBody request,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "exceptions/decide",
            token => capabilityRegistry.DecideExceptionReviewAsync(moduleId, portfolioId, exceptionId, reviewId, request, token, cancellationToken));

    [HttpPost("{moduleId}/{portfolioId}/exceptions/{exceptionId}/activate")]
    public Task<IActionResult> ActivateException(
        string moduleId, string portfolioId, string exceptionId,
        CancellationToken cancellationToken) =>
        Relay(moduleId, portfolioId, "exceptions/activate",
            token => capabilityRegistry.ActivateExceptionAsync(moduleId, portfolioId, exceptionId, token, cancellationToken));

    // Governor Portal Approvals queue -- cross-capability, so no moduleId/portfolioId
    // to scope the error payload to (unlike every action above).
    [HttpGet("overrides/pending")]
    public Task<IActionResult> ListPendingOverrides(CancellationToken cancellationToken) =>
        RelayList("overrides/pending", token => capabilityRegistry.ListPendingOverridesAsync(token, cancellationToken));

    [HttpGet("exceptions/pending")]
    public Task<IActionResult> ListPendingExceptions(CancellationToken cancellationToken) =>
        RelayList("exceptions/pending", token => capabilityRegistry.ListPendingExceptionsAsync(token, cancellationToken));

    private async Task<IActionResult> RelayList(string action, Func<string?, Task<(int StatusCode, string Body)>> call)
    {
        var bearerToken = Request.Headers.Authorization.ToString();
        (int StatusCode, string Body) result;
        try
        {
            result = await call(string.IsNullOrWhiteSpace(bearerToken) ? null : bearerToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Capability {Action} relay failed", action);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "Unable to reach the capability registry service.",
                action
            });
        }

        return ParseRelayResult(result);
    }

    private async Task<IActionResult> Relay(
        string moduleId, string portfolioId, string action,
        Func<string?, Task<(int StatusCode, string Body)>> call)
    {
        var bearerToken = Request.Headers.Authorization.ToString();
        (int StatusCode, string Body) result;
        try
        {
            result = await call(string.IsNullOrWhiteSpace(bearerToken) ? null : bearerToken);
        }
        catch (Exception ex)
        {
            // Fail closed: a relay failure (timeout, network, Node unreachable) must not
            // be mistaken for a successful call -- same reasoning TaskApprovalGate
            // already applies to its own capability-registry lookup failures.
            logger.LogError(ex, "Capability {Action} relay failed for module={ModuleId} portfolio={PortfolioId}", action, moduleId, portfolioId);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "Unable to reach the capability registry service; the action was not applied.",
                moduleId,
                portfolioId,
                action
            });
        }

        return ParseRelayResult(result);
    }

    private IActionResult ParseRelayResult((int StatusCode, string Body) result)
    {
        if (string.IsNullOrWhiteSpace(result.Body))
        {
            return StatusCode(result.StatusCode);
        }

        try
        {
            using var document = JsonDocument.Parse(result.Body);
            return StatusCode(result.StatusCode, document.RootElement.Clone());
        }
        catch (JsonException)
        {
            // Node's response wasn't valid JSON -- relay the status code and raw text
            // rather than masking a real (if malformed) response as a generic error.
            return StatusCode(result.StatusCode, result.Body);
        }
    }
}
