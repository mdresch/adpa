// ============================================================================
// RPAS-CM CP7 Shadow Enforcement Service
// ============================================================================
// Phase: 2 (Shadow Evaluation)
// Mode: Pre-Authoritative Law Evaluation
// Blocking: NO — violations logged but not enforced
// ============================================================================

using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace RPAS.Orchestrator.DirectoryBoundary;

/// <summary>
/// Shadow enforcement service for CP7 Law Hardening Phase 2.
/// 
/// This service runs CP7 validation in parallel with normal execution,
/// logging violations WITHOUT blocking. This allows evidence collection
/// and false positive detection before hard enforcement is enabled.
/// 
/// CRITICAL: This service must NEVER block execution in shadow mode.
/// </summary>
public class ShadowEnforcementService
{
    private readonly DirectoryBoundaryValidator _validator;
    private readonly DirectoryManifest _manifest;
    private readonly IShadowEvaluationLogger _shadowLogger;
    private readonly ILogger<ShadowEnforcementService> _logger;
    private readonly ShadowEvaluationMetrics _metrics;

    public ShadowEnforcementService(
        DirectoryManifest manifest,
        string projectRoot,
        IShadowEvaluationLogger shadowLogger,
        ILogger<ShadowEnforcementService> logger)
    {
        _manifest = manifest;
        _shadowLogger = shadowLogger;
        _logger = logger;
        _validator = new DirectoryBoundaryValidator(manifest, projectRoot, new MsLoggerAdapter(logger));
        _metrics = new ShadowEvaluationMetrics();
    }

    /// <summary>
    /// Current enforcement mode.
    /// In shadow mode, violations are logged but NOT enforced.
    /// In enforcement mode, violations are blocked.
    /// </summary>
    public EnforcementMode Mode { get; private set; } = EnforcementMode.Shadow;

    /// <summary>
    /// Evaluates a file operation in shadow mode.
    /// ALWAYS returns success (does not block).
    /// Logs the result for evidence collection.
    /// </summary>
    public ShadowEvaluationResult Evaluate(
        string filePath,
        string taskClass,
        FileOperation operation,
        string agentId,
        string requestId)
    {
        var result = _validator.Validate(filePath, taskClass, operation);
        var timestamp = DateTime.UtcNow;

        // Create shadow evaluation record
        var record = new ShadowEvaluationRecord
        {
            RequestId = requestId,
            Timestamp = timestamp,
            FilePath = filePath,
            TaskClass = taskClass,
            Operation = operation,
            AgentId = agentId,
            WouldBlock = !result.IsValid,
            ViolationCode = result.ViolationCode,
            Reason = result.RejectionReason,
            SuggestedAction = result.SuggestedAction,
            MatchedDirectory = result.MatchedDirectory?.Path,
            CsrEpoch = _manifest.CsrEpoch
        };

        // Update metrics
        _metrics.RecordEvaluation(record);

        // Log to shadow evaluation log
        _shadowLogger.LogEvaluation(record);

        // Log to console with appropriate level
        if (result.IsValid)
        {
            _logger.LogInformation(
                "[SHADOW] CP7 PASS | Request: {RequestId} | Path: {Path} | Task: {Task}",
                requestId, filePath, taskClass);
        }
        else
        {
            _logger.LogWarning(
                "[SHADOW] CP7 WOULD BLOCK | Request: {RequestId} | Path: {Path} | Task: {Task} | Code: {Code} | Reason: {Reason}",
                requestId, filePath, taskClass, result.ViolationCode, result.RejectionReason);
        }

        // CRITICAL: In shadow mode, ALWAYS return success
        // The blocking happens in Phase 5, not Phase 2
        return new ShadowEvaluationResult
        {
            Record = record,
            ShouldProceed = true, // Always true in shadow mode
            Mode = Mode,
            Message = Mode == EnforcementMode.Shadow
                ? "Shadow evaluation complete. Execution proceeds normally."
                : "Enforcement mode active. See enforcement service."
        };
    }

    /// <summary>
    /// Batch evaluation for multiple file operations.
    /// </summary>
    public ShadowEvaluationResult EvaluateBatch(
        IEnumerable<FileOperationRequest> requests,
        string agentId,
        string requestId)
    {
        var requestList = requests.ToList();
        var records = new List<ShadowEvaluationRecord>();

        foreach (var req in requestList)
        {
            var result = Evaluate(req.FilePath, req.TaskClass, req.Operation, agentId, requestId);
            records.Add(result.Record);
        }

        var wouldBlockAny = records.Any(r => r.WouldBlock);

        return new ShadowEvaluationResult
        {
            Records = records,
            ShouldProceed = true, // Always true in shadow mode
            Mode = Mode,
            Message = wouldBlockAny
                ? "Shadow evaluation complete. Some operations would be blocked in enforcement mode."
                : "Shadow evaluation complete. All operations would pass."
        };
    }

    /// <summary>
    /// Gets current metrics for the evaluation period.
    /// </summary>
    public ShadowEvaluationMetrics GetMetrics()
    {
        return _metrics;
    }

    /// <summary>
    /// Generates a daily report for evidence collection.
    /// </summary>
    public DailyReport GenerateDailyReport(DateTime date)
    {
        var dayRecords = _shadowLogger.GetRecordsForDate(date);
        var totalRequests = dayRecords.Count;
        var blockedRequests = dayRecords.Count(r => r.WouldBlock);
        var passedRequests = totalRequests - blockedRequests;

        var violationsByCode = dayRecords
            .Where(r => r.WouldBlock)
            .GroupBy(r => r.ViolationCode ?? "UNKNOWN")
            .ToDictionary(g => g.Key, g => g.Count());

        var violationsByPath = dayRecords
            .Where(r => r.WouldBlock)
            .GroupBy(r => r.FilePath)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .ToDictionary(g => g.Key, g => g.Count());

        var violationsByExtension = dayRecords
            .Where(r => r.WouldBlock)
            .GroupBy(r => Path.GetExtension(r.FilePath))
            .OrderByDescending(g => g.Count())
            .ToDictionary(g => g.Key, g => g.Count());

        var violationsByTaskClass = dayRecords
            .Where(r => r.WouldBlock)
            .GroupBy(r => r.TaskClass)
            .ToDictionary(g => g.Key, g => g.Count());

        return new DailyReport
        {
            Date = date,
            Phase = 2,
            PhaseName = "Shadow Evaluation",
            TotalRequests = totalRequests,
            BlockedRequests = blockedRequests,
            PassedRequests = passedRequests,
            BlockPercentage = totalRequests > 0 ? (double)blockedRequests / totalRequests * 100 : 0,
            ViolationsByCode = violationsByCode,
            TopFlaggedPaths = violationsByPath,
            TopFlaggedExtensions = violationsByExtension,
            ViolationsByTaskClass = violationsByTaskClass,
            FalsePositives = _metrics.GetFalsePositivesForDate(date),
            Recommendations = GenerateRecommendations(violationsByCode, violationsByPath)
        };
    }

    /// <summary>
    /// Transitions to enforcement mode (Phase 5).
    /// This should only be called after all graduation criteria are met.
    /// </summary>
    public void TransitionToEnforcementMode()
    {
        _logger.LogWarning(
            "CP7 transitioning from SHADOW to ENFORCEMENT mode. " +
            "This should only happen after all graduation criteria are met.");

        Mode = EnforcementMode.Enforcement;
    }

    /// <summary>
    /// Rolls back to shadow mode (emergency procedure).
    /// </summary>
    public void RollbackToShadowMode(string reason)
    {
        _logger.LogError(
            "CP7 EMERGENCY ROLLBACK to SHADOW mode. Reason: {Reason}",
            reason);

        Mode = EnforcementMode.Shadow;

        // Log incident
        _shadowLogger.LogIncident(new ShadowIncidentRecord
        {
            Timestamp = DateTime.UtcNow,
            Type = "ROLLBACK",
            Reason = reason,
            PreviousMode = EnforcementMode.Enforcement,
            NewMode = EnforcementMode.Shadow
        });
    }

    private List<string> GenerateRecommendations(
        Dictionary<string, int> violationsByCode,
        Dictionary<string, int> violationsByPath)
    {
        var recommendations = new List<string>();

        if (violationsByCode.TryGetValue("CP7-UNAPPROVED-PATH", out var unapprovedCount) && unapprovedCount > 10)
        {
            recommendations.Add("Consider adding frequently accessed paths to approved_directories in manifest.");
        }

        if (violationsByCode.TryGetValue("CP7-INVALID-EXTENSION", out var extCount) && extCount > 5)
        {
            recommendations.Add("Review allowed_extensions for directories with frequent extension violations.");
        }

        if (violationsByPath.Any())
        {
            var topPath = violationsByPath.First();
            recommendations.Add($"Most flagged path: {topPath.Key} ({topPath.Value} violations). Review if this should be approved.");
        }

        return recommendations;
    }
}

/// <summary>
/// Enforcement mode for CP7.
/// </summary>
public enum EnforcementMode
{
    /// <summary>
    /// Phase 2: Violations logged but not enforced.
    /// </summary>
    Shadow,

    /// <summary>
    /// Phase 5: Violations blocked.
    /// </summary>
    Enforcement
}

/// <summary>
/// Result of a shadow evaluation.
/// </summary>
public class ShadowEvaluationResult
{
    public ShadowEvaluationRecord Record { get; set; } = new();
    public List<ShadowEvaluationRecord> Records { get; set; } = new();
    public bool ShouldProceed { get; set; }
    public EnforcementMode Mode { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Record of a single shadow evaluation.
/// </summary>
public class ShadowEvaluationRecord
{
    public string RequestId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string TaskClass { get; set; } = string.Empty;
    public FileOperation Operation { get; set; }
    public string AgentId { get; set; } = string.Empty;
    public bool WouldBlock { get; set; }
    public string? ViolationCode { get; set; }
    public string? Reason { get; set; }
    public string? SuggestedAction { get; set; }
    public string? MatchedDirectory { get; set; }
    public string CsrEpoch { get; set; } = string.Empty;
}

/// <summary>
/// Metrics for shadow evaluation.
/// </summary>
public class ShadowEvaluationMetrics
{
    private readonly List<ShadowEvaluationRecord> _records = new();
    private readonly List<FalsePositiveRecord> _falsePositives = new();

    public void RecordEvaluation(ShadowEvaluationRecord record)
    {
        lock (_records)
        {
            _records.Add(record);
        }
    }

    public void RecordFalsePositive(FalsePositiveRecord record)
    {
        lock (_falsePositives)
        {
            _falsePositives.Add(record);
        }
    }

    public int TotalRequests => _records.Count;
    public int BlockedRequests => _records.Count(r => r.WouldBlock);
    public int PassedRequests => _records.Count(r => !r.WouldBlock);
    public double BlockPercentage => TotalRequests > 0 ? (double)BlockedRequests / TotalRequests * 100 : 0;
    public int FalsePositiveCount => _falsePositives.Count;
    public double FalsePositiveRate => TotalRequests > 0 ? (double)FalsePositiveCount / TotalRequests * 100 : 0;

    public List<FalsePositiveRecord> GetFalsePositivesForDate(DateTime date)
    {
        return _falsePositives
            .Where(fp => fp.ReportedAt.Date == date.Date)
            .ToList();
    }
}

/// <summary>
/// Record of a reported false positive.
/// </summary>
public class FalsePositiveRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FilePath { get; set; } = string.Empty;
    public string ViolationCode { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime ReportedAt { get; set; }
    public string Status { get; set; } = "Investigating";
}

/// <summary>
/// Daily report for evidence collection.
/// </summary>
public class DailyReport
{
    public DateTime Date { get; set; }
    public int Phase { get; set; }
    public string PhaseName { get; set; } = string.Empty;
    public int TotalRequests { get; set; }
    public int BlockedRequests { get; set; }
    public int PassedRequests { get; set; }
    public double BlockPercentage { get; set; }
    public Dictionary<string, int> ViolationsByCode { get; set; } = new();
    public Dictionary<string, int> TopFlaggedPaths { get; set; } = new();
    public Dictionary<string, int> TopFlaggedExtensions { get; set; } = new();
    public Dictionary<string, int> ViolationsByTaskClass { get; set; } = new();
    public List<FalsePositiveRecord> FalsePositives { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// Record of an incident (rollback, etc.).
/// </summary>
public class ShadowIncidentRecord
{
    public DateTime Timestamp { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public EnforcementMode PreviousMode { get; set; }
    public EnforcementMode NewMode { get; set; }
}

/// <summary>
/// Logger interface for shadow evaluation records.
/// </summary>
public interface IShadowEvaluationLogger
{
    void LogEvaluation(ShadowEvaluationRecord record);
    void LogIncident(ShadowIncidentRecord incident);
    List<ShadowEvaluationRecord> GetRecordsForDate(DateTime date);
}