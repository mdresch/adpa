using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Governance;

public class GovernanceLedgerEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string RitualType { get; set; } = "Phase0";
    
    public DateTimeOffset InitiatedAt { get; set; } = DateTimeOffset.UtcNow;
    
    public string Status { get; set; } = "Completed";

    // Full-fidelity JSON storage for auditability
    public string? IdeationJson { get; set; }
    
    public string? BusinessCaseJson { get; set; }

    // Human oversight fields
    public string? GovernorNotes { get; set; }
    
    public bool IsOverridden { get; set; } = false;
    
    public string? OverrideJustification { get; set; }
}
