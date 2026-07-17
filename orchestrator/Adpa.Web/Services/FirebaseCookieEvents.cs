using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Adpa.Web.Services;

/// <summary>
/// ADR-009: keeps the session's Firebase ID token fresh without forcing re-login every
/// ~1h (Firebase ID tokens expire quickly by design). Runs on every request that
/// presents the auth cookie; refreshes only when the token is actually close to expiry,
/// not on every validation.
///
/// Fail-closed, matching every other credential check in this ADR: a refresh failure
/// (revoked refresh token, Firebase outage) rejects the principal and signs the user
/// out, rather than letting a stale/expired ID token keep being relayed to endpoints
/// that will just reject it anyway with a confusing 401 deep inside a workflow.
/// </summary>
public sealed class FirebaseCookieEvents(FirebaseAuthService firebaseAuth, ILogger<FirebaseCookieEvents> logger) : CookieAuthenticationEvents
{
    public const string RefreshTokenClaimType = "firebase_refresh_token";
    public const string ExpiresAtClaimType = "firebase_token_expires_at";

    private static readonly TimeSpan RefreshWindow = TimeSpan.FromMinutes(5);

    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var expiresAtClaim = context.Principal?.FindFirst(ExpiresAtClaimType)?.Value;
        var refreshToken = context.Principal?.FindFirst(RefreshTokenClaimType)?.Value;

        if (expiresAtClaim is null || refreshToken is null || !DateTimeOffset.TryParse(expiresAtClaim, out var expiresAt))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }

        if (expiresAt - DateTimeOffset.UtcNow > RefreshWindow)
        {
            return; // still fresh, nothing to do this request
        }

        var result = await firebaseAuth.RefreshAsync(refreshToken);
        if (!result.Success || result.IdToken is null || result.RefreshToken is null)
        {
            logger.LogWarning("Firebase token refresh failed for an active session; signing out.");
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }

        var identity = (ClaimsIdentity)context.Principal!.Identity!;
        ReplaceClaim(identity, FirebaseBearerTokenHandler.IdTokenClaimType, result.IdToken);
        ReplaceClaim(identity, RefreshTokenClaimType, result.RefreshToken);
        ReplaceClaim(identity, ExpiresAtClaimType, DateTimeOffset.UtcNow.AddSeconds(result.ExpiresInSeconds).ToString("O"));

        context.ShouldRenew = true;
    }

    private static void ReplaceClaim(ClaimsIdentity identity, string type, string value)
    {
        var existing = identity.FindFirst(type);
        if (existing is not null) identity.RemoveClaim(existing);
        identity.AddClaim(new Claim(type, value));
    }
}
