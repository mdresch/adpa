using System.Text.Json.Serialization;

namespace Adpa.Web.Services;

/// <summary>
/// ADR-009: server-side Firebase sign-in for the Governor Portal (Blazor Server).
/// Calls Firebase's Identity Toolkit REST API directly -- there is no Firebase Admin
/// SDK for .NET, and this deliberately does NOT ship the Firebase client JS SDK to the
/// browser (Blazor Server renders/executes on the server; the SPA client-SDK pattern
/// Node/Next.js uses doesn't apply here). Requires FIREBASE_WEB_API_KEY -- the same
/// public Web API key already used by the Next.js frontend's client SDK
/// (NEXT_PUBLIC_FIREBASE_API_KEY in .env.example), not a service-account secret.
/// </summary>
public sealed class FirebaseAuthService(HttpClient http, IConfiguration configuration, ILogger<FirebaseAuthService> logger)
{
    private string ApiKey => configuration["FIREBASE_WEB_API_KEY"]
        ?? throw new InvalidOperationException("FIREBASE_WEB_API_KEY is not configured; Governor Portal sign-in cannot function.");

    public sealed record SignInResult(bool Success, string? IdToken, string? RefreshToken, string? Uid, string? Email, int ExpiresInSeconds, string? Error);

    private sealed class SignInPasswordRequest
    {
        [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
        [JsonPropertyName("password")] public string Password { get; set; } = string.Empty;
        [JsonPropertyName("returnSecureToken")] public bool ReturnSecureToken { get; set; } = true;
    }

    private sealed class SignInPasswordResponse
    {
        [JsonPropertyName("idToken")] public string? IdToken { get; set; }
        [JsonPropertyName("refreshToken")] public string? RefreshToken { get; set; }
        [JsonPropertyName("localId")] public string? LocalId { get; set; }
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("expiresIn")] public string? ExpiresIn { get; set; }
    }

    private sealed class FirebaseErrorResponse
    {
        [JsonPropertyName("error")] public FirebaseErrorDetail? Error { get; set; }
    }

    private sealed class FirebaseErrorDetail
    {
        [JsonPropertyName("message")] public string Message { get; set; } = "UNKNOWN_ERROR";
    }

    public async Task<SignInResult> SignInWithPasswordAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var response = await http.PostAsJsonAsync(
            $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={Uri.EscapeDataString(ApiKey)}",
            new SignInPasswordRequest { Email = email, Password = password },
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadFromJsonAsync<FirebaseErrorResponse>(cancellationToken: cancellationToken);
            var errorMessage = errorBody?.Error?.Message ?? "SIGN_IN_FAILED";
            logger.LogWarning("Firebase sign-in rejected: {Error}", errorMessage);
            return new SignInResult(false, null, null, null, null, 0, MapFirebaseError(errorMessage));
        }

        var body = await response.Content.ReadFromJsonAsync<SignInPasswordResponse>(cancellationToken: cancellationToken);
        if (body?.IdToken is null || body.RefreshToken is null)
        {
            return new SignInResult(false, null, null, null, null, 0, "Unexpected response from the identity provider.");
        }

        return new SignInResult(true, body.IdToken, body.RefreshToken, body.LocalId, body.Email, int.TryParse(body.ExpiresIn, out var s) ? s : 3600, null);
    }

    private sealed class RefreshTokenResponse
    {
        [JsonPropertyName("id_token")] public string? IdToken { get; set; }
        [JsonPropertyName("refresh_token")] public string? RefreshToken { get; set; }
        [JsonPropertyName("user_id")] public string? UserId { get; set; }
        [JsonPropertyName("expires_in")] public string? ExpiresIn { get; set; }
    }

    /// <summary>
    /// Firebase's token-refresh endpoint is a DIFFERENT host (securetoken.googleapis.com,
    /// not identitytoolkit.googleapis.com) and a different (snake_case, form-encoded)
    /// request/response shape -- these are two distinct Google Identity Platform APIs,
    /// not one endpoint with two verbs.
    /// </summary>
    public async Task<SignInResult> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var response = await http.PostAsync(
            $"https://securetoken.googleapis.com/v1/token?key={Uri.EscapeDataString(ApiKey)}",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken
            }),
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Firebase token refresh failed with status {Status}", response.StatusCode);
            return new SignInResult(false, null, null, null, null, 0, "Session refresh failed; please sign in again.");
        }

        var body = await response.Content.ReadFromJsonAsync<RefreshTokenResponse>(cancellationToken: cancellationToken);
        if (body?.IdToken is null || body.RefreshToken is null)
        {
            return new SignInResult(false, null, null, null, null, 0, "Unexpected response from the identity provider.");
        }

        return new SignInResult(true, body.IdToken, body.RefreshToken, body.UserId, null, int.TryParse(body.ExpiresIn, out var s) ? s : 3600, null);
    }

    /// <summary>Firebase's own error codes are machine-oriented (EMAIL_NOT_FOUND, INVALID_PASSWORD,
    /// INVALID_LOGIN_CREDENTIALS) -- map to one generic message so failed sign-in doesn't
    /// leak which half (email vs password) was wrong.</summary>
    private static string MapFirebaseError(string firebaseCode) => firebaseCode switch
    {
        var c when c.StartsWith("TOO_MANY_ATTEMPTS", StringComparison.Ordinal) =>
            "Too many failed attempts. Please wait a few minutes and try again.",
        _ => "Invalid email or password."
    };
}
