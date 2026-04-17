// ============================================================================
// RPAS-CM Directory Boundary Enforcement - Validator Service
// ============================================================================
// AMD: AMD-2026-04-16-0001-Directory-Boundary
// Task Class: TCL-SEC (Security) + TCL-GOV (Governance)
// Guardrails: G1 (Authority), G4 (Determinism), CP7 (Directory Boundary)
// ============================================================================

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace RPAS.Orchestrator.DirectoryBoundary;

/// <summary>
/// Validates file operations against the approved directory manifest.
/// This is the technical enforcement layer that makes governance violations
/// impossible rather than just policy violations.
/// 
/// Integration Point: Called at AEV Gate 1 before any file operation.
/// </summary>
public class DirectoryBoundaryValidator
{
    private readonly DirectoryManifest _manifest;
    private readonly string _projectRoot;
    private readonly ILogger? _logger;

    public DirectoryBoundaryValidator(DirectoryManifest manifest, string projectRoot, ILogger? logger = null)
    {
        _manifest = manifest ?? throw new ArgumentNullException(nameof(manifest));
        _projectRoot = NormalizePath(projectRoot);
        _logger = logger;
    }

    /// <summary>
    /// Validates if a file operation is permitted for the given task class.
    /// Called at AEV Gate 1 - Mechanical Integrity check.
    /// </summary>
    /// <param name="filePath">Relative or absolute path to the file</param>
    /// <param name="taskClass">The TCL task class attempting the operation</param>
    /// <param name="operation">Type of operation: create, modify, delete</param>
    /// <returns>Validation result with approval or rejection details</returns>
    public BoundaryValidationResult Validate(
        string filePath, 
        string taskClass, 
        FileOperation operation = FileOperation.Modify)
    {
        var normalizedPath = NormalizePath(filePath);
        var absolutePath = Path.IsPathRooted(normalizedPath) 
            ? normalizedPath 
            : Path.Combine(_projectRoot, normalizedPath);

        var relativePath = Path.GetRelativePath(_projectRoot, absolutePath);

        // Step 1: Check global blocked extensions
        var extension = Path.GetExtension(absolutePath).ToLowerInvariant();
        if (_manifest.GlobalBlockedExtensions.Contains(extension))
        {
            return new BoundaryValidationResult
            {
                IsValid = false,
                RejectionReason = $"File extension '{extension}' is globally blocked. Security risk detected.",
                ViolationCode = "CP7-GLOBAL-BLOCK",
                SuggestedAction = "Remove the blocked file extension or request governance exception."
            };
        }

        // Step 2: Check blocked paths (blacklist)
        foreach (var blockedPath in _manifest.BlockedPaths)
        {
            if (relativePath.StartsWith(NormalizePath(blockedPath), StringComparison.OrdinalIgnoreCase))
            {
                return new BoundaryValidationResult
                {
                    IsValid = false,
                    RejectionReason = $"Path '{relativePath}' is in blocked directory '{blockedPath}'.",
                    ViolationCode = "CP7-BLOCKED-PATH",
                    SuggestedAction = "Choose an approved directory from the manifest."
                };
            }
        }

        // Step 3: Find matching approved directory
        ApprovedDirectory? matchedDir = null;
        foreach (var dir in _manifest.ApprovedDirectories.OrderByDescending(d => d.Path.Length))
        {
            var normalizedDirPath = NormalizePath(dir.Path);
            var isInDirectory = dir.Recursive
                ? relativePath.StartsWith(normalizedDirPath, StringComparison.OrdinalIgnoreCase)
                : string.Equals(Path.GetDirectoryName(relativePath)?.Replace("\\", "/"), normalizedDirPath.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);

            if (isInDirectory)
            {
                matchedDir = dir;
                break;
            }
        }

        // Step 4: Reject if no approved directory matches
        if (matchedDir == null)
        {
            var approvedList = string.Join(", ", _manifest.ApprovedDirectories.Select(d => d.Path));
            return new BoundaryValidationResult
            {
                IsValid = false,
                RejectionReason = $"Path '{relativePath}' is not in any approved directory. " +
                                  $"Approved directories: {approvedList}",
                ViolationCode = "CP7-UNAPPROVED-PATH",
                SuggestedAction = "Move the file to an approved directory or request manifest amendment."
            };
        }

        // Step 5: Validate extension
        if (matchedDir.AllowedExtensions.Count > 0 && !matchedDir.AllowedExtensions.Contains(extension))
        {
            var allowedExts = string.Join(", ", matchedDir.AllowedExtensions);
            return new BoundaryValidationResult
            {
                IsValid = false,
                RejectionReason = $"Extension '{extension}' not allowed in directory '{matchedDir.Path}'. " +
                                  $"Allowed: {allowedExts}",
                ViolationCode = "CP7-INVALID-EXTENSION",
                MatchedDirectory = matchedDir,
                SuggestedAction = "Use an allowed file extension or request manifest amendment."
            };
        }

        // Step 6: Validate task class
        if (!string.IsNullOrEmpty(taskClass) && matchedDir.AllowedTaskClasses.Count > 0)
        {
            if (!matchedDir.AllowedTaskClasses.Contains(taskClass, StringComparer.OrdinalIgnoreCase))
            {
                var allowedClasses = string.Join(", ", matchedDir.AllowedTaskClasses);
                return new BoundaryValidationResult
                {
                    IsValid = false,
                    RejectionReason = $"Task class '{taskClass}' not allowed for directory '{matchedDir.Path}'. " +
                                      $"Allowed: {allowedClasses}",
                    ViolationCode = "CP7-INVALID-TASK-CLASS",
                    MatchedDirectory = matchedDir,
                    SuggestedAction = "Use an appropriate task class or request manifest amendment."
                };
            }
        }

        // Step 7: Check if human approval required
        if (matchedDir.RequiresHumanApproval)
        {
            _logger?.LogWarning(
                "Directory '{Path}' requires human approval. Task class: {TaskClass}",
                matchedDir.Path, taskClass);
            // Note: This doesn't reject, but flags for HIL integration
        }

        // All checks passed
        LogValidation(relativePath, taskClass, operation, matchedDir);

        return new BoundaryValidationResult
        {
            IsValid = true,
            MatchedDirectory = matchedDir
        };
    }

    /// <summary>
    /// Validates multiple file paths in a batch operation.
    /// Returns the first failure or success if all pass.
    /// </summary>
    public BoundaryValidationResult ValidateBatch(
        IEnumerable<string> filePaths, 
        string taskClass,
        FileOperation operation = FileOperation.Modify)
    {
        foreach (var path in filePaths)
        {
            var result = Validate(path, taskClass, operation);
            if (!result.IsValid)
            {
                return result;
            }
        }

        return new BoundaryValidationResult { IsValid = true };
    }

    /// <summary>
    /// Generates a deterministic hash for audit logging
    /// </summary>
    public string GenerateOperationHash(string filePath, string taskClass, FileOperation operation)
    {
        var input = $"{filePath}:{taskClass}:{operation}:{_manifest.CsrEpoch}";
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>
    /// Gets all approved directories for a given task class
    /// </summary>
    public IEnumerable<ApprovedDirectory> GetApprovedDirectoriesForTaskClass(string taskClass)
    {
        return _manifest.ApprovedDirectories
            .Where(d => d.AllowedTaskClasses.Contains(taskClass, StringComparer.OrdinalIgnoreCase));
    }

    private static string NormalizePath(string path)
    {
        return path.Replace("\\", "/").TrimEnd('/') + "/";
    }

    private void LogValidation(string relativePath, string taskClass, FileOperation operation, ApprovedDirectory dir)
    {
        var hash = GenerateOperationHash(relativePath, taskClass, operation);
        _logger?.LogInformation(
            "CP7 Validation PASSED | Path: {Path} | Task: {Task} | Op: {Op} | Dir: {Dir} | Hash: {Hash}",
            relativePath, taskClass, operation, dir.Path, hash);
    }
}

/// <summary>
/// File operation types
/// </summary>
public enum FileOperation
{
    Create,
    Modify,
    Delete
}

/// <summary>
/// Simple logger interface for dependency injection
/// </summary>
public interface ILogger
{
    void LogInformation(string message, params object[] args);
    void LogWarning(string message, params object[] args);
    void LogError(string message, params object[] args);
}