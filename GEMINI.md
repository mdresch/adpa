# ADPA Framework `GEMINI.md`

This document provides essential context for the ADPA (Advanced Document Processing & Automation) Framework, a full-stack enterprise application. Use this as a guide for understanding the project's architecture, conventions, and key commands.

## Project Overview

ADPA is a comprehensive platform for AI-powered document generation, management, and automation. It is built with a modern, enterprise-grade architecture.

-   **Frontend**: A Next.js 14+ application using the App Router, located in the `app/` directory. It uses TypeScript, Tailwind CSS, and various Radix UI components for the user interface.
-   **Backend**: A separate Express.js server, which seems to handle the core business logic. The `next.config.mjs` file is configured to proxy requests from `/api` on the frontend to a backend server running on port `5000`.
-   **Database**: The project uses PostgreSQL as its database. Drizzle ORM is used for database access, with the main schema likely located at `lib/morphic/db/schema.ts` as indicated by `drizzle.config.ts`.
-   **AI Integration**: The application integrates multiple AI providers, including OpenAI, Google AI (Gemini), and local models via Ollama. It also uses Langfuse for tracing.
-   **Core Technologies**: TypeScript, Next.js, React, Express.js, PostgreSQL, Drizzle ORM, Tailwind CSS, Sentry (for error monitoring), and various AI SDKs.

## Agent Skills System

The project utilizes a specialized "Skills" system to provide domain-specific knowledge and procedural guidance to AI agents (like Gemini CLI or Cursor). This system is critical for ensuring that agent-driven changes are consistent with the project's architecture and best practices.

-   **Location**: Skills are defined in the `skills/` directory and the root directory. Each skill consists of a `SKILL.md` file that contains the core documentation and procedural logic.
-   **Purpose**: Each skill gives the agent instructions on how to handle specific tasks, such as deploying to Railway, implementing a digital twin feature, or adding a new document template. They define when the skill should be triggered, the steps to take, and important context.
-   **Loading**: These skill files are actively loaded at runtime by the AI agent. When you make a request, the agent matches your request to the "When to use" triggers defined in the skill files to apply the correct procedure.
-   **Convention**: When adding or modifying a significant feature, you should also create or update the corresponding `SKILL.md` file. This ensures the project's architectural knowledge is captured and can be used by the agent for future tasks.

## Building and Running

The project uses `pnpm` as its package manager. The `README.md` and `package.json` provide the necessary commands to run the application.

### Key Commands

-   **Install Dependencies**:
    ```bash
    pnpm install
    ```
    *Note: The `README.md` also mentions running `npm install` inside a `server` directory, suggesting the backend has its own `package.json`.*

-   **Run Development Servers**:
    The frontend and backend run as separate processes.

    *   **Frontend (Next.js)**:
        ```bash
        pnpm dev
        ```
        This starts the Next.js development server on `http://localhost:3005`.

    *   **Backend (Express.js)**:
        Based on the `README.md`, the command is:
        ```bash
        # From the root directory
        cd server && npm run dev
        ```
        This likely starts the Express server on `http://localhost:5000`.

-   **Build for Production**:
    ```bash
    pnpm build
    ```

-   **Run Production Server**:
    ```bash
    pnpm start
    ```

-   **Linting**:
    ```bash
    pnpm lint
    ```

### Database Migrations

Drizzle Kit is used for managing database schemas and migrations.

-   **Apply Migrations**:
    ```bash
    pnpm migrate
    ```

-   **Reset and Seed Database (for development)**:
    ```bash
    pnpm migrate:dev
    ```

## Development Conventions

-   **Tech Stack**: Strictly use TypeScript for all new code. Adhere to the established stack (Next.js, Drizzle, tRPC, etc.).
-   **Styling**: Use Tailwind CSS for styling, following the configuration in `tailwind.config.ts`.
-   **Components**: Reusable UI components are located in the `components/` directory.
-   **API Routes**:
    -   Next.js API routes under `app/api/morphic/` handle client-side calls that are processed by the Next.js server itself.
    -   Most API calls (to `/api/*`) are proxied to the external Express backend.
-   **Database Schema**: All database schema changes must be managed through Drizzle ORM and migrations. The schema is located at `lib/morphic/db/schema.ts`.
-   **Environment Variables**: Use the `.env.local.example` file as a template for local development. Do not commit `.env.local` files to version control.
