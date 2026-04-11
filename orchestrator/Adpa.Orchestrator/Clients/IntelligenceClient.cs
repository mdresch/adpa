using System.Net.Http.Json;
using Adpa.Orchestrator.Models.Rituals;

namespace Adpa.Orchestrator.Clients;

public class IngestionRequest
{
    public string Filename { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string SourceType { get; set; } = "markdown";
}

public record ResearchAdviceRequest(string TargetId, List<RtmRequirement> Ledger);

public record ResearchAdvice(
    string TargetRequirementId,
    string SuggestedDescription,
    string Justification,
    string AmendmentType,
    string AmendmentSubType,
    double ConfidenceScore,
    string AnalysisContext);

public class IntelligenceClient(HttpClient httpClient, ILogger<IntelligenceClient> logger)
{
    public async Task<IdeationSummary?> IngestIdeationAsync(string filename, string content)
    {
        try
        {
            var request = new IngestionRequest { Filename = filename, Content = content };
            var response = await httpClient.PostAsJsonAsync("/rituals/phase0/ingest", request);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<IdeationSummary>();
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
            var response = await httpClient.PostAsJsonAsync("/rituals/phase0/business-case", summary);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<BusinessCase>();
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
            var response = await httpClient.PostAsJsonAsync("/rituals/rtm/research-advice", request);
            
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<ResearchAdvice>();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to consult intelligence service for RTM research advice.");
            throw;
        }
    }
}
