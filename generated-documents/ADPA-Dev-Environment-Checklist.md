# ADPA Development Environment Setup Checklist

This checklist will help you set up the development environment for the ADPA project, following the technical stack and requirements in the implementation plan.

---

## 1. Prerequisites
- [x] Install **Node.js** (version 18.x or higher)
- [x] Install **npm** (comes with Node.js) or **yarn**
- [x] Install **Docker** (for containerization and local development)
- [x] Install **Git** (for version control)
- [ ] (Optional) Install **Kubernetes** (for local cluster testing)
- [ ] (Optional) Install **VS Code** or your preferred IDE

## 2. Repository Setup
- [x] Clone the repository: `git clone <repo-url>`
- [x] Install dependencies: `npm install` or `yarn install`
- [x] Review and update `.env` and configuration files as needed
- [x] Ensure `config-rga.json` is present and configured

## 3. TypeScript & Linting
- [x] Ensure **TypeScript** (≥5.7) is installed: `npm install -g typescript` (if not already)
- [x] Compile the project: `npm run build` or `tsc`
- [x] Run linter: `npm run lint` (if available)

## 4. Frontend Setup
- [x] Install frontend dependencies in `admin-interface` (if separate): `cd admin-interface && npm install`
- [x] Start the Next.js/React admin portal: `npm run dev` or `yarn dev`

## 5. Backend/API Setup
- [x] Start the API server: `npm run start:api` or `npm run dev:api`
- [x] Verify Express.js endpoints are running (default: `http://localhost:3001/api/v1`)

## 6. Database & Storage (if required)
- [ ] Set up any required databases (e.g., PostgreSQL, MongoDB) as per documentation
- [ ] Configure connection strings in `.env` or config files

## 7. AI Provider Integration
- [x] Obtain API keys/tokens for OpenAI, Google AI, Copilot, Ollama, etc.
- [x] Add credentials to `.env` or secure config
- [x] Test provider connectivity (see project scripts or test commands)

## 8. Optional: Docker & Kubernetes
- [x] Build Docker images: `docker build -t adpa .`
- [x] Run containers locally: `docker-compose up`
- [ ] (Optional) Deploy to local Kubernetes cluster

## 9. Validation
- [x] Run all tests: `npm test` or `yarn test`
- [x] Verify CLI, API, and web portal are operational
- [x] Confirm document generation works end-to-end

---

*Update this checklist as the project evolves or as new requirements are added.*
