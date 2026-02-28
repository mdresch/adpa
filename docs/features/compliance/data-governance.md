# 📊 Data Governance

ADPA provides full data lineage, ensuring every data point in your reports can be traced back to its source document and processing step.

## Features

- **Provenance Tracking**: Record the document, model, and prompt used for every extraction.
- **Schema Registry**: Centralized storage of data models and transformations.
- **Audit Log**: Immutable log of all user actions and system changes.

## 🛠️ How It Works

- All events (e.g., `document_processed`, `pii_redacted`) are logged to the `audit-log` topic.
- Lineage is visualized in the Analytics Dashboard.

---

🔗 **Next**: [GDPR/CCPA Compliance](gdpr-ccpa.md)
