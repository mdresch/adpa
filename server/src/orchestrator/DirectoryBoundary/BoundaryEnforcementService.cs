// ============================================================================
// RPAS-CM Directory Boundary Enforcement - Enforcement Service
// ============================================================================
// AMD: AMD-2026-04-16-0001-Directory-Boundary
// Task Class: TCL-SEC (Security) + TCL-GOV (Governance)
// Guardrails: G1 (Authority), G4 (Determinism), CP7 (Directory Boundary)
// ============================================================================
// This service integrates with the file system to enforce directory boundaries
// at the technical level. It is called by the Orchestrator before any
// file operation is permitted.
// ============================================================================

using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace RPAS.Orchestrator.DirectoryBoundary;

/// <summary>
/// Main enforcement service that intercepts file operations and validates
/// them against the directory manifest. This is the technical enforcement
/// layer that makes governance violations impossible.
/// 
/// Integration Points:
/// - AEV Gate 1 (Mechanical Integrity)
/// - RPAS-PRE (Agent Preflight Ritual)
/// - DRACO Review Board
/// </summary>
public class BoundaryEnforcementService
{
    private readonly DirectoryBoundaryValidator _validator;
    private readonly DirectoryManifest _manifest;
    private readonly IBoundaryAuditLogger _auditLogger;
    private readonly ILogger<BoundaryEnforcementService> _logger;
    private readonly string _manifestPath;

    public BoundaryEnforcementService(
        string manifestPath,
        string projectRoot,
        IBoundaryAuditLogger auditLogger,
        ILogger<BoundaryEnforcementService> logger)
    {
        _manifestPath = manifestPath;
        _auditLogger = auditLogger;
        _logger = logger;

        _manifest = LoadManifest(manifestPath);
        _validator = new DirectoryBoundaryValidator(_manifest, projectRoot, new MsLoggerAdapter(logger));
    }

    /// <summary>
    /// Gate 1 Entry Point: Validates a file operation before execution.
    /// Returns a token that must be presented at commit time.
    /// </summary>
    /// <param name="filePath">Target file path</param>
    /// <param name="taskClass">TCL task classification</param>
    /// <param name="operation">Type of file operation</param>
    /// <param name="agentId">ID of the agent requesting the operation</param>
    /// <returns>Authorization token or rejection</returns>
    public BoundaryAuthorizationToken? RequestAuthorization(
        string filePath,
        string taskClass,
        FileOperation operation,
        string agentId)
    {
        var result = _validator.Validate(filePath, taskClass, operation);

        if (!result.IsValid)
        {
            _logger.LogError(
                "CP7 REJECTION | Path: {Path} | Task: {Task} | Op: {Op} | Code: {Code} | Reason: {Reason}",
                filePath, taskClass, operation, result.ViolationCode, result.RejectionReason);

            // Log to audit trail
            _auditLogger.LogRejection(new BoundaryRejectionEvent
            {
                Timestamp = DateTime.UtcNow,
                FilePath = filePath,
                TaskClass = taskClass,
                Operation = operation,
                AgentId = agentId,
                ViolationCode = result.ViolationCode ?? "UNKNOWN",
                RejectionReason = result.RejectionReason ?? "Unknown reason",
                SuggestedAction = result.SuggestedAction ?? string.Empty
            });

            return null;
        }

        // Generate authorization token
        var token = new BoundaryAuthorizationToken
        {
            TokenId = Guid.NewGuid().ToString(),
            FilePath = filePath,
            TaskClass = taskClass,
            Operation = operation,
            AgentId = agentId,
            AuthorizedDirectory = result.MatchedDirectory?.Path ?? "unknown",
            CsrEpoch = _manifest.CsrEpoch,
            IssuedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            Hash = _validator.GenerateOperationHash(filePath, taskClass, operation)
        };

        _logger.LogInformation(
            "CP7 AUTHORIZED | Token: {TokenId} | Path: {Path} | Task: {Task} | Dir: {Dir}",
            token.TokenId, filePath, taskClass, token.AuthorizedDirectory);

        return token;
    }

    /// <summary>
    /// Validates a batch of file operations for a single atomic change.
    /// All must pass or none are authorized.
    /// </summary>
    public BatchAuthorizationToken? RequestBatchAuthorization(
        IEnumerable<FileOperationRequest> requests,
        string agentId)
    {
        var requestList = requests.ToList();
        var tokens = new List<BoundaryAuthorizationToken>();

        foreach (var req in requestList)
        {
            var token = RequestAuthorization(req.FilePath, req.TaskClass, req.Operation, agentId);
            if (token == null)
            {
                // Rollback all previously authorized tokens
                _logger.LogWarning(
                    "CP7 BATCH REJECTED | Failed at: {Path} | Rolling back {Count} authorizations",
                    req.FilePath, tokens.Count);

                return null;
            }
            tokens.Add(token);
        }

        return new BatchAuthorizationToken
        {
            BatchId = Guid.NewGuid().ToString(),
            Tokens = tokens,
            AgentId = agentId,
            IssuedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
    }

    /// <summary>
    /// Verifies an authorization token is still valid at commit time.
    /// Called at AEV Gate 4 (Commit Certification).
    /// </summary>
    public bool VerifyToken(BoundaryAuthorizationToken token)
    {
        if (token.ExpiresAt < DateTime.UtcNow)
        {
            _logger.LogError("CP7 TOKEN EXPIRED | Token: {TokenId}", token.TokenId);
            return false;
        }

        // Re-validate to ensure manifest hasn't changed
        var result = _validator.Validate(token.FilePath, token.TaskClass, token.Operation);
        if (!result.IsValid)
        {
            _logger.LogError(
                "CP7 TOKEN INVALIDATED | Token: {TokenId} | Reason: {Reason}",
                token.TokenId, result.RejectionReason);
            return false;
        }

        // Verify hash matches (determinism check)
        var currentHash = _validator.GenerateOperationHash(token.FilePath, token.TaskClass, token.Operation);
        if (currentHash != token.Hash)
        {
            _logger.LogError(
                "CP7 HASH MISMATCH | Token: {TokenId} | Expected: {Expected} | Actual: {Actual}",
                token.TokenId, token.Hash, currentHash);
            return false;
        }

        return true;
    }

    /// <summary>
    /// Reloads the manifest from disk (for hot-reload capability)
    /// </summary>
    public void ReloadManifest()
    {
        var newManifest = LoadManifest(_manifestPath);
        var newValidator = new DirectoryBoundaryValidator(
            newManifest, 
            Path.GetDirectoryName(_manifestPath) ?? ".", 
            new MsLoggerAdapter(_logger));

        _logger.LogInformation(
            "CP7 MANIFEST RELOADED | Version: {Version} | CSR: {Csr} | Directories: {Count}",
            newManifest.Version, newManifest.CsrEpoch, newManifest.ApprovedDirectories.Count);

        // Thread-safe replacement
        System.Threading.Interlocked.Exchange(ref _manifest, newManifest);
        System.Threading.Interlocked.Exchange(ref _validator, newValidator);
    }

    /// <summary>
    /// Gets the current manifest for inspection
    /// </summary>
    public DirectoryManifest GetManifest() => _manifest;

    /// <summary>
    /// Gets all approved directories for a task class
    /// </summary>
    public IEnumerable<string> GetApprovedPathsForTaskClass(string taskClass)
    {
        return _validator.GetApprovedDirectoriesForTaskClass(taskClass)
            .Select(d => d.Path);
    }

    private static DirectoryManifest LoadManifest(string path)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Directory boundary manifest not found at: {path}. " +
                "Create rpas-manifest.yaml to enable CP7 enforcement.");
        }

        var json = File.ReadAllText(path);
        
        // Support both JSON and YAML (simple conversion)
        if (path.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".yml", StringComparison.OrdinalIgnoreCase))
        {
            json = ConvertYamlToJson(json);
        }

        return JsonSerializer.Deserialize<DirectoryManifest>(json)
            ?? throw new InvalidOperationException("Failed to parse directory manifest");
    }

    private static string ConvertYamlToJson(string yaml)
    {
        // Simple YAML to JSON conversion for basic manifests
        // In production, use a proper YAML library like YamlDotNet
        // This is a placeholder for the conversion logic
        return yaml; // Placeholder - implement proper conversion
    }
}

/// <summary>
/// Authorization token issued for a single file operation
/// </summary>
public class BoundaryAuthorizationToken
{
    public string TokenId { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string TaskClass { get; set; } = string.Empty;
    public FileOperation Operation { get; set; }
    public string AgentId { get; set; } = string.Empty;
    public string AuthorizedDirectory { get; set; } = string.Empty;
    public string CsrEpoch { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string Hash { get; set; } = string.Empty;
}

/// <summary>
/// Batch authorization token for multiple file operations
/// </summary>
public class BatchAuthorizationToken
{
    public string BatchId { get; set; } = string.Empty;
    public List<BoundaryAuthorizationToken> Tokens { get; set; } = new();
    public string AgentId { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

/// <summary>
/// Request for a file operation
/// </summary>
public class FileOperationRequest
{
    public string FilePath { get; set; } = string.Empty;
    public string TaskClass { get; set; } = string.Empty;
    public FileOperation Operation { get; set; }
}

/// <summary>
/// Audit logger interface for boundary enforcement events
/// </summary>
public interface IBoundaryAuditLogger
{
    void LogRejection(BoundaryRejectionEvent rejection);
    void LogAuthorization(BoundaryAuthorizationToken token);
}

/// <summary>
/// Rejection event for audit trail
/// </summary>
public class BoundaryRejectionEvent
{
    public DateTime Timestamp { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string TaskClass { get; set; } = string.Empty;
    public FileOperation Operation { get; set; }
    public string AgentId { get; set; } = string.Empty;
    public string ViolationCode { get; set; } = string.Empty;
    public string RejectionReason { get; set; } = string.Empty;
    public string SuggestedAction { get; set; } = string.Empty;
}

/// <summary>
/// Microsoft.Extensions.Logging adapter
/// </summary>
internal class MsLoggerAdapter : ILogger
{
    private readonly ILogger<BoundaryEnforcementService> _logger;

    public MsLoggerAdapter(ILogger<BoundaryEnforcementService> logger)
    {
        _logger = logger;
    }

    public void LogInformation(string message, params object[] args) => _logger.LogInformation(message, args);
    public void LogWarning(string message, params object[] args) => _logger.LogWarning(message, args);
    public void LogError(string message, params object[] args) => _logger.LogError(message, args);
}