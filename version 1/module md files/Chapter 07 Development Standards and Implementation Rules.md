# 📘 Chapter 07 – Development Standards & Implementation Rules

> **Document Status:** Official Production Engineering Standard & Developer Implementation Manual  
> **Target Audience:** Full-Stack Engineers, DevOps Engineers, QA Engineers, and AI Coding Assistants (Claude Code, Cursor AI, Antigravity)  
> **Application Context:** iPOMS Enterprise (Placement Operation Management System)  
> **Technology Stack:** Next.js 14+ (App Router, Tailwind CSS, TypeScript/JavaScript), Node.js / Express.js (3-Tier Layered Architecture: Controller ➔ Service ➔ Repository ➔ Mongoose ODM ➔ MongoDB 7.0+)  

---

# Document Control

| **Version** | **Date** | **Description** | **Prepared By** | **Approved By** |
|---|---|---|---|---|
| v7.0 | 08-Aug-2026 | Master Technical Engineering Standard for Chapter 7 – Development Standards & Implementation Rules. Establishes binding coding, git, environment, testing, error handling, code review, deployment, backup, security, and documentation standards prior to Project Scaffolding & Implementation. | Infoziant Lead Architecture Team | Approved |

---

# Table of Contents

1. **Section 7.1 – Coding Standards & Naming Conventions**
   - 7.1.1 File & Directory Naming Rules
   - 7.1.2 Variable & Constant Naming Conventions
   - 7.1.3 Function & Method Naming Conventions
   - 7.1.4 Frontend React Component & Hook Conventions
   - 7.1.5 REST API Naming & URL Structure Standards
   - 7.1.6 Database Schema Field Naming Rules
2. **Section 7.2 – Git & Version Control Strategy**
   - 7.2.1 Git Flow Branching Strategy
   - 7.2.2 Conventional Commit Message Specifications
   - 7.2.3 Feature Branch & Pull Request (PR) Rules
   - 7.2.4 Code Merge & Release Tagging Protocol
3. **Section 7.3 – Environment Management & Configuration**
   - 7.3.1 4-Tier Environment Lifecycle (DEV ➔ TEST ➔ STG ➔ PROD)
   - 7.3.2 Environment Variable Security & `.env` Separation
   - 7.3.3 Mandatory Application Environment Variables Registry
4. **Section 7.4 – Comprehensive Testing Strategy**
   - 7.4.1 Unit Testing Standards (Jest / Vitest)
   - 7.4.2 Backend API Integration Testing (Supertest + Test DB)
   - 7.4.3 Frontend Component Testing (React Testing Library)
   - 7.4.4 End-to-End (E2E) Testing (Playwright / Cypress)
   - 7.4.5 Automated Regression & Smoke Test Pipeline
5. **Section 7.5 – Error Handling & Logging Standards**
   - 7.5.1 Standardized API Error Response Contract
   - 7.5.2 HTTP Status Code & Error Class Taxonomy
   - 7.5.3 Frontend Error Boundaries & Axios Interceptor Handling
   - 7.5.4 Structured Logging Architecture (Winston + Morgan + Correlation IDs)
6. **Section 7.6 – Code Review & Quality Standards**
   - 7.6.1 Automated Static Analysis & Linting (ESLint + Prettier + Husky)
   - 7.6.2 Peer Code Review Checklist (6 Core Pillars)
   - 7.6.3 Code Coverage & Complexity Thresholds
7. **Section 7.7 – Build & Deployment Standards**
   - 7.7.1 CI/CD Pipeline Lifecycle (GitHub Actions / GitLab CI)
   - 7.7.2 Next.js Standalone Build & Docker Containerization
   - 7.7.3 Environment Deployment Gateways & Rollback Rules
8. **Section 7.8 – Backup & Recovery Standards**
   - 7.8.1 MongoDB Database Backup Strategy (PITR + Snapshots)
   - 7.8.2 Disaster Recovery Targets (RPO & RTO Specifications)
   - 7.8.3 Soft-Delete & 90-Day Purge Operational Safeguards
9. **Section 7.9 – Security Development Standards (10 Golden Commandments)**
   - 7.9.1 The 10 Golden Commandments of iPOMS Security
   - 7.9.2 Input Sanitization, NoSQL Injection & OWASP Top 10 Safeguards
   - 7.9.3 Rate Limiting, CORS & Security Header Specifications
10. **Section 7.10 – Documentation & Maintenance Standards**
    - 7.10.1 OpenAPI 3.0 / Swagger & Postman Documentation
    - 7.10.2 Architecture Decision Records (ADR) & Markdown Standards
    - 7.10.3 Codebase Commenting & Changelog Maintenance Protocol

---

# Section 7.1 – Coding Standards & Naming Conventions

To guarantee absolute consistency across human developers and AI coding assistants, the iPOMS codebase strictly enforces uniform naming conventions, single-responsibility boundaries, and architectural adherence across all software layers.

### 7.1.1 The 10 Core Architectural Coding Principles

1. **Strict Naming Consistency:** Universal naming rules across files, folders, components, functions, variables, constants, hooks, services, controllers, repositories, API endpoints, and database fields.
2. **One Responsibility Per File / Class / Function:** A function must never mix validation, database queries, business rules, and response formatting into a monolithic block. Clean separation of concerns is mandatory:
   ```text
   Backend:  Route ➔ Middleware ➔ Controller ➔ Service ➔ Repository ➔ MongoDB
   Frontend: Page ➔ Layout ➔ Feature Component ➔ Custom Hook ➔ API Client Service
   ```
3. **No Business Logic in UI Components:** React components focus strictly on rendering, user interaction, props, and emitting actions. All calculations, domain transitions, and formatting logic reside in custom hooks, utilities, or services.
4. **No Direct Database Access from Controllers:** Controllers must never import Mongoose models or execute raw database queries directly. All database access routes strictly through the Repository layer.
5. **No Duplicate Shared Logic (DRY Enforcement):** Developers must check existing shared components (`components/ui`), hooks (`hooks/`), utilities (`lib/utils`), and validators before creating new helpers.
6. **Type Safety & Data Contracts:** Request bodies, query parameters, and response envelopes adhere to strict, predictable data schemas across frontend and backend.
7. **Meaningful Intent-Based Comments:** Comments must explain *why* non-obvious logic exists, not repeat *what* the code self-evidently does.
8. **No Hardcoded Business Configuration:** Thresholds, limits, retention windows, pagination sizes, and system enums must reside in `.env`, `config/constants.js`, or the `app_settings` collection.
9. **No Secrets in Source Code:** Zero tolerance for hardcoded API keys, JWT secrets, passwords, or cloud credentials in source files or Git commits.
10. **Strict Architecture Compliance:** Developers and AI assistants must follow the frozen architecture (Chapters 1–6). Bypassing architectural tiers for "convenience" is strictly prohibited. Architectural modifications require a documented and approved Architecture Decision Record (ADR).

---

### 7.1.2 File & Directory Naming Rules

| Software Layer | Target | Case Convention | Example File / Path |
|---|---|---|---|
| **Frontend (Next.js)** | Components | `kebab-case.tsx` | `components/features/daily-tracker/daily-tracker-table.tsx` |
| **Frontend (Next.js)** | Hooks | `kebab-case.ts` (starts with `use-`) | `hooks/use-daily-tracker.ts` |
| **Frontend (Next.js)** | App Router Pages | `page.tsx`, `layout.tsx`, `loading.tsx` | `app/(dashboard)/daily-tracker/page.tsx` |
| **Frontend (Next.js)** | Route Handlers | `route.ts` | `app/api/v1/daily-tracker/route.ts` |
| **Backend (Node/Express)** | Controllers | `camelCaseController.js` | `controllers/dailyTrackerController.js` |
| **Backend (Node/Express)** | Services | `camelCaseService.js` | `services/dailyTrackerService.js` |
| **Backend (Node/Express)** | Repositories | `camelCaseRepository.js` | `repositories/dailyTrackerRepository.js` |
| **Backend (Node/Express)** | Models / Schemas | `camelCaseModel.js` | `models/dailyTrackerModel.js` |
| **Backend (Node/Express)** | Routes | `camelCaseRoutes.js` | `routes/dailyTrackerRoutes.js` |
| **Backend (Node/Express)** | Validators | `camelCaseValidator.js` | `validators/dailyTrackerValidator.js` |
| **Directories (All)** | Folder Names | `kebab-case` or lowercase | `src/modules/daily-tracker/`, `src/components/ui/` |

---

### 7.1.3 Variable & Constant Naming Conventions

1. **Variables & Properties (`camelCase`):**
   - All local variables, object keys, and class parameters must use `camelCase`.
   - *Examples:* `userId`, `companyName`, `isFinalized`, `totalCallsCount`.
2. **Boolean Variables (Strict Prefix Rules):**
   - Boolean variables must begin with a descriptive verb prefix: `is`, `has`, `should`, `can`, or `did`.
   - *Correct:* `isActive`, `hasPermission`, `canEdit`, `isDeleted`, `shouldAutoSave`.
   - *Incorrect:* `active`, `permission`, `editable`, `deleted`.
3. **Global Constants (`UPPER_SNAKE_CASE`):**
   - True immutable constants must use `UPPER_SNAKE_CASE`.
   - *Examples:* `MAX_IMPORT_ROW_LIMIT = 5000`, `DEFAULT_PAGE_SIZE = 25`, `RECYCLE_BIN_RETENTION_DAYS = 90`, `IST_TIMEZONE = 'Asia/Kolkata'`.

---

### 7.1.4 Function & Method Naming Conventions

Functions must be named using **verb-first `camelCase`** reflecting their specific operational purpose.

| Category | Verb Prefix | Example Function Name | Primary Responsibilities |
|---|---|---|---|
| **Data Retrieval** | `get`, `fetch`, `find` | `getUserById(id)`, `findDailyLogsByDate(date)` | Query data without side effects |
| **Data Creation** | `create`, `add`, `insert` | `createDailyLog(payload)`, `addCollege(data)` | Insert new entity into database |
| **Data Modification** | `update`, `modify` | `updateHRMetadata(id, updates)` | Update existing document fields |
| **State Transformation** | `finalize`, `sync`, `restore` | `finalizeDailyTracker(id)`, `syncHRToMaster()` | Execute state machine or domain workflow |
| **Deletion / Archive** | `softDelete`, `hardPurge` | `softDeleteToRecycleBin(id)`, `hardPurgeRecord(id)` | Mark soft-deleted or execute permanent purge |
| **Validation** | `validate`, `check` | `validateImportRow(row)`, `checkRolePermission()` | Boolean or exception validation checks |

---

### 7.1.5 Frontend React Component & Hook Conventions

1. **React Components (`PascalCase`):**
   - Components must use `PascalCase` matching their file name.
   - Use named exports for UI and Feature components (`export function UserCard()`).
   - Default exports are strictly reserved for Next.js page components (`export default function DailyTrackerPage()`).
2. **Custom React Hooks (`camelCase` with `use` Prefix):**
   - All custom hooks must begin with `use` (e.g., `useDailyTracker`, `useAuth`, `useCompanyMetadata`).

---

### 7.1.6 REST API Naming & URL Structure Standards

1. **Base API Path:** All API routes must begin with `/api/v1/`.
2. **Resource Nouns (`kebab-case`, Plural):**
   - Endpoint paths must use plural nouns in lowercase `kebab-case`.
   - *Correct:* `/api/v1/daily-trackers`, `/api/v1/company-metadata`, `/api/v1/recycle-bin/items`.
   - *Incorrect:* `/api/v1/getDailyTracker`, `/api/v1/company_metadata`, `/api/v1/user`.
3. **Standard HTTP Verbs:**

```text
GET    /api/v1/daily-trackers            ➔ Fetch paginated daily tracker records
POST   /api/v1/daily-trackers            ➔ Create a new daily tracker log entry
GET    /api/v1/daily-trackers/:id        ➔ Fetch a single daily tracker by ID
PUT    /api/v1/daily-trackers/:id        ➔ Update an existing daily tracker
DELETE /api/v1/daily-trackers/:id        ➔ Soft-delete daily tracker (move to Recycle Bin)
POST   /api/v1/daily-trackers/:id/sync   ➔ Execute explicit domain action (e.g. HR Sync)
```

---

### 7.1.7 Database Schema Field Naming Rules

In accordance with Chapter 5 MongoDB Specifications:
- Document fields use `snake_case` (e.g., `college_id`, `company_name`, `call_date`, `is_deleted`, `created_at`, `updated_at`).
- Foreign key reference fields must strictly append `_id` (e.g., `user_id`, `college_id`, `company_metadata_id`).

---

### 7.1.8 Formal Architectural Decisions Sign-Off (Q1 – Q6)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Strict naming conventions across full stack?** | **YES (Approved)** | Pre-commit ESLint rules & repository file naming linters. |
| **Q2: Single responsibility per file/class/function?** | **YES (Approved)** | SonarQube complexity checks & PR peer review gates. |
| **Q3: Prohibit bypassing architectural tiers?** | **YES (Approved)** | Architectural code review checks; controllers cannot import models. |
| **Q4: Check existing shared logic before creating duplicates?** | **YES (Approved)** | DRY audit during code review; centralized component & hook library. |
| **Q5: Total prohibition of secrets in Git/codebase?** | **YES (Mandatory)** | Gitleaks / GitGuardian pre-commit secret detection hooks. |
| **Q6: Architectural changes require formal approval & ADR?** | **YES (Approved)** | ADR documentation required in `docs/adr/` before merge. |

---

# Section 7.2 – Git & Version Control Strategy

iPOMS enforces a disciplined, safe, and transparent Git and version control strategy to ensure that all changes across Frontend, Backend, Database, Jobs, Integrations, Documentation, and Tests are developed, reviewed, and released predictably without relying on local machines or individual memory.

### 7.2.1 Primary Repository Structure (Monorepo Layout)

For Version 1, iPOMS is maintained within **one primary repository** to maintain strict end-to-end synchronization across all tiers:

```text
iPOMS/
├── frontend/          # Next.js 14+ App Router client application
├── backend/           # Node.js / Express 3-Tier REST API application
├── docs/              # Master architecture, module specs, API schemas & ADRs
│   ├── architecture/  # Frozen Chapters 01 to 07
│   ├── adr/           # Architecture Decision Records
│   └── api/           # OpenAPI / Swagger & Postman collections
├── scripts/           # DB migrations, seeders, data patches & maintenance scripts
├── tests/             # End-to-End (Playwright) & cross-service integration suites
└── README.md          # Project overview, setup guide, and onboarding handbook
```

---

### 7.2.2 Main Branching Hierarchy

iPOMS follows a simplified Git Flow branching strategy:

```text
main (Production-Ready Code — Sealed & Protected)
  ▲
  │ (Validated Release Merge + SemVer Tag)
develop (Active Integration Branch for Completed Features)
  ▲
  │ (Feature Merge via Reviewed Pull Request)
  ├── feature/authentication
  ├── feature/company-metadata
  ├── feature/daily-tracker
  ├── feature/weekly-tracker
  ├── feature/notifications
  ├── fix/prevent-duplicate-leads
  └── refactor/separate-notification-service
```

- **`main`:** Contains strictly stable, production-ready code. No direct commits allowed.
- **`develop`:** The central integration branch where completed feature branches merge prior to release.
- **`feature/*`:** Isolated branches created off `develop` for individual modules or capabilities.
- **`fix/*` / `bugfix/*`:** Branches created off `develop` to resolve issues identified in QA/Testing.
- **`hotfix/*`:** Urgent branches created off `main` to address critical production issues.

---

### 7.2.3 Feature Branch Workflow

Developers and AI coding tools must never develop directly on `main` or `develop`. The lifecycle is strictly enforced:

```text
develop ➔ Checkout feature/branch ➔ Local Development ➔ Unit/Integration Testing ➔ Pull Request ➔ Peer Review & CI Gates ➔ Merge into develop ➔ Release Validation ➔ Merge into main
```

---

### 7.2.4 Commit Message Standards (Conventional Commits)

Commits must describe *what* and *why* changes occurred using the **Conventional Commits** format. Ambiguous messages (`update`, `changes`, `latest`, `working`) are strictly rejected.

- `feat:` A new user-facing or system capability (`feat: add company metadata search and filter endpoint`)
- `fix:` A bug fix (`fix: prevent duplicate daily lead entries on rapid click`)
- `refactor:` Code restructuring without behavioral change (`refactor: separate notification service into queue worker`)
- `test:` Adding or updating tests (`test: add recycle bin restore integration tests`)
- `docs:` Updating specifications or architecture (`docs: reconcile weekly tracker 7-section workflow`)
- `chore:` Tooling, dependency, or configuration updates (`chore: update Mongoose ODM to v8.2.0`)
- `perf:` Performance optimizations (`perf: add compound index on daily tracker college_id and call_date`)

---

### 7.2.5 Commit Granularity & Atomic Commits

Commits must represent a single logical change. Massive multi-module commits (e.g., 50 files mixing auth, DB, UI, and reports) are prohibited. Changes must be split into clean atomic steps:
1. `feat(company-metadata): create company metadata mongoose model and indexes`
2. `feat(company-metadata): add company metadata repository with search queries`
3. `feat(company-metadata): implement controller and validation schema`
4. `feat(company-metadata): build frontend search panel component and hook`

---

### 7.2.6 Pull Request (PR) Requirements

Every change merging into `develop` or `main` must go through a formal Pull Request. The PR description must explicitly document:
1. **Summary of Changes:** What was implemented or modified.
2. **Business & Module Impact:** Which of the 14 iPOMS modules are affected.
3. **Testing Verification:** Which unit, integration, or manual tests were run.
4. **Database & API Impacts:** Schema alterations, index additions, or API contract modifications.
5. **Security Implications:** RBAC permissions checked, input sanitization applied.

---

### 7.2.7 Multi-Layer Code Review Standards

Before any PR can merge into `develop`, it must pass review across 6 dimensions:
1. **Architecture Compliance:** Strict adherence to Chapter 6 (Controller ➔ Service ➔ Repository, Page ➔ Feature ➔ Hook ➔ API).
2. **Security & RBAC:** Proper middleware attachment (`authenticateJWT`, `authorizeRoles`), zero exposed secrets.
3. **Database Integrity:** Follows Chapter 5 collection design, compound indexes utilized, soft-delete honored.
4. **API Consistency:** Standard `/api/v1` REST naming, uniform JSON error responses.
5. **Frontend State & Components:** No business logic in UI, proper hook isolation, error boundaries configured.
6. **Test Coverage:** Relevant unit or integration tests accompany the code changes.

---

### 7.2.8 Branch Protection Rules for `main` & `develop`

The `main` and `develop` branches are protected with the following automated rules:
- **Direct Pushes Prohibited:** All changes must arrive via approved Pull Requests.
- **Required Reviews:** Minimum 1 Senior/Lead Engineer approval required.
- **Required Status Checks:** Automated build, ESLint/Prettier checks, and test suites must pass 100%.
- **No Force Pushes (`--force`):** History rewriting is permanently disabled.
- **Linear History:** Squash and merge or rebase merge enforced to prevent messy merge bubbles.

---

### 7.2.9 Semantic Versioning (SemVer) & Release Tagging

Every production release from `main` must be tagged with a Semantic Version (`vMAJOR.MINOR.PATCH`):
- `v1.0.0`: Initial production release of iPOMS Core Platform.
- `v1.0.1`: Maintenance patch release resolving minor defects.
- `v1.1.0`: Minor feature release adding new non-breaking capabilities (e.g., advanced analytics).
- Release tags enable instant rollback to a known, stable deployment state.

---

### 7.2.10 Production Hotfix Workflow

When a critical bug is discovered in Production:
```text
main (v1.0.0) ➔ Checkout hotfix/v1.0.1-fix-name ➔ Implement Fix ➔ Automated Tests ➔ PR & Review ➔ Merge to main (Tag v1.0.1) ➔ Back-merge to develop
```
- **Mandatory Back-Merge:** The hotfix branch or `main` must immediately be merged back into `develop` to prevent regression in future releases.

---

### 7.2.11 Database Changes & Migration Tracking in Git

- All database schema modifications, seeders, index scripts, and data fix utilities must be committed under `/scripts` (e.g., `scripts/migrations/20260815_add_ttl_index.js`).
- Database adjustments must never be applied manually on staging/production without a corresponding committed script in Git.

---

### 7.2.12 Synchronized Documentation Maintenance

Documentation is treated as first-class code:
- When a workflow, business rule, or data schema is modified in code, the corresponding Markdown specification in `/docs` MUST be updated in the same Pull Request.
- Prevents architectural drift between implementation and design specifications.

---

### 7.2.13 AI Coding Tool Governance & Safety Net

Because AI-assisted development tools (Claude Code, Cursor AI, Antigravity) are utilized in iPOMS construction, an automated safety net is enforced:
```text
AI Coding Tool / Developer
           ↓
    Feature Branch
           ↓
Automated Lint & Tests
           ↓
Human Peer Review
           ↓
  Pull Request into develop
           ↓
 Release Validation
           ↓
       main
```
- **Rule:** AI tools are strictly prohibited from pushing directly to `develop` or `main`. All AI-generated code must pass through feature branches, automated tests, and human peer reviews before integration.

---

### 7.2.14 Formal Architectural Decisions Sign-Off (Q1 – Q7)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: One primary repository for full iPOMS stack?** | **YES (Approved)** | Monorepo layout (`/frontend`, `/backend`, `/docs`, `/scripts`, `/tests`) |
| **Q2: Strictly protect `main` for production code?** | **YES (Approved)** | GitHub/GitLab Branch Protection rules (zero direct pushes) |
| **Q3: Use `develop` as central integration branch?** | **YES (Approved)** | Protected `develop` branch requiring reviewed PRs |
| **Q4: Isolated feature/bugfix branches for all tasks?** | **YES (Approved)** | `feature/*` and `fix/*` naming and lifecycle standard |
| **Q5: Mandatory Pull Requests for all merges?** | **YES (Approved)** | PR template with impact, test, and security audit checklists |
| **Q6: Mandatory automated test/lint/build checks in CI?** | **YES (Approved)** | CI pipeline status checks block PR merging on failure |
| **Q7: Semantic Versioning tags for production releases?** | **YES (Approved)** | Git tags (`v1.0.0`, `v1.0.1`) required on every `main` release |

---

# Section 7.3 – Environment Management & Configuration

To guarantee application stability, prevent cross-environment pollution, and ensure zero security leaks, iPOMS strictly adheres to the core principle:

> **The application code remains 100% identical; environment-specific configuration changes.**

---

### 7.3.1 4-Tier Environment Lifecycle & Hardware Boundaries

```text
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│     DEVELOPMENT (DEV)   │ ──➔ │      TESTING (TEST)     │ ──➔ │      STAGING (STG)      │ ──➔ │    PRODUCTION (PROD)    │
│  - Local workstation    │     │  - Automated CI runner  │     │  - Prod-mirror cluster  │     │  - Live user traffic    │
│  - Local MongoDB        │     │  - In-memory test DB    │     │  - Staging MongoDB DB   │     │  - Multi-region Atlas   │
│  - Mock 3rd-party APIs  │     │  - Ephemeral containers │     │  - Production-like load │     │  - Strict access logs   │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

1. **Development (DEV):** Dedicated to active local coding. Connects strictly to a local MongoDB instance or isolated dev container. External services (email/SMS/Teams) are mocked or pointed to test sandboxes.
2. **Testing (TEST/QA):** Dedicated to automated CI unit/integration test suites. Executes against ephemeral in-memory databases with zero persistence.
3. **Staging (STG):** Exact replica of the production environment (Nginx reverse proxy, Node runtime, database cluster topology). Used for final user acceptance testing (UAT) and release candidate validation.
4. **Production (PROD):** Highly available, secured, production-grade cluster serving live end-users. Access is strictly audited and gated.

---

### 7.3.2 Strict Environment Database Isolation

Under no circumstances may an environment connect to a database belonging to a different tier.

```text
Development Environment ──➔ iPOMS_DEV Database (localhost / dev cluster)
Testing Environment     ──➔ iPOMS_TEST Database (In-Memory / ephemeral)
Staging Environment     ──➔ iPOMS_STG Database (isolated staging cluster)
Production Environment  ──➔ iPOMS_PROD Database (isolated production cluster)
```

- **Safety Guardrail:** Cross-tier database connections (e.g. local DEV connecting to PROD DB) are technically blocked via network firewalls and VPC peering rules.

---

### 7.3.3 Production Data Protection & Sanitization Protocol

1. **No Raw Production Data in Dev/Test:** Live production databases must never be cloned directly into developer machines or testing environments.
2. **Sanitized Synthetic Seeding:** Development and QA environments utilize deterministic synthetic seed scripts (`scripts/seeders/`).
3. **Sanitization Protocol for Staging UAT:** If production data is ever required for staging performance benchmarks, all Personally Identifiable Information (PII), student records, corporate HR phone numbers, and authentication hashes must be irreversibly masked and anonymized before transfer.

---

### 7.3.4 Frontend vs. Backend Configuration Boundary

A hard boundary is enforced between client-exposed and server-private configurations:

```text
┌──────────────────────────────────────────────────┐     ┌──────────────────────────────────────────────────┐
│             FRONTEND CONFIGURATION               │     │              BACKEND CONFIGURATION               │
│       (Publicly Exposed to Web Browser)          │     │        (Private & Cryptographically Secured)     │
├──────────────────────────────────────────────────┤     ├──────────────────────────────────────────────────┤
│ • Public API Base URL (NEXT_PUBLIC_API_BASE_URL) │     │ • MongoDB URI & Connection Credentials           │
│ • App Environment Name (NEXT_PUBLIC_APP_ENV)     │     │ • JWT Access & Refresh Token Signing Secrets     │
│ • Public Asset / CDN URLs                        │     │ • Cloud Storage (AWS S3) Secret Keys             │
│ • Client Sentry / Analytics Public DSN           │     │ • MS Teams / SMTP / WhatsApp Private Webhooks    │
│ ❌ NEVER: DB credentials, JWT secrets, API keys  │     │ • Bcrypt Salt Rounds & Encryption Keys           │
└──────────────────────────────────────────────────┘     └──────────────────────────────────────────────────┘
```

---

### 7.3.5 Application Configuration (`app_settings`) vs. Infrastructure Secrets

iPOMS strictly segregates application business settings from infrastructure environment secrets:

| Dimension | Environment Secrets (`.env` / Vault) | Business Application Settings (`app_settings` Collection) |
|---|---|---|
| **Storage Medium** | OS Environment / CI/CD Secrets Vault | MongoDB `app_settings` Database Collection |
| **Data Nature** | Infrastructure credentials, API keys, DB URIs | Operational limits, retention windows, dropdown enums |
| **Modification Method** | Server redeploy / CI/CD variable update | Director / Admin UI Control Panel (`/settings`) |
| **Examples** | `MONGODB_URI`, `JWT_SECRET`, `SMTP_PASSWORD` | `max_import_rows` (5000), `recycle_bin_ttl` (90 days) |
| **Client Visibility** | Never exposed to browser | Selected public settings exposed via `/api/v1/settings` |

---

### 7.3.6 Fail-Fast Startup Configuration Validation

The backend application will **refuse to boot** if mandatory environment variables are missing, malformed, or insecure:

```javascript
// src/config/envValidator.js
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters long'),
  CORS_ALLOWED_ORIGINS: z.string().min(1, 'CORS_ALLOWED_ORIGINS is required'),
  TIMEZONE: z.string().default('Asia/Kolkata'),
  ENABLE_TTL_PURGER: z.coerce.boolean().default(true),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ FATAL CONFIGURATION ERROR: Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1); // Fail immediately at startup
  }
  return result.data;
}
```

---

### 7.3.7 Least-Privilege Service Configuration

Different services in the iPOMS infrastructure receive only the specific configuration they require:
- **Web API Server:** Receives HTTP routing, Auth JWT secrets, DB connections, and CORS origins.
- **Background Cron Engine (`node-cron`):** Receives DB connection and scheduler flags; does NOT receive HTTP port or public CORS configs.
- **Next.js Client Application:** Receives only `NEXT_PUBLIC_*` variables.

---

### 7.3.8 Feature Flags Governance

1. **Controlled Rollouts:** Non-breaking optional features may be gated using boolean feature flags (e.g. `FEATURE_ADVANCED_ANALYTICS=true`).
2. **Temporary Lifecycle:** Feature flags must be short-lived. Once a feature is stabilized in Production, the flag and its conditional branching code must be removed in the subsequent sprint cleanup.

---

### 7.3.9 Mandatory Environment Variables Template (`.env.example`)

```env
# ==============================================================================
# iPOMS MASTER ENVIRONMENT CONFIGURATION TEMPLATE (.env.example)
# ==============================================================================

# Node Runtime & Server Specs
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
API_PREFIX=/api/v1
FRONTEND_URL=http://localhost:3000

# Next.js Public Client Configuration (Prefix: NEXT_PUBLIC_)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME="iPOMS Enterprise"

# MongoDB Persistence Cluster
MONGODB_URI=mongodb://localhost:27017/ipoms_dev
MONGODB_MAX_POOL_SIZE=50

# JWT & Cryptographic Secrets (Minimum 32 characters)
JWT_SECRET=super_secret_jwt_access_key_min_32_chars_dev_only
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=super_secret_refresh_token_key_dev_only
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Security, CORS & Rate Limiting
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# External Integration Adapters
MS_TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/dummy_sandbox_key
AWS_S3_BUCKET_NAME=ipoms-dev-exports
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=dummy_dev_access_key
AWS_SECRET_ACCESS_KEY=dummy_dev_secret_key

# Background Scheduler & Operational Flags
TIMEZONE=Asia/Kolkata
LOG_LEVEL=debug
ENABLE_TTL_PURGER=true
RECYCLE_BIN_RETENTION_DAYS=90
IMPORT_HISTORY_RETENTION_DAYS=90
```

---

### 7.3.10 Formal Architectural Decisions Sign-Off (Q1 – Q7)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Officially use 4 environments (DEV, TEST, STG, PROD)?** | **YES (Approved)** | Segregated deployment pipelines & infrastructure hosting |
| **Q2: Separate MongoDB database instance for each tier?** | **YES (Approved)** | VPC/network isolation; 100% discrete database connection strings |
| **Q3: Secrets provided via secret management & excluded from Git?** | **YES (Mandatory)** | `.gitignore`, Gitleaks CI scans, and runtime Vault injection |
| **Q4: Frontend receives strictly public-safe configuration?** | **YES (Approved)** | Next.js `NEXT_PUBLIC_` namespace filter; zero private secrets in bundle |
| **Q5: Fail-fast startup validation refusing to boot on error?** | **YES (Approved)** | `envValidator.js` with Zod schema validation on application entry |
| **Q6: Zero raw production data in Dev/Test without sanitization?** | **YES (Approved)** | Masking/anonymization pipeline for UAT; synthetic seeders for dev |
| **Q7: Traceable & documented configuration changes?** | **YES (Approved)** | Architecture Decision Records (ADRs) & Git history tracking |

---

# Section 7.4 – Comprehensive Testing Strategy

To guarantee that iPOMS reliably protects placement operations, company metadata, student interview tracking, and administrative security, testing is enforced across multiple synchronized layers. Testing is not merely for defect detection—it is an automated proof that our approved business rules remain unbroken.

```text
                 /\
                /  \     E2E Tests (Playwright / Cypress — Critical Business Journeys)
               /----\
              / API  \   API & Integration Tests (Supertest + In-Memory MongoDB)
             /--------\
            / Component\ Frontend Component & Form Tests (React Testing Library)
           /------------\
          /  Unit Tests  \ Unit Tests (Jest / Vitest — Services, Repos, Validators, Utils)
         /________________\
```

---

### 7.4.1 Multi-Layered Testing Pyramid Philosophy

- **High-Volume Unit Tests:** Fast, isolated tests targeting core services, conversion calculators, schema validators, and data transformers without external network or DB overhead.
- **Moderate Integration / API Tests:** Rigorous HTTP contract testing verifying middleware guards, RBAC authorization, and database persistence.
- **Targeted E2E Workflows:** End-to-end browser journeys validating multi-step operational flows.
- **Pragmatic Coverage Goal:** Meaningful coverage prioritized over vanity metrics. Focus on **≥ 80% coverage on core business logic** (Services, Repositories, Validators) rather than 100% on static UI styling.

---

### 7.4.2 Unit Testing Standards (Jest / Vitest)

- **Backend Logic:** Pure business functions, conversion metrics (`calculateConversionRate`), phone/email validators, and date utility functions.
- **Frontend Logic:** Custom hooks (`useDailyTracker`, `useCompanySearch`), permission checking helpers (`canUserPerformAction`), and form schema validators.
- **Isolation:** Tests execute in pure memory using mocks/stubs for external dependencies.

---

### 7.4.3 Repository & MongoDB Persistence Testing

Tests directly against ephemeral MongoDB test databases to verify:
- Accurate document insertion, retrieval, and atomic updates.
- Compound index efficiency and unique constraint enforcement (e.g. unique college codes).
- Soft-delete operations (`is_deleted: true`) and query filtering that excludes soft-deleted items.
- Multi-document MongoDB ACID transaction rollback on mid-operation failure.

---

### 7.4.4 Service & Core Business Rule Testing

Directly verifies the core business logic approved in Chapters 4–6:
1. **Daily Leads Transition:** Moving a lead from `Positive` ➔ `JD Received` updates the state machine while preserving the historical positive log entry.
2. **Weekly Tracker 7-Section Grouping:** Aggregates and moves companies into their exact approved section: *(1) Completed, (2) In Progress, (3) Pipeline, (4) Top Companies (Pinned), (5) Hold by TPO, (6) Hold by HR, (7) Rejected*.
3. **Recycle Bin Workflow:** Deleting a document moves a complete snapshot into `recycle_bin`; restoring it returns the record seamlessly to its original collection.
4. **Meeting Notifications:** Verifies broadcast delivery and explicit response states (`Will Attend`, `Cannot Attend`).

---

### 7.4.5 REST API Integration Testing (Supertest)

Executes full HTTP requests against Express route pipelines:
- Asserts HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`).
- Verifies that response envelopes strictly match the standardized JSON structure with request correlation IDs (`x-request-id`).
- Asserts that validation errors return field-level issues array.

---

### 7.4.6 Authentication & Session Security Testing

- **Valid Login:** Correct credentials issue valid JWT access token + refresh token cookie with role payload.
- **Invalid Login:** Incorrect passwords return 401 with generic error message (preventing user enumeration).
- **Session Expiry:** Expired access token triggers silent refresh; expired refresh token returns 401 redirecting to login.
- **Logout:** Invalidation of active session and clearing of refresh cookies.

---

### 7.4.7 Mandatory RBAC Enforcement Testing (Security Pillars)

RBAC tests verify both **allowed** and **forbidden** behaviors at the API gateway layer, ensuring UI button hiding cannot be bypassed:

```text
[ Test: DELETE /api/v1/users/:id ]
  ├── Execution by 'Administrator' ──➔ Expected: 200 OK (Allowed)
  ├── Execution by 'Director'      ──➔ Expected: 200 OK (Allowed)
  └── Execution by 'Coordinator'   ──➔ Expected: 403 Forbidden (Blocked by RBAC Guard)
```

---

### 7.4.8 Frontend Component & Form Testing (React Testing Library)

- **Reusable UI Components:** `DataTable`, `SearchBar`, `ModalDialog`, `PermissionGuard`, `StatusBadge`.
- **Form State Verification:** Required field validation triggers, invalid email format warnings, loading spinner during submission, and **rapid double-click submission prevention**.

---

### 7.4.9 File Import Processing & Partial Success Testing

Verifies bulk Excel/CSV file processing engines:
- **Valid File:** 100 valid rows inserted cleanly into database with audit log entry.
- **Invalid Structure:** Malformed column headers rejected immediately with human-readable error.
- **Partial Success (Critical Rule):** If an uploaded sheet contains 100 rows where 95 are valid and 5 have invalid fields, **the 95 valid rows MUST be successfully saved**, and an error report generated listing the exact 5 failed row numbers and issues.

---

### 7.4.10 The 7 Critical Business Journeys (E2E Automated Workflows)

Playwright E2E browser test suites continuously validate the 7 foundational operational journeys:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE 7 iPOMS CRITICAL BUSINESS JOURNEYS                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Journey 1: Auth Lifecycle      ➔ Login ➔ View Dashboard ➔ Token Refresh ➔ Logout               │
│ Journey 2: Daily Call Log      ➔ Open Daily Tracker ➔ Input Call ➔ Auto-Save ➔ Midnight Lock    │
│ Journey 3: Company Master Sync ➔ Edit Call Log ➔ Click "Sync to Master" ➔ Verify Company HR     │
│ Journey 4: Daily Leads Stream  ➔ Log Positive Lead ➔ Transition to JD Received ➔ Verify History │
│ Journey 5: Weekly Pipeline     ➔ Open Weekly Tracker ➔ Move Company across 7 Sections ➔ Finalize│
│ Journey 6: Recycle Bin Restore ➔ Soft Delete Company ➔ Open Recycle Bin ➔ Restore to Master    │
│ Journey 7: Broadcast & Action  ➔ Admin creates Announcement ➔ Recipient Acknowledges Meeting    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.4.11 The iPOMS Critical Business Test Suite

A dedicated, permanent regression test suite that executes prior to every production release:
- Aggregates the 7 Critical Business Journeys into an automated test runner.
- Guarantees that no core placement operational capability is broken during refactoring or feature additions.

---

### 7.4.12 Automated Regression & Bug Conversion Protocol

- **Golden Rule:** Whenever a defect is identified in QA, Staging, or Production, developers must write a reproducing automated test case **before fixing the bug**.
- The test is added to the permanent regression suite to ensure the defect can never recur.

---

### 7.4.13 Performance & Security Testing Standards

- **Performance Checks:** Table rendering tests with 500+ records, pagination limits, debounced search performance (< 300ms), and S3 export streaming.
- **Security Checks:** Automated NoSQL injection fuzzing (`{"$gt": ""}`), token tampering, path traversal upload checks, and rate-limiting triggers on `/api/v1/auth/*`.

---

### 7.4.14 Production Smoke Testing & Release Checklist

Following any deployment to Staging or Production, an automated smoke checklist executes within 2 minutes:
1. HTTP 200 on `/health` and `/api/v1/health`.
2. Database connectivity and ping latency < 50ms.
3. Successful login with system test account.
4. Dashboard metric counters render with non-zero valid data.
5. S3 export storage bucket accessibility check.

---

### 7.4.15 Formal Architectural Decisions Sign-Off (Q1 – Q7)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Multi-layered testing pyramid (Unit, Integration, API, E2E)?** | **YES (Approved)** | Jest/Vitest for unit/integration + Playwright for E2E suites |
| **Q2: Mandatory RBAC enforcement testing on all protected APIs?** | **YES (Approved)** | Automated Supertest suites verifying both allowed and 403 denied roles |
| **Q3: Dedicated E2E tests for the 7 Critical Business Journeys?** | **YES (Approved)** | Playwright automated test journeys executed in CI |
| **Q4: Convert every post-release defect into a regression test?** | **YES (Approved)** | PR policy requiring accompanying test case for all `fix/*` branches |
| **Q5: Automated test execution blocking Pull Request merges?** | **YES (Approved)** | GitHub Actions CI gate blocks merge if any test suite fails |
| **Q6: Prioritize business-critical coverage over 100% vanity target?** | **YES (Approved)** | Target ≥ 80% coverage on Services, Repositories, and Validators |
| **Q7: Maintain automated Smoke Test Checklist for all releases?** | **YES (Approved)** | Automated post-deployment health check & smoke test runner |

---

# Section 7.5 – Error Handling & Logging Standards

iPOMS enforces the principle that errors are inevitable in enterprise software, but their handling must be **safe, predictable, traceable, and never security-compromising**. Every error flows through the **Three-Layer Error Principle**:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  THREE-LAYER ERROR PRINCIPLE                        │
├─────────────────────────────────────────────────────────────────────┤
│  TECHNICAL LAYER  ➔  Detailed structured log (Winston JSON)        │
│  APPLICATION LAYER ➔  Standard error code (DATABASE_UNAVAILABLE)   │
│  USER LAYER       ➔  Friendly message ("Please try again.")        │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 7.5.1 User Errors vs. System Errors (Fundamental Distinction)

| Error Category | Nature | User Can Fix? | Frontend Display | Example |
|---|---|---|---|---|
| **User / Input Error** | Invalid data or action submitted by user | **YES** | Field-level validation message or toast | `"Company Name is required."` |
| **System Error** | Infrastructure, database, or integration failure | **NO** | Generic friendly message with Request ID | `"We're temporarily unable to complete this action. Please try again."` |

- Internal technical details (MongoDB errors, stack traces, connection strings) must **NEVER** be displayed to the end user.

---

### 7.5.2 Standardized API Error Response Contract

All backend API errors MUST return the following standardized JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid daily tracker log submission.",
    "details": [
      {
        "field": "call_date",
        "issue": "call_date must be formatted as ISO 8601 YYYY-MM-DD"
      }
    ],
    "requestId": "req-8f92a1c4-1092-4b2a"
  },
  "timestamp": "2026-08-15T14:50:00.000Z"
}
```

- Every error response includes a `requestId` for end-to-end traceability.
- The `details` array provides field-level specificity for validation errors.
- System errors in Production return a generic `message` while the full stack trace is logged server-side only.

---

### 7.5.3 HTTP Status Code & Error Class Taxonomy

| Status Code | Error Class Name | Application Trigger Scenario |
|---|---|---|
| `400 Bad Request` | `BadRequestError` | Malformed JSON, missing query parameters |
| `401 Unauthorized` | `AuthenticationError` | Missing, invalid, or expired JWT access token |
| `403 Forbidden` | `ForbiddenError` | User role lacks RBAC permission for route or resource |
| `404 Not Found` | `NotFoundError` | Entity ID does not exist in MongoDB |
| `409 Conflict` | `ConflictError` | Duplicate unique constraint violation (e.g. duplicate college code) |
| `422 Unprocessable` | `ValidationError` | Request payload fails Zod / Mongoose schema validation |
| `429 Too Many Requests` | `RateLimitError` | Client exceeded API rate limit threshold |
| `500 Internal Error` | `SystemError` | Uncaught exception, unhandled DB failure (Details hidden in Prod) |
| `503 Service Unavailable` | `ServiceUnavailableError` | External integration or database temporarily unreachable |

- **Rule:** Developers must NEVER return `200 OK` for failed operations and embed errors inside arbitrary message strings.

---

### 7.5.4 Application-Level Error Codes

Alongside HTTP status codes, iPOMS uses predictable application error codes for reliable frontend handling:

```text
┌─────────────────────────────────┬───────────────────────────────────────────────────┐
│ Application Error Code          │ Trigger Scenario                                  │
├─────────────────────────────────┼───────────────────────────────────────────────────┤
│ VALIDATION_ERROR                │ Schema validation failure on request payload       │
│ AUTHENTICATION_FAILED           │ Invalid credentials or expired JWT                 │
│ PERMISSION_DENIED               │ RBAC role lacks required access                    │
│ RESOURCE_NOT_FOUND              │ Entity ID does not exist in database               │
│ DUPLICATE_RESOURCE              │ Unique constraint violation (college code, email)   │
│ COMPANY_NOT_FOUND               │ Company metadata ID not in master collection       │
│ IMPORT_PARTIAL_FAILURE          │ Excel import partially succeeded with row errors    │
│ INVALID_FILE_FORMAT             │ Uploaded file fails type/size/extension validation  │
│ NOTIFICATION_EXPIRED            │ Notification past acknowledgement deadline          │
│ REPORT_GENERATION_FAILED        │ Report engine failed during export processing      │
│ DATABASE_UNAVAILABLE            │ MongoDB connection lost or timed out               │
│ EXTERNAL_SERVICE_FAILURE        │ MS Teams / S3 / SMTP integration unreachable       │
│ RATE_LIMIT_EXCEEDED             │ Client exceeded request threshold                  │
│ SESSION_EXPIRED                 │ Refresh token expired; full re-authentication req. │
└─────────────────────────────────┴───────────────────────────────────────────────────┘
```

---

### 7.5.5 Request ID Correlation & End-to-End Traceability

Every API request is assigned a unique UUID (`x-request-id`) by Express middleware at the point of entry:

```text
User Action ➔ Frontend Axios Request ➔ x-request-id: "req-8f92a1c4" ➔ Controller ➔ Service ➔ Repository ➔ MongoDB
                                                    ↓
                                              Attached to ALL:
                                              - API Response headers
                                              - Structured log entries
                                              - Error response payloads
                                              - Audit log records
```

- **Support Traceability:** If an error reaches the user, the frontend displays the `requestId`. Support teams can search logs using this single ID to reconstruct the complete request lifecycle.

---

### 7.5.6 Frontend Error Boundaries & Axios Interceptor Handling

1. **Global React Error Boundary:** Wraps the top-level layout to gracefully display a modern fallback screen ("An unexpected error occurred. Our team has been notified.") with options to **Retry**, **Go Back**, or **Return to Dashboard**. The application must never become a blank white screen.
2. **Axios Global Response Interceptor:**
   - `401 Unauthorized`: Triggers silent JWT token refresh via refresh token cookie; if refresh fails, clears session state and redirects to `/login`.
   - `403 Forbidden`: Displays error toast ("Access Denied: You do not have permission to perform this action.").
   - `422 Validation Error`: Maps `details[].field` errors directly to form input error labels for inline correction.
   - `500 System Error`: Displays generic error toast with the unique `requestId` for support reference.

---

### 7.5.7 Structured Logging Architecture (Winston + Morgan + Correlation IDs)

1. **Winston JSON Structured Logs:** All production logs are output as machine-readable JSON objects:

```json
{
  "timestamp": "2026-08-15T14:50:00.124Z",
  "level": "error",
  "message": "Failed to synchronize HR record to Master Metadata",
  "requestId": "req-8f92a1c4-1092-4b2a",
  "userId": "usr_65c8e9f1a23b",
  "service": "dailyTrackerService",
  "module": "company-metadata",
  "action": "syncHRToMaster",
  "stack": "Error: Document not found\n    at DailyTrackerRepository.findById..."
}
```

2. **Morgan HTTP Access Logs:** HTTP request/response lifecycle logging (method, path, status, response time) in structured format.

---

### 7.5.8 Log Levels & Environment-Specific Filtering

| Level | Purpose | Environments |
|---|---|---|
| `DEBUG` | Detailed development diagnostics (query params, intermediate states) | DEV only |
| `INFO` | Normal operational events (user login, record created, job started) | DEV, STG, PROD |
| `WARN` | Unusual but non-critical conditions (slow query, retry attempt) | DEV, STG, PROD |
| `ERROR` | Failures requiring investigation (DB timeout, integration failure) | DEV, STG, PROD |
| `FATAL` | Critical failures threatening application availability | DEV, STG, PROD |

- **Production Rule:** `LOG_LEVEL=info` in production. DEBUG logging is strictly disabled in PROD to prevent performance degradation and log flooding.

---

### 7.5.9 Sensitive Information Logging Prohibition

The following data must **NEVER** appear in application logs under any circumstance:

```text
❌ Passwords (plain text or hashed)
❌ JWT access tokens or refresh tokens
❌ API secret keys or cloud credentials
❌ Database connection strings with credentials
❌ Full authentication headers
❌ Sensitive PII (student phone numbers, HR personal emails) beyond what is necessary for diagnosis
❌ Uploaded document contents
❌ Credit card or financial data
```

- **Enforcement:** Pre-commit log sanitization checks and periodic log audit reviews.

---

### 7.5.10 Audit Logs vs. Application Logs (Strict Separation)

| Dimension | Audit Log (`audit_logs` Collection) | Application Log (Winston / stdout) |
|---|---|---|
| **Question Answered** | **Who** did **what** to **which record** and **when**? | **What happened technically** in the system? |
| **Storage** | MongoDB `audit_logs` collection (permanent, immutable) | File system / log aggregator (rotated, searchable) |
| **Audience** | Directors, CEOs, Administrators, Compliance auditors | Backend engineers, DevOps, Support diagnostics |
| **Example** | "Coordinator Priya updated Company XYZ phone at 14:35 IST" | "dailyTrackerService.syncHRToMaster failed: Document not found. requestId: req-8f92a1c4" |
| **Mutability** | **Immutable** — cannot be edited or deleted | Rotated and archived per retention policy |

---

### 7.5.11 Background Job Error Handling & Visibility

Scheduled background jobs (`node-cron`) must never silently swallow failures:

1. **Mandatory Error Recording:** Every job failure generates a structured `ERROR` log entry containing: job name, execution timestamp (IST), error message, and relevant document IDs.
2. **Admin Visibility:** Failed job executions are surfaced in the System Information / Administration dashboard for Director and Administrator roles.
3. **Retry Policy:** Transient failures (DB connection timeout) trigger a maximum of 3 automatic retries with exponential backoff. Permanent failures (invalid data state) are logged and flagged without retry.

---

### 7.5.12 Controlled Retry Strategy

| Failure Type | Retry Eligible? | Max Retries | Backoff Strategy |
|---|---|---|---|
| **Network timeout** | ✅ YES | 3 | Exponential (1s → 2s → 4s) |
| **External service unavailable (Teams, S3)** | ✅ YES | 3 | Exponential with jitter |
| **Database connection lost** | ✅ YES | 3 | Exponential (500ms → 1s → 2s) |
| **Validation failure (400/422)** | ❌ NO | — | Return error immediately |
| **Permission denied (403)** | ❌ NO | — | Return error immediately |
| **Duplicate record (409)** | ❌ NO | — | Return error immediately |
| **Invalid file format** | ❌ NO | — | Return error immediately |

---

### 7.5.13 External Integration Error Isolation

When external services (MS Teams webhooks, AWS S3, SMTP email) fail:
- The **core iPOMS operation must complete successfully** (e.g. a Daily Tracker entry is saved even if the Teams notification fails).
- The integration failure is logged as a separate `WARN` or `ERROR` entry with the external service name.
- Provider credentials and webhook URLs are **never** included in error messages or log outputs.

---

### 7.5.14 Frontend Error Recovery Options

When errors occur in the frontend, users are presented with contextually appropriate recovery actions:
- **Retry:** For transient server errors (500, 503).
- **Correct & Resubmit:** For validation errors (422) with field-level feedback.
- **Go Back / Return to Dashboard:** For navigation or authorization errors.
- **Re-authenticate:** For expired session errors (401 after refresh failure).
- **Rule:** Destructive operations (delete, purge) must **NEVER** be automatically retried.

---

### 7.5.15 Formal Architectural Decisions Sign-Off (Q1 – Q7)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Standard API error response structure for all endpoints?** | **YES (Approved)** | Centralized `errorHandler` middleware returning uniform JSON envelope |
| **Q2: Unique Request ID (`x-request-id`) for end-to-end tracing?** | **YES (Approved)** | Express middleware auto-generates UUID; propagated through all layers |
| **Q3: Strict separation of Audit Logs vs. Application Logs?** | **YES (Approved)** | Audit: MongoDB `audit_logs` (immutable). App: Winston structured JSON |
| **Q4: Prohibition of secrets/sensitive data in production logs?** | **YES (Mandatory)** | Pre-commit log sanitization checks and periodic audit reviews |
| **Q5: Controlled retries for transient failures only?** | **YES (Approved)** | Retry eligible: network/DB timeouts. Not eligible: 400/403/409/422 |
| **Q6: Global React Error Boundary with user-friendly fallback?** | **YES (Approved)** | Top-level ErrorBoundary with Retry, Go Back, and Dashboard options |
| **Q7: Background job failures logged and visible to admins?** | **YES (Approved)** | Structured ERROR logs + System Admin dashboard visibility |

---

# Section 7.6 – Code Review & Quality Standards

Code is not considered complete merely because it runs. It is complete when it follows the frozen architecture, passes the required tests, meets security standards, and is maintainable. Code review is the **quality gate between "code written" and "code accepted into the project."**

---

### 7.6.1 The iPOMS Definition of Done (DoD)

A feature or task cannot be marked complete until every item in this checklist is satisfied:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                  iPOMS DEFINITION OF DONE (DoD)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ ☐ Implementation complete and functional                                │
│ ☐ Frozen architecture followed (Ch.6 Backend + Frontend tiers)         │
│ ☐ Business rules verified against approved specifications (Ch.4–5)     │
│ ☐ Required tests written (Unit / Integration / E2E as appropriate)     │
│ ☐ All automated tests passing (0 failures)                             │
│ ☐ Security reviewed (RBAC, input validation, no exposed secrets)       │
│ ☐ Performance considered (no obvious N+1 queries, pagination used)     │
│ ☐ Documentation updated (if business rules or API contracts changed)   │
│ ☐ Pull Request reviewed and approved by peer                           │
│ ☐ All automated CI checks passed (ESLint, Prettier, build, tests)     │
│ ☐ Approved for merge into develop                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 7.6.2 Pull Request (PR) Content Requirements

Every meaningful Pull Request must include a structured description covering:

1. **What Changed:** Clear summary of the implementation.
2. **Why:** Business justification or issue reference.
3. **Modules Affected:** Which of the 14 iPOMS modules are impacted.
4. **Testing Performed:** Which unit, integration, or E2E tests were added or executed.
5. **Database / API Changes:** Schema alterations, new indexes, API contract modifications (if any).
6. **RBAC / Permissions Impact:** Whether new role-based access controls are introduced or changed.

---

### 7.6.3 Automated Static Analysis & Linting (Pre-Review Gate)

Automated checks must pass **before** human review begins:

1. **ESLint Rules:** Enforces strict TypeScript/JavaScript standards — disallows unused variables, explicit `any` types, dangling unhandled promises, and console.log in production code.
2. **Prettier Formatting:** Enforces single quotes, 2-space indentation, 100-character line limits, and trailing commas.
3. **TypeScript Compiler (`tsc --noEmit`):** Zero type errors allowed on PR branches.
4. **Git Pre-Commit Hooks (Husky + lint-staged):** Automatically runs ESLint and Prettier on staged files prior to commit creation.
5. **Build Verification:** `npm run build` must succeed with zero errors.

---

### 7.6.4 Architecture Compliance Review (8 Core Pillars)

Every significant Pull Request MUST be audited against these 8 non-negotiable architectural pillars:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                  iPOMS PEER CODE REVIEW CHECKLIST (8 PILLARS)                │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ ] 1. LAYERED ARCHITECTURE: Controllers handle HTTP only; Services handle  │
│        business logic; Repositories handle DB operations. No shortcuts.     │
│ [ ] 2. BUSINESS RULES: Implementation matches approved Chapters 4–6 specs  │
│        (e.g., explicit HR sync, 7 weekly tracker sections, partial import). │
│ [ ] 3. SECURITY & RBAC: Payload validated on backend (Zod/Joi); endpoint   │
│        protected with authenticateJWT & authorizeRoles middleware.          │
│ [ ] 4. DATABASE INTEGRITY: MongoDB queries use proper compound indexes;    │
│        soft-delete honored; no unindexed regex or unbounded scans.          │
│ [ ] 5. API CONTRACT: Standard /api/v1 REST naming; uniform JSON error      │
│        envelope with requestId; correct HTTP status codes.                  │
│ [ ] 6. ERROR HANDLING: All async routes use asyncHandler or try/catch;     │
│        Three-Layer Error Principle applied (Technical → Code → User).      │
│ [ ] 7. TEST COVERAGE: New features include accompanying unit, integration, │
│        or E2E test specs targeting the changed business logic.             │
│ [ ] 8. DOCUMENTATION: If API contracts, business rules, or schemas changed,│
│        corresponding spec documents in /docs are updated in the same PR.   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.6.5 Business Rule Verification During Review

Reviewers must explicitly compare significant business logic against the approved iPOMS specifications (Chapters 4–6). Critical areas requiring business rule verification:

- **Daily Leads:** JD Received transition must NOT delete the original Positive entry.
- **Weekly Tracker:** Companies must flow into the correct one of the 7 finalized sections.
- **Recycle Bin:** Soft-delete moves a full document snapshot; restore returns it to the original collection.
- **HR Metadata Sync:** Requires explicit user-triggered "Sync to Master" action — never automatic.
- **Notifications:** Meeting announcements support `Will Attend` / `Cannot Attend` responses.
- **Import Processing:** Partial success rule — 95 valid rows saved even if 5 rows fail validation.

---

### 7.6.6 RBAC & Security Review Requirements

Every change involving authentication, authorization, or data access must verify:
- Backend middleware (`authenticateJWT`, `authorizeRoles`) is attached to the route.
- Frontend `PermissionGuard` components hide unauthorized actions.
- API-level RBAC testing confirms both **allowed** and **denied** role access (not just allowed).
- No secrets, tokens, or credentials introduced into source code or logs.

---

### 7.6.7 Database & API Change Review Protocol

When a Pull Request modifies MongoDB schemas, indexes, or REST API contracts:
1. **Schema Changes:** Must reference the approved Chapter 5 collection specification. New fields require explicit justification.
2. **Index Changes:** Compound index additions must demonstrate query performance improvement.
3. **API Changes:** Must update the OpenAPI/Swagger spec and Postman collection in the same PR.
4. **Migration Scripts:** Database changes require a committed migration script in `/scripts/migrations/`.

---

### 7.6.8 Performance Review Awareness

Reviewers should identify obvious performance anti-patterns without requiring deep benchmarking on every PR:

```text
❌ Loading unbounded datasets without pagination (e.g., all 50,000 companies into browser memory)
❌ Making an API request inside every table row render cycle (N+1 query pattern)
❌ Re-rendering entire dashboard components on unrelated state changes
❌ Running expensive aggregation calculations on every keystroke without debouncing
❌ Fetching full document bodies when only summary fields are needed (missing field projection)
```

---

### 7.6.9 Risk-Tiered Review Levels

Not every change requires the same depth of review:

| Risk Tier | Change Examples | Review Depth | Required Checks |
|---|---|---|---|
| **Low Risk** | Text correction, minor UI spacing, comment update | Lightweight single-reviewer approval | Automated CI checks pass |
| **Medium Risk** | New UI component, new API endpoint, new hook | Standard review (1 reviewer, architecture check) | CI checks + unit/integration tests |
| **High Risk** | Authentication, RBAC changes, DB migration, delete/restore logic, major business workflow, payment integration | Thorough review (Senior/Lead engineer + full test verification) | CI checks + full test suite + business rule verification |

---

### 7.6.10 Dependency Governance

Adding new third-party packages (`npm install <package>`) requires justification:

1. **Necessity Check:** Is the functionality already available in the codebase or via existing dependencies?
2. **Maintenance Check:** Is the package actively maintained (recent commits, resolved issues)?
3. **Security Check:** Does `npm audit` flag any known vulnerabilities?
4. **Bundle Impact:** Does the package significantly increase frontend bundle size?
5. **License Compatibility:** Is the license compatible with iPOMS project requirements?

---

### 7.6.11 Documentation Synchronization Rule

If an implementation changes any approved business behavior, the corresponding specification document in `/docs` MUST be updated **in the same Pull Request**:

```text
Business Rule Changed ➔ Code Updated ➔ Tests Updated ➔ Specification Updated ➔ Single PR
```

This directly prevents the documentation/code drift discovered during the Chapter 6 consistency review.

---

### 7.6.12 Code Coverage & Complexity Thresholds

| Metric | Target | Enforcement |
|---|---|---|
| **Line Coverage (Services, Repos, Validators)** | ≥ 80% | CI coverage report on every PR |
| **Cyclomatic Complexity per function** | ≤ 15 | ESLint `complexity` rule warning |
| **Max function length** | ≤ 50 lines (guideline) | Code review awareness |
| **Max file length** | ≤ 300 lines (guideline) | Code review awareness; split if exceeded |

---

### 7.6.13 Formal Architectural Decisions Sign-Off (Q1 – Q7)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Standard PR checklist covering architecture, testing, security, perf, docs?** | **YES (Approved)** | 8-Pillar Peer Code Review Checklist on every significant PR |
| **Q2: Automated checks required to pass before PR merge?** | **YES (Approved)** | ESLint, Prettier, TypeScript, build, and test suites as CI gates |
| **Q3: High-risk changes (auth, RBAC, DB, delete/restore) require deeper review?** | **YES (Approved)** | Risk-tiered review levels; Senior/Lead required for high-risk PRs |
| **Q4: Business logic reviewed against approved iPOMS specifications?** | **YES (Approved)** | Explicit business rule verification for Weekly Tracker, Daily Leads, Recycle Bin |
| **Q5: API & database changes require explicit documentation in the same PR?** | **YES (Approved)** | Swagger/Postman updates + migration scripts committed together |
| **Q6: New third-party dependencies require justification & security check?** | **YES (Approved)** | Dependency governance checklist (necessity, maintenance, audit, license) |
| **Q7: Documentation updated in same cycle when approved behavior changes?** | **YES (Approved)** | Single-PR rule: code + tests + spec doc updated together |

---

# Section 7.7 – Build & Deployment Standards

This section defines how approved code moves from a developer's machine into a running iPOMS environment. The foundational principle is:

> **No code should reach production simply because someone manually copied files or clicked "deploy."**

Every deployment follows the **Build Once, Promote the Same Artifact** principle:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│              BUILD ONCE, PROMOTE THE SAME ARTIFACT                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Source Commit ➔ Build ➔ Verified Artifact                                 │
│                              │                                               │
│                    ┌─────────┼──────────┬──────────┐                        │
│                    ↓         ↓          ↓          ↓                        │
│                  DEV       TEST       STG        PROD                       │
│                                                                              │
│   Environment-specific configuration is injected separately.                │
│   The built artifact remains identical across all environments.             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.7.1 Reproducible Build Process

Every build must be deterministic and reproducible from the same source commit:

```text
Source Code (specific Git commit)
        ↓
Install Dependencies (npm ci — uses lockfile)
        ↓
Lint & Format Check (ESLint / Prettier)
        ↓
TypeScript Type Check (tsc --noEmit)
        ↓
Run Tests (Jest — Unit + Integration)
        ↓
Security Audit (npm audit / Snyk)
        ↓
Production Build (next build / tsc compile)
        ↓
Deployable Artifact (Docker image tagged with commit SHA)
```

- **Rule:** `npm ci` (not `npm install`) is used in CI/CD to ensure exact lockfile-pinned dependency versions.

---

### 7.7.2 Frontend Build (Next.js)

```text
Frontend Source (/frontend)
        ↓
npm ci
        ↓
ESLint + Prettier + tsc --noEmit
        ↓
Jest Unit + Component Tests
        ↓
next build (output: 'standalone')
        ↓
Docker Image: ipoms-frontend:<commit-sha>
```

1. **Next.js Standalone Mode:** Built using `output: 'standalone'` in `next.config.js` to minimize container payload size by excluding unnecessary `node_modules`.
2. **No Development Dependencies in Production:** `devDependencies` are excluded from the production image.
3. **Environment Variables:** Runtime configuration injected via environment variables at container startup — never baked into the build.

---

### 7.7.3 Backend Build (Node.js / Express)

```text
Backend Source (/backend)
        ↓
npm ci
        ↓
ESLint + Prettier + tsc --noEmit
        ↓
Jest Unit + Integration Tests
        ↓
TypeScript Compile (tsc)
        ↓
Docker Image: ipoms-backend:<commit-sha>
```

1. **Startup Validation:** The backend application must validate all required environment variables and database connectivity on startup. If validation fails, the process exits immediately with a clear error (fail-fast, per Section 7.3).
2. **Background Jobs Included:** The `/src/jobs` directory is packaged within the backend container. Job scheduling is configured via environment variables.

---

### 7.7.4 Containerization Architecture

Frontend and backend are independently deployable Docker containers:

```text
                    Nginx / Reverse Proxy
                          │
              ┌───────────┴───────────┐
              ↓                       ↓
    ┌──────────────────┐    ┌──────────────────┐
    │   Frontend        │    │   Backend         │
    │   Container       │    │   Container       │
    │   (Next.js)       │    │   (Express.js)    │
    │   Port: 3000      │    │   Port: 5000      │
    └──────────────────┘    │                    │
                             │   Background Jobs  │
                             │   (node-cron)      │
                             └──────────────────┘
                                      │
                             ┌────────┴────────┐
                             ↓                 ↓
                          MongoDB         File Storage
                                          (S3 / Local)
```

1. **Multi-Stage Dockerfiles:** Docker builds utilize Node.js 20 Alpine lightweight multi-stage base images to reduce production container size to < 150 MB.
2. **Image Tagging:** Every image is tagged with the Git commit SHA (e.g., `ipoms-backend:a1b2c3d`). Semantic version tags (e.g., `v1.3.0`) are applied for releases.
3. **Independent Deployment:** Frontend can be updated without restarting backend, and vice versa.

---

### 7.7.5 CI/CD Pipeline Lifecycle

The automated pipeline handles validation, building, and deployment:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CI/CD PIPELINE STAGES                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STAGE 1: VALIDATE                                                          │
│  ├── ESLint + Prettier (code style)                                         │
│  ├── TypeScript compiler (tsc --noEmit)                                     │
│  └── Security audit (npm audit / Snyk)                                      │
│                                                                              │
│  STAGE 2: TEST                                                              │
│  ├── Unit tests (Jest)                                                      │
│  ├── Integration tests (Jest + Supertest)                                   │
│  └── Coverage report (≥ 80% on Services, Repos, Validators)                │
│                                                                              │
│  STAGE 3: BUILD                                                             │
│  ├── Next.js production build (frontend)                                    │
│  ├── TypeScript compile (backend)                                           │
│  └── Docker image build + tag with commit SHA                               │
│                                                                              │
│  STAGE 4: DEPLOY                                                            │
│  ├── Push Docker image to container registry                                │
│  ├── Deploy to target environment (TEST → STG → PROD)                       │
│  └── Execute database migration scripts (if applicable)                     │
│                                                                              │
│  STAGE 5: VERIFY                                                            │
│  ├── Application health check                                               │
│  ├── API health endpoint verification                                       │
│  ├── Database connectivity check                                            │
│  └── Post-deployment smoke test                                             │
│                                                                              │
│  ⛔ ANY STAGE FAILURE → Pipeline halts. No promotion to next environment.    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **CI/CD Platform:** GitHub Actions is the primary platform. The pipeline architecture is designed to remain platform-portable.

---

### 7.7.6 Environment Promotion Gates

Code must move progressively through environments with explicit gates:

| Promotion | Gate Requirement | Who Triggers |
|---|---|---|
| **DEV → TEST** | All CI checks pass (lint, type, tests, build) | Automatic on merge to `develop` |
| **TEST → STG** | Full test suite passes + QA approval | Manual trigger after QA validation |
| **STG → PROD** | Staging smoke test passes + Release approval | Manual trigger by authorized deployer |

- **Rule:** Direct promotion from Developer Machine → Production is **strictly prohibited**.
- **Rule:** A failed gate at any stage blocks promotion to the next environment.

---

### 7.7.7 Database Deployment Protocol

Database changes are treated as controlled deployment operations — never applied manually in production:

1. **Migration Scripts:** All schema changes (new indexes, validation rules, collection modifications, TTL configs) are committed as versioned scripts in `/scripts/migrations/`.
2. **Forward-Only Migrations:** Each migration script runs exactly once and is tracked via a `migration_history` collection recording script name, execution timestamp, and result.
3. **Review Requirement:** Database migration scripts require explicit review as part of the PR (per Section 7.6.7).
4. **Execution Order:** Migrations execute automatically as part of the CI/CD Stage 4 (Deploy), **before** the application starts accepting traffic.

---

### 7.7.8 Background Job Deployment Verification

After every deployment, the system must verify that scheduled background jobs are operational:

1. **Job Registry Validation:** On startup, the backend logs all registered `node-cron` jobs with their schedule expressions and job names.
2. **Duplicate Prevention:** If the backend is scaled horizontally, only one instance executes scheduled jobs (leader election or single-worker designation).
3. **Post-Deployment Check:** The deployment verification step confirms:
   - All expected jobs are registered.
   - No duplicate job workers are running.
   - Job execution history is intact from prior runs.

Critical scheduled jobs:
```text
┌──────────────────────────────────────────┬────────────────┐
│ Background Job                           │ Schedule       │
├──────────────────────────────────────────┼────────────────┤
│ Daily Tracker Finalization               │ 00:00 IST      │
│ Recycle Bin TTL Cleanup (90-day purge)   │ 02:00 IST      │
│ Import Processing History TTL Cleanup    │ 02:30 IST      │
│ Notification Expiry Processing           │ 03:00 IST      │
└──────────────────────────────────────────┴────────────────┘
```

---

### 7.7.9 Health Check Endpoints

The application exposes health endpoints for infrastructure monitoring:

```text
GET /api/v1/health
```

Response:

```json
{
  "status": "healthy",
  "version": "1.3.0",
  "commit": "a1b2c3d",
  "uptime": "2h 15m",
  "checks": {
    "database": "connected",
    "fileStorage": "available",
    "backgroundJobs": "running"
  },
  "timestamp": "2026-08-15T14:50:00.000Z"
}
```

- **Liveness Probe:** Returns `200 OK` if the application process is running.
- **Readiness Probe:** Returns `200 OK` only if the application AND its dependencies (MongoDB, file storage) are operational. Used by load balancers to determine traffic routing.

---

### 7.7.10 Post-Deployment Smoke Test

After every deployment to STG or PROD, the automated smoke test (established in Section 7.4) is executed:

```text
Deploy Complete
      ↓
Application Health Check (GET /api/v1/health)
      ↓
API Connectivity (authenticated API call succeeds)
      ↓
Database Connectivity (verified via health response)
      ↓
Authentication Flow (login → JWT issued → protected route accessed)
      ↓
Critical Business Workflow (create + read on a non-destructive test path)
      ↓
✅ DEPLOYMENT VERIFIED
```

- If any smoke test step fails, the deployment is flagged and rollback procedures are initiated.

---

### 7.7.11 Rollback Strategy

Every production release must have a documented rollback path:

1. **Container Rollback:** Revert to the previous Docker image tag (e.g., from `ipoms-backend:a1b2c3d` back to `ipoms-backend:x9y8z7w`).
2. **Database Rollback:** If the release includes a database migration, the migration script must document the compensating rollback steps. Complex migrations require a tested rollback script before deployment approval.
3. **Rollback Decision Window:** If critical issues are detected within 1 hour of production deployment, immediate rollback is the default action. Investigation happens after stability is restored.
4. **Rollback Log:** Every rollback event is recorded in the deployment log with reason, initiator, and timestamp.

---

### 7.7.12 Deployment Atomicity (Versioned Releases)

Each production release represents one known, complete application state:

```text
Release v1.3.0
├── Frontend: ipoms-frontend:v1.3.0 (commit a1b2c3d)
├── Backend:  ipoms-backend:v1.3.0  (commit a1b2c3d)
├── Database: Migration #024 applied
└── Config:   Environment variables verified
```

- **Rule:** Partial deployments (e.g., deploying new backend without its required frontend changes) are prohibited unless explicitly designed for backward compatibility.

---

### 7.7.13 Zero / Minimal Downtime Strategy

Because frontend and backend are independently containerized, deployments aim for zero or minimal user-visible downtime:

```text
Old Container (v1.2.0) ── serving traffic ──┐
                                             │
New Container (v1.3.0) ── starting ──────────┤
                                             │
Health Check passes ─────────────────────────┤
                                             │
Traffic switches to v1.3.0 ──────────────────┘
                                             │
Old Container (v1.2.0) ── gracefully stops ──┘
```

- **Graceful Shutdown:** On receiving a stop signal, the backend finishes processing in-flight requests before shutting down.
- **Infrastructure Flexibility:** The exact mechanism (rolling update, blue-green, canary) is determined by the deployment platform. The application is designed to support any of these patterns.

---

### 7.7.14 Deployment Logging & Traceability

Every deployment is recorded with:

| Field | Example Value |
|---|---|
| **Version** | `v1.3.0` |
| **Commit SHA** | `a1b2c3d4e5f6` |
| **Environment** | `production` |
| **Timestamp (IST)** | `2026-08-15T16:30:00+05:30` |
| **Deployment Result** | `SUCCESS` / `FAILED` / `ROLLED_BACK` |
| **Migration Result** | `Migration #024 applied successfully` |
| **Deployer** | `CI/CD pipeline (triggered by @priya)` |
| **Smoke Test Result** | `PASSED` (5/5 checks) |

---

### 7.7.15 Failed Deployment Protocol

If any pipeline stage fails, promotion is automatically halted:

```text
Build Failure        ➔ STOP — Do not create artifact
Test Failure         ➔ STOP — Do not deploy
Deployment Failure   ➔ STOP — Do not promote
Health Check Failure ➔ STOP — Investigate + Rollback if necessary
Smoke Test Failure   ➔ STOP — Rollback to previous stable version
```

- **Rule:** A failed build or failed critical deployment check must **NEVER** continue automatically into the next environment.
- **Notification:** Deployment failures trigger an alert to the development team (via configured notification channel).

---

### 7.7.16 Formal Architectural Decisions Sign-Off (Q1 – Q8)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Production deployment only after successful automated build, test, and staging validation?** | **YES (Approved)** | 5-stage CI/CD pipeline with automatic halt on any failure |
| **Q2: Frontend and backend remain independently deployable?** | **YES (Approved)** | Separate Docker containers with independent image tags |
| **Q3: Database changes deployed through controlled migration scripts?** | **YES (Approved)** | Versioned scripts in `/scripts/migrations/` with execution tracking |
| **Q4: Deployment verifies background jobs are running correctly?** | **YES (Approved)** | Startup job registry logging + post-deployment verification check |
| **Q5: Every release has identifiable version/commit and rollback path?** | **YES (Approved)** | Docker images tagged with commit SHA + documented rollback steps |
| **Q6: Failed builds/checks automatically stop promotion?** | **YES (Approved)** | Pipeline stage gates — any failure halts the entire pipeline |
| **Q7: Post-deployment smoke test covering availability, auth, API, DB, and business workflow?** | **YES (Approved)** | Automated 5-step smoke test on every STG/PROD deployment |
| **Q8: Design for zero/minimal downtime with flexible deployment technology?** | **YES (Approved)** | Graceful shutdown + health-gated traffic switching; platform-agnostic |

---

# Section 7.8 – Security Development Standards

Security must be enforced by the backend, validated throughout the application, and treated as part of every feature — not added at the end. This section converts the architectural security decisions from Chapter 6 into **mandatory development rules**.

---

### 🔐 The 10 Golden Commandments of iPOMS Security

Developers and AI coding assistants MUST strictly observe these commandments at all times:

```text
╔═════════════════════════════════════════════════════════════════════════════════╗
║                    THE 10 GOLDEN COMMANDMENTS OF iPOMS SECURITY               ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║  1. NEVER hardcode API keys, secrets, or passwords in Git repositories.       ║
║  2. NEVER trust frontend validation — ALWAYS re-validate on the backend.      ║
║  3. NEVER bypass RBAC middleware — attach authenticateJWT & authorizeRoles     ║
║     on every protected API route.                                             ║
║  4. NEVER log sensitive information (passwords, JWTs, PII) in plain text.     ║
║  5. NEVER execute raw MongoDB query logic directly inside Express Controllers.║
║  6. ALWAYS sanitize incoming request payloads against NoSQL Injection.         ║
║  7. ALWAYS enforce rate limits on authentication endpoints.                    ║
║  8. ALWAYS set HTTP-Only, Secure, SameSite=Strict flags on session cookies.   ║
║  9. NEVER expose raw system error stack traces to the client in production.   ║
║ 10. ALWAYS apply the Principle of Least Privilege for users, services & DB.   ║
╚═════════════════════════════════════════════════════════════════════════════════╝
```

---

### 7.8.1 Authentication Security

Authentication establishes **who the user is**. The backend is the sole authority:

```text
User ➔ Login Form ➔ Backend Authentication ➔ JWT Issued ➔ Protected API Access
```

1. **Backend Authority:** The backend independently verifies every authentication claim. The frontend is never treated as proof of identity.
2. **Password Hashing:** All passwords stored using bcrypt with a minimum cost factor of 12. Plain-text passwords are **never** stored, logged, or returned in API responses.
3. **Password Reset Flow:** Uses time-limited, single-use tokens (expiry: 15 minutes). Tokens are cryptographically random and stored hashed.
4. **Account Lockout:** After 5 consecutive failed login attempts, the account is temporarily locked for 15 minutes.

---

### 7.8.2 Authorization / RBAC Enforcement (Backend is the Ultimate Authority)

Authentication answers "Who are you?" Authorization answers **"What are you allowed to do?"**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RBAC ENFORCEMENT ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND PERMISSION GUARD         BACKEND RBAC MIDDLEWARE                  │
│  ─────────────────────────         ────────────────────────                  │
│  Purpose: UX / Visibility          Purpose: ACTUAL SECURITY                 │
│  Hides unauthorized buttons        Rejects unauthorized API requests        │
│  Can be bypassed by user           Cannot be bypassed                       │
│  Trust level: NONE                 Trust level: ABSOLUTE                    │
│                                                                              │
│  A hidden button is NOT security.  authorizeRoles middleware IS security.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Rule:** Every protected backend route MUST have `authenticateJWT` and `authorizeRoles` middleware attached. No exceptions.
- **Rule:** RBAC testing must verify both **allowed** access AND **denied** access for unauthorized roles.

---

### 7.8.3 Session & Token Security (JWT + Refresh Token)

| Token Type | Storage | Lifetime | Security Flags |
|---|---|---|---|
| **Access Token (JWT)** | Memory (frontend state) | 15 minutes | Never in localStorage; never in URL params |
| **Refresh Token** | HTTP-Only cookie | 7 days | `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth/refresh` |

1. **Token Refresh Flow:** When the access token expires, the frontend silently requests a new one via the refresh token cookie. If the refresh token is also expired, the user is redirected to `/login`.
2. **Token Revocation:** On logout, the refresh token is invalidated server-side (blacklisted or removed from the token store).
3. **Session Fixation Prevention:** A new session/token pair is issued on every successful authentication.

---

### 7.8.4 API Security (Request Lifecycle)

Every protected API request must pass through this mandatory security chain:

```text
Incoming Request
      ↓
1. Rate Limit Check
      ↓
2. CORS Validation
      ↓
3. Authentication (authenticateJWT middleware)
      ↓
4. Authorization (authorizeRoles middleware)
      ↓
5. Input Validation (Zod / Joi schema)
      ↓
6. NoSQL Injection Sanitization (mongo-sanitize)
      ↓
7. Business Logic (Service Layer)
      ↓
8. Response
```

- **Rule:** The backend must independently enforce every security check. It must NEVER trust the frontend's assertion that "the user is allowed."

---

### 7.8.5 Input Validation (Server-Side Mandatory)

**Never trust user input.** All input sources must be validated on the backend:

| Input Source | Validation Method | Examples |
|---|---|---|
| **Request Body (JSON)** | Zod / Joi schema validation | Company create, HR update, tracker log |
| **URL Parameters** | Type + format + existence check | `:id` must be valid MongoDB ObjectId |
| **Query Parameters** | Whitelist + type coercion + range check | `?page=1&limit=25&sort=name` |
| **File Uploads** | Size + type + extension + MIME validation | Excel import, document upload |
| **Imported Data (Excel/CSV)** | Row-by-row schema validation | Import processing with partial success |

- **Rule:** Frontend validation exists for UX (immediate feedback). Backend validation exists for SECURITY (enforcement). Both are required; neither replaces the other.

---

### 7.8.6 Database Security

1. **Repository Layer Only:** All MongoDB operations are executed exclusively through the Repository layer. Controllers and Services must NEVER construct or execute database queries directly.
2. **NoSQL Injection Prevention:** All incoming request payloads are sanitized using `mongo-sanitize` or equivalent before reaching query construction.
3. **Field Projection:** Queries return only the fields required by the requesting operation — never full documents with sensitive fields included.
4. **Index-Backed Queries:** All queries on large collections must use compound indexes. Unindexed regex scans on production data are prohibited.
5. **Least Privilege Connection:** The application's MongoDB connection string uses credentials with only the permissions required (read/write on the application database — not cluster admin).

---

### 7.8.7 File Upload Security

iPOMS processes file uploads (Excel imports, document attachments, reports). Every upload must pass backend validation:

```text
File Upload
      ↓
1. File Size Check (≤ configured maximum per type)
      ↓
2. File Extension Whitelist (.xlsx, .csv, .pdf, .docx, .jpg, .png)
      ↓
3. MIME Type Verification (Content-Type header matches extension)
      ↓
4. Filename Sanitization (strip path traversal, special characters)
      ↓
5. Content Validation (for imports: parse and validate row data)
      ↓
6. Secure Storage (renamed with UUID, stored outside web root)
```

- **Rule:** A frontend file-size check alone is insufficient. Backend MUST enforce all upload limits.
- **Rule:** Uploaded files are stored with UUID-generated filenames — never with user-provided original filenames in the storage path.

---

### 7.8.8 Sensitive Data Protection & API Response Filtering

APIs must return **only the fields the requesting user actually needs**:

```text
❌ WRONG: Return entire user document including password_hash, internal_notes, system_flags
✅ RIGHT: Return only { name, email, role, department } for the user profile endpoint
```

Sensitive fields that must NEVER appear in API responses:
- `password_hash`
- `refresh_token`
- Internal system flags not relevant to the requesting context
- Other users' private contact information (unless explicitly authorized)

---

### 7.8.9 Secrets Management

No secrets in any of these locations:

```text
❌ Source code / Git repository
❌ Frontend JavaScript bundle
❌ Application logs
❌ API responses
❌ Error messages
❌ Documentation
❌ Docker images (baked in)
```

Secrets must come exclusively from:
```text
✅ Environment variables (injected at runtime)
✅ Secret management service (e.g., cloud secret manager)
✅ .env files (local development only — .gitignored)
```

This directly connects with Section 7.3 (Environment & Configuration Management).

---

### 7.8.10 Rate Limiting

Abuse-sensitive endpoints must have rate limiting to prevent brute-force attacks and request storms:

| Endpoint Category | Rate Limit | Window |
|---|---|---|
| **Login (`/api/v1/auth/login`)** | 5 requests | per minute per IP |
| **Password Reset** | 3 requests | per minute per email |
| **Token Refresh** | 10 requests | per minute per user |
| **File Import** | 5 requests | per minute per user |
| **Report Generation** | 3 requests | per minute per user |
| **General API (authenticated)** | 100 requests | per minute per user |

- **Rule:** Rate limit responses return `429 Too Many Requests` with a `Retry-After` header.

---

### 7.8.11 CORS (Cross-Origin Resource Sharing)

Production CORS must be explicitly restricted to approved frontend origins:

```text
❌ PRODUCTION: Access-Control-Allow-Origin: *
✅ PRODUCTION: Access-Control-Allow-Origin: https://ipoms.example.com
✅ DEVELOPMENT: Access-Control-Allow-Origin: http://localhost:3000
```

- **Rule:** CORS configuration is environment-specific (per Section 7.3). Wildcard (`*`) origin is permitted only in DEV.
- **Allowed Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- **Credentials:** `Access-Control-Allow-Credentials: true` (required for HTTP-Only cookie refresh tokens)

---

### 7.8.12 Security Headers

The production application must set appropriate HTTP security headers:

| Header | Value | Protection |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `0` (rely on CSP instead) | Legacy XSS filter disabled |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS |
| `Content-Security-Policy` | Strict policy (configured per deployment) | Prevents XSS, injection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |

- **Implementation:** Applied via `helmet` middleware in Express.js.

---

### 7.8.13 Error Information Exposure Prevention

As established in Section 7.5 (Three-Layer Error Principle):

```text
✅ USER SEES:    "Something went wrong. Please try again. Reference: req-8f92a1c4"
❌ USER SEES:    "MongoServerError: connection string mongodb://admin:password123@..."
```

- **Rule:** Production error responses NEVER include stack traces, database connection details, internal file paths, or server configuration.
- **Rule:** The `requestId` is the only technical reference exposed to the user.

---

### 7.8.14 Audit Log Immutability

The `audit_logs` MongoDB collection is the permanent, tamper-proof record of business-critical actions:

1. **No Edit Operations:** No API endpoint, Service method, or Repository function may update or modify existing audit log entries.
2. **No Delete Operations:** No user role — including Administrator or Director — may delete audit log records through the application.
3. **Append-Only:** Audit logs support only `insertOne` / `insertMany` operations.
4. **Background Job Exception:** Only the TTL purge job may remove audit entries, and only after the configured retention period (defined separately from the 90-day recycle bin TTL).

---

### 7.8.15 Dependency Security

Third-party dependencies are a potential attack vector:

1. **Pre-Installation Review:** Before adding any new package, verify necessity, maintenance status, and known vulnerabilities (per Section 7.6.10 Dependency Governance).
2. **Automated Scanning:** `npm audit` runs as part of the CI/CD Stage 1 (Validate). Critical or high vulnerabilities block the pipeline.
3. **Periodic Review:** Dependencies are reviewed quarterly for security patches, end-of-life notices, and available updates.
4. **Lockfile Integrity:** `package-lock.json` is committed to Git and used via `npm ci` to ensure reproducible, verified dependency trees.

---

### 7.8.16 Security Testing Integration

Security testing is part of the normal development lifecycle — not a separate end-of-project activity:

| Security Test Type | What It Verifies | When It Runs |
|---|---|---|
| **RBAC Access Control Tests** | Authorized roles succeed; unauthorized roles receive 403 | Every PR with auth changes |
| **Authentication Boundary Tests** | Expired tokens rejected; invalid credentials rejected | Part of auth module test suite |
| **Input Injection Tests** | NoSQL injection payloads rejected; XSS payloads sanitized | Part of integration test suite |
| **File Upload Abuse Tests** | Oversized files rejected; disallowed types rejected | Part of import module test suite |
| **Rate Limit Tests** | Exceeding threshold returns 429; subsequent requests honored after window | Part of API test suite |
| **Sensitive Data Exposure Tests** | Password hashes, tokens, credentials never in API responses | Part of API response validation |

---

### 7.8.17 Principle of Least Privilege

Every user, service, and process operates with **only the minimum access required**:

```text
┌───────────────────────────────┬──────────────────────────────────────────────┐
│ Entity                        │ Access Scope                                 │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ Coordinator                   │ Own college data + assigned module access     │
│ Team Leader                   │ Team members' data + coordinator permissions  │
│ Administrator / Director      │ All data + system configuration + audit logs  │
│ TPO                           │ Read-only overview + approval workflows       │
│ Background Job (node-cron)    │ Only the collections required by the job      │
│ MongoDB Connection (App)      │ Read/Write on ipoms_db only — not cluster     │
│ File Storage Service          │ Upload/download to designated bucket only     │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

---

### 7.8.18 Security Gate (Integration with Definition of Done)

Any feature involving authentication, authorization, user data, company/HR data, file uploads, deletion, restoration, reports, or external integrations cannot be marked complete until the **Security Gate** is satisfied:

```text
Implementation Complete
        ↓
Input Validation Verified (Server-Side)
        ↓
RBAC Authorization Verified (Backend Middleware)
        ↓
Security Tests Written & Passing
        ↓
Audit Logging Considered (if business-critical action)
        ↓
Code Review (with Security Pillar checked)
        ↓
✅ SECURITY GATE PASSED — Feature Approved
```

This integrates security into the **iPOMS Definition of Done (7.6.1)** rather than treating it as a separate end-of-project audit.

---

### 7.8.19 Formal Architectural Decisions Sign-Off (Q1 – Q8)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Backend RBAC enforcement mandatory, even when frontend hides/restricts UI?** | **YES (Mandatory)** | `authenticateJWT` + `authorizeRoles` on every protected route; RBAC tests verify denied access |
| **Q2: Passwords, tokens, API keys never in source code, logs, API responses, or frontend bundles?** | **YES (Mandatory)** | `.gitignore`, log sanitization, API response filtering, env-only secrets |
| **Q3: Every important API input validated server-side, regardless of frontend validation?** | **YES (Mandatory)** | Zod/Joi schemas on all request bodies, params, and query strings |
| **Q4: File uploads validated for size, type, and allowed formats on backend?** | **YES (Mandatory)** | 6-step upload validation pipeline (size → extension → MIME → sanitize → validate → store) |
| **Q5: Rate limiting on authentication, password-reset, and abuse-sensitive endpoints?** | **YES (Approved)** | `express-rate-limit` middleware with endpoint-specific thresholds |
| **Q6: Production CORS explicitly allows only approved frontend origins?** | **YES (Approved)** | Environment-specific CORS config; wildcard only in DEV |
| **Q7: Security testing part of normal development lifecycle?** | **YES (Approved)** | RBAC, auth boundary, injection, upload, and rate limit tests in CI suite |
| **Q8: All users, services, and background jobs follow least-privilege principle?** | **YES (Mandatory)** | Role-scoped access, DB connection with minimal permissions, job-specific collection access |

---

# Section 7.9 – Backup, Recovery & Operational Safety

This section defines how iPOMS will protect business data, recover from failures, and safely handle operational incidents. The foundational principle is:

> **If something goes seriously wrong, we must have a known and tested way to recover.**

---

### 7.9.1 Backup vs. Recycle Bin (Fundamental Distinction)

These are entirely different recovery mechanisms and must not be confused:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│              RECYCLE BIN                    BACKUP & RECOVERY               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Protects against:                   Protects against:                     │
│  USER-LEVEL accidental deletion      SYSTEM-LEVEL failures                 │
│                                                                             │
│  Trigger: User deletes a record      Trigger: DB corruption, infra failure,│
│                                      deployment mistake, security incident │
│                                                                             │
│  Mechanism: Soft-delete to           Mechanism: Full database snapshot /    │
│  recycle_bin collection              point-in-time restore                  │
│                                                                             │
│  Who restores: Coordinator/Admin     Who restores: Operations / Admin only │
│  via UI "Restore" button             via controlled recovery procedure     │
│                                                                             │
│  Scope: Individual record            Scope: Entire database state          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.9.2 MongoDB Database Backup Strategy

MongoDB is the most critical data layer for iPOMS. The backup strategy protects all operational collections:

```text
┌──────────────────────────────────────────────────────────────────────┐
│                  PROTECTED COLLECTIONS                               │
├──────────────────────────────────────────────────────────────────────┤
│  users                    │  colleges                                │
│  roles                    │  company_metadata                        │
│  assignments              │  daily_tracker                           │
│  weekly_tracker            │  daily_leads                            │
│  notifications            │  audit_logs                              │
│  import_processing_history │  recycle_bin                            │
│  app_settings             │  report_library                          │
└──────────────────────────────────────────────────────────────────────┘
```

Backup tiers:

| Backup Type | Frequency | Retention | Purpose |
|---|---|---|---|
| **Continuous Oplog / PITR** | Continuous (real-time) | 35 days (infrastructure-dependent) | Point-in-time recovery to minutes before incident |
| **Daily Automated Snapshots** | Every 24 hours | 30 days | Standard daily recovery point |
| **Weekly Snapshots** | Every 7 days | 90 days | Medium-term recovery |
| **Monthly Archival Snapshots** | Monthly | 12 months | Enterprise audit compliance |
| **Pre-Migration Snapshots** | Before every risky DB migration | Until migration verified successful | Migration safety net |

- **Note:** The exact PITR capability depends on the production MongoDB hosting model (e.g., MongoDB Atlas provides continuous oplog tailing). The requirement is established here; infrastructure details are finalized during deployment.

---

### 7.9.3 Backup Storage Separation

Production backups must **NOT** reside solely on the same infrastructure they protect:

```text
❌ WRONG:
  Production Server → Database + Backup on same server
  Server fails → Backup also lost

✅ RIGHT:
  Production Server → Database
  Independent Storage → Backup copies
  Server fails → Backup still available
```

- **Rule:** At least one backup tier must be stored on infrastructure independent from the primary production database.

---

### 7.9.4 Backup Security

Backups contain the same business data as production and must receive equivalent protection:

1. **Access Control:** Only authorized operations/administrative personnel can access or download production backups.
2. **Encryption:** Backups are encrypted at rest where supported by the storage platform.
3. **Credential Separation:** Backup storage credentials are separate from application database credentials.
4. **Audit Trail:** Backup access and restore operations are logged.
5. **Restricted Restore:** Only authorized personnel can initiate a production database restore.

---

### 7.9.5 Backup Verification & Success Monitoring

A backup that exists but cannot be restored is not a reliable backup:

1. **Automated Success Confirmation:** The backup process must confirm completion status after every scheduled execution.
2. **Failure Alerting:** Backup failures generate an immediate operational alert to administrators. A backup system that silently fails is considered a critical operational gap.
3. **Size & Integrity Checks:** Backup size is monitored for unexpected drops (which may indicate incomplete captures).

---

### 7.9.6 Restore Testing (Mandatory)

Backup restore capability must be periodically verified through actual testing:

```text
Backup File
      ↓
Restore to Test Environment
      ↓
Database Starts Successfully
      ↓
Collections & Indexes Intact
      ↓
Application Connects
      ↓
Critical Workflow Executes
      ↓
✅ RESTORE TEST PASSED
```

| Frequency | Restore Test Scope |
|---|---|
| **Quarterly (minimum)** | Full database restore to test environment + application connectivity verification |
| **Before major releases** | Pre-release restore test to confirm migration + backup compatibility |

- **Rule:** A backup strategy is incomplete if nobody has ever tested the recovery process.

---

### 7.9.7 Point-in-Time Recovery (PITR)

For production, iPOMS requires recovery capability beyond "yesterday's snapshot":

```text
10:00  Normal operations
10:30  Normal operations
11:00  Accidental destructive operation (bulk delete, bad migration)
11:05  Problem discovered
        ↓
PITR: Restore database to state at 10:59 (1 minute before incident)
```

- The exact PITR capability depends on the MongoDB hosting model. MongoDB Atlas provides continuous oplog tailing with configurable restore windows.
- **Requirement:** Production must support recovery to a point closer than the last daily snapshot.

---

### 7.9.8 Recovery Point Objective (RPO) & Recovery Time Objective (RTO)

These formal targets must be defined before production launch:

| Metric | Definition | Recommended Target | Finalization |
|---|---|---|---|
| **RPO** | Maximum acceptable data loss measured in time | **< 1 hour** (aim for minutes with PITR) | Finalized based on production infrastructure |
| **RTO** | Maximum acceptable time to restore service | **< 2 hours** | Finalized based on production infrastructure |

- **Rule:** RPO and RTO targets are formally established before the first production deployment, not retroactively after an incident.

---

### 7.9.9 Application Recovery

Database recovery alone is insufficient. The complete application must be recoverable:

```text
Application Recovery = Code (Git) + Database (Backup) + Configuration (Env/Secrets)
```

| Component | Recovery Source | Reference |
|---|---|---|
| **Application Code** | Git repository — deploy known tagged release | Section 7.2 (Git), 7.7 (Deployment) |
| **Database State** | Backup snapshot or PITR restore | This section (7.9) |
| **Environment Config** | Secret manager / documented env variables | Section 7.3 (Environment) |
| **Docker Images** | Container registry — pull tagged image | Section 7.7 (Containerization) |

---

### 7.9.10 Deployment Rollback vs. Database Recovery (Separate Mechanisms)

These are different procedures and must not be conflated:

| Scenario | Correct Response | Wrong Response |
|---|---|---|
| **Bad deployment** (frontend bug, API regression) | Roll back application to previous container version | Restore entire database |
| **Data corruption** (bad migration, accidental bulk delete) | Database restore / PITR | Simply redeploying old code |
| **Both** (bad deployment caused data corruption) | Roll back application AND restore database to pre-incident state | Guess and hope |

---

### 7.9.11 Database Migration Safety

Before any destructive or structural database migration:

```text
Pre-Migration Backup / Recovery Point
        ↓
Execute Migration Script
        ↓
Verify Collections & Indexes
        ↓
Verify Application Connectivity
        ↓
Run Smoke Tests
        ↓
✅ Migration Verified — Pre-migration backup retained for safety window
```

- **Rule:** Risky migrations (field removals, data transformations, index restructuring) must have a verified recovery point before execution.
- **Safety Window:** Pre-migration backup is retained for a minimum of 7 days after successful migration verification.

---

### 7.9.12 Production Data Protection

Production data must never be casually manipulated:

```text
❌ Developer: "Let me quickly fix this record directly in production MongoDB"
✅ Developer: "I'll investigate via logs and read-only inspection, then create a proper fix"
```

1. **No Ad-Hoc Production Edits:** Direct database modifications in production require a documented, approved operational procedure.
2. **Debugging Without Mutation:** Use structured logs (Section 7.5), read-only queries, and sanitized test data for debugging.
3. **Controlled Admin Tools:** If production data manipulation is required, it must go through approved administrative tools with audit logging.

---

### 7.9.13 Recovery Priority Matrix

Not every function has equal business importance during incident recovery:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                    iPOMS RECOVERY PRIORITY MATRIX                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIORITY 1 — CRITICAL (Restore First)                                      │
│  ├── Authentication & Login                                                  │
│  ├── MongoDB Database Availability                                          │
│  └── Core RBAC & User Session Management                                    │
│                                                                              │
│  PRIORITY 2 — HIGH (Restore Second)                                         │
│  ├── Company Metadata & College Management                                  │
│  ├── Daily Tracker & Weekly Tracker                                         │
│  └── Assignment Management                                                  │
│                                                                              │
│  PRIORITY 3 — MEDIUM (Restore Third)                                        │
│  ├── Daily Leads                                                            │
│  ├── Notifications                                                          │
│  └── Report Library & Generation                                            │
│                                                                              │
│  PRIORITY 4 — STANDARD (Restore Last)                                       │
│  ├── Import Processing History                                              │
│  ├── Recycle Bin                                                            │
│  └── System Information / Administration Dashboards                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.9.14 Incident Recovery Runbook (Framework)

A documented recovery sequence prevents panic-driven decisions during real incidents:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│               iPOMS INCIDENT RECOVERY RUNBOOK                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Step 1:  DETECT — Identify the incident (monitoring, alert, user)    │
│  Step 2:  ASSESS — Determine severity and scope of impact             │
│  Step 3:  CONTAIN — Stop further damage (halt deployment, block ops)  │
│  Step 4:  IDENTIFY — Determine correct recovery method                │
│           (rollback? PITR? snapshot restore? both?)                    │
│  Step 5:  RESTORE — Execute recovery procedure                        │
│  Step 6:  VALIDATE DB — Verify collections, indexes, data integrity   │
│  Step 7:  VALIDATE APP — Verify application connectivity & function   │
│  Step 8:  SMOKE TEST — Run critical business workflow tests            │
│  Step 9:  RESUME — Restore normal operations                          │
│  Step 10: DOCUMENT — Record incident, root cause, recovery actions    │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Note:** The full operational runbook will be created during the deployment phase. Chapter 7.9 establishes the requirement and framework.

---

### 7.9.15 Recovery Access Control

Recovery operations are restricted to authorized personnel:

| Operation | Authorized Roles | Not Authorized |
|---|---|---|
| **Recycle Bin Restore** (individual record) | Coordinator, Team Leader, Admin, Director | — |
| **Hard Purge from Recycle Bin** | Director, CEO, Administrator only | Coordinator, Team Leader |
| **Full Database Restore** | Operations / System Administrator only | All application users |
| **Deployment Rollback** | Authorized deployer / Operations | Individual developers |
| **Production Data Manipulation** | System Administrator with documented approval | All developers |

---

### 7.9.16 Soft-Delete & 90-Day Purge Operational Safeguards

As established in previous chapters, the application-level data protection operates through:

1. **Soft Delete Standard:** Deleting records moves them to `recycle_bin` with `is_deleted: true` and a full original document snapshot.
2. **Hard Purge Restrictions:** Hard purging records from `recycle_bin` is restricted exclusively to Director, CEO, and Administrator roles.
3. **Automated Background Retention (TTL):** Background job (`ttlPurger.js`) automatically hard-purges items in `recycle_bin` and `import_processing_history` after exactly 90 days.

---

### 7.9.17 Disaster Recovery Scenarios

| Scenario | Recovery Procedure |
|---|---|
| **Database corruption / failure** | Restore from latest snapshot or PITR to pre-incident point |
| **Application server failure** | Redeploy known tagged release from container registry |
| **Bad deployment** | Roll back to previous container image version (Section 7.7.11) |
| **Accidental bulk data deletion** | PITR to moment before deletion + verify data integrity |
| **Storage / file system failure** | Restore from independent backup storage |
| **Security breach / compromise** | Isolate systems → rotate credentials → restore from clean backup → audit |
| **Major infrastructure failure** | Rebuild services from Git + Docker registry + restore DB from independent backup |

---

### 7.9.18 Backup Monitoring & Alerting

Backup operations must be actively monitored:

1. **Success/Failure Logging:** Every scheduled backup records its completion status, duration, and resulting backup size.
2. **Failure Alerts:** Backup failures trigger an immediate alert to system administrators via the configured notification channel.
3. **Stale Backup Detection:** If no successful backup has been recorded within 48 hours, an escalation alert is generated.
4. **Admin Dashboard Visibility:** Backup status (last successful backup timestamp, next scheduled backup) is visible in the System Information / Administration dashboard.

---

### 7.9.19 Formal Architectural Decisions Sign-Off (Q1 – Q8)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: Production MongoDB backups automated rather than manually created?** | **YES (Mandatory)** | Scheduled automated snapshots + continuous PITR where infrastructure supports |
| **Q2: Backups stored separately from primary production environment?** | **YES (Mandatory)** | Independent backup storage; not co-located with production database server |
| **Q3: Backup failures generate administrator/operations alert?** | **YES (Approved)** | Automated failure alerting + stale backup detection (48-hour threshold) |
| **Q4: Periodic actual restore tests rather than just checking backup files exist?** | **YES (Approved)** | Quarterly restore tests to test environment + pre-major-release restore tests |
| **Q5: Risky database migrations have verified recovery point before execution?** | **YES (Mandatory)** | Pre-migration snapshot + 7-day safety window retention |
| **Q6: Full database recovery restricted to authorized operations personnel?** | **YES (Approved)** | Recovery access control matrix; application users cannot restore databases |
| **Q7: RPO and RTO formally defined before production launch?** | **YES (Approved)** | Targets established during deployment phase; RPO < 1hr, RTO < 2hr recommended |
| **Q8: Application rollback and database recovery remain separate procedures?** | **YES (Approved)** | Distinct procedures: container rollback vs. DB restore; never conflated |

---

# Section 7.10 – Documentation & Maintenance Standards

This section defines how iPOMS remains understandable and maintainable after initial development is complete. The foundational principle is:

> **The documentation and the code must evolve together.**

---

### 7.10.1 Documentation Is Part of the Codebase

The `/docs` directory is a first-class citizen in the iPOMS repository from Day 1:

```text
iPOMS/
├── frontend/
├── backend/
├── docs/
│   ├── architecture/          # System, frontend, backend architecture
│   ├── api/                   # OpenAPI specs, Postman collections
│   ├── database/              # Collection specifications, data lifecycle
│   ├── modules/               # Per-module documentation
│   ├── business-rules/        # Business rule specifications
│   ├── adr/                   # Architecture Decision Records
│   ├── setup/                 # Developer setup & environment guides
│   ├── troubleshooting/       # Common problem solutions
│   └── maintenance/           # Operational maintenance procedures
├── scripts/
├── tests/
├── CHANGELOG.md
└── README.md
```

- **Rule:** Documentation is version-controlled alongside the implementation. Changes to documented behavior must include documentation updates in the same PR (per Section 7.6.11).

---

### 7.10.2 Architecture Documentation

The architecture frozen across Chapters 1–6 must remain accessible to all developers:

| Document | Location | Contents |
|---|---|---|
| **System Architecture Overview** | `docs/architecture/system-overview.md` | Full system diagram, technology stack, deployment topology |
| **Frontend Architecture** | `docs/architecture/frontend.md` | Component hierarchy, routing, state management, hooks pattern |
| **Backend Architecture** | `docs/architecture/backend.md` | 3-tier layering (Controller → Service → Repository), middleware chain |
| **Authentication & RBAC** | `docs/architecture/auth-rbac.md` | JWT flow, refresh token lifecycle, role permissions matrix |
| **Background Jobs** | `docs/architecture/background-jobs.md` | Job registry, schedules, failure handling, leader election |
| **Integration Architecture** | `docs/architecture/integrations.md` | MS Teams, S3, SMTP integration patterns and error isolation |

- **Purpose:** A new developer should be able to understand **why the application is structured the way it is** without reverse-engineering the code.

---

### 7.10.3 API Documentation (OpenAPI 3.0 / Swagger + Postman)

The backend API must have actively maintained documentation:

1. **Swagger UI:** REST API endpoints documented using OpenAPI 3.0 annotations, served at `/api/v1/docs`.
2. **Postman Collection:** An up-to-date Postman collection (`docs/api/ipoms-postman-collection.json`) updated whenever API endpoints are created or modified.
3. **Synchronization Rule:** API documentation must stay synchronized with actual endpoints:

```text
API Endpoint Changed
        ↓
Implementation Updated
        ↓
Tests Updated
        ↓
OpenAPI Specification Updated
        ↓
Postman Collection Updated
        ↓
Single PR
```

---

### 7.10.4 Database Collection Documentation

The 14 operational collections must have documented specifications:

| Documentation Element | Required For Each Collection |
|---|---|
| **Purpose** | What business entity or function does this collection serve? |
| **Fields** | Field name, type, required/optional, default value, description |
| **Relationships** | References to other collections (e.g., `college_id` → `colleges`) |
| **Indexes** | Compound indexes with purpose and query optimization target |
| **TTL Behavior** | If applicable (e.g., `recycle_bin`, `import_processing_history`) |
| **Validation Rules** | Schema-level validation constraints |
| **Data Lifecycle** | Creation → modification → soft-delete → purge flow |
| **Permissions** | Which roles can create, read, update, delete |
| **Business Rules** | Critical operational rules (e.g., audit logs are immutable) |

---

### 7.10.5 Business Rules Documentation

Technical documentation alone is insufficient. iPOMS contains many business rules that developers must understand explicitly:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│               CRITICAL BUSINESS RULES (Must Be Documented)                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  • Weekly Tracker has 7 defined sections (frozen in Chapter 4)              │
│  • Daily Leads: JD Received does NOT delete the Positive entry             │
│  • Recycle Bin: restoration returns full document snapshot to source        │
│  • Recycle Bin: 90-day TTL auto-purge via background job                   │
│  • HR Metadata Sync: explicit "Sync to Master" — never automatic           │
│  • Import Processing: partial success (95 valid rows saved if 5 fail)      │
│  • Audit Logs: immutable — no edit, no delete through application          │
│  • Import History: read-only for Coordinators                              │
│  • Coordinators cannot perform certain administrative actions              │
│  • Notifications: Meeting announcements support Will Attend / Cannot Attend│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Location:** `docs/business-rules/` with per-module rule files.
- **Rule:** Business rules must be documented separately from low-level implementation details so they can be reviewed without reading source code.

---

### 7.10.6 Module Documentation Template

Each major iPOMS module should have a concise module-level document following this structure:

```text
Module: [Module Name]
├── Purpose                    — What this module does
├── User Roles & Permissions   — Who can access what
├── Workflow                   — Primary user journey / data flow
├── API Endpoints              — Summary of routes with HTTP methods
├── Database Collections       — Collections this module reads/writes
├── Validation Rules           — Key input validation requirements
├── Business Rules             — Module-specific frozen business rules
├── Background Jobs            — If applicable
├── Tests                      — Test coverage summary
└── Known Operational Rules    — Edge cases, gotchas, important notes
```

- **Location:** `docs/modules/<module-name>.md`
- **Coverage:** All 14 iPOMS modules should eventually have module documentation.

---

### 7.10.7 Developer Setup & README Documentation

A new developer must be able to set up and run iPOMS without relying on someone's personal instructions:

**`README.md` (root)** must include:
1. **Project Overview:** What is iPOMS, technology stack, architecture summary.
2. **Prerequisites:** Node.js version, npm version, MongoDB, Docker (if applicable).
3. **Installation:** Step-by-step repository clone, dependency installation.
4. **Environment Setup:** `.env` file configuration with all required variables documented.
5. **Database Setup:** Local MongoDB configuration, seed data (if applicable).
6. **Running Locally:** `npm run dev` for frontend and backend.
7. **Running Tests:** `npm test`, coverage reports.
8. **Build Process:** Production build commands.
9. **Common Troubleshooting:** Quick fixes for common setup issues.

---

### 7.10.8 Architecture Decision Records (ADR)

Major architectural decisions must be recorded using lightweight ADRs in `docs/adr/`:

**Format:** `docs/adr/ADR-XXXX-<title>.md`

```text
# ADR-XXXX: [Decision Title]

## Status
Accepted / Superseded / Deprecated

## Context
What problem or decision prompted this?

## Decision
What was decided?

## Reason
Why this approach over alternatives?

## Alternatives Considered
What other options were evaluated?

## Consequences
What are the implications of this decision?
```

**Initial ADRs to create during scaffolding:**

| ADR | Decision |
|---|---|
| ADR-0001 | Monorepo with separate frontend/backend directories |
| ADR-0002 | Strict 3-tier backend layering (Controller → Service → Repository) |
| ADR-0003 | JWT access token + HTTP-Only refresh token authentication |
| ADR-0004 | Soft-delete with Recycle Bin collection pattern |
| ADR-0005 | 7-section Weekly Tracker architecture |
| ADR-0006 | Background jobs within backend container (node-cron) |

- **Rule:** Any future deviation from the frozen architecture (Chapters 1–7) must be documented as a new ADR before implementation.

---

### 7.10.9 Changelog Maintenance Protocol

The project changelog must be updated with every tagged release:

**File:** `CHANGELOG.md` (repository root)

**Format:** Standard headers per [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.3.0] - 2026-09-15

### Added
- Daily Leads JD Received workflow with notification triggers

### Changed
- Weekly Tracker section 4 now includes pipeline status indicator

### Fixed
- Company Metadata HR sync failing for records with missing phone fields

### Security
- Rate limiting added to password reset endpoint
```

---

### 7.10.10 Codebase Commenting Standards (TSDoc / JSDoc)

Source code comments follow these rules:

1. **TSDoc for Public Methods:** All public Service methods, complex calculations (e.g., Weekly Tracker 7-section aggregation), and custom React hooks must include TSDoc blocks:

```typescript
/**
 * Synchronizes HR records from a company assignment to the Master Company Metadata.
 * Only updates fields that have changed since the last sync.
 *
 * @param companyId - The ObjectId of the company_metadata document
 * @param hrRecords - Array of HR records to sync from the assignment
 * @returns The updated company_metadata document
 * @throws {NotFoundError} If the company_metadata document does not exist
 * @throws {ValidationError} If any HR record fails schema validation
 */
async syncHRToMaster(companyId: string, hrRecords: HRRecord[]): Promise<CompanyMetadata>
```

2. **Avoid Obvious Comments:** Do not comment what the code already clearly expresses. Comment **why**, not **what**.
3. **TODO/FIXME Protocol:** `// TODO:` and `// FIXME:` comments must include the author and date. They are tracked and resolved before release.

---

### 7.10.11 Deprecation Protocol

When functionality is being replaced, follow a controlled deprecation lifecycle:

```text
ACTIVE ➔ DEPRECATED ➔ MIGRATION PERIOD ➔ REMOVED
```

1. **Mark as Deprecated:** Add `@deprecated` annotation in code + document in `docs/deprecations.md`.
2. **Provide Migration Path:** Document what replaces the deprecated functionality.
3. **Minimum Notice Period:** Deprecated features remain functional for at least one minor version release before removal.
4. **Removal:** Only remove after confirming no active consumers and documenting in CHANGELOG under `[Removed]`.

---

### 7.10.12 Troubleshooting Documentation

Common operational problems must have documented solutions in `docs/troubleshooting/`:

| Problem Category | Example Issues |
|---|---|
| **Backend Startup** | App won't start, missing env variables, DB connection failure |
| **Authentication** | Login fails, JWT expired, refresh token invalid |
| **Database** | Connection timeout, index errors, migration failures |
| **Background Jobs** | Job not executing, duplicate executions, job failure |
| **Import Processing** | Excel parsing errors, partial import failures |
| **Notifications** | Teams webhook failure, email delivery failure |
| **Deployment** | Build failure, container crash, health check failure |
| **Performance** | Slow queries, memory issues, API timeout |

---

### 7.10.13 Maintenance Procedures

Recurring operational tasks must be documented in `docs/maintenance/`:

| Procedure | Frequency | Documentation |
|---|---|---|
| **Backup verification** | Daily (automated) + quarterly (manual restore test) | `docs/maintenance/backup-verification.md` |
| **Dependency updates** | Monthly review + quarterly update cycle | `docs/maintenance/dependency-updates.md` |
| **Security patching** | As needed (critical: immediate) | `docs/maintenance/security-patching.md` |
| **Log review** | Weekly summary review | `docs/maintenance/log-review.md` |
| **Background job verification** | After every deployment | `docs/maintenance/job-verification.md` |
| **Health check review** | Continuous (automated) | `docs/maintenance/health-checks.md` |
| **Database cleanup** | 90-day TTL (automated) + periodic index review | `docs/maintenance/database-cleanup.md` |

---

### 7.10.14 Single Source of Truth Rule

For every important concept, there must be **one authoritative definition** to prevent conflicting documentation:

```text
┌────────────────────────────────┬─────────────────────────────────────────────┐
│ Concept                        │ Single Source of Truth                      │
├────────────────────────────────┼─────────────────────────────────────────────┤
│ Business Rules                 │ docs/business-rules/<module>.md             │
│ API Contract                   │ OpenAPI spec (docs/api/openapi.yaml)        │
│ Database Schema                │ Mongoose models + docs/database/<coll>.md   │
│ Architecture Decisions         │ docs/adr/ADR-XXXX-<title>.md               │
│ Environment Configuration      │ .env.example + docs/setup/environment.md   │
│ Deployment Procedures          │ docs/maintenance/deployment.md             │
│ RBAC Permission Matrix         │ docs/architecture/auth-rbac.md             │
│ Implementation                 │ Source code + tests                         │
└────────────────────────────────┴─────────────────────────────────────────────┘
```

- **Rule:** If something changes, update the authoritative source first, then propagate to dependent documentation. Avoid maintaining the same information in multiple places.

---

### 7.10.15 Formal Architectural Decisions Sign-Off (Q1 – Q8)

| Question | Decision | Enforcement Mechanism |
|---|---|---|
| **Q1: `/docs` as a first-class part of the iPOMS repository from Day 1?** | **YES (Approved)** | `/docs` directory with structured subdirectories committed from project scaffolding |
| **Q2: Every significant API change requires API documentation update?** | **YES (Approved)** | OpenAPI spec + Postman collection updated in the same PR as the API change |
| **Q3: Business rules documented separately from implementation code?** | **YES (Approved)** | `docs/business-rules/` with per-module rule files |
| **Q4: Major architectural decisions recorded as lightweight ADRs?** | **YES (Approved)** | `docs/adr/ADR-XXXX-<title>.md` format; mandatory for architecture deviations |
| **Q5: Each major module has a concise module-level document?** | **YES (Approved)** | `docs/modules/<module-name>.md` following standardized template |
| **Q6: Documentation updates part of Definition of Done?** | **YES (Approved)** | Integrated into iPOMS DoD (7.6.1) and single-PR synchronization rule (7.6.11) |
| **Q7: Developer setup & troubleshooting docs maintained?** | **YES (Approved)** | README.md + `docs/setup/` + `docs/troubleshooting/` |
| **Q8: Deprecated functionality documented before removal?** | **YES (Approved)** | `@deprecated` annotation + `docs/deprecations.md` + minimum 1-version notice |

---

# Section 7.11 – Milestone Sign-Off & Project Scaffolding Gateway

With all 10 sections of Chapter 7 completed and frozen, the **planning and theoretical architecture phase for iPOMS is OFFICIALLY COMPLETE**.

```text
╔═════════════════════════════════════════════════════════════════════════════════╗
║                        iPOMS ARCHITECTURAL MILESTONE MATRIX                   ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  MILESTONE 1: Product & UX Design (Chapters 1 – 3)         ✅ FROZEN         ║
║  MILESTONE 2: System & Business Architecture (Chapters 4–5) ✅ FROZEN         ║
║  MILESTONE 3: Technical Architecture (Chapter 6)            ✅ FROZEN         ║
║  MILESTONE 4: Development Standards & Rules (Chapter 7)     ✅ FROZEN         ║
║                                                                               ║
║  Chapter 7 Sections:                                                          ║
║  ├── 7.1  Coding Standards & Naming Conventions             ✅ SIGNED OFF    ║
║  ├── 7.2  Git & Version Control Strategy                    ✅ SIGNED OFF    ║
║  ├── 7.3  Environment & Configuration Management            ✅ SIGNED OFF    ║
║  ├── 7.4  Testing Strategy                                  ✅ SIGNED OFF    ║
║  ├── 7.5  Error Handling & Logging Standards                ✅ SIGNED OFF    ║
║  ├── 7.6  Code Review & Quality Standards                   ✅ SIGNED OFF    ║
║  ├── 7.7  Build & Deployment Standards                      ✅ SIGNED OFF    ║
║  ├── 7.8  Security Development Standards                    ✅ SIGNED OFF    ║
║  ├── 7.9  Backup, Recovery & Operational Safety             ✅ SIGNED OFF    ║
║  └── 7.10 Documentation & Maintenance Standards             ✅ SIGNED OFF    ║
║                                                                               ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║  OVERALL STATUS: READY FOR PROJECT SCAFFOLDING & CODE DEVELOPMENT! 🚀        ║
╚═════════════════════════════════════════════════════════════════════════════════╝
```

---

### Next Immediate Operational Steps:

**Phase 1 — Project Scaffolding:**
1. Initialize Git repository with branch protections (per 7.2).
2. Create monorepo directory structure (`/frontend`, `/backend`, `/docs`, `/scripts`, `/tests`).
3. Initialize Next.js 14+ frontend project (`/frontend`).
4. Initialize Node.js / Express backend project (`/backend`).
5. Configure environment files and validation (per 7.3).
6. Build backend folder tree (3-tier layered architecture per Chapter 6).
7. Build frontend folder tree (component hierarchy per Chapter 6).
8. Create initial `/docs` structure with architecture documentation stubs.
9. Create initial ADRs (ADR-0001 through ADR-0006).
10. Configure ESLint, Prettier, Husky, lint-staged (per 7.1, 7.6).

**Phase 2 — Foundation Implementation:**
1. Authentication module (JWT + refresh tokens + RBAC middleware + login screens).
2. User & role management module.
3. Database connection, models, and seed data.
4. Error handling middleware (per 7.5).
5. Health check endpoint (per 7.7.9).

**Phase 3 — First Business Modules:**
1. College Management.
2. Master Company Metadata.
3. Assignment Management.
4. Daily Tracker (first operational module).
