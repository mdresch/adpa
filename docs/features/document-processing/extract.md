# 📤 Extraction

Get structured data out of your documents.

## Extraction Types

| Type | Description | Example |
|------|-------------|---------|
| **Key-Value** | Pull out specific fields (e.g., `Invoice Number`) | NER + prompt engineering |
| **Table Extraction** | Parse tables into rows/columns | LayoutLM + rule fixes |
| **Relation Extraction** | Link entities (e.g., `Party A` → `Contract Start Date`) | OpenIE or custom LLM prompt |

## 🔧 Developer Guide

- Extraction is model-agnostic. Use OpenAI, HuggingFace, or a self-hosted model.
- Results are validated against a schema before being stored.

---

🔗 **Back**: [Document Processing Overview](README.md)
