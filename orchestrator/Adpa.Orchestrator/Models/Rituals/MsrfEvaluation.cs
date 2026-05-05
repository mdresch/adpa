using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Rituals;

public enum MsrfPillar
{
    Education,
    Infrastructure,
    Generation,
    Cohesion,
    Accountability,
    Maintenance,
    Dignity,
    Financial_Integrity
}

public enum AntiFraudPatternClass
{
    Class_A_Synthetic_Settlement,
    Class_B_Impersonated_Monetary,
    Class_C_Hyper_Volatility_Gamified,
    Class_D_Unregistered_Algorithmic
}

public class PillarScore
{
    [JsonPropertyName("pillar")]
    public string PillarName { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public double Score { get; set; }

    [JsonPropertyName("findings")]
    public List<string> Findings { get; set; } = new();

    [JsonPropertyName("detected_patterns")]
    public List<string> DetectedPatterns { get; set; } = new();
}

public class MsrfEvaluation
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("project_id")]
    public string ProjectId { get; set; } = string.Empty;

    [JsonPropertyName("overall_compliance_score")]
    public double OverallComplianceScore { get; set; }

    [JsonPropertyName("pillar_scores")]
    public List<PillarScore> PillarScores { get; set; } = new();

    [JsonPropertyName("stability_score")]
    public double StabilityScore { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "BLOCKED"; // BLOCKED, ADVISORY, UNLOCKED

    [JsonPropertyName("remediation_instructions")]
    public List<string> RemediationInstructions { get; set; } = new();

    [JsonPropertyName("is_msrf_validated")]
    public bool IsMsrfValidated { get; set; }

    [JsonPropertyName("evaluated_at")]
    public string EvaluatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}
