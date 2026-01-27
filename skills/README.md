# Cursor Agent Skills

This folder contains **SKILL.md** files for Cursor agent skills. Skills give the agent domain-specific procedures, commands, and error-handling for particular tasks.

| Skill | File | Use when |
|-------|------|----------|
| **Railway Deploy & Verify** | [railway-deploy.SKILL.md](./railway-deploy.SKILL.md) | Deploy ADPA backend to Railway, confirm latest repo, fix "Skipped: No Changes" or deploy timeouts |
| **Digital Twin Implementation** | [digital-twin-implementation.SKILL.md](./digital-twin-implementation.SKILL.md) | Implementing Digital Twin UI, services, API, or schema; ensure correct React/module usage and event-driven flow. Includes [iTwin.js](https://www.itwinjs.org/) and [iTwinUI](https://itwinui.bentley.com/docs) for connectors, Viewer, and Bentley-aligned UI. |
| **Digital Twin Safe Implementation** | [digital-twin-safe-implementation.SKILL.md](./digital-twin-safe-implementation.SKILL.md) | Risk-aware Digital Twin work: migrations, events, triggers, connectors, RLS; apply mitigations and pre-merge checks |
| **Add a New Template** | [add-template.SKILL.md](./add-template.SKILL.md) | Add a new document template via UI, API, or seed; add a new framework (e.g. Construction); validate and register templates correctly |

Agents discover skills when your request matches the "When to use" triggers. You can also invoke a skill via the slash command menu if configured.
