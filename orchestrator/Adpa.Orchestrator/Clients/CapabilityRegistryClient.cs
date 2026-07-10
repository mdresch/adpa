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
}
