using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public class RtmRequirement
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("business_case_id")]
    public string BusinessCaseId { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("domain")]
    public string Domain { get; set; } = "UNSPECIFIED"; // e.g., PMBOK, BABOK, Technical

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "MEDIUM";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "PROPOSED";

    [JsonPropertyName("source_version")]
    public int SourceVersion { get; set; } = 1;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("amendment_id")]
    public string? AmendmentId { get; set; }

    [JsonPropertyName("csr_version")]
    public string? CsrVersion { get; set; }

    [JsonPropertyName("executed_at")]
    public DateTimeOffset? ExecutedAt { get; set; }
}
