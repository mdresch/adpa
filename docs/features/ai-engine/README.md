# 🤖 AI Engine

This section covers the AI and language model capabilities within ADPA.

## 🧠 Key Components

| Feature | Description |
|---------|-------------|
| **[LLM Observability](llm-observability.md)** | Real-time tracing, cost, and accuracy metrics using Langfuse. |
| **[Prompt Management](prompt-management.md)** | Centralized versioning and deployment of system and user prompts. |

## 🔧 For Developers

- All LLM interactions are orchestrated via the `ai-engine` service.
- Prompts are managed through the `prompts/` directory in the repo and deployed via CI/CD.
- Metrics are exported to Prometheus and visualized in the Analytics Dashboard.

## 📚 Resources

- [Langfuse Documentation](https://langfuse.com/)
- [LayoutLM Paper](https://arxiv.org/abs/2012.14740)
