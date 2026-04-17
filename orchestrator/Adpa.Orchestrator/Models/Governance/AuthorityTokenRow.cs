namespace Adpa.Orchestrator.Models.Governance;

/// <summary>
/// EF projection for <c>authority_tokens</c> (written by RPAS.Governance.Api validation path).
/// </summary>
public class AuthorityTokenRow
{
    public Guid Id { get; set; }
    public string RitualType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsConsumed { get; set; }
    public List<string> AllowedPaths { get; set; } = new();
}
