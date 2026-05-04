namespace Adpa.Orchestrator.Models.Governance;

/// <summary>
/// EF projection for the <c>governance_ledger</c> table (owned by RPAS.Governance.Api writes).
/// Present on the orchestrator context so migrations keep the shared PostgreSQL schema aligned.
/// </summary>
public class GovernanceLedgerRow
{
    public Guid Id { get; set; }
    public string RitualType { get; set; } = string.Empty;
    public DateTimeOffset InitiatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? IdeationJson { get; set; }
    public string? BusinessCaseJson { get; set; }
    public string? GovernorNotes { get; set; }
    public bool IsOverridden { get; set; }
    public string? OverrideJustification { get; set; }
}
