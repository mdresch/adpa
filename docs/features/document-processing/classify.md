# 🏷️ Classification

Automatically identify the type of document (e.g., invoice, contract, SOW).

## Methods

- **ML Model**: Fine-tuned classifier (e.g., `document-type-classifier`).
- **Rule-Based Fallback**: Heuristics (e.g., “if 'Invoice' appears in first 10 lines → invoice”).

## ⚙️ Integration

Classification happens *before* extraction, allowing ADPA to apply the correct extraction model and schema.

---

🔗 **Back**: [Document Processing Overview](README.md)
