# 🔍 LLM Observability (via Langfuse)

## Overview
ADPA uses [Langfuse](https://langfuse.com/) for full observability of all LLM interactions, including model calls, input/output, latency, token usage, and cost.

## Why It Matters

- **Debugging**: Identify which prompts or models cause errors or hallucinations.
- **Cost Control**: Track spend per document, workflow, or user.
- **Performance Monitoring**: Monitor output quality (accuracy, latency) over time.

## 🔌 Integration

- Every LLM call in `ai-engine` is wrapped with `langfuse.track(...)`.
- Data is exported in real-time to the Langfuse dashboard or S3 for long-term storage.

## 📊 Example KPIs

- `llm_calls_per_day`: Volume of LLM requests.
- `tokens_used_per_document`: Average cost per document.
- `output_accuracy`: % of successful extractions vs. ground truth.

---

🔗 **Next**: See [Prompt Management](prompt-management.md)
