using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Adpa.Orchestrator.Clients;

namespace Adpa.Orchestrator.Controllers;

/// <summary>
/// ADR-005 Phase 6 (write-endpoint half): a thin proxy to Node's authenticated
/// promote_capability_status endpoint. Distinct from RitualController, which handles the
/// older BusinessCase/RtmAmendment ritual/JIT-approval concept -- this controller has no
/// relationship to TaskApprovalGate's JIT approval flow at all.
///
/// Deliberately not [Authorize]-decorated -- following the same reasoning already
/// documented for RitualController's phase0/approve/rtm/apply-amendment ([Authorize]
/// would be enforced by ASP.NET Core's middleware before any downstream check could run,
/// and this codebase has never actually exercised attribute-based authorization). The
/// real check is downstream: this proxy relays whatever Authorization header the caller
/// presented (or none) straight through to Node, and Node's authenticateToken middleware
/// is the actual, already-real enforcement point -- a missing/invalid token fails there
/// with 401, the same fail-closed-by-construction shape TaskApprovalGate already uses.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class CapabilityController(
    CapabilityRegistryClient capabilityRegistry,
    ILogger<CapabilityController> logger) : ControllerBase
{
    [HttpPost("{moduleId}/{portfolioId}/promote")]
    public async Task<IActionResult> Promote(
        string moduleId,
        string portfolioId,
        [FromBody] CapabilityRegistryClient.PromoteRequest request,
        CancellationToken cancellationToken)
    {
        var bearerToken = Request.Headers.Authorization.ToString();

        (int StatusCode, string Body) result;
        try
        {
            result = await capabilityRegistry.PromoteAsync(
                moduleId, portfolioId, request,
                string.IsNullOrWhiteSpace(bearerToken) ? null : bearerToken,
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Fail closed: a relay failure (timeout, network, Node unreachable) must not
            // be mistaken for a successful promotion -- same reasoning TaskApprovalGate
            // already applies to its own capability-registry lookup failures.
            logger.LogError(ex, "Capability promote relay failed for module={ModuleId} portfolio={PortfolioId}", moduleId, portfolioId);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "Unable to reach the capability registry service; promotion not applied.",
                moduleId,
                portfolioId
            });
        }

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
