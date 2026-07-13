using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Adpa.Web.Services;

/// <summary>
/// ADR-009: the actual sign-in/sign-out HTTP endpoints, deliberately NOT Blazor
/// components or minimal-API handlers wrapped in interactive render logic --
/// Login.razor's plain HTML form posts here as a normal browser navigation, and
/// HttpContext.SignInAsync/SignOutAsync need a real HTTP response to write the
/// Set-Cookie header on, which an interactive Blazor Server circuit can't provide.
/// </summary>
public static class AuthEndpoints
{
    public static void MapFirebaseAuthEndpoints(this WebApplication app)
    {
        app.MapPost("/login", async (HttpContext context, FirebaseAuthService firebaseAuth) =>
        {
            var form = await context.Request.ReadFormAsync();
            var email = form["email"].ToString();
            var password = form["password"].ToString();
            var returnUrl = form["returnUrl"].ToString();

            var result = await firebaseAuth.SignInWithPasswordAsync(email, password);
            if (!result.Success || result.IdToken is null || result.RefreshToken is null || result.Uid is null)
            {
                return Results.Redirect($"/login?error=1&returnUrl={Uri.EscapeDataString(returnUrl)}");
            }

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, result.Uid),
                new(ClaimTypes.Email, result.Email ?? email),
                new(FirebaseBearerTokenHandler.IdTokenClaimType, result.IdToken),
                new(FirebaseCookieEvents.RefreshTokenClaimType, result.RefreshToken),
                new(FirebaseCookieEvents.ExpiresAtClaimType, DateTimeOffset.UtcNow.AddSeconds(result.ExpiresInSeconds).ToString("O"))
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

            return Results.Redirect(IsSafeLocalReturnUrl(returnUrl) ? returnUrl : "/");
        });

        app.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Redirect("/login");
        });
    }

    /// <summary>
    /// Open-redirect guard: "/" alone is not enough -- "//evil.com" and "/\evil.com" both
    /// start with "/" but browsers resolve them as protocol-relative URLs to an external
    /// host. Only a single-leading-slash, non-backslash path is accepted.
    /// </summary>
    private static bool IsSafeLocalReturnUrl(string? returnUrl) =>
        !string.IsNullOrWhiteSpace(returnUrl)
        && returnUrl.StartsWith('/')
        && !returnUrl.StartsWith("//", StringComparison.Ordinal)
        && !returnUrl.StartsWith("/\\", StringComparison.Ordinal);
}
