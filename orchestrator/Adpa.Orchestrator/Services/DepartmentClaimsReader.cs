using System.Security.Claims;
using System.Text.Json;
using Adpa.Orchestrator.Models.Governance;

namespace Adpa.Orchestrator.Services;

/// <summary>
/// Parses the "departments" custom claim Firebase embeds in the validated ID token
/// (ADR-005 Phase 0 buildDepartmentClaims() output). Returns an empty list on any parse
/// failure or missing claim — callers must treat that as "no claimed membership," the
/// same as an unauthenticated caller, never as a transient error to retry or bypass.
/// </summary>
public static class DepartmentClaimsReader
{
    private const string ClaimType = "departments";

    public static IReadOnlyList<DepartmentClaim> Read(ClaimsPrincipal? user)
    {
        var claim = user?.Claims.FirstOrDefault(c => c.Type == ClaimType);
        if (claim is null || string.IsNullOrWhiteSpace(claim.Value))
            return Array.Empty<DepartmentClaim>();

        try
        {
            var parsed = JsonSerializer.Deserialize<List<DepartmentClaim>>(
                claim.Value,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return (IReadOnlyList<DepartmentClaim>?)parsed ?? Array.Empty<DepartmentClaim>();
        }
        catch (JsonException)
        {
            return Array.Empty<DepartmentClaim>();
        }
    }

    /// <summary>
    /// Both portfolioId and department must match — matching department name alone is not
    /// sufficient once a department can exist identically-named across multiple portfolios.
    /// </summary>
    public static bool HasMatchingMembership(
        IReadOnlyList<DepartmentClaim> claims,
        string portfolioId,
        string department)
    {
        foreach (var claim in claims)
        {
            if (string.Equals(claim.PortfolioId, portfolioId, StringComparison.Ordinal) &&
                string.Equals(claim.Department, department, StringComparison.Ordinal))
            {
                return true;
            }
        }
        return false;
    }
}
