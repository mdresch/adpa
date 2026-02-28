# 📄 Document Processing

The foundation of ADPA: ingest, parse, classify, and extract from any document.

## 📚 Documentation

- **[Ingestion](ingest.md)**: How documents enter the system.
- **[Parsing](parse.md)**: OCR, layout analysis, and text extraction.
- **[Classification](classify.md)**: Identifying document types (e.g., invoice, contract).
- **[Extraction](extract.md)**: Getting structured data out (e.g., amounts, dates).

## 🔧 Developer Tip

All document processing is orchestrated via the `document-pipeline` service, which uses a configurable, event-driven workflow (e.g., Kafka → Ingest → Parse → Classify → Extract → Store).

---

🔗 **Back**: [Feature List](../../feature-list.md)
