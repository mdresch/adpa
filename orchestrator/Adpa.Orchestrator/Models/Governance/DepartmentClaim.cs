namespace Adpa.Orchestrator.Models.Governance;

/// <summary>
/// Mirrors the shape Node's buildDepartmentClaims() produces (ADR-005 Phase 0) and that
/// Firebase Admin SDK's setCustomUserClaims(uid, { departments: [...] }) embeds in the
/// validated ID token — one entry per active user_departments row.
/// </summary>
public sealed class DepartmentClaim
{
    public string PortfolioId { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
