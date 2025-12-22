# Digital Signing & Compliance (Documenso) – User Guide

Confluence version: cba-hr.atlassian.net/wiki/spaces/AD/pages/371884044

Status: Draft (v0.1)
Audience: Document Authors, Approvers, Compliance, Administrators
Related Epics: WA-74 (Compliance & Digital Signing)

---

## Purpose
Enable faster audits and verifiable approvals using Documenso. This guide covers initiating signatures, tracking status, verifying audit trails, and producing compliance reports in under 10 minutes.

## What You Can Do
- Send documents for signature
- Assign signer roles and order
- Track signing status in real time
- Verify audit logs for each signing event
- Export signed copies and audit trails
- Troubleshoot failures and re‑send requests

---

## Prerequisites
- Your ADPA user has permission to initiate signing
- Documenso integration configured by admin
- Finalized document (Markdown, PDF, or generated from a template)

---

## End-to-End Workflow
1) Prepare Document
- Create or select a finalized document in a project
- Validate fields and signers required

2) Initiate Signing
- From the document: Actions → Send for Signature
- Select integration: Documenso
- Add signers (name, email, role) and signing order if needed
- Place required fields (signature, initials, date, text)
- Add message to signers → Send

3) Track & Manage
- View status: Pending, Viewed, Signed, Declined, Expired, Error
- Remind: Send reminder to outstanding signers
- Edit recipients (if allowed) or cancel request

4) Verify Audit Trail
- Open Audit tab: see time‑stamped events (sent, viewed, signed, IP, user agent)
- Confirm: 100% of signing events recorded
- Download: Signed copy + audit trail PDF/JSON as evidence

5) Compliance Report (<10 minutes)
- Go to Compliance → Reports → New
- Select project/date range → Include documents with signing events
- Export report (PDF/CSV) including links to audit artifacts

---

## Step-by-Step

A. Send for Signature
- Document → Actions → Send for Signature → Documenso
- Add signers and roles (Approver, Reviewer, Observer)
- Place fields on the document canvas
- Attach message and due date → Send

B. Monitor Status
- Document → Signing tab → Status timeline
- Remind overdue signers; re‑send as needed

C. Handle Exceptions
- Declined: Review reason → Amend doc → Re‑issue
- Error/Undelivered: Validate email; re‑send or replace signer
- Expired: Re‑issue with new deadline

D. Retrieve Evidence
- Document → Audit → Download audit trail (PDF/JSON)
- Document → Files → Download signed copy

E. Generate Compliance Report
- Compliance → Reports → New → Select scope → Export

---

## Troubleshooting
- I can’t see “Send for Signature”: Check permissions or integration status
- No audit entries: Confirm integration is connected; check Documenso status
- Signer didn’t receive email: Check spam, verify email, re‑send
- Mismatched fields: Ensure all required fields placed and assigned

---

## Admin Notes
- Configuration: API token, callback/webhook URL, allowed file types
- Security: Encrypted credential storage; least-privilege permissions
- Audit retention: Define retention period and storage location
- Monitoring: Set alerts if audit events fall <100%

---

## KPIs
- <10 minutes to produce a compliance report
- 100% signing events audit‑logged

---

## Related Documentation
- Routes/Services: server/src/routes/qualityAuditRoutes.ts, server/src/services/qualityAuditService.ts, server/src/lib/documenso/*
- Features: docs/06-features/APPROVAL_WORKFLOW_GUIDE.md, APPROVAL_WORKFLOW_IMPLEMENTATION.md
- Security: docs/12-security/SECURITY_CLEANUP_SUMMARY.md
- Personas & User Stories (Confluence): https://cba-hr.atlassian.net/wiki/spaces/AD/pages/372113409

---

## Version History
- v0.1 (Draft): Initial end‑user workflow and compliance checklist
