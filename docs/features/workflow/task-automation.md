# ⚙️ Task Automation & Kaneo Integration

Automate the routing, escalation, and delegation of tasks within ADPA.

## 🔌 Integration with Kaneo

ADPA integrates with **Kaneo** to provide a simple, intuitive interface for task management:

- **Task Creation**: Automatically create a task when a document reaches a certain status.
- **Dynamic Assignment**: Assign tasks based on custom rules (e.g., document region → local reviewer).
- **Simple UI**: Reviewers see only the documents they need to action, with no clutter.

## 🛠️ Developer Guide

- Events from ADPA (`document_review_needed`) are sent to Kaneo via webhooks.
- Kaneo’s status (`task_completed`) triggers the next step in the ADPA pipeline.

---

🔗 **Back**: [Workflow Overview](README.md)
