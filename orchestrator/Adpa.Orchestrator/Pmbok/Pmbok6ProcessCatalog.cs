using System.Collections.ObjectModel;
using Adpa.Orchestrator.Models.Pmbok;

namespace Adpa.Orchestrator.Pmbok;

/// <summary>
/// Canonical PMBOK 6 (49 processes) catalog and dependency map.
/// Source of truth is aligned with <c>AI-Foundry-Projects/pmbok/process_registry.py</c>.
/// </summary>
public static class Pmbok6ProcessCatalog
{
    /// <summary>Prerequisite process IDs per process (same edges as Python <c>PROCESS_DEPENDENCY_MAP</c>).</summary>
    public static IReadOnlyDictionary<string, IReadOnlyList<string>> Prerequisites { get; } =
        new ReadOnlyDictionary<string, IReadOnlyList<string>>(
            new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal)
            {
                ["4.1"] = Arr(),
                ["13.1"] = Arr(),
                ["4.2"] = Arr("4.1", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1", "13.2"),
                ["5.1"] = Arr("4.1"),
                ["6.1"] = Arr("4.1"),
                ["7.1"] = Arr("4.1"),
                ["8.1"] = Arr("4.1", "5.2"),
                ["9.1"] = Arr("4.1"),
                ["10.1"] = Arr("4.1"),
                ["11.1"] = Arr("4.1"),
                ["12.1"] = Arr("4.1"),
                ["13.2"] = Arr("13.1"),
                ["5.2"] = Arr("5.1"),
                ["5.3"] = Arr("5.2"),
                ["5.4"] = Arr("5.3"),
                ["6.2"] = Arr("6.1"),
                ["6.3"] = Arr("6.2"),
                ["6.4"] = Arr("6.3"),
                ["6.5"] = Arr("6.4"),
                ["7.2"] = Arr("7.1", "6.5"),
                ["7.3"] = Arr("7.2"),
                ["9.2"] = Arr("9.1", "5.4"),
                ["11.2"] = Arr("11.1"),
                ["11.3"] = Arr("11.2"),
                ["11.4"] = Arr("11.3"),
                ["11.5"] = Arr("11.4"),
                ["4.3"] = Arr(),
                ["4.4"] = Arr("4.3"),
                ["8.2"] = Arr(),
                ["9.3"] = Arr(),
                ["9.4"] = Arr("9.3"),
                ["9.5"] = Arr("9.4"),
                ["10.2"] = Arr(),
                ["11.6"] = Arr("11.5"),
                ["12.2"] = Arr("12.1"),
                ["13.3"] = Arr(),
                ["4.5"] = Arr(),
                ["4.6"] = Arr(),
                ["5.5"] = Arr("5.4"),
                ["5.6"] = Arr("5.4"),
                ["6.6"] = Arr("6.5"),
                ["7.4"] = Arr("7.3"),
                ["8.3"] = Arr("8.2"),
                ["9.6"] = Arr("9.3"),
                ["10.3"] = Arr("10.2"),
                ["11.7"] = Arr("11.6"),
                ["12.3"] = Arr("12.2"),
                ["13.4"] = Arr("13.3"),
                ["4.7"] = Arr(),
            });

    /// <summary>49 processes in orchestrator catalog order (matches Python <c>_PROCESS_DATA</c> sequence).</summary>
    public static IReadOnlyList<PmbokProcessDefinition> AlignedSequence { get; } = BuildAlignedSequence();

    public static PmbokProcessDefinition? GetById(string processId) =>
        AlignedSequence.FirstOrDefault(p => string.Equals(p.ProcessId, processId, StringComparison.Ordinal));

    private static IReadOnlyList<PmbokProcessDefinition> BuildAlignedSequence()
    {
        var rows = new (string Id, string Name, string Ka, string Pg, string[] Outputs)[]
        {
            ("4.1", "Develop Project Charter", "Integration", "Initiating", new[] { "Project Charter" }),
            ("4.2", "Develop Project Management Plan", "Integration", "Planning", new[] { "Project Management Plan" }),
            ("4.3", "Direct and Manage Project Work", "Integration", "Executing", new[] { "Deliverables", "Work Performance Data", "Issue Log" }),
            ("4.4", "Manage Project Knowledge", "Integration", "Executing", new[] { "Lessons Learned Register" }),
            ("4.5", "Monitor and Control Project Work", "Integration", "Monitoring & Controlling", new[] { "Work Performance Reports", "Change Requests" }),
            ("4.6", "Perform Integrated Change Control", "Integration", "Monitoring & Controlling", new[] { "Approved Change Requests", "Change Log" }),
            ("4.7", "Close Project or Phase", "Integration", "Closing", new[] { "Final Product/Service/Result Transition", "Final Report" }),
            ("5.1", "Plan Scope Management", "Scope", "Planning", new[] { "Scope Management Plan", "Requirements Management Plan" }),
            ("5.2", "Collect Requirements", "Scope", "Planning", new[] { "Requirements Documentation", "Requirements Traceability Matrix" }),
            ("5.3", "Define Scope", "Scope", "Planning", new[] { "Project Scope Statement" }),
            ("5.4", "Create WBS", "Scope", "Planning", new[] { "Work Breakdown Structure", "WBS Dictionary", "Scope Baseline" }),
            ("5.5", "Validate Scope", "Scope", "Monitoring & Controlling", new[] { "Accepted Deliverables", "Work Performance Information" }),
            ("5.6", "Control Scope", "Scope", "Monitoring & Controlling", new[] { "Work Performance Information", "Change Requests", "Scope Baseline Updates" }),
            ("6.1", "Plan Schedule Management", "Schedule", "Planning", new[] { "Schedule Management Plan" }),
            ("6.2", "Define Activities", "Schedule", "Planning", new[] { "Activity List", "Activity Attributes", "Milestone List" }),
            ("6.3", "Sequence Activities", "Schedule", "Planning", new[] { "Project Schedule Network Diagrams" }),
            ("6.4", "Estimate Activity Durations", "Schedule", "Planning", new[] { "Duration Estimates", "Basis of Estimates" }),
            ("6.5", "Develop Schedule", "Schedule", "Planning", new[] { "Project Schedule", "Schedule Baseline", "Schedule Data" }),
            ("6.6", "Control Schedule", "Schedule", "Monitoring & Controlling", new[] { "Work Performance Information", "Schedule Forecasts", "Change Requests" }),
            ("7.1", "Plan Cost Management", "Cost", "Planning", new[] { "Cost Management Plan" }),
            ("7.2", "Estimate Costs", "Cost", "Planning", new[] { "Cost Estimates", "Basis of Estimates" }),
            ("7.3", "Determine Budget", "Cost", "Planning", new[] { "Cost Baseline", "Project Funding Requirements" }),
            ("7.4", "Control Costs", "Cost", "Monitoring & Controlling", new[] { "Work Performance Information", "Cost Forecasts", "Change Requests" }),
            ("8.1", "Plan Quality Management", "Quality", "Planning", new[] { "Quality Management Plan", "Quality Metrics" }),
            ("8.2", "Manage Quality", "Quality", "Executing", new[] { "Quality Reports", "Test and Evaluation Documents" }),
            ("8.3", "Control Quality", "Quality", "Monitoring & Controlling", new[] { "Quality Control Measurements", "Verified Deliverables" }),
            ("9.1", "Plan Resource Management", "Resource", "Planning", new[] { "Resource Management Plan", "Team Charter" }),
            ("9.2", "Estimate Activity Resources", "Resource", "Planning", new[] { "Resource Requirements", "Basis of Estimates", "Resource Breakdown Structure" }),
            ("9.3", "Acquire Resources", "Resource", "Executing", new[] { "Physical Resource Assignments", "Project Team Assignments" }),
            ("9.4", "Develop Team", "Resource", "Executing", new[] { "Team Performance Assessments" }),
            ("9.5", "Manage Team", "Resource", "Executing", new[] { "Change Requests", "Project Management Plan Updates" }),
            ("9.6", "Control Resources", "Resource", "Monitoring & Controlling", new[] { "Work Performance Information", "Change Requests" }),
            ("10.1", "Plan Communications Management", "Communications", "Planning", new[] { "Communications Management Plan" }),
            ("10.2", "Manage Communications", "Communications", "Executing", new[] { "Project Communications" }),
            ("10.3", "Monitor Communications", "Communications", "Monitoring & Controlling", new[] { "Work Performance Information", "Change Requests" }),
            ("11.1", "Plan Risk Management", "Risk", "Planning", new[] { "Risk Management Plan" }),
            ("11.2", "Identify Risks", "Risk", "Planning", new[] { "Risk Register", "Risk Report" }),
            ("11.3", "Perform Qualitative Risk Analysis", "Risk", "Planning", new[] { "Risk Register Updates" }),
            ("11.4", "Perform Quantitative Risk Analysis", "Risk", "Planning", new[] { "Risk Report Updates" }),
            ("11.5", "Plan Risk Responses", "Risk", "Planning", new[] { "Risk Register Updates", "Risk Report Updates", "Change Requests" }),
            ("11.6", "Implement Risk Responses", "Risk", "Executing", new[] { "Change Requests" }),
            ("11.7", "Monitor Risks", "Risk", "Monitoring & Controlling", new[] { "Work Performance Information", "Change Requests" }),
            ("12.1", "Plan Procurement Management", "Procurement", "Planning", new[] { "Procurement Management Plan", "Procurement Strategy", "Bid Documents" }),
            ("12.2", "Conduct Procurements", "Procurement", "Executing", new[] { "Selected Sellers", "Agreements" }),
            ("12.3", "Control Procurements", "Procurement", "Monitoring & Controlling", new[] { "Closed Procurements", "Work Performance Information" }),
            ("13.1", "Identify Stakeholders", "Stakeholder", "Initiating", new[] { "Stakeholder Register" }),
            ("13.2", "Plan Stakeholder Engagement", "Stakeholder", "Planning", new[] { "Stakeholder Engagement Plan" }),
            ("13.3", "Manage Stakeholder Engagement", "Stakeholder", "Executing", new[] { "Change Requests", "Stakeholder Engagement Plan Updates" }),
            ("13.4", "Monitor Stakeholder Engagement", "Stakeholder", "Monitoring & Controlling", new[] { "Work Performance Information", "Change Requests" }),
        };

        var list = new List<PmbokProcessDefinition>(rows.Length);
        for (var i = 0; i < rows.Length; i++)
        {
            var r = rows[i];
            if (!Prerequisites.TryGetValue(r.Id, out var pre))
                pre = Array.Empty<string>();

            list.Add(new PmbokProcessDefinition(
                r.Id,
                r.Name,
                r.Ka,
                r.Pg,
                i,
                pre,
                r.Outputs));
        }

        return new ReadOnlyCollection<PmbokProcessDefinition>(list);
    }

    private static IReadOnlyList<string> Arr(params string[] items) => items;
}
