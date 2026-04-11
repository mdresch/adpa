using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public class CostItem
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public double? Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";

    [JsonPropertyName("is_placeholder")]
    public bool IsPlaceholder { get; set; }
}

public class BusinessCase
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("ideation_summary_id")]
    public string IdeationSummaryId { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public int Version { get; set; } = 1;

    [JsonPropertyName("executive_summary")]
    public string ExecutiveSummary { get; set; } = string.Empty;

    [JsonPropertyName("problem_statement")]
    public string ProblemStatement { get; set; } = string.Empty;

    [JsonPropertyName("proposed_solution")]
    public string ProposedSolution { get; set; } = string.Empty;

    [JsonPropertyName("expected_benefits")]
    public List<string> ExpectedBenefits { get; set; } = new();

    [JsonPropertyName("estimated_costs")]
    public List<CostItem> EstimatedCosts { get; set; } = new();

    [JsonPropertyName("key_risks")]
    public List<string> KeyRisks { get; set; } = new();

    [JsonPropertyName("core_requirements")]
    public List<string> CoreRequirements { get; set; } = new();

    [JsonPropertyName("recommendation")]
    public string Recommendation { get; set; } = string.Empty;

    [JsonPropertyName("placeholders")]
    public List<string> Placeholders { get; set; } = new();

    [JsonPropertyName("approval_status")]
    public string ApprovalStatus { get; set; } = "PENDING";

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
