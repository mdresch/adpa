using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public class Conflict
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("source_a_id")]
    public string SourceAId { get; set; } = string.Empty;

    [JsonPropertyName("value_a")]
    public string ValueA { get; set; } = string.Empty;

    [JsonPropertyName("source_b_id")]
    public string SourceBId { get; set; } = string.Empty;

    [JsonPropertyName("value_b")]
    public string ValueB { get; set; } = string.Empty;

    [JsonPropertyName("resolved")]
    public bool Resolved { get; set; }

    [JsonPropertyName("resolution")]
    public string? Resolution { get; set; }
}

public class IdeationSummary
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("session_id")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("problem_statement")]
    public string ProblemStatement { get; set; } = string.Empty;

    [JsonPropertyName("proposed_solution")]
    public string ProposedSolution { get; set; } = string.Empty;

    [JsonPropertyName("key_goals")]
    public List<string> KeyGoals { get; set; } = new();

    [JsonPropertyName("assumptions")]
    public List<string> Assumptions { get; set; } = new();

    [JsonPropertyName("constraints")]
    public List<string> Constraints { get; set; } = new();

    [JsonPropertyName("conflicts")]
    public List<Conflict> Conflicts { get; set; } = new();

    [JsonPropertyName("approval_status")]
    public string ApprovalStatus { get; set; } = "PENDING";

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
