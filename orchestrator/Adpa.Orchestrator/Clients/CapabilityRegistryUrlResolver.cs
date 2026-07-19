namespace Adpa.Orchestrator.Clients;

/// <summary>
/// Resolves CapabilityRegistryClient's BaseAddress. Isolated in its own file (not inline in
/// Program.cs) so the internal-only service-discovery/localhost-dev URLs it references live in
/// one small, clearly-scoped place -- these are never public-facing (adpa-backend is an internal
/// Aspire hostname reached only from inside the orchestrator's own network boundary, same trust
/// model already documented for GovernanceApiClient/IntelligenceClient), unlike a URL an external
/// client would call.
/// </summary>
public static class CapabilityRegistryUrlResolver
{
    public static string Resolve(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var capabilityRegistryUrl = configuration["CAPABILITY_REGISTRY_URL"] ?? DefaultServiceDiscoveryUrl;

        // Fallback for local debugging without service discovery — matches the Express
        // backend's Aspire-assigned dev port (Adpa.AppHost: adpa-backend, PORT=5000).
        if (environment.IsDevelopment() && capabilityRegistryUrl == DefaultServiceDiscoveryUrl)
        {
            capabilityRegistryUrl = DefaultLocalDevUrl;
        }

        return capabilityRegistryUrl;
    }

    private const string DefaultServiceDiscoveryUrl = "http://adpa-backend";
    private const string DefaultLocalDevUrl = "http://localhost:5000";
}
