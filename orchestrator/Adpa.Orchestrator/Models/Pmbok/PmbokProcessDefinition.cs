namespace Adpa.Orchestrator.Models.Pmbok;

/// <summary>
/// PMBOK Guide 6th Edition process metadata aligned with <c>AI-Foundry-Projects/pmbok/process_registry.py</c>.
/// </summary>
public sealed record PmbokProcessDefinition(
    string ProcessId,
    string Name,
    string KnowledgeArea,
    string ProcessGroup,
    /// <summary>0-based position in the orchestrator canonical catalog order.</summary>
    int SequenceIndex,
    IReadOnlyList<string> Prerequisites,
    IReadOnlyList<string> ExpectedOutputs);
