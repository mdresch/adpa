# 🇪🇺 GDPR / 🇺🇸 CCPA Compliance

ADPA is designed to help organizations comply with global data privacy regulations.

## Key Capabilities

| Regulation | ADPA Feature | Description |
|------------|--------------|-------------|
| **Right to Access** | Audit Log + Data Export API | Export all data related to a user ID. |
| **Right to Erasure** | PII Redaction & Data Delete API | Delete all data, including lineage traces. |
| **Consent Management** | User Consent Attribute | Tag documents with consent status. |
| **Data Minimization** | Dynamic Redaction Engine | Automatically remove sensitive fields before analysis. |

## 📝 Developer Guide

- Use the `/api/v1/gdpr/data-export` and `/api/v1/gdpr/delete` endpoints.
- All redaction uses the `pii-detector` model, which can be configured to detect regional PII types.

---

🔗 **Back**: [Compliance Overview](README.md)
