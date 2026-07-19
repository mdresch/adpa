using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Adpa.Orchestrator.Clients;

namespace Adpa.Orchestrator.Controllers;

/// <summary>
/// ADR-012 PR1: thin proxy to Node's GET /api/v1/auth/me, so Adpa.Web can resolve the
/// signed-in caller's role and active department memberships -- the gap the Approvals
/// design spec deferred (Adpa.Web's session previously knew only the caller's Firebase
/// UID/email, nothing else). Same relay/fail-closed shape as CapabilityController: relay
/// whatever Authorization header the caller presented, pass Node's raw (status code, JSON
/// body) straight back, 502 on an unreachable/failed relay rather than mistaking it for a
/// successful call. Deliberately not [Authorize]-decorated for the same reason documented
/// on CapabilityController -- the real enforcement point is Node's authenticateToken
/// middleware, downstream of this relay.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class CurrentUserController(
    CurrentUserClient currentUser,
    ILogger<CurrentUserController> logger) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var bearerToken = Request.Headers.Authorization.ToString();
        (int StatusCode, string Body) result;
        try
        {
            result = await currentUser.GetProfileAsync(string.IsNullOrWhiteSpace(bearerToken) ? null : bearerToken, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Current-user profile relay failed");
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "Unable to reach the current-user profile service."
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
            return StatusCode(result.StatusCode, result.Body);
        }
    }
}
