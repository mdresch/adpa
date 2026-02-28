# 📋 Audit Log

The ultimate source of truth for what happened, to whom, and when.

## 🛡️ What’s Logged

| Event | Data Captured |
|-------|---------------|
| `document_processed` | Document ID, user, timestamp, model used, confidence score. |
| `pii_redacted` | Field names, redaction method (e.g., `mask`, `delete`). |
| `task_assigned` | User assigned, task ID, due date. |
| `signature_completed` | Signer, timestamp, signature hash. |

## 🔍 Use Cases

- **Regulatory Audit**: Prove data was handled correctly.
- **Debugging**: Trace why a document failed (e.g., "Why was redaction skipped?").
- **User Accountability**: Answer "Who approved this?"

## 🔌 Access

- View via `/api/v1/audit-log?document_id=...`
- Export full logs for SIEM tools (e.g., Splunk, Datadog).

---

🔗 **Back**: [Workflow Overview](README.md)
