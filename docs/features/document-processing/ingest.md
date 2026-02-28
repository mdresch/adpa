# 📥 Ingestion

How documents enter the ADPA system.

## Supported Inputs

| Format | Notes |
|--------|-------|
| **PDF** | Native and scanned (with OCR). |
| **DOCX, PPTX, XLSX** | All standard Microsoft Office formats. |
| **CSV, TIF, JPG** | For structured data or image-based inputs. |
| **Email (EML/MBOX)** | Automatically extract attachments and body text. |

## 🔌 Ingestion Methods

- **API Upload**: `POST /api/v1/documents/ingest`
- **Email Ingest**: Configure a dedicated email address; ADPA polls the mailbox.
- **SFTP/SharePoint**: Bulk ingestion from network shares.

---

🔗 **Back**: [Document Processing Overview](README.md)
