# 📊 Dashboards

ADPA's analytics layer provides customizable, role-based dashboards.

## 🔌 Data Sources

- **Prometheus**: Raw metrics (latency, throughput, cost).
- **Langfuse**: LLM performance (accuracy, hallucinations).
- **Audit Log**: User activity and task status.

## 📱 Example Dashboard Widgets

| Widget | Data Source | Description |
|--------|-------------|-------------|
| 📈 Documents Processed/Day | Prometheus | Volume over time. |
| 💰 Cost per Document | Langfuse | Avg. token usage & cost. |
| 📉 Accuracy Trend | Langfuse/Ground Truth | % of successful extractions. |
| ⚠️ Error Hotspots | Audit Log | Most common failure reasons. |

## 📝 How to Build Your Own

- Use the `/api/v1/analytics/query` endpoint with a SQL-like syntax.
- Or, embed the dashboard in your own portal via an iframe.

---

🔗 **Back**: [Analytics Overview](README.md)
