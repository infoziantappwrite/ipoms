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

To guarantee absolute consistency across human developers and AI coding assistants, the iPOMS codebase strictly enforces uniform naming conventions across all software layers.

### 7.1.1 File & Directory Naming Rules

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

### 7.1.2 Variable & Constant Naming Conventions

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

### 7.1.3 Function & Method Naming Conventions

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

### 7.1.4 Frontend React Component & Hook Conventions

1. **React Components (`PascalCase`):**
   - Components must use `PascalCase` matching their file name.
   - Use named exports for UI and Feature components (`export function UserCard()`).
   - Default exports are strictly reserved for Next.js page components (`export default function DailyTrackerPage()`).
2. **Custom React Hooks (`camelCase` with `use` Prefix):**
   - All custom hooks must begin with `use` (e.g., `useDailyTracker`, `useAuth`, `useCompanyMetadata`).

---

### 7.1.5 REST API Naming & URL Structure Standards

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

### 7.1.6 Database Schema Field Naming Rules

In accordance with Chapter 5 MongoDB Specifications:
- Document fields use `snake_case` (e.g., `college_id`, `company_name`, `call_date`, `is_deleted`, `created_at`, `updated_at`).
- Foreign key reference fields must strictly append `_id` (e.g., `user_id`, `college_id`, `company_metadata_id`).

---

# Section 7.2 – Git & Version Control Strategy

iPOMS enforces a structured **Git Flow** variant to maintain repository stability and facilitate seamless multi-developer collaboration.

### 7.2.1 Git Flow Branching Strategy

```text
main (Production Ready - Sealed)
  ▲
  │ (Release Merge)
staging (Pre-Production QA Environment)
  ▲
  │ (Feature Integration Merge via PR)
development (Active Integration Branch)
  ├── feature/daily-tracker-autosave
  ├── feature/auth-rbac-guard
  └── bugfix/recycle-bin-restore-id
```

| Branch Name | Operational Purpose | Protection Level | Auto-Deployment Target |
|---|---|---|---|
| `main` | Production-ready stable release code. Tagged with SemVer. | **Protected** (Requires 2 Approvals + Passed CI) | Production Environment |
| `staging` | Release candidate integration and pre-prod regression testing. | **Protected** (Requires 1 Approval + Passed CI) | Staging / Pre-Prod |
| `development` | Main integration branch for active development. | **Protected** (No direct push, PR merge only) | Dev Server |
| `feature/*` | Isolated feature development (`feature/<module>-<desc>`). | Developer Branch | Local / Preview Environments |
| `bugfix/*` | Non-critical defect fixes (`bugfix/<issue-id>-<desc>`). | Developer Branch | Local / Preview Environments |
| `hotfix/*` | Critical production hotfixes (`hotfix/v1.0.1-<desc>`). | Branch off `main` | Staging ➔ Production |

---

### 7.2.2 Conventional Commit Message Specifications

All commit messages must adhere strictly to the **Conventional Commits** standard:

```text
<type>(<scope>): <short imperative summary>

[optional body giving context on WHY the change was made]

[optional footer for breaking changes or issue links]
```

#### Commit Types:
- `feat`: A new end-user feature (e.g., `feat(daily-tracker): implement 5-second auto-save endpoint`).
- `fix`: A bug fix (e.g., `fix(rbac): prevent placement coordinator from hard purging records`).
- `docs`: Documentation changes only (e.g., `docs(api): update Chapter 05 Swagger specs`).
- `style`: Formatting, missing semi-colons, white-space changes (no code logic impact).
- `refactor`: Code restructuring without changing functional behavior.
- `test`: Adding missing tests or refactoring existing test suites.
- `chore`: Maintenance tasks, dependency updates, build configuration updates.
- `perf`: Performance optimization changes.

---

### 7.2.3 Feature Branch & Pull Request (PR) Rules

1. **PR Requirements:**
   - Every PR must target `development` (or `main` for hotfixes).
   - PR Title must follow Conventional Commits format.
   - PR Description must detail: (1) Changes Made, (2) How it was Tested, (3) Linked Issue/Task ID.
2. **Automated PR Checks:**
   - ESLint and Prettier formatting checks must pass with 0 errors.
   - All Unit and Integration test suites must pass 100%.
   - No security vulnerabilities flagged by automated security scanners.
3. **Human Approval Rules:**
   - Minimum **1 Senior Developer or Tech Lead approval** is required before merging into `development`.
   - Self-approval is strictly forbidden.

---

### 7.2.4 Code Merge & Release Tagging Protocol

1. **Squash and Merge:** Feature branches must be merged into `development` using **Squash and Merge** to maintain a clean, linear git history.
2. **Semantic Versioning (SemVer):** Releases on `main` are tagged using `vMAJOR.MINOR.PATCH` (e.g., `v1.0.0`, `v1.1.0`).

---

# Section 7.3 – Environment Management & Configuration

To prevent configuration drift and security leaks, environment management is strictly segregated across 4 execution environments.

### 7.3.1 4-Tier Environment Lifecycle

```text
[ Developer Workstation ] ➔ [ QA / Test Server ] ➔ [ Staging Mirror ] ➔ [ Production Cluster ]
    (DEV - Local DB)          (TEST - Mock/Test DB)    (STG - Prod Clone)      (PROD - Atlas Multi-Region)
```

1. **Development (DEV):** Local engineer workstation executing Node.js & Next.js dev servers with local MongoDB or Docker container.
2. **Testing (TEST/QA):** Automated CI runner executing unit/integration suites against an ephemeral MongoDB memory database.
3. **Staging (STG):** Exact replica of Production hardware, Nginx configuration, and database topology used for final sign-off.
4. **Production (PROD):** High-availability, load-balanced enterprise environment.

---

### 7.3.2 Environment Variable Security & `.env` Separation

1. **Strict Version Control Exclusion:** `.env`, `.env.local`, `.env.production` files must NEVER be committed to Git. They are explicitly excluded in `.gitignore`.
2. **Template File (`.env.example`):** A sanitized `.env.example` file containing all required key names with dummy sample values MUST be maintained in the repository root.
3. **Vault Management:** Production and Staging secrets are injected securely at runtime via CI/CD secrets vaults (e.g., GitHub Secrets, AWS Secrets Manager).

---

### 7.3.3 Mandatory Application Environment Variables Registry

```env
# ==============================================================================
# iPOMS MANDATORY ENVIRONMENT CONFIGURATION TEMPLATE (.env.example)
# ==============================================================================

# Node Runtime & Server Specs
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
API_PREFIX=/api/v1
FRONTEND_URL=http://localhost:3000

# MongoDB Persistence Cluster
MONGODB_URI=mongodb://localhost:27017/ipoms_dev
MONGODB_MAX_POOL_SIZE=50

# JWT & Authentication Secrets
JWT_SECRET=super_secret_jwt_access_key_min_64_chars_change_in_prod
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=super_secret_refresh_token_key_change_in_prod
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Security & CORS Constraints
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Integration Webhooks & Storage
MS_TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/dummy_key
AWS_S3_BUCKET_NAME=ipoms-production-exports
AWS_REGION=ap-south-1

# Application Background Engine & System Defaults
TIMEZONE=Asia/Kolkata
LOG_LEVEL=debug
ENABLE_TTL_PURGER=true
RECYCLE_BIN_RETENTION_DAYS=90
IMPORT_HISTORY_RETENTION_DAYS=90
```

---

# Section 7.4 – Comprehensive Testing Strategy

Quality is verified continuously across the entire software development lifecycle using a multi-tiered automated testing pyramid.

```text
        / \
       /   \     E2E Tests (Playwright - Critical Flows)
      /-----\
     /       \   Integration Tests (Supertest API + DB)
    /---------\
   /           \ Unit Tests (Jest/Vitest - Services & Utils)
  /-------------\
```

### 7.4.1 Unit Testing Standards (Jest / Vitest)

- **Scope:** Individual domain functions, service layer logic, data formatters, and schema validators.
- **Isolation:** Unit tests must execute in pure isolation without making network or real database calls (use Mongoose Mocks or repository stubs).
- **Target Coverage:** **≥ 80% line coverage** on Business Logic Services and Utility modules.
- **File Location:** Placed alongside source code as `*.test.js` or `*.test.ts` (e.g., `dailyTrackerService.test.js`).

---

### 7.4.2 Backend API Integration Testing (Supertest + Test DB)

- **Scope:** Full API gateway pipeline execution from HTTP Request ➔ Route ➔ Auth Guard Middleware ➔ Controller ➔ Service ➔ Repository ➔ MongoDB In-Memory Server.
- **Verification Targets:**
  - Valid requests return expected HTTP status codes (200, 201) and payload structures.
  - Invalid requests return 400/422 validation errors with correct correlation IDs.
  - Unauthorized requests return 401/403 forbidden responses.
  - Transaction rollbacks execute cleanly on server failure.

---

### 7.4.3 Frontend Component Testing (React Testing Library)

- **Scope:** Isolated React components, forms, modals, tables, and permission guard wrappers.
- **Verification Targets:**
  - Component renders correctly given initial props.
  - User interactions (button clicks, form typing) update UI state as expected.
  - Role-Based guards correctly hide or disable restricted buttons for unauthorized roles.

---

### 7.4.4 End-to-End (E2E) Testing (Playwright / Cypress)

Automated browser tests verifying the 6 critical business workflows:

1. **User Authentication Flow:** Login ➔ JWT Token Storage ➔ Role-Based Dashboard Redirection ➔ Logout.
2. **Daily Tracker Entry & Auto-Save:** Form Input ➔ 5-sec Auto-save trigger ➔ Midnight Finalization lock.
3. **Master HR Metadata Sync:** Daily Tracker log entry ➔ Explicit HR Sync click ➔ Master Company Metadata updated.
4. **Weekly Tracker Aggregation:** Academic Year selection ➔ 7-Section continuous aggregate rendering.
5. **Recycle Bin Restoration:** Placement Coordinator soft-deleting a record ➔ Navigating to Recycle Bin ➔ Successful restoration.
6. **Bulk Excel Import:** Uploading `.xlsx` file ➔ Schema validation ➔ 90-Day Import History record generation.

---

### 7.4.5 Automated Regression & Smoke Test Pipeline

- **Pre-Commit Hook:** Husky runs ESLint, Prettier, and fast unit tests before allowing `git commit`.
- **PR Build Pipeline:** Executes complete Unit + Integration test suite on every PR against `development`.
- **Nightly Build:** Executes full Playwright E2E test suite against the `staging` environment.

---

# Section 7.5 – Error Handling & Logging Standards

iPOMS enforces predictable, uniform error handling and correlation-indexed logging across all client and server layers.

### 7.5.1 Standardized API Error Response Contract

All backend API errors MUST return the following standardized JSON payload:

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
  "timestamp": "2026-08-08T14:50:00.000Z"
}
```

---

### 7.5.2 HTTP Status Code & Error Class Taxonomy

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

---

### 7.5.3 Frontend Error Boundaries & Axios Interceptor Handling

1. **Global React Error Boundary:** Wraps top-level layout to gracefully display a modern fall-back screen ("An unexpected error occurred. Our team has been notified.") instead of a blank white screen.
2. **Axios Global Response Interceptor:**
   - `401 Unauthorized`: Triggers silent JWT token refresh; if refresh fails, clears session storage and redirects to `/login`.
   - `403 Forbidden`: Displays an error toast ("Access Denied: You do not have permission to perform this action.").
   - `422 Validation Error`: Maps field errors directly to form input error labels.
   - `500 System Error`: Displays generic error toast with the unique `requestId` for support reference.

---

### 7.5.4 Structured Logging Architecture (Winston + Morgan + Correlation IDs)

1. **Request Correlation ID (`x-request-id`):** Every incoming request is assigned a unique UUID by Nginx/Express middleware (`x-request-id`). This ID is passed through all service logs and returned in API responses.
2. **Winston JSON Formatted Logs:** Logs are output as structured JSON objects in production:

```json
{
  "timestamp": "2026-08-08T14:50:00.124Z",
  "level": "error",
  "message": "Failed to synchronize HR record to Master Metadata",
  "requestId": "req-8f92a1c4-1092-4b2a",
  "userId": "usr_65c8e9f1a23b",
  "service": "dailyTrackerService",
  "stack": "Error: Document not found\n    at DailyTrackerRepository.findById..."
}
```

---

# Section 7.6 – Code Review & Quality Standards

Code quality is enforced programmatically before human reviews take place.

### 7.6.1 Automated Static Analysis & Linting

1. **ESLint Rules:** Enforces strict TypeScript/JavaScript standards, disallowing unused variables, explicit `any` types, and dangling unhandled promises.
2. **Prettier Formatting:** Enforces single quotes, 2-space indentation, 100-character line limits, and trailing commas.
3. **Git Pre-Commit Hooks (Husky + lint-staged):** Automatically runs ESLint and Prettier on staged files prior to commit creation.

---

### 7.6.2 Peer Code Review Checklist (6 Core Pillars)

Every Pull Request MUST be audited against these 6 non-negotiable architectural pillars:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    PEER CODE REVIEW CHECKLIST                          │
├────────────────────────────────────────────────────────────────────────┤
│ [ ] 1. Layered Architecture: Controllers handle HTTP, Services handle  │
│        business logic, Repositories handle DB operations.              │
│ [ ] 2. Security & RBAC: Payload is validated on backend; endpoint is   │
│        protected with authenticateJWT & authorizeRoles middleware.    │
│ [ ] 3. Database Efficiency: MongoDB queries use proper indexes, avoid  │
│        unindexed regex searches, and limit payload fields.             │
│ [ ] 4. Error Handling: All async routes use asyncHandler or try/catch; │
│        errors return standardized JSON with request IDs.              │
│ [ ] 5. Reconciled Business Rules: Adheres to frozen Chapter 6 rules     │
│        (e.g., explicit HR sync, 7 weekly tracker sections).           │
│ [ ] 6. Test Coverage: New features include accompanying unit or        │
│        integration test specs.                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

# Section 7.7 – Build & Deployment Standards

iPOMS utilizes fully automated CI/CD pipelines to package, test, and deploy applications deterministically.

### 7.7.1 CI/CD Pipeline Lifecycle (GitHub Actions)

```text
[ Git Push to Branch ]
         ↓
  1. Lint & Format Check (ESLint / Prettier)
         ↓
  2. Security Audit (Snyk / npm audit)
         ↓
  3. Execute Unit & Integration Tests (Jest)
         ↓
  4. Build Next.js & Node Bundles
         ↓
  5. Build OCI Docker Container Images
         ↓
  6. Deploy to Environment Target (STG / PROD)
```

---

### 7.7.2 Next.js Standalone Build & Docker Containerization

1. **Next.js Standalone Mode:** Next.js frontend is built using `output: 'standalone'` in `next.config.js` to minimize container payload size by excluding unnecessary `node_modules`.
2. **Multi-Stage Dockerfiles:** Docker builds utilize Node.js 20 Alpine lightweight multi-stage base images to reduce production container size to < 150MB.

---

# Section 7.8 – Backup & Recovery Standards

Operational safeguards ensure zero data loss and business continuity.

### 7.8.1 MongoDB Database Backup Strategy

1. **Point-in-Time Recovery (PITR):** MongoDB Atlas continuous oplog tailing enabled with a 35-day restore window.
2. **Daily Automated Snapshots:** Stored across multi-region cloud buckets retained for 30 days.
3. **Monthly Archival Snapshots:** Retained for 12 months for enterprise audit compliance.

---

### 7.8.2 Disaster Recovery Targets

| Metric | Target Specification | Operational Safeguard |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 5 Minutes** | Continuous oplog backup streaming via MongoDB Atlas PITR |
| **Recovery Time Objective (RTO)** | **< 1 Hour** | Automated cluster failover & scripted restore automation |

---

### 7.8.3 Soft-Delete & 90-Day Purge Operational Safeguards

1. **Soft Delete Standard:** Deleting records moves them to `recycle_bin` with `is_deleted: true` and an original copy of document data.
2. **Hard Purge Restrictions:** Hard purging records from `recycle_bin` is restricted exclusively to Director, CEO, and Administrator roles.
3. **Automated Background Retention (TTL):** Background job (`ttlPurger.js`) automatically hard-purges items in `recycle_bin` and `import_processing_history` after exactly 90 days.

---

# Section 7.9 – Security Development Standards (10 Golden Commandments)

Developers and AI coding assistants MUST strictly observe the **10 Golden Commandments of iPOMS Security**:

```text
=================================================================================================
                       THE 10 GOLDEN COMMANDMENTS OF iPOMS SECURITY
=================================================================================================
 1. NEVER hardcode API keys, secrets, or passwords in Git repositories.
 2. NEVER trust frontend validation — ALWAYS re-validate payloads on the backend using Zod/Joi.
 3. NEVER bypass RBAC middleware — attach authenticateJWT and authorizeRoles on every API route.
 4. NEVER log sensitive information (passwords, JWTs, PII, credit cards) in plain text.
 5. NEVER execute raw MongoDB query logic directly inside Express Controllers.
 6. ALWAYS sanitize incoming request payloads against NoSQL Injection using mongo-sanitize.
 7. ALWAYS enforce rate limits on authentication endpoints (/api/v1/auth/* max 5 req/min).
 8. ALWAYS set HTTP-Only, Secure, SameSite=Strict flags on session cookies.
 9. NEVER expose raw system error stack traces to the client browser in production.
10. ALWAYS apply the Principle of Least Privilege for database and cloud service accounts.
=================================================================================================
```

---

# Section 7.10 – Documentation & Maintenance Standards

All code and system interfaces must remain fully documented and maintainable.

### 7.10.1 OpenAPI 3.0 / Swagger & Postman Documentation

1. **Swagger UI:** Standardized REST API endpoints are documented using OpenAPI 3.0 annotations served at `/api/v1/docs`.
2. **Postman Collection:** An up-to-date Postman collection (`docs/api/ipoms-postman-collection.json`) must be updated whenever new API endpoints are created.

---

### 7.10.2 Architecture Decision Records (ADR) & Markdown Standards

1. **ADR Protocol:** Any future deviation or additions to the frozen architecture (Chapters 1 to 7) must be documented in `docs/adr/ADR-XXXX-<title>.md`.
2. **Markdown Maintenance:** Technical docs must follow standard GitHub Flavored Markdown with explicit table structures and Mermaid flowcharts.

---

### 7.10.3 Codebase Commenting & Changelog Maintenance Protocol

1. **JSDoc / TSDoc Standard:** All public Service methods, complex calculations (e.g., Weekly Tracker 7-section aggregation logic), and custom React hooks must include TSDoc comment blocks detailing `@param`, `@returns`, and `@throws`.
2. **Changelog (`CHANGELOG.md`):** Updated with every tagged release adhering to standard headers (`[Added]`, `[Changed]`, `[Fixed]`, `[Security]`).

---

# Section 7.11 – Milestone Sign-Off & Project Scaffolding Gateway

With Chapter 7 completed and frozen, the planning and theoretical architecture phase for iPOMS is **OFFICIALLY COMPLETE**.

```text
=================================================================================================
                            iPOMS ARCHITECTURAL MILESTONE MATRIX
=================================================================================================
  MILESTONE 1: Product & UX Design (Chapters 1 - 3)              ✅ FROZEN & SIGNED OFF
  MILESTONE 2: System & Business Architecture (Chapters 4 - 5)   ✅ FROZEN & SIGNED OFF
  MILESTONE 3: Technical Architecture (Chapter 6)                ✅ FROZEN & SIGNED OFF
  MILESTONE 4: Development Standards & Rules (Chapter 7)         ✅ FROZEN & SIGNED OFF
=================================================================================================
  OVERALL STATUS: READY FOR PROJECT SCAFFOLDING & ACTUAL CODE DEVELOPMENT! 🚀
=================================================================================================
```

### Next Immediate Operational Steps:
1. **Freeze Chapter 7 Specification Document.**
2. **Initialize Project Scaffolding (Phase 1):**
   - Setup Git Repository & Branch Protections.
   - Initialize Next.js 14+ Frontend Project (`/frontend`).
   - Initialize Node.js / Express Backend Project (`/backend`).
   - Establish Database Connection & Environment Config Files.
   - Build Base Folder Trees for Backend (Layered 3-Tier) and Frontend (Component Hierarchy).
3. **Begin Phase 2 & 3 Core Implementation:**
   - Authentication Module (JWT + Refresh Tokens + RBAC Middleware + Login Screens).
   - User & Role Management Module.
   - First Business Module (College Management & Master Company Metadata).
