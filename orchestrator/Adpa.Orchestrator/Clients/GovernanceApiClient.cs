using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Adpa.Orchestrator.Models.Exceptions;

namespace Adpa.Orchestrator.Clients;

public sealed class GovernanceAuthorityToken
{
    public Guid Id { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string RitualType { get; set; } = string.Empty;
}

public sealed class GovernanceValidationResult
{
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public GovernanceAuthorityToken? AuthorityToken { get; set; }
}

public class ValidationPetition
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public object Payload { get; set; } = new();
}

public class GovernanceApiClient(HttpClient http)
{
    public async Task<GovernanceValidationResult> ValidateStateTransitionAsync(ValidationPetition petition, CancellationToken cancellationToken = default)
    {
        var response = await http.PostAsJsonAsync("/Validation/validate", petition, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<GovernanceValidationResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            return result ?? new GovernanceValidationResult
            {
                Status = "valid",
                Message = "State transition approved."
            };
        }

        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            var raw = await response.Content.ReadAsStringAsync(cancellationToken);
            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;
                var err = root.TryGetProperty("error", out var e) ? e.GetString() ?? raw : raw;
                var rule = root.TryGetProperty("rule", out var r) ? r.GetString() ?? "Unknown" : "Unknown";
                throw new RpasLawViolationException(rule, err ?? raw);
            }
            catch (JsonException)
            {
                throw new RpasLawViolationException("GovernanceConflict", raw);
            }
        }

        response.EnsureSuccessStatusCode();
        return new GovernanceValidationResult();
    }
}
