using System.Net.Http.Headers;

namespace Adpa.Web.Services;

/// <summary>
/// ADR-009: attaches the signed-in user's Firebase ID token (held as a claim on the
/// auth cookie's ClaimsPrincipal -- see Program.cs's cookie events) to every outgoing
/// request on the "api" HttpClient. Mirrors CapabilityController.Promote's existing
/// per-request relay pattern server-side of the orchestrator boundary -- this is the
/// same idea one hop earlier, at the point Adpa.Web calls the orchestrator.
///
/// An anonymous request (no signed-in user, e.g. before ADR-009 shipped, or a page that
/// deliberately allows anonymous access) sends no Authorization header at all -- exactly
/// today's pre-ADR-009 behavior for those calls, not a synthesized/blank credential.
/// </summary>
public sealed class FirebaseBearerTokenHandler(IHttpContextAccessor httpContextAccessor) : DelegatingHandler
{
    public const string IdTokenClaimType = "firebase_id_token";

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var idToken = httpContextAccessor.HttpContext?.User?.FindFirst(IdTokenClaimType)?.Value;
        if (!string.IsNullOrWhiteSpace(idToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", idToken);
        }

        return base.SendAsync(request, cancellationToken);
    }
}
