using Adpa.Orchestrator.Pmbok;
using Microsoft.AspNetCore.Mvc;

namespace Adpa.Orchestrator.Controllers;

/// <summary>
/// Read-only PMBOK 6 (49-process) catalog for experience tiers and tooling.
/// </summary>
[ApiController]
[Route("api/pmbok6/catalog")]
public sealed class Pmbok6CatalogController : ControllerBase
{
    [HttpGet("processes")]
    public ActionResult<IReadOnlyList<object>> GetAlignedProcesses()
    {
        var items = Pmbok6ProcessCatalog.AlignedSequence.Select(p => new
        {
            p.ProcessId,
            p.Name,
            p.KnowledgeArea,
            p.ProcessGroup,
            p.SequenceIndex,
            prerequisites = p.Prerequisites,
            expectedOutputs = p.ExpectedOutputs,
        });
        return Ok(items.ToList());
    }

    [HttpGet("processes/{processId}")]
    public ActionResult<object> GetProcess(string processId)
    {
        var p = Pmbok6ProcessCatalog.GetById(processId);
        if (p is null)
            return NotFound(new { processId, message = "Unknown PMBOK 6 process id." });

        return Ok(new
        {
            p.ProcessId,
            p.Name,
            p.KnowledgeArea,
            p.ProcessGroup,
            p.SequenceIndex,
            prerequisites = p.Prerequisites,
            expectedOutputs = p.ExpectedOutputs,
        });
    }

    [HttpGet("dependencies")]
    public ActionResult<IReadOnlyDictionary<string, IReadOnlyList<string>>> GetDependencyMap() =>
        Ok(Pmbok6ProcessCatalog.Prerequisites);
}
