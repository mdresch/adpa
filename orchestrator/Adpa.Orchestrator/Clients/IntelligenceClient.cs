using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Adpa.Orchestrator.Models.Rituals;

namespace Adpa.Orchestrator.Clients;

public class IngestionRequest
{
    [JsonPropertyName("filename")]
    public string Filename { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("source_type")]
    public string SourceType { get; set; } = "markdown";
}

public record ResearchAdviceRequest(
    [property: JsonPropertyName("target_id")] string TargetId, 
    [property: JsonPropertyName("ledger")] List<RtmRequirement> Ledger);

public record MsrfValidationRequest(
    [property: JsonPropertyName("project_id")] string ProjectId,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("concept")] string Concept);

public class IntelligenceClient(HttpClient httpClient, ILogger<IntelligenceClient> logger)
{
    private static readonly JsonSerializerOptions _snakeCaseOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = false
    };

    public async Task<IdeationSummary?> IngestIdeationAsync(string filename, string content)
    {
        try
        {
            var request = new IngestionRequest { Filename = filename, Content = content };
            var response = await httpClient.PostAsJsonAsync("/rituals/phase0/ingest", request, _snakeCaseOptions);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<IdeationSummary>(_snakeCaseOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to ingest ideation ritual via intelligence service.");
            throw;
        }
    }

    public async Task<BusinessCase?> GenerateBusinessCaseAsync(IdeationSummary summary)
    {
        try
        {
            var response = await httpClient.PostAsJsonAsync("/rituals/phase0/business-case", summary, _snakeCaseOptions);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<BusinessCase>(_snakeCaseOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate business case ritual via intelligence service.");
            throw;
        }
    }

    public async Task<ResearchAdvice?> GetRtmResearchAdviceAsync(string targetId, List<RtmRequirement> ledger)
    {
        try
        {
            var request = new ResearchAdviceRequest(targetId, ledger);
            var response = await httpClient.PostAsJsonAsync("/rituals/rtm/research-advice", request, _snakeCaseOptions);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<ResearchAdvice>(_snakeCaseOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to consult intelligence service for RTM research advice.");
            throw;
        }
    }

    public async Task<MsrfEvaluation?> ValidateMsrfAsync(string projectId, string title, string concept)
    {
        try
        {
            var request = new MsrfValidationRequest(projectId, title, concept);
            var response = await httpClient.PostAsJsonAsync("/rituals/msrf/validate", request, _snakeCaseOptions);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<MsrfEvaluation>(_snakeCaseOptions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to perform MSRF validation ritual via intelligence service.");
            throw;
        }
    }

    public async Task<bool> CheckHealthAsync()
    {
        try
        {
            // The intelligence service (FastAPI) health endpoint
            var response = await httpClient.GetAsync("/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
