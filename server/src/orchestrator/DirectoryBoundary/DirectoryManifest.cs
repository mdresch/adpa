// ============================================================================
// RPAS-CM Directory Boundary Enforcement - Manifest Definition
// ============================================================================
// AMD: AMD-2026-04-16-0001-Directory-Boundary
// Task Class: TCL-SEC (Security) + TCL-GOV (Governance)
// Guardrails: G1 (Authority), G4 (Determinism), CP7 (Directory Boundary)
// ============================================================================

using System.Text.Json.Serialization;

namespace RPAS.Orchestrator.DirectoryBoundary;

/// <summary>
/// Root manifest for approved directory boundaries.
/// This file defines which directories agents are permitted to modify.
/// Any file operation outside these boundaries is rejected at Gate 1.
/// </summary>
public class DirectoryManifest
{
    /// <summary>
    /// Manifest version for schema validation
    /// </summary>
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// CSR epoch this manifest is bound to
    /// </summary>
    [JsonPropertyName("csr_epoch")]
    public string CsrEpoch { get; set; } = "CSR-42";

    /// <summary>
    /// Last modification timestamp (deterministic)
    /// </summary>
    [JsonPropertyName("last_modified")]
    public DateTime LastModified { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// List of approved directory rules
    /// </summary>
    [JsonPropertyName("approved_directories")]
    public List<ApprovedDirectory> ApprovedDirectories { get; set; } = new();

    /// <summary>
    /// List of explicitly blocked paths (blacklist)
    /// </summary>
    [JsonPropertyName("blocked_paths")]
    public List<string> BlockedPaths { get; set; } = new();

    /// <summary>
    /// Global allowed file extensions across all directories
    /// </summary>
    [JsonPropertyName("global_allowed_extensions")]
    public List<string> GlobalAllowedExtensions { get; set; } = new()
    {
        ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".scss",
        ".sql", ".cs", ".csproj", ".yaml", ".yml", ".xml"
    };

    /// <summary>
    /// Global blocked file extensions (never allowed)
    /// </summary>
    [JsonPropertyName("global_blocked_extensions")]
    public List<string> GlobalBlockedExtensions { get; set; } = new()
    {
        ".exe", ".dll", ".bat", ".cmd", ".ps1", ".sh",
        ".env", ".pem", ".key", ".pfx"
    };
}

/// <summary>
/// Defines an approved directory with its constraints
/// </summary>
public class ApprovedDirectory
{
    /// <summary>
    /// Relative path from project root (e.g., "server/src/")
    /// </summary>
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable description
    /// </summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Allowed file extensions for this directory
    /// </summary>
    [JsonPropertyName("allowed_extensions")]
    public List<string> AllowedExtensions { get; set; } = new();

    /// <summary>
    /// Valid task classes that can modify this directory
    /// </summary>
    [JsonPropertyName("allowed_task_classes")]
    public List<string> AllowedTaskClasses { get; set; } = new()
    {
        "TCL-FEAT", "TCL-REFAC", "TCL-FIX", "TCL-HYG", "TCL-DOC"
    };

    /// <summary>
    /// Whether subdirectories are included
    /// </summary>
    [JsonPropertyName("recursive")]
    public bool Recursive { get; set; } = true;

    /// <summary>
    /// Maximum file size in bytes (0 = unlimited)
    /// </summary>
    [JsonPropertyName("max_file_size_bytes")]
    public long MaxFileSizeBytes { get; set; } = 0;

    /// <summary>
    /// Whether this directory requires human approval for any change
    /// </summary>
    [JsonPropertyName("requires_human_approval")]
    public bool RequiresHumanApproval { get; set; } = false;

    /// <summary>
    /// Tier that owns this directory
    /// </summary>
    [JsonPropertyName("owner_tier")]
    public string OwnerTier { get; set; } = "Orchestration";
}

/// <summary>
/// Result of a directory boundary validation
/// </summary>
public class BoundaryValidationResult
{
    public bool IsValid { get; set; }
    public string? RejectionReason { get; set; }
    public string? ViolationCode { get; set; }
    public ApprovedDirectory? MatchedDirectory { get; set; }
    public string? SuggestedAction { get; set; }
}

/// <summary>
/// Task class enumeration matching RPAS-TCL-001
/// </summary>
public static class TaskClasses
{
    public const string FEATURE = "TCL-FEAT";
    public const string REFACTOR = "TCL-REFAC";
    public const string HYGIENE = "TCL-HYG";
    public const string DOCUMENTATION = "TCL-DOC";
    public const string CONFIGURATION = "TCL-CFG";
    public const string MIGRATION = "TCL-MIG";
    public const string BUGFIX = "TCL-FIX";
    public const string SECURITY = "TCL-SEC";
    public const string GOVERNANCE = "TCL-GOV";
    public const string DEPENDENCY = "TCL-DEP";

    public static readonly HashSet<string> AllClasses = new()
    {
        FEATURE, REFACTOR, HYGIENE, DOCUMENTATION, CONFIGURATION,
        MIGRATION, BUGFIX, SECURITY, GOVERNANCE, DEPENDENCY
    };
}