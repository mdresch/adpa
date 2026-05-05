using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Governance;

[JsonConverter(typeof(ApproveBusinessCaseRequestJsonConverter))]
public sealed record ApproveBusinessCaseRequest(string BusinessCaseId, TaskApprovalAttestation? Approval);
