using System.Text.Json;
using System.Text.Json.Serialization;

namespace Adpa.Orchestrator.Models.Governance;

/// <summary>
/// Accepts legacy JSON string body <c>"bc-123"</c> or object <c>{"businessCaseId":"...","approval":{...}}</c>.
/// </summary>
public sealed class ApproveBusinessCaseRequestJsonConverter : JsonConverter<ApproveBusinessCaseRequest>
{
    public override ApproveBusinessCaseRequest Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var element = JsonElement.ParseValue(ref reader);

        if (element.ValueKind == JsonValueKind.String)
        {
            var id = element.GetString();
            if (string.IsNullOrWhiteSpace(id))
                throw new JsonException("Business case id string is empty.");
            return new ApproveBusinessCaseRequest(id, null);
        }

        if (element.ValueKind != JsonValueKind.Object)
            throw new JsonException("Expected JSON string or object for approve request.");

        if (!TryGetStringProperty(element, "businessCaseId", out var businessCaseId) &&
            !TryGetStringProperty(element, "business_case_id", out businessCaseId))
            throw new JsonException("Missing string property 'businessCaseId' or 'business_case_id'.");
        TaskApprovalAttestation? approval = null;
        if (element.TryGetProperty("approval", out var approvalEl) && approvalEl.ValueKind is JsonValueKind.Object)
            approval = approvalEl.Deserialize<TaskApprovalAttestation>(options);

        return new ApproveBusinessCaseRequest(businessCaseId ?? throw new JsonException("Business case id is empty."), approval);
    }

    private static bool TryGetStringProperty(JsonElement element, string name, out string? value)
    {
        value = null;
        if (!element.TryGetProperty(name, out var prop) || prop.ValueKind != JsonValueKind.String)
            return false;
        value = prop.GetString();
        return !string.IsNullOrWhiteSpace(value);
    }

    public override void Write(Utf8JsonWriter writer, ApproveBusinessCaseRequest value, JsonSerializerOptions options)
    {
        if (value.Approval is null)
        {
            writer.WriteStringValue(value.BusinessCaseId);
            return;
        }

        writer.WriteStartObject();
        writer.WriteString("businessCaseId", value.BusinessCaseId);
        writer.WritePropertyName("approval");
        JsonSerializer.Serialize(writer, value.Approval, options);
        writer.WriteEndObject();
    }
}
