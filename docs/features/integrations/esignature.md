# ✍️ eSignature Integration

Close the loop by adding secure, legally binding digital signatures to your documents.

## 🔌 Supported Providers

- **DocuSign** (Recommended)
- **Adobe Sign**
- **HelloSign**

## 🛠️ Integration Flow

1.  **Document Ready**: ADPA marks document as `ready_for_signature`.
2.  **Envelope Creation**: ADPA calls eSig API to create an envelope with the document + signature fields.
3.  **Signing Ceremony**: Signer receives an email/link to sign.
4.  **Completion Webhook**: eSig service calls ADPA (`signing_complete`), updating the document status and storing a tamper-proof signature log.

## 📄 Compliance & Security

- All signatures are timestamped and stored with cryptographic hashes.
- Audit logs are immutable and available for regulatory review.

---

🔗 **Back**: [Integrations Overview](README.md)
