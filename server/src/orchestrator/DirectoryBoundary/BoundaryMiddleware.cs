// ============================================================================
// RPAS-CM Directory Boundary Enforcement - Middleware Integration
// ============================================================================
// AMD: AMD-2026-04-16-0001-Directory-Boundary
// Task Class: TCL-SEC (Security) + TCL-GOV (Governance)
// Guardrails: G1 (Authority), G4 (Determinism), CP7 (Directory Boundary)
// ============================================================================
// This middleware integrates boundary enforcement into the file operation
// pipeline. It intercepts all file operations and validates them against
// the manifest before allowing execution.
// ============================================================================

using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace RPAS.Orchestrator.DirectoryBoundary;

/// <summary>
/// ASP.NET Core middleware that enforces directory boundaries for all
/// file operations. This is the technical enforcement layer that makes
/// governance violations impossible at the HTTP API level.
/// 
/// Usage in Program.cs:
///   app.UseMiddleware<BoundaryEnforcementMiddleware>();
/// </summary>
public class BoundaryEnforcementMiddleware
{
    private readonly RequestDelegate _next;
    private readonly BoundaryEnforcementService _enforcementService;
    private readonly ILogger<BoundaryEnforcementMiddleware> _logger;

    // Paths that bypass boundary enforcement
    private static readonly HashSet<string> BypassPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health",
        "/metrics",
        "/swagger",
        "/api/status"
    };

    public BoundaryEnforcementMiddleware(
        RequestDelegate next,
        BoundaryEnforcementService enforcementService,
        ILogger<BoundaryEnforcementMiddleware> logger)
    {
        _next = next;
        _enforcementService = enforcementService;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip health/metrics endpoints
        if (BypassPaths.Any(p => context.Request.Path.StartsWithSegments(p)))
        {
            await _next(context);
            return;
        }

        // Only intercept file operation endpoints
        if (!IsFileOperationRequest(context.Request))
        {
            await _next(context);
            return;
        }

        // Extract file operation details from request
        var operation = await ExtractFileOperation(context);
        if (operation == null)
        {
            await WriteErrorResponse(context, 400, "Invalid file operation request");
            return;
        }

        // Validate against boundary manifest
        var token = _enforcementService.RequestAuthorization(
            operation.FilePath,
            operation.TaskClass,
            operation.Operation,
            operation.AgentId);

        if (token == null)
        {
            _logger.LogWarning(
                "CP7 Middleware blocked request | Path: {FilePath} | Agent: {Agent}",
                operation.FilePath, operation.AgentId);

            await WriteErrorResponse(context, 403, new
            {
                error = "Directory boundary violation",
                code = "CP7-VIOLATION",
                message = $"File operation on '{operation.FilePath}' is not permitted. " +
                          "See rpas-manifest.json for approved directories.",
                manifest_version = _enforcementService.GetManifest().Version,
                csr_epoch = _enforcementService.GetManifest().CsrEpoch
            });

            return;
        }

        // Store token in context for downstream use
        context.Items["BoundaryToken"] = token;

        // Continue to next middleware
        await _next(context);

        // Verify token at response time (Gate 4)
        if (context.Response.StatusCode < 400)
        {
            if (!_enforcementService.VerifyToken(token))
            {
                _logger.LogError(
                    "CP7 Token verification failed at Gate 4 | Token: {TokenId}",
                    token.TokenId);

                // Token was invalidated during request processing
                context.Response.StatusCode = 500;
                await context.Response.WriteAsync("Authorization token invalidated during operation");
            }
        }
    }

    private static bool IsFileOperationRequest(HttpRequest request)
    {
        return request.Path.StartsWithSegments("/api/files") ||
               request.Path.StartsWithSegments("/api/execute") ||
               request.Path.StartsWithSegments("/api/amendment") ||
               request.Method == "POST" && request.Path.Contains("file");
    }

    private async Task<FileOperationRequest?> ExtractFileOperation(HttpContext context)
    {
        try
        {
            // Try to read from request body
            if (context.Request.ContentLength > 0)
            {
                context.Request.EnableBuffering();
                using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                return JsonSerializer.Deserialize<FileOperationRequest>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }

            // Try query parameters
            var filePath = context.Request.Query["filePath"].FirstOrDefault();
            var taskClass = context.Request.Query["taskClass"].FirstOrDefault();
            var operationStr = context.Request.Query["operation"].FirstOrDefault();

            if (!string.IsNullOrEmpty(filePath))
            {
                return new FileOperationRequest
                {
                    FilePath = filePath,
                    TaskClass = taskClass ?? "TCL-FEAT",
                    Operation = Enum.Parse<FileOperation>(operationStr ?? "Modify", true)
                };
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    private static async Task WriteErrorResponse(HttpContext context, int statusCode, object error)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(error));
    }

    private static async Task WriteErrorResponse(HttpContext context, int statusCode, string message)
    {
        await WriteErrorResponse(context, statusCode, new { error = message });
    }
}

/// <summary>
/// Extension methods for registering boundary enforcement middleware
/// </summary>
public static class BoundaryEnforcementExtensions
{
    /// <summary>
    /// Adds directory boundary enforcement services to the DI container
    /// </summary>
    public static IServiceCollection AddBoundaryEnforcement(
        this IServiceCollection services,
        string manifestPath,
        string projectRoot)
    {
        services.AddSingleton<IBoundaryAuditLogger, ConsoleBoundaryAuditLogger>();
        services.AddSingleton<BoundaryEnforcementService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<BoundaryEnforcementService>>();
            var auditLogger = sp.GetRequiredService<IBoundaryAuditLogger>();
            return new BoundaryEnforcementService(manifestPath, projectRoot, auditLogger, logger);
        });

        return services;
    }

    /// <summary>
    /// Adds the boundary enforcement middleware to the pipeline
    /// </summary>
    public static IApplicationBuilder UseBoundaryEnforcement(this IApplicationBuilder app)
    {
        return app.UseMiddleware<BoundaryEnforcementMiddleware>();
    }
}

/// <summary>
/// Console-based audit logger for development
/// </summary>
public class ConsoleBoundaryAuditLogger : IBoundaryAuditLogger
{
    public void LogRejection(BoundaryRejectionEvent rejection)
    {
        var originalColor = Console.ForegroundColor;
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[CP7 REJECTION] {rejection.Timestamp:O}");
        Console.WriteLine($"  Path: {rejection.FilePath}");
        Console.WriteLine($"  Task: {rejection.TaskClass}");
        Console.WriteLine($"  Agent: {rejection.AgentId}");
        Console.WriteLine($"  Code: {rejection.ViolationCode}");
        Console.WriteLine($"  Reason: {rejection.RejectionReason}");
        Console.ForegroundColor = originalColor;
    }

    public void LogAuthorization(BoundaryAuthorizationToken token)
    {
        var originalColor = Console.ForegroundColor;
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"[CP7 AUTHORIZED] {token.IssuedAt:O}");
        Console.WriteLine($"  Token: {token.TokenId}");
        Console.WriteLine($"  Path: {token.FilePath}");
        Console.WriteLine($"  Task: {token.TaskClass}");
        Console.WriteLine($"  Dir: {token.AuthorizedDirectory}");
        Console.ForegroundColor = originalColor;
    }
}