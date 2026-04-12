using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public class IdeationSummary
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("executive_summary")]
    public string ExecutiveSummary { get; set; } = string.Empty;

    [JsonPropertyName("problem_statement")]
    public string ProblemStatement { get; set; } = string.Empty;

    [JsonPropertyName("proposed_solution")]
    public string ProposedSolution { get; set; } = string.Empty;

    [JsonPropertyName("benefit_hypothesis")]
    public string BenefitHypothesis { get; set; } = string.Empty;

    [JsonPropertyName("constraints")]
    public List<string> Constraints { get; set; } = new();

    [JsonPropertyName("strategic_alignment")]
    public string StrategicAlignment { get; set; } = string.Empty;
}
