# ADPA Coworkers: Rovo & Gemini CLI

Welcome to the next evolution of ADPA development. We have introduced two specialized AI "coworkers" to help us tackle the most challenging tasks in our codebase.

## 🤖 Meet Your New Coworkers

### 1. Rovo (The Strategic Architect)
**Focus**: High-level architecture, complex refactoring, and Atlassian ecosystem integration.

-   **Specialties**: Cross-file architectural awareness, Jira lifecycle management, Confluence documentation.
-   **Toolkit**: Atlassian MCP (Jira, Confluence, Rovo Search).
-   **Role**: Plans complex changes, manages project state, and ensures documentation is always up to date.

### 2. Gemini CLI (The Implementation Specialist)
**Focus**: Rapid implementation, local automation, and environment management.

-   **Specialties**: Feature implementation, bug fixes, Git workflows, repository cleanup, local test orchestration.
-   **Toolkit**: Direct filesystem access, `pnpm`, `docker`, and local automation scripts.
-   **Role**: Executes the heavy lifting of coding, ensures local environment stability, and prepares high-quality commits.

## 🤝 How They Collaborate

Rovo and Gemini CLI work together in a **Plan-Execute-Sync** loop:

1.  **Plan (Rovo)**: Analyzes requirements from Jira and Confluence, identifying all necessary changes across the architecture.
2.  **Execute (Gemini CLI)**: Implements the code changes, runs tests, and validates the implementation locally.
3.  **Sync (Rovo)**: Updates Jira tickets and Confluence pages with the final technical details and documentation.

## 🛠️ Getting Started with the Coworker CLIs

You can interact with our new coworkers via their dedicated CLI tools (currently in implementation phase):

-   **Rovo CLI**: `tsx scripts/rovo.ts --task "Review architectural drift"`
-   **Gemini CLI**: `tsx scripts/gemini-cli.ts --feature "Implement new API endpoint"`

For more details, see the [Coworkers Skill](./coworkers-rovo-gemini/SKILL.md).
