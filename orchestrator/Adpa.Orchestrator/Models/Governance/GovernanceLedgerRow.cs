namespace Adpa.Orchestrator.Models.Governance;

/// <summary>
/// EF projection for the <c>governance_ledger</c> table (owned by RPAS.Governance.Api writes).
/// Present on the orchestrator context so migrations keep the shared PostgreSQL schema aligned.
/// </summary>
/// <remarks>
/// ADR-005 Phase 5 (tamper-evidence): <see cref="PrevHash"/>/<see cref="Hash"/> are maintained by a
/// BEFORE INSERT trigger (governance_ledger_before_insert, migration
/// 20260712120000_AddGovernanceLedgerHashChain) mirroring server/'s audit_log_before_insert() pattern
/// -- never set them from application code. No in-repo code path writes to this table today (see the
/// class summary); the trigger protects it regardless of whether the writer is this repo's own
/// in-process governance fallback or the external RPAS.Governance.Api this table's rows are ultimately
/// owned by.
/// </remarks>
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
    public string? PrevHash { get; set; }
    public string? Hash { get; set; }
}
