using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Adpa.Orchestrator.Models.Exceptions;

namespace Adpa.Orchestrator.Clients;

public class ValidationPetition
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public object Payload { get; set; } = new();
}

public class GovernanceApiClient(HttpClient http)
{
    public async Task ValidateStateTransitionAsync(ValidationPetition petition, CancellationToken cancellationToken = default)
    {
        var response = await http.PostAsJsonAsync("/Validation/validate", petition, cancellationToken);

        if (response.IsSuccessStatusCode)
            return;

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
    }
}
