using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Clients;

public sealed class CapabilityRegistryEntry
{
    [JsonPropertyName("moduleId")]
    public string ModuleId { get; set; } = string.Empty;

    [JsonPropertyName("portfolioId")]
    public string PortfolioId { get; set; } = string.Empty;

    [JsonPropertyName("platformOperator")]
    public string PlatformOperator { get; set; } = string.Empty;

    [JsonPropertyName("functionalOwnerType")]
    public string FunctionalOwnerType { get; set; } = string.Empty;

    [JsonPropertyName("functionalOwnerDepartment")]
    public string? FunctionalOwnerDepartment { get; set; }

    [JsonPropertyName("controlDefinitionOwnerDepartment")]
    public string? ControlDefinitionOwnerDepartment { get; set; }
}

/// <summary>
/// Reads capability_registry (ADR-005 Phase 1) via the Node backend's read-only lookup
/// endpoint (GET /api/v1/capability-registry/:moduleId/:portfolioId) — the orchestrator's
/// own GovernanceDbContext is a physically separate Postgres database (Aspire-provisioned
/// "governance-ledger") and cannot query that table directly.
/// </summary>
public class CapabilityRegistryClient(HttpClient http)
{
    private sealed class CapabilityRegistryResponse
    {
        [JsonPropertyName("capability")]
        public CapabilityRegistryEntry? Capability { get; set; }
    }

    /// <summary>Returns null when no row exists for (moduleId, portfolioId) — not found is not an error.</summary>
    public async Task<CapabilityRegistryEntry?> GetAsync(
        string moduleId,
        string portfolioId,
        CancellationToken cancellationToken = default)
    {
        var response = await http.GetAsync(
            $"/api/v1/capability-registry/{Uri.EscapeDataString(moduleId)}/{Uri.EscapeDataString(portfolioId)}",
            cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<CapabilityRegistryResponse>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            cancellationToken);

        return payload?.Capability;
    }

    public sealed class PromoteRequest
    {
        [JsonPropertyName("newStatus")]
        public string NewStatus { get; set; } = string.Empty;

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("dracoVerdictId")]
        public string? DracoVerdictId { get; set; }

        [JsonPropertyName("isOverride")]
        public bool IsOverride { get; set; }

        [JsonPropertyName("overrideExpiresAt")]
        public DateTimeOffset? OverrideExpiresAt { get; set; }
    }

    /// <summary>
    /// ADR-005 Phase 6: proxies to Node's authenticated promote endpoint (the first
    /// human-triggerable path to promote_capability_status anywhere in the codebase —
    /// previously only an automated cron job called it). Relays the caller's own
    /// bearer token (set on this specific request, never on the shared HttpClient's
    /// default headers, since that's a DI-scoped instance reused across requests) so
    /// Node's authenticateToken middleware validates the same underlying Firebase
    /// identity this endpoint's own [Authorize] already accepted — a token relay, not
    /// a synthesized credential.
    ///
    /// Returns the raw (status code, JSON body) from Node rather than remodeling its
    /// response shape here — the caller (CapabilityController) passes both straight
    /// through, so there's one place (Node) that defines what a successful/failed
    /// promotion response looks like, not two.
    /// </summary>
    public async Task<(int StatusCode, string Body)> PromoteAsync(
        string moduleId,
        string portfolioId,
        PromoteRequest request,
        string? bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"/api/v1/capability-registry/{Uri.EscapeDataString(moduleId)}/{Uri.EscapeDataString(portfolioId)}/promote")
        {
            Content = JsonContent.Create(request)
        };

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            httpRequest.Headers.TryAddWithoutValidation("Authorization", bearerToken);
        }

        var response = await http.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        return ((int)response.StatusCode, body);
    }
}
