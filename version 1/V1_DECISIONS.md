# INFOZIANT iPOMS — Version 1 Master Decisions & Single Source of Truth
**Document:** `V1_DECISIONS.md`  
**Status:** 🔒 **FROZEN & AUTHORITATIVE**  
**Effective Date:** 15 August 2026  
**Applicability:** All iPOMS Version 1 Implementation, Frontend, Backend, Database, and QA.

---

> ### ⚠️ PRECEDENCE CLAUSE (GOLDEN RULE)
> **Where an older specification conflicts with a later approved Version 1 decision, the later approved decision recorded in `V1_DECISIONS.md` takes precedence. Older documents remain historical references and must not be used as implementation authority when they conflict with this file.**

---

## 📚 Three-Level Documentation Hierarchy

To preserve historical context while providing unambiguous implementation authority, iPOMS documentation operates on three strict tiers:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: HISTORICAL SPECIFICATIONS                                           │
│ (Chapters 1–7 & original Module Specs — preserved historical context)        │
├──────────────────────────────────────────────────────────────────────────────┤
                                      ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: FINAL VERSION 1 DECISION REGISTER                                   │
│ (V1_DECISIONS.md — Authoritative single source of truth & precedence)        │
├──────────────────────────────────────────────────────────────────────────────┤
                                      ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: DEVELOPER IMPLEMENTATION DOCUMENTATION                              │
│ (/docs — Architecture, OpenAPI contracts, Mongoose schemas, setup, tests)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents
1. [Core Architecture & Tool Independence](#1-core-architecture--tool-independence)
2. [Authoritative 14 Database Collections Master List](#2-authoritative-14-database-collections-master-list)
3. [Weekly Tracker vs. Weekly Placement Report Distinction](#3-weekly-tracker-vs-weekly-placement-report-distinction)
4. [Reports & Analytics: Workflow, Storage, and Unified Formats](#4-reports--analytics-workflow-storage-and-unified-formats)
5. [Report Library & Remembered Builder Configurations](#5-report-library--remembered-builder-configurations)
6. [Complete Screen Blueprint & Implementation Status](#6-complete-screen-blueprint--implementation-status)
7. [Granular Role × Module × Action Permission Matrix](#7-granular-role--module--action-permission-matrix)
8. [Training & Placement Officer (TPO) Access Rules](#8-training--placement-officer-tpo-access-rules)
9. [Table Interaction: Inline Editing & Quick Actions vs. Action Column](#9-table-interaction-inline-editing--quick-actions-vs-action-column)
10. [Unified Export Rules (PDF + Excel + PNG)](#10-unified-export-rules-pdf--excel--png)
11. [Audit Logs & Import History: Strict Immutability](#11-audit-logs--import-history-strict-immutability)
12. [Scheduled Background Jobs Baseline (node-cron)](#12-scheduled-background-jobs-baseline-node-cron)
13. [Integration Abstraction Architecture](#13-integration-abstraction-architecture)
14. [Historical Document Reconciliations](#14-historical-document-reconciliations)

---

# 1. Core Architecture & Tool Independence

1. **Tooling Independence:** **Development tooling is implementation-independent.** The architecture, coding standards, testing strategy, and deployment process do not depend on any particular AI-assisted or manual development environment.
2. **Monorepo Structure:** `/frontend` (Next.js 14+ App Router) and `/backend` (Node.js + Express + TypeScript) with shared types.
3. **Strict 3-Tier Layering:** `Route/Controller` (HTTP & status codes) ➔ `Service` (Business logic, validation, audit triggers) ➔ `Repository` (Mongoose DB queries & compound indexes). No shortcuts.
4. **Stateless JWT Authentication:** Access Token (15m in memory/header) + Refresh Token (7d in HTTP-Only, Secure Cookie) with centralized RBAC middleware.
5. **Resilient Data Safety:** Soft-delete on all primary business records moving snapshots into `recycle_bin` (90-day auto-purge TTL).
6. **Fail-Fast Configuration:** Environment variable validation at server boot.

---

# 2. Authoritative 14 Database Collections Master List

The MongoDB database (`ipoms_db`) contains exactly **14 collections**. No module may introduce a surprise fifteenth collection during Version 1 implementation without an explicit architectural decision:

| # | Collection Name | Primary Purpose / Domain | Key Indexes & Business Rules |
|---|---|---|---|
| 1 | `users` | User accounts, credentials, profiles, assigned roles | Unique `email`, `employee_id`. Soft delete. |
| 2 | `roles` | System & custom RBAC role definitions with granular permissions | Unique `role_name`. System-locked default roles. |
| 3 | `colleges` | Partner/Client institutions & branding (logo, domain, TPO details) | Unique `college_code`. Soft delete. |
| 4 | `company_metadata` | Master directory of 50,000+ corporate hiring partners & HR contacts | Unique `company_name` + `cin`/`gstin`. Compound search index. |
| 5 | `assignments` | Coordinator-to-College and Coordinator-to-Company allocations | Compound index (`coordinator_id`, `college_id`, `academic_year`). |
| 6 | `daily_tracker` | Real-time call logs, call outcomes, durations, follow-up dates | Compound index (`coordinator_id`, `call_date`, `college_id`). |
| 7 | `weekly_tracker` | Company placement lifecycle across operational stages | Compound index (`college_id`, `week_number`, `section_id`). |
| 8 | `daily_leads` | Positive lead opportunities and JD Received tracking | Stacked sections: `POSITIVE_OPPORTUNITY` & `JD_RECEIVED`. |
| 9 | `notifications` | System alerts, announcements, meeting invites, reminders | TTL index on `expires_at`. Actionable RSVP support. |
| 10 | `audit_logs` | Immutable security and compliance log of all critical actions | Read-only. Indexed on `timestamp`, `user_id`, `action_type`. |
| 11 | `import_processing_history` | Audit trail of Excel/CSV batch uploads with row error details | Stores row-level success/error counts and validation error logs. |
| 12 | `recycle_bin` | Deleted record staging area with full document snapshot | 90-day automatic TTL purge index. Supports 1-click restore. |
| 13 | `app_settings` | Global system configurations, branding assets, working hours | Key-value/singleton configuration documents. |
| 14 | `report_library` | Saved report builder definitions, filter presets, and layouts | Stores configurations and parameters — not binary PDF/Excel files. |

---

# 3. Weekly Tracker vs. Weekly Placement Report Distinction

To prevent confusion between live operational data entry and executive reporting:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY TRACKER (OPERATIONAL BOARD)                                           │
│ Live operational board with 6 operational sections + Follow-up Due Today:    │
│ 1. Follow-up Due Today (Urgent view)                                         │
│ 2. Companies Completed (Drive finished, offers recorded)                     │
│ 3. Companies In Progress (JD received, student DB shared, drive scheduled)   │
│ 4. Companies in Pipeline (Invite email sent / awaiting JD)                  │
│ 5. Top Companies (CTC ≥ 3.5 LPA or pinned override)                          │
│ 6. Rejected by HR                                                            │
│ 7. Rejected by College                                                       │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ↓
                           (Feeds live data into)
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY PLACEMENT REPORT (REPORT BUILDER PRESENTATION)                        │
│ Polished executive presentation format rendered in 7 approved sections:      │
│ 1. Completed                                                                 │
│ 2. In Progress                                                               │
│ 3. Pipeline                                                                  │
│ 4. Top Companies                                                             │
│ 5. Companies on Hold by TPO                                                  │
│ 6. Companies on Hold by HR                                                   │
│ 7. Rejected Companies                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. Reports & Analytics: Workflow, Storage, and Unified Formats

### 4.1 Native Interactive Report Workflow (Generate ➔ Edit ➔ Regenerate ➔ Export)
Generated reports are interactive presentation drafts:

```text
┌──────────────┐     ┌──────────┐     ┌───────────┐     ┌───────────────────┐     ┌────────────┐     ┌──────────┐
│ Build Report │ ──➔ │ Generate │ ──➔ │  Preview  │ ──➔ │ Coordinator Edits │ ──➔ │ Regenerate │ ──➔ │ Download │
│ (Set Filters)│     │ Raw Data │     │ Multi-page│     │ (Cells, Remarks,  │     │ Live View  │     │ PDF/XLSX/│
└──────────────┘     └──────────┘     └───────────┘     │  Reorder Sections)│     └────────────┘     │   PNG    │
                                                        └───────────────────┘                        └──────────┘
```

- **Coordinator Privileges:** A coordinator who generated the report can edit presentation cells, rename column headers, add remarks, re-order sections, choose color themes, regenerate the live preview, and export.
- **Strict Non-Destructive Separation:** **Report Editing ≠ Operational Data Editing.** Edits made inside the Report Editor **NEVER** alter underlying operational records in `daily_tracker`, `weekly_tracker`, `daily_leads`, or `company_metadata`.
- **Mandatory Report Audit Logging:** Generating a report automatically logs an immutable audit event in `audit_logs` capturing: `user_id`, `template_name`, `college_id`, `reporting_period`, `filters_applied`, `timestamp`, and `request_id`.

### 4.2 The 4 Standard Report Templates
1. **Weekly Placement Report:** Completed, In Progress, Pipeline, Top Companies, Holds by TPO/HR, Rejections.
2. **Monthly Placement Report:** Monthly KPIs, Comparisons, Total Placements, Package Trends.
3. **College Performance Report:** College-specific activity, Active Companies, Offers Received, Package Metrics.
4. **Coordinator Performance Report:** Calls Completed, Positive Responses, Drives Slated, Conversion Efficiency (Metrics only — no public rankings in v1.0).

---

# 5. Report Library & Remembered Builder Configurations

```text
┌──────────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Component                            │ Storage & Lifecycle Rule                              │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Report Definition / Builder Config   │ SAVED in `report_library` collection                  │
│                                      │ (Filter presets, selected sections, custom theme)     │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Saved & Remembered Configurations    │ SUPPORTED in `report_library`                         │
│                                      │ (Users can save, pin, or favorite builder presets)    │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Generated Report Presentation        │ RENDERED IN MEMORY / REACT STATE on demand            │
│                                      │ (Regenerated dynamically from live collection data)   │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Exported File (PDF / Excel / PNG)    │ DOWNLOADED TO LOCAL CLIENT MACHINE                    │
│                                      │ (Direct browser stream download — no MongoDB binary) │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Audit Record                         │ PERMANENTLY RECORDED in `audit_logs` collection       │
│                                      │ (Who generated, when, template, college, requestId)   │
└──────────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

# 6. Complete Screen Blueprint & Implementation Status

All 14 functional application areas are accounted for in Version 1:

| Screen / Area | V1 Implementation Status | Specification Reference |
|---|---|---|
| **Login / Authentication** | 🔒 **Frozen** | Chapter 3, Screen 1 |
| **Forgot / Reset Password** | 🔒 **Frozen** | Chapter 3, Screen 2 |
| **Coordinator Dashboard** | 🔒 **Frozen** | Chapter 3, Screen 3 |
| **Team Leader Dashboard** | 🔒 **Frozen** | Chapter 3, Screen 4 |
| **Executive / Admin Dashboard** | 🔒 **Frozen** | Chapter 3, Screen 5 |
| **Daily Tracker** | 🔒 **Frozen** | Chapter 3, Screen 6 |
| **Weekly Tracker** | 🔒 **Frozen** | Chapter 3, Screen 7 / Module 04 |
| **Daily Leads** | 🔒 **Frozen** | Chapter 3, Screen 8 / Module 05 |
| **Master Company Database** | 🔒 **Frozen** | Chapter 3, Screen 9 / Module 02 |
| **Reports & Analytics** | 🔒 **Frozen** | Chapter 3, Screen 10 / Module 06 |
| **Notifications Drawer & Page** | 🔒 **Architecture Defined** | Chapters 4–5, Module 08 |
| **User Profile & Security** | 🔒 **Architecture Defined** | Chapter 5, Module 01/08 |
| **Settings & Configuration** | 🔒 **Architecture Defined** | Chapter 5, Module 09 |
| **System Admin & Audit Trail** | 🔒 **Architecture Defined** | Chapters 4–5, Module 10 |

---

# 7. Granular Role × Module × Action Permission Matrix

Access control is enforced **per Module × Action** on both Frontend (`PermissionGuard`) and Backend (`authorizeRoles` middleware):

| Module / Area | Action | Placement Coordinator | Team Leader | Administrator / CEO | TPO (College) |
|---|---|:---:|:---:|:---:|:---:|
| **Daily Tracker** | View / Log Own Calls | ✅ | ✅ | ✅ | ❌ |
| | Edit Historical (>24h) | ❌ | ✅ | ✅ | ❌ |
| **Weekly Tracker** | View Assigned Colleges | ✅ | ✅ | ✅ | Restricted (Own College) |
| | Edit Rows & Move Sections | ✅ | ✅ | ✅ | ❌ |
| **Daily Leads** | Add Positive Lead / JD | ✅ | ✅ | ✅ | ❌ |
| | Export Leads Table | ✅ | ✅ | ✅ | ❌ |
| **Master Database** | Search / View Contacts | ✅ | ✅ | ✅ | ❌ |
| | Add / Edit Company Info | ✅ (Assigned) | ✅ | ✅ | ❌ |
| | Bulk Excel Import | ❌ | ✅ | ✅ | ❌ |
| | Purge / Hard Delete | ❌ | ❌ | ✅ | ❌ |
| **Reports & Analytics**| Generate & Edit Reports | ✅ (Assigned) | ✅ | ✅ | ❌ |
| | Export Reports (PDF/XLS/PNG) | ✅ | ✅ | ✅ | ✅ (Weekly Placement) |
| **User Management** | Create / Update Users | ❌ | Restricted | ✅ | ❌ |
| | Assign Roles / Permissions | ❌ | ❌ | ✅ | ❌ |
| **Audit Logs** | View Security Logs | ❌ | View Own Team | Full Access | ❌ |
| **Recycle Bin** | Restore Deleted Records | ❌ | ✅ | ✅ | ❌ |

---

# 8. Training & Placement Officer (TPO) Access Rules

The **TPO role** represents external college placement officers and has strictly circumscribed permissions:
1. **No Operational Write Access:** TPOs can **NEVER** edit, create, or delete records in Daily Tracker, Weekly Tracker, Daily Leads, or Company Metadata.
2. **Weekly Placement Report Access:** TPOs are granted read-only access exclusively to the finalized **Weekly Placement Report** and high-level dashboard summaries for their specific institution (`college_id`).
3. **Multi-Layer Enforcement:** Scoped at Frontend routing + Backend REST APIs + RBAC middleware.

---

# 9. Table Interaction: Inline Editing & Quick Actions vs. Action Column

1. **No Dedicated Visible Action Column:** No dedicated visible Action column is used in operational tables to keep data density clean and rapid.
2. **Direct Inline Editing:** Clicking any cell enables direct input; pressing `Enter` or navigating with arrows commits and auto-saves the change.
3. **Row-Level Quick Action Menu:** Where row-level operational actions are required, they are accessed through contextual hover/menu controls:
   - `Insert Row Above / Below`
   - `Duplicate Record`
   - `Move to Section`
   - `Delete (Soft Delete to Recycle Bin)`
   - `Pin / Unpin from Top Companies`

---

# 10. Unified Export Rules (PDF + Excel + PNG)

**Version 1 reports may be exported in PDF, Excel, or PNG, subject to the capabilities and permissions of the specific report operation. No report type is permanently locked to a single export format.**

- **Reports & Analytics:** All 4 report templates support **PDF**, **Excel (.xlsx)**, and **PNG (High-Resolution Snapshot)**.
- **Daily Leads:** Supports **Excel** and **WhatsApp-Optimized Image Snapshot**.
- **Master Company Database:** Supports **Excel (.xlsx)** and **CSV**.
- **Weekly Tracker:** Supports **Excel**, **PDF**, and **CSV**.
- **Audit Logs:** Supports **Excel** and **CSV**.

---

# 11. Audit Logs & Import History: Strict Immutability

1. **Immutable Security Records:** Audit logs (`audit_logs`) and batch upload logs (`import_processing_history`) are strictly **read-only and immutable**. Users and administrators cannot edit, modify, or delete audit entries under any circumstance.
2. **Mandatory Audit Events:**
   - `LOGIN`, `LOGOUT`, `FAILED_LOGIN_ATTEMPT`, `PASSWORD_RESET_REQUEST`, `PASSWORD_CHANGED`
   - `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `ROLE_ASSIGNED`, `PERMISSION_CHANGED`
   - `RECORD_DELETED`, `RECORD_RESTORED`, `RECYCLE_BIN_PURGED`
   - `BULK_IMPORT_EXECUTED`, `BULK_METADATA_SYNC_TRIGGERED`
   - `REPORT_GENERATED`
   - `APP_SETTINGS_MODIFIED`

---

# 12. Scheduled Background Jobs Baseline (node-cron)

Scheduled automated processes execute in `/src/jobs` within the backend process:

| Job Identifier | Cron Schedule | Time (IST) | Operational Responsibility |
|---|---|---|---|
| `dailyTrackerFinalizeJob` | `0 0 * * *` | **00:00 (Midnight)** | Locks completed daily logs; carries over pending follow-ups. |
| `recycleBinCleanupJob` | `0 2 * * *` | **02:00 AM** | Permanently purges soft-deleted records older than 90 days. |
| `importHistoryCleanupJob` | `30 2 * * *` | **02:30 AM** | Archives/cleans import history logs older than 90 days. |
| `notificationExpiryJob` | `0 3 * * *` | **03:00 AM** | Marks unacknowledged or time-expired alerts as archived. |

---

# 13. Integration Abstraction Architecture

All external 3rd-party communications and storage integrations are abstracted in `/src/services/integrations/`:
1. **`emailService`:** Abstract interface for transactional email delivery (SMTP / AWS SES / SendGrid).
2. **`whatsappService`:** Abstract interface for outbound notifications and report snapshots (Meta Graph API / Webhook).
3. **`storageService`:** Abstract interface for media and export asset storage (Local disk / AWS S3 / Cloudflare R2).
4. **Rule:** Business modules (Services, Controllers) must **NEVER** import or invoke vendor-specific SDKs directly; they interact strictly through the unified service interface.

---

# 14. Historical Document Reconciliations

- **Chapter 3 Status:** Historical Chapter 3 Screen Blueprint completed the core 10 screens; later architecture chapters (Chapters 4–7) define the remaining areas as documented in Section 6.
- **Chapter 4 Progression:** Historical "Proceed to Chapter 5" references are preserved as historical markers; Chapters 5, 6, and 7 have subsequently been completed, approved, and frozen.
- **Tooling References:** Any mention of specific AI tools (Claude Code, Cursor AI) in older documents is historical context only; implementation is tool-independent.

---

### 🔒 AUTHORIZATION & FREEZE SIGN-OFF

**Approved By:** A. Mohanaradha, Infoziant Placement Operations  
**Approved By:** Chief Executive Officer / Technical Lead, Infoziant  
**Status:** 🚀 **APPROVED FOR PROJECT SCAFFOLDING & DEVELOPMENT**
