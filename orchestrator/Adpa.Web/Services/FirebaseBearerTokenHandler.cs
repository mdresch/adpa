using System.Net.Http.Headers;
using Microsoft.AspNetCore.Components.Authorization;

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
///
/// ADR-012 PR1 bugfix (2026-07-17): IHttpContextAccessor.HttpContext is only reliably
/// non-null during a circuit's initial render (Microsoft's own Blazor Server docs warn
/// against relying on it afterward -- there's no active HTTP request behind a SignalR
/// circuit interaction). A caller invoked later in the circuit's lifetime (e.g.
/// CurrentUserService.GetAsync() from a component's OnAfterRenderAsync, or after a
/// client-side reconnect) could previously see HttpContext null, send this request with
/// no Authorization header, get a 401 from Node, and have that misread as "not
/// authorized" rather than "the token lookup itself failed" -- silently hiding
/// department-gated actions from an actually-authorized user for the rest of the
/// circuit. AuthenticationStateProvider's ClaimsPrincipal is captured once when the
/// circuit's auth state is established and stays valid for the circuit's full lifetime,
/// so it's the correct fallback here, not a second HttpContext-shaped guess.
/// </summary>
public sealed class FirebaseBearerTokenHandler(
    IHttpContextAccessor httpContextAccessor,
    AuthenticationStateProvider authenticationStateProvider) : DelegatingHandler
{
    public const string IdTokenClaimType = "firebase_id_token";

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var idToken = httpContextAccessor.HttpContext?.User?.FindFirst(IdTokenClaimType)?.Value;

        if (string.IsNullOrWhiteSpace(idToken))
        {
            var authState = await authenticationStateProvider.GetAuthenticationStateAsync();
            idToken = authState.User?.FindFirst(IdTokenClaimType)?.Value;
        }

        if (!string.IsNullOrWhiteSpace(idToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", idToken);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
