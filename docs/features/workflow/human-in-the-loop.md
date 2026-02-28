# 👥 Human-in-the-Loop (HITL)

When AI isn't 100% confident, ADPA routes documents for human review.

## How It Works

1.  **Model Confidence Score**: If score < threshold, mark as `needs_review`.
2.  **Task Queue**: Add to a queue in the workflow engine (e.g., `Kaneo`).
3.  **Review UI**: Reviewer accesses document in a clean, focused interface.
4.  **Correction & Publish**: Reviewer edits fields and publishes back to the system.

## 📌 Best Practice

- Set confidence thresholds dynamically per document type (e.g., contracts need 98%+; invoices 95%+).

---

🔗 **Back**: [Workflow Overview](README.md)
