# INFOZIANT iPOMS — Validated Development Order
**Document:** `DEVELOPMENT_ORDER.md`  
**Status:** 🔒 **AUTHORITATIVE IMPLEMENTATION SEQUENCE**  
**Effective Date:** 15 August 2026  
**Applicability:** Master construction roadmap for all engineering phases.

---

> ### 🏗️ DEVELOPMENT PHILOSOPHY: ZERO CIRCULAR DEPENDENCY
> iPOMS is built in a strict, dependency-ordered pipeline. Each phase provides the foundation, security boundaries, and data contracts required by the subsequent phase. Development and testing proceed side-by-side in every phase.

---

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                            iPOMS DEVELOPMENT ROADMAP                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 0: Project Scaffolding & Core Architecture Setup                      │
│     ↓                                                                        │
│  PHASE 1: Technical Backend & Frontend Foundation                            │
│     ↓                                                                        │
│  PHASE 2: Authentication, Roles & Security Perimeter (Auth First)            │
│     ↓                                                                        │
│  PHASE 3: Master Institutional & Corporate Data (Colleges, Metadata, Assign) │
│     ↓                                                                        │
│  PHASE 4: Core Operational Workflows (Daily Tracker, Weekly, Leads)          │
│     ↓                                                                        │
│  PHASE 5: Supporting Services & Safety Nets (Recycle Bin, Audit, Alerts)     │
│     ↓                                                                        │
│  PHASE 6: Reporting, BI & Role-Based Dashboards                              │
│     ↓                                                                        │
│  PHASE 7: Administration, Global Settings & Background Schedulers            │
│     ↓                                                                        │
│  PHASE 8: Full-System Integration & Critical Business Journey E2E Testing    │
│     ↓                                                                        │
│  PHASE 9: Staging Gate Validation & Production Launch                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Step-by-Step Construction Plan

### Phase 0: Project Scaffolding & Core Architecture Setup
1. **Repository Structure:** Initialize root monorepo directory layout:
   - `/frontend` (Next.js 14+ App Router, Tailwind CSS, TypeScript)
   - `/backend` (Node.js, Express, Mongoose, TypeScript)
   - `/docs` (Architecture Decision Records, API specs, Module docs)
   - `/scripts` (Database seeders, migration scripts)
   - `/tests` (E2E Playwright test suites)
2. **Developer Tooling & Linting:**
   - Configure TypeScript (`tsconfig.json`) in frontend and backend with strict typing.
   - Configure ESLint and Prettier rules (2 spaces, single quotes, 100 char limit).
   - Configure Git pre-commit hooks via Husky and `lint-staged`.
3. **Environment & Fail-Fast Validation:**
   - Create `.env.example` templates in root, `/frontend`, and `/backend`.
   - Implement Zod schema environment validator (`/backend/src/config/env.ts`).
4. **Architecture Documentation Stubs:**
   - Initialize ADRs: `ADR-0001` (Monorepo), `ADR-0002` (3-Tier Layering), `ADR-0003` (Dual-Token JWT), `ADR-0004` (Soft-Delete & Recycle Bin), `ADR-0005` (Tracker vs. Report Separation), `ADR-0006` (node-cron Background Jobs).

---

### Phase 1: Technical Backend & Frontend Foundation
1. **Backend Infrastructure:**
   - Express server instantiation with security middleware: Helmet, CORS, Morgan structured access logging, express-rate-limit.
   - Unique Request ID middleware (`x-request-id` attached to requests, responses, and loggers).
   - Centralized Winston structured JSON logger.
   - Centralized `errorHandler` middleware returning standard JSON error envelope.
   - MongoDB connection manager with resilient auto-reconnect and pooling.
   - Base health check route (`GET /api/v1/health`).
2. **Frontend Foundation:**
   - Next.js 14+ App Router shell with root layout and metadata.
   - Global CSS design system tokens (Color variables, Typography, Elevation, Spacing per Chapter 1).
   - Core reusable enterprise components (Buttons, Inputs, Modals, Card containers per Chapter 2).
   - Global Axios client with Request ID forwarding and 401/403/422 response interceptors.
   - Global React Error Boundary fallback screen.

---

### Phase 2: Authentication, Roles & Security Perimeter
1. **Database Models & Seed Data:**
   - Implement `roles` and `users` Mongoose schemas with compound indexes.
   - Seed standard system roles: `PLACEMENT_COORDINATOR`, `TEAM_LEADER`, `ADMINISTRATOR`, `TPO`.
   - Seed initial Administrator master account.
2. **Authentication Engine:**
   - Password hashing and salting with bcrypt.
   - Dual-token JWT issuer: 15-min Access Token + 7-day HTTP-Only Secure cookie Refresh Token.
   - RBAC middleware: `authenticateJWT` and `authorizeRoles(...)`.
   - Rate limiting on all authentication routes (`/api/v1/auth/*`).
3. **Auth API Endpoints:**
   - `POST /api/v1/auth/login`
   - `POST /api/v1/auth/refresh`
   - `POST /api/v1/auth/logout`
   - `POST /api/v1/auth/forgot-password` (4-step OTP recovery flow)
   - `POST /api/v1/auth/reset-password`
4. **Frontend Auth & Protection:**
   - `AuthProvider` context managing in-memory token, user profile, and silent refresh.
   - `PermissionGuard` and `ProtectedRoute` components for role-gated UI elements.
   - Login Screen (Official Email + Password + Remember Me).
   - Forgot Password 4-step recovery modal flow.

---

### Phase 3: Master Institutional & Corporate Metadata
1. **College Management:**
   - `colleges` Mongoose schema with unique `college_code`.
   - College CRUD APIs, branding asset upload (logos), and TPO contact assignment.
   - Frontend College profile viewer and branding manager.
2. **Master Company Database:**
   - `company_metadata` Mongoose schema with compound indexes on `company_name`, `cin`, `gstin`.
   - High-speed starts-with search and autocomplete service.
   - Excel batch import processing engine with partial success rules (95 saved, 5 errors isolated) and error logging in `import_processing_history`.
   - Frontend 50,000+ record search table, add/edit company modal, duplicate detection warnings.
3. **Assignments Engine:**
   - `assignments` Mongoose schema mapping Coordinators ➔ Colleges ➔ Companies for academic years.
   - Assignment management APIs and Team Leader allocation interface.

---

### Phase 4: Core Operational Workflow Engines
1. **Daily Tracker (Module 03):**
   - `daily_tracker` Mongoose schema with index on `coordinator_id`, `call_date`, `college_id`.
   - Fast inline call logging with 60-second auto-save debounce (`● All changes saved`).
   - Call outcome selection with mandatory Follow-up Date validation on `Follow-up Required`.
   - Submit Day workflow pushing positive outcomes directly into Weekly Tracker Pipeline.
2. **Weekly Tracker (Module 04):**
   - `weekly_tracker` Mongoose schema across the 6 operational sections + Follow-up Due Today.
   - Friday-to-Friday week cycle selector (`◀ Week 30 ▶`).
   - Contextual Row-Level Quick Action menu (Insert row, duplicate, move section, soft-delete, pin top companies).
   - Auto-placement rules based on status and CTC thresholds.
3. **Daily Leads (Module 05):**
   - `daily_leads` Mongoose schema with stacked `POSITIVE_OPPORTUNITY` and `JD_RECEIVED` sections.
   - 1-click Move-to-JD Received action with confirmation and notification triggers.
   - High-resolution table snapshot (WhatsApp formatted) and Excel exports.

---

### Phase 5: Supporting Systems & Safety Nets
1. **Recycle Bin (Soft-Delete Engine):**
   - `recycle_bin` Mongoose schema with 90-day TTL purge index.
   - Soft-delete interceptor capturing complete document snapshots prior to removal.
   - 1-click restore endpoint and UI modal returning records to their original collection.
2. **Notifications & Announcements:**
   - `notifications` Mongoose schema with TTL expiration index.
   - Actionable meeting invites supporting `Will Attend` / `Cannot Attend` RSVP callbacks.
   - Slide-over notification drawer with unread counter badges.
3. **Audit Logging & Import History:**
   - `audit_logs` and `import_processing_history` Mongoose schemas (strict immutability).
   - Automatic audit logging for authentication, user management, deletions, restorations, bulk imports, and report generation.

---

### Phase 6: Reporting, Business Intelligence & Dashboards
1. **Report Builder & Interactive Editor (Module 06):**
   - `report_library` Mongoose schema storing template configurations, filter presets, and favorites.
   - 4 Standard Templates: Weekly Placement (7 presentation sections), Monthly Placement, College Performance, Coordinator Performance.
   - Native Interactive Report Editor: Presentation-level cell editing, column renaming, custom remarks, section reordering, color themes.
   - Live regeneration from operational data + local client downloads (**PDF**, **Excel**, **PNG**).
   - Mandatory audit record generation on every report build.
2. **Role-Based Dashboards (Module 07):**
   - Coordinator Dashboard (daily targets, call progress, urgent follow-ups due today).
   - Team Leader Dashboard (multi-college progress, coordinator comparative performance).
   - Executive Dashboard (high-level placement metrics, total offers, company packages).

---

### Phase 7: Administration, Global Settings & Background Schedulers
1. **Global Settings (Module 09):**
   - `app_settings` Mongoose singleton schema for organization branding, working hours, and system rules.
2. **System Administration (Module 10):**
   - Admin user management, role assignment UI, system health metrics, background job status viewer.
3. **Scheduled Background Jobs (`/src/jobs`):**
   - `00:00 IST`: Daily Tracker Finalization
   - `02:00 IST`: Recycle Bin 90-Day Cleanup
   - `02:30 IST`: Import History Cleanup
   - `03:00 IST`: Notification Expiry Processing

---

### Phase 8: Full-System Integration & Critical Business Journey E2E Testing
1. **Automated Test Execution:**
   - Unit tests targeting Services, Repositories, and Domain Validators (≥ 80% coverage).
   - Supertest API integration suites validating RBAC boundaries (both 200 OK and 403 Forbidden).
2. **7 Critical Business Journeys E2E Suite:**
   - *Journey 1:* Daily Call Logging ➔ Submit Day ➔ Pipeline Ingestion.
   - *Journey 2:* Daily Leads ➔ Move to JD Received Workflow.
   - *Journey 3:* Master Company DB 50k Search ➔ Batch Excel Import with Partial Errors.
   - *Journey 4:* Weekly Tracker Operational Update ➔ Follow-up Urgent View ➔ Completed Offers.
   - *Journey 5:* Report Builder ➔ Generate ➔ Presentation Edit ➔ Regenerate ➔ PDF/XLSX/PNG Export.
   - *Journey 6:* Soft-Delete Record ➔ Recycle Bin Staging ➔ 1-Click Restore.
   - *Journey 7:* 4-Step Forgot Password Recovery Flow with Rate Limiting.
3. **Production Smoke Test Suite:** Automated validation of health, database latency, auth, metrics, and storage.

---

### Phase 9: Staging Gate Validation & Production Launch
1. **Staging Promotion:** Deploy Docker containers to STG environment, execute database migrations, run automated smoke test.
2. **Production Release:** Promote verified Docker image tag to PROD with zero/minimal downtime rolling deployment.
3. **Operational Monitoring:** Winston structured log aggregation, health checks, and backup verification.

---

### 🔒 APPROVAL & SIGN-OFF

**Approved By:** A. Mohanaradha, Infoziant Placement Operations  
**Approved By:** Chief Executive Officer / Technical Lead, Infoziant  
**Status:** 🚀 **AUTHORIZED FOR PHASE 0 SCAFFOLDING**
