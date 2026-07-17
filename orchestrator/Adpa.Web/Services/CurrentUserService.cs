using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Adpa.Web.Services;

public sealed class CurrentUserProfile
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("role")] public string Role { get; set; } = string.Empty;
}

public sealed class CurrentUserDepartmentMembership
{
    [JsonPropertyName("portfolioId")] public string PortfolioId { get; set; } = string.Empty;
    [JsonPropertyName("department")] public string Department { get; set; } = string.Empty;
    [JsonPropertyName("departmentRole")] public string DepartmentRole { get; set; } = string.Empty;
}

/// <summary>Resolved profile for the signed-in caller. A lookup failure resolves to an
/// empty instance (no user, no departments) rather than throwing -- see CurrentUserService's
/// own fail-closed reasoning: an unresolved profile must never be treated as broader access
/// than a resolved-but-empty one.</summary>
public sealed class ResolvedCurrentUser
{
    public CurrentUserProfile? User { get; init; }
    public IReadOnlyList<CurrentUserDepartmentMembership> Departments { get; init; } = Array.Empty<CurrentUserDepartmentMembership>();

    public bool IsAdmin =>
        string.Equals(User?.Role, "admin", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(User?.Role, "super_admin", StringComparison.OrdinalIgnoreCase);

    public bool IsActiveMember(string portfolioId, string department) =>
        Departments.Any(d =>
            string.Equals(d.PortfolioId, portfolioId, StringComparison.Ordinal) &&
            string.Equals(d.Department, department, StringComparison.OrdinalIgnoreCase));
}

/// <summary>
/// ADR-012 PR1: scoped (per-circuit) resolution of the signed-in caller's role and active
/// department memberships, via Adpa.Orchestrator's CurrentUserController -> Node's
/// GET /api/v1/auth/me. Cached for the lifetime of the DI scope (one Blazor Server circuit)
/// so pages consuming this (Capabilities.razor/PR4, the request forms/PR5, Approvals.razor)
/// don't each trigger their own round trip. Uses the same "api" HttpClient every other page
/// already injects -- FirebaseBearerTokenHandler attaches the bearer token automatically.
/// </summary>
public sealed class CurrentUserService(IHttpClientFactory httpClientFactory, ILogger<CurrentUserService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly SemaphoreSlim _lock = new(1, 1);
    private ResolvedCurrentUser? _cached;

    private sealed class MeResponse
    {
        [JsonPropertyName("user")] public CurrentUserProfile? User { get; set; }
        [JsonPropertyName("departments")] public List<CurrentUserDepartmentMembership>? Departments { get; set; }
    }

    /// <summary>
    /// Double-checked locking: a Blazor Server circuit can have multiple components call
    /// this concurrently on first render (e.g. a page and its nested cards all gating on
    /// the same profile). Without the lock, each would race its own HTTP call and the
    /// last one to finish would silently win, rather than every caller sharing one
    /// resolved (or one in-flight) result.
    /// </summary>
    public async Task<ResolvedCurrentUser> GetAsync(CancellationToken cancellationToken = default)
    {
        if (_cached is not null)
        {
            return _cached;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cached is not null)
            {
                return _cached;
            }

            var client = httpClientFactory.CreateClient("api");
            try
            {
                var response = await client.GetAsync("api/CurrentUser/me", cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    logger.LogWarning("Current-user profile lookup failed with {StatusCode}", (int)response.StatusCode);
                    _cached = new ResolvedCurrentUser();
                    return _cached;
                }

                var body = await response.Content.ReadFromJsonAsync<MeResponse>(JsonOptions, cancellationToken);
                _cached = new ResolvedCurrentUser
                {
                    User = body?.User,
                    Departments = body?.Departments ?? new List<CurrentUserDepartmentMembership>()
                };
            }
            catch (Exception ex)
            {
                // Fail closed: a relay/network failure resolves to "no memberships, not an
                // admin", the same posture CapabilityController's Relay/RelayList already take
                // on their own failures (502, not a silently-broader default).
                logger.LogError(ex, "Current-user profile lookup threw");
                _cached = new ResolvedCurrentUser();
            }

            return _cached;
        }
        finally
        {
            _lock.Release();
        }
    }
}
