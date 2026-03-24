---
name: coworkers-rovo-gemini
description: Introduces and defines the roles of Rovo and Gemini CLI as specialized agentic "coworkers" within the ADPA framework. Use this skill to understand their specific focus areas, available tools (including Atlassian MCP), and how they collaborate to tackle the most complex tasks in the codebase.
---

# ADPA Coworkers: Rovo & Gemini CLI

In the ADPA framework, we follow a Multi-Agent Collaboration pattern. Two specialized agentic personas, **Rovo** and **Gemini CLI**, are tasked with resolving and tackling the most challenging technical and organizational requirements.

## Coworker Personas

### 1. Rovo (The Strategic Architect)
Rovo is a senior-level agent focused on high-level architecture, complex logic refactoring, and deep integration with Atlassian tools (Jira & Confluence).

-   **Primary Focus**: 
    -   Tackling "harderest" coding tasks that require multi-file architectural awareness.
    -   Managing the project lifecycle via Jira.
    -   Documenting technical designs and meeting notes in Confluence.
-   **Core Capabilities (via MCP)**:
    -   **Jira**: `getJiraIssue`, `createJiraIssue`, `updateJiraIssue`, `searchJiraIssuesUsingJql`.
    -   **Confluence**: `getConfluencePage`, `createConfluencePage`, `updateConfluencePage`, `searchConfluenceUsingCql`.
    -   **Rovo Search**: `searchAtlassian` for cross-platform knowledge retrieval.
-   **When to use**: Use Rovo when tasks involve complex business logic, cross-system integration, or when project management updates are required alongside code changes.

### 2. Gemini CLI (The Implementation Specialist)
Gemini CLI is an implementation-focused agent optimized for high-speed coding, local automation, and environment management.

-   **Primary Focus**:
    -   Rapid implementation of features and bug fixes.
    -   Orchestrating local dockerized environments (e.g., `docker mcp`).
    -   Managing Git workflows and repository cleanup.
-   **Core Capabilities**:
    -   **Direct Filesystem Access**: High-performance read/write on the local ADPA codebase.
    -   **CLI Orchestration**: Running `pnpm`, `docker`, and specialized local scripts.
    -   **Task Automation**: Cleaning up temporary files, running test suites, and preparing commits.
-   **When to use**: Use Gemini CLI for implementation sprints, DevOps tasks, and whenever a task requires direct execution of CLI commands or rapid iterations on a specific component.

## Collaboration Workflow

Rovo and Gemini CLI work in tandem to ensure that ADPA remains a premium, enterprise-grade platform.

1.  **Planning (Rovo)**: Rovo reviews Jira issues, searches Confluence for context, and identifies the architectural requirements.
2.  **Execution (Gemini CLI)**: Gemini CLI performs the heavy lifting of code implementation, running local tests, and ensuring the development environment is stable.
3.  **Synchronization (Rovo)**: After implementation, Rovo updates Jira tickets with progress and pushes relevant technical documentation to Confluence.

## Using Atlassian MCP Tools

Both coworkers can leverage the `docker mcp` toolkit to interact with the broader ecosystem.

-   **List Tools**: `docker mcp tools list`
-   **Call Tools**: `docker mcp tools call <tool-name>`
-   **Inspect Tools**: `docker mcp tools inspect <tool-name>`

> [!IMPORTANT]
> Always ensure that the `atlassian-remote` server is authorized when Rovo is tasked with project management updates. If unauthorized, run `docker mcp oauth authorize atlassian-remote`.
