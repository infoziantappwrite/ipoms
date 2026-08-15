# INFOZIANT iPOMS — Master Implementation Checklist
**Document:** `MASTER_IMPLEMENTATION_CHECKLIST.md`  
**Status:** 🔒 **PRE-CONSTRUCTION READINESS GATE — VERIFIED**  
**Effective Date:** 15 August 2026  
**Applicability:** Master gateway check prior to Project Scaffolding & Code Construction.

---

> ### 📋 PURPOSE
> This checklist is the **final master verification gate** confirming that all requirements, architectural blueprints, database collections, security boundaries, API contracts, testing strategies, and operational protocols are accounted for before writing project code.

---

## 1. Architectural & Specification Blueprints

- [x] **Chapter 1 (Design Foundation):** Visual identity, Color palette, Typography, Elevation, Spacing scale.
- [x] **Chapter 2 (Component Library):** Enterprise tables, Toolbars, Buttons, Modals, Form inputs, KPI cards.
- [x] **Chapter 3 (Screen Blueprints):** 10 Frozen core screen blueprints + 4 Architecture-defined application areas.
- [x] **Chapter 4 (Backend System Architecture):** Layered design, REST API standard, 14 collections overview.
- [x] **Chapter 5 (Database Engineering & API Specs):** Mongoose schemas, compound indexes, API request/response contracts.
- [x] **Chapter 6 (System Architecture & Consistency Review):** 3-tier layering (Controller ➔ Service ➔ Repository), Next.js component hierarchy.
- [x] **Chapter 7 (Development Standards & Rules):** Git workflow, Environment management, Testing strategy, Error handling & logging, CI/CD deployment, Security, Backup/Recovery, Documentation standards.
- [x] **`V1_DECISIONS.md`:** Authoritative single source of truth, Precedence Clause, 3-tier documentation hierarchy.

---

## 2. The 14 Database Collections Authority

- [x] **`users`:** User authentication, credentials, profiles, assigned roles. Soft-delete enabled.
- [x] **`roles`:** RBAC role definitions with granular permissions (`Placement Coordinator`, `Team Leader`, `Administrator`, `TPO`).
- [x] **`colleges`:** Partner/Client institutions, college codes, branding assets, TPO contact details.
- [x] **`company_metadata`:** Master directory of 50,000+ companies, HR contacts, compound search indexes.
- [x] **`assignments`:** Allocation mapping connecting Coordinators to Colleges and Companies.
- [x] **`daily_tracker`:** High-frequency call logs, call outcomes, durations, follow-up dates, 60s auto-save.
- [x] **`weekly_tracker`:** Placement operational board with 6 operational sections + Follow-up Due Today view.
- [x] **`daily_leads`:** Daily leads workbook with stacked `POSITIVE_OPPORTUNITY` and `JD_RECEIVED` sections.
- [x] **`notifications`:** Real-time system alerts, announcements, meeting RSVP invites with TTL cleanup.
- [x] **`audit_logs`:** Permanent, immutable security and compliance audit trail.
- [x] **`import_processing_history`:** Permanent, immutable batch import audit log with row-level validation errors.
- [x] **`recycle_bin`:** Deleted record staging area with full document snapshot and 90-day TTL purge.
- [x] **`app_settings`:** Global system settings, branding configuration, working hours.
- [x] **`report_library`:** Saved report builder definitions, filter presets, and favorite configurations.

---

## 3. Module Responsibilities Matrix (Frontend / Backend / Database)

| Module # | Module Name | Frontend Layer (Next.js) | Backend Layer (Express / Services) | Database Layer (Mongoose) |
|---|---|---|---|---|
| **01** | **User Management** | Profile, Security, User List (Admin) | `userService`, `authService`, Hash/Salt | `users`, `roles` |
| **02** | **Master Company DB** | 50k Search Table, Company Modal, Filter Toolbar | `companyMetadataService`, Search Engine | `company_metadata` |
| **03** | **Daily Tracker** | Fast Inline Table, Auto-save Indicator, Outcome Select | `dailyTrackerService`, Date Finalizer | `daily_tracker` |
| **04** | **Weekly Tracker** | 6-Section Board, Week Selector, Quick Actions | `weeklyTrackerService`, State Machine | `weekly_tracker` |
| **05** | **Daily Leads** | Stacked Positive/JD Table, Move-to-JD Trigger | `dailyLeadsService`, JD Synchronizer | `daily_leads` |
| **06** | **Reports & Analytics** | Live BI Charts, 4 Report Templates, Interactive Editor | `reportingService`, Excel/PDF Exporter | `report_library` |
| **07** | **Role Dashboards** | Coordinator / Team Leader / Executive KPI Cards | `dashboardService`, Real-time Aggregator | Cross-collection Aggregations |
| **08** | **User Access & Auth** | Login Screen, 4-Step Forgot Password, RBAC Guard | `authMiddleware`, Token Generator | `users`, `roles`, `audit_logs` |
| **09** | **Settings & Config** | Global Settings Page, College Branding Upload | `settingsService`, Asset Storage Manager | `app_settings`, `colleges` |
| **10** | **System Administration**| System Info, Job Monitor, Audit Log Table, Recycle Bin | `auditService`, `recycleBinService`, Jobs | `audit_logs`, `recycle_bin`, History |

---

## 4. API & Communication Standards

- [x] **Uniform REST Naming:** All endpoints mounted under `/api/v1/<module>`.
- [x] **Standard JSON Envelope:** All API responses adhere to standard `{ success: true, data: {...}, timestamp: "..." }`.
- [x] **Uniform Error Envelope:** All failures return `{ success: false, error: { code: "...", message: "...", details: [], requestId: "..." }, timestamp: "..." }`.
- [x] **HTTP Status Code Taxonomy:** Strict semantic usage (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`, `503`).
- [x] **Request ID Tracing:** Every HTTP request auto-assigned a UUID `x-request-id` propagated across logs, errors, and responses.

---

## 5. Security, Authentication & RBAC

- [x] **Dual Token Strategy:** 15-minute JWT access token (memory/header) + 7-day HTTP-Only Secure cookie refresh token.
- [x] **CSRF & Security Headers:** Helmet middleware, CORS domain restriction, rate-limiting on auth routes (`/api/v1/auth/*`).
- [x] **Granular RBAC Middleware:** `authenticateJWT` + `authorizeRoles("COORDINATOR", "TEAM_LEADER", "ADMIN", "TPO")`.
- [x] **TPO Role Scoping:** Enforced at Frontend + Backend API + RBAC layers (Read-only Weekly Placement Reports for own `college_id`).
- [x] **Log Sanitization:** Zero passwords, tokens, API secrets, or unmasked PII in Winston logs.

---

## 6. Scheduled Background Jobs Baseline

- [x] **`dailyTrackerFinalizeJob` (`0 0 * * *` - 00:00 IST):** Auto-finalizes daily call records and rolls over pending follow-ups.
- [x] **`recycleBinCleanupJob` (`0 2 * * *` - 02:00 IST):** Permanently purges soft-deleted records older than 90 days.
- [x] **`importHistoryCleanupJob` (`30 2 * * *` - 02:30 IST):** Cleans/archives batch upload logs older than 90 days.
- [x] **`notificationExpiryJob` (`0 3 * * *` - 03:00 IST):** Archives unacknowledged time-expired notifications.
- [x] **Architecture Isolation:** Jobs live exclusively in `/src/jobs` via `node-cron` — never embedded in HTTP controllers.

---

## 7. Integration Abstraction Layer

- [x] **`emailService`:** Abstract transactional email adapter (SMTP / AWS SES).
- [x] **`whatsappService`:** Abstract outbound notifications and snapshot sharing adapter.
- [x] **`storageService`:** Abstract media and export document asset storage adapter (Local disk / AWS S3).
- [x] **Vendor Isolation:** Zero vendor-specific SDK imports inside core business services.

---

## 8. Multi-Layered Testing Strategy

- [x] **Unit Testing:** Jest / Vitest for Services, Repositories, Domain Validators, and Utility functions (Target: ≥ 80% coverage).
- [x] **Integration & API Testing:** Supertest API integration suites testing happy path, validation failures, and 403 RBAC denials.
- [x] **Frontend Component Testing:** React Testing Library for interactive forms, error boundary fallbacks, and table auto-save.
- [x] **7 Critical Business Journeys:**
  1. *Journey 1:* Coordinator Daily Call Logging ➔ Submit Day ➔ Pipeline Ingestion.
  2. *Journey 2:* Daily Leads Positive Lead ➔ Move to JD Received Workflow.
  3. *Journey 3:* Master Company DB 50k Search ➔ Batch Excel Import with Partial Errors.
  4. *Journey 4:* Weekly Tracker Operational Update ➔ Follow-up Urgent View ➔ Completed Offers.
  5. *Journey 5:* Report Builder ➔ Generate ➔ Coordinator Presentation Edit ➔ Regenerate ➔ PDF/Excel/PNG Export.
  6. *Journey 6:* Soft-Delete Record ➔ Recycle Bin Staging ➔ 1-Click Restore to Original Collection.
  7. *Journey 7:* 4-Step Forgot Password Recovery Flow with Rate Limiting.
- [x] **Regression Protocol:** Every post-release defect converted into a permanent automated test spec before bug fix merge.

---

## 9. Environment & Operational Safety

- [x] **Multi-Environment Strategy:** `DEV`, `TEST`, `STG`, `PROD` with strict promotion gates.
- [x] **Fail-Fast Boot:** Schema validation of all required environment variables on startup.
- [x] **Database Safety:** Migration tracking collection `migration_history` for versioned schema modifications.
- [x] **Health Check Probes:** Liveness and readiness endpoints at `/api/v1/health`.
- [x] **Rollback Protocol:** Container image rollback + tested database migration rollback procedures.

---

## 10. Master Pre-Construction Gate Sign-Off

```text
╔═════════════════════════════════════════════════════════════════════════════════╗
║                      iPOMS MASTER IMPLEMENTATION GATEWAY                      ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  1. All 7 Planning & Architecture Chapters:                 ✅ FROZEN         ║
║  2. V1_DECISIONS.md Precedence & Hierarchy:                 ✅ FROZEN         ║
║  3. 14 Database Collections Schema & Index Designs:         ✅ FROZEN         ║
║  4. REST API Envelopes & HTTP Status Taxonomy:              ✅ FROZEN         ║
║  5. Granular RBAC Matrix & TPO Boundary Rules:              ✅ FROZEN         ║
║  6. 4 Scheduled Background Jobs in /src/jobs:               ✅ FROZEN         ║
║  7. Integration Abstraction Layer Interfaces:               ✅ FROZEN         ║
║  8. Multi-Layer Testing Pyramid & 7 Critical Journeys:      ✅ FROZEN         ║
║  9. Environment Validation & Deployment Gates:              ✅ FROZEN         ║
║ 10. Single Source of Truth & Documentation Structure:       ✅ FROZEN         ║
║                                                                               ║
╠═════════════════════════════════════════════════════════════════════════════════╣
║  VERDICT: 100% READY FOR PROJECT SCAFFOLDING & SYSTEM IMPLEMENTATION 🚀        ║
╚═════════════════════════════════════════════════════════════════════════════════╝
```

---

**Approved By:** A. Mohanaradha, Infoziant Placement Operations  
**Approved By:** Chief Executive Officer / Technical Lead, Infoziant  
**Status:** 🚀 **AUTHORIZED TO COMMENCE CONSTRUCTION**
