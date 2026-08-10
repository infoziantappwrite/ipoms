# 🚀 iPOMS – Infoziant Placement Operations Management System

> **Official Enterprise Master Repository & Construction Architecture**  
> **Repository:** [https://github.com/mohanaradha-13/ipoms](https://github.com/mohanaradha-13/ipoms)  
> **Tech Stack:** Next.js 14+ (App Router), Node.js (Express.js), MongoDB 7.0+ (Mongoose ODM 8.0+), Tailwind CSS, Nginx, Docker, GitHub Actions  

---

## 📌 Executive Overview

**iPOMS (Infoziant Placement Operations Management System)** is a multi-tenant, enterprise-grade placement operations and call-tracking platform. It is engineered to streamline, track, automate, and report corporate outreach, placement drives, student recruitment workflows, and daily call tracking across multiple engineering institutions and corporate recruiters.

The platform is built adhering to a strict **Enterprise Layered Architecture** (`Route ➔ Middleware ➔ Validator ➔ Controller ➔ Service ➔ Repository ➔ Model ➔ MongoDB`), providing non-repudiable audit logging, role-based access control (RBAC), atomic database transactions, background cron automation, multi-environment lifecycle governance, and high-performance reporting.

---

## 🏗 System Architecture Blueprint

```text
                                Internet
                                   │
                                   ▼
                         Nginx Reverse Proxy
                         /                 \
                        /                   \
                       ▼                     ▼
             Next.js 14+ Frontend    Express.js REST API Gateway
              (App Router Client)          (/api/v1)
                       │                     │
                       │ HTTPS REST API      │
                       └───────────┬─────────┘
                                   │
                                   ▼
                          Business Layer
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
      Domain Services       Integration Layer     Background Jobs
    (User, Tracker, Company) (Email, WhatsApp, S3)  (node-cron 00:00/02:00)
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   │
                                   ▼
                          Repositories (DAL)
                                   │
                                   ▼
                        MongoDB 7.0+ Database
```

---

## 📚 Comprehensive Blueprint & Documentation Index

The complete specification suite for iPOMS is organized systematically inside [`version 1/module md files/`](./version%201/module%20md%20files/):

### 📄 Master Engineering Architecture Chapters
- 📘 **[Chapter 01 – Design Foundation v1.0](./version%201/module%20md%20files/chapter%2001%20-%20Design_Foundation_v1.0.md):** Brand visual identity, typography scales, color palettes, spacing tokens, and accessibility standards.
- 📘 **[Chapter 02 – UI Enterprise Component Library v1.0](./version%201/module%20md%20files/Chapter_02_UI_Enterprise_Component_Library_Specification_v1.0.md):** 5-tier component composition tree, atomic UI elements, form inputs, and data table specifications.
- 📘 **[Chapter 03 – UI Screen Blueprint System v1.0](./version%201/module%20md%20files/Chapter_03_UI_Screen_Blueprint_System_Specification_v1.0.md):** Screen-by-screen layout specifications, responsive navigation frames, and modal designs.
- 📘 **[Chapter 04 – Backend System Architecture Specification v1.0](./version%201/module%20md%20files/Chapter_04_Backend_System_Architecture_Specification_v1.0.md):** Backend paradigm, layering principles, stateless JWT auth, and RBAC security models.
- 📘 **[Chapter 05 – Database Engineering & API Specifications](./version%201/module%20md%20files/Chapter%2005%20Database%20Engineering%20and%20API%20Specifications.md):** Complete 13 MongoDB collection schemas, indexes, validation rules, BSON field types, and REST API payload envelopes.
- 📘 **[Chapter 06 – System Architecture & Implementation Blueprint](./version%201/module%20md%20files/Chapter%2006%20System%20Architecture%20and%20Implementation%20Blueprint.md):** Master construction manual detailing the 12-folder symmetrical backend/frontend structures, controller/service/repository code contracts, middleware pipeline, background cron engine, and 15-step end-to-end request lifecycle.
- 📘 **[Chapter 07 – Development Standards & Implementation Rules](./version%201/module%20md%20files/Chapter%2007%20Development%20Standards%20and%20Implementation%20Rules.md):** Master production engineering standard detailing coding standards, naming conventions, Git flow branching & commit rules, 4-tier environment lifecycle (DEV ➔ TEST ➔ STG ➔ PROD), comprehensive testing strategies (Jest, Vitest, Supertest, Playwright), error handling contracts, static code quality analysis, security golden rules, and deployment workflows.

### 📦 Module Specifications (Modules 01 to 10)
- 📝 **[Module 01 – User Management](./version%201/module%20md%20files/Module_01_User_Management_Specification_v1.0.md)** – User lifecycle, profile management, and account status controls.
- 📝 **[Module 02 – Master Company Database](./version%201/module%20md%20files/Module_02_Master_Company_Database_Specification_v1.0.md)** – Corporate repository, recruiter contacts, and company interaction history.
- 📝 **[Module 03 – Daily Tracker](./version%201/module%20md%20files/Module_03_Daily_Tracker_Specification_v1.0.md)** – Core call tracking, disposition logging, institution outreach, and draft locking.
- 📝 **[Module 04 – Weekly Tracker](./version%201/module%20md%20files/Module_04_Weekly_Tracker_Specification_v1.0.md)** – Weekly outreach summaries, placement drive scheduling, and institutional target management.
- 📝 **[Module 05 – Daily Leads](./version%201/module%20md%20files/Module_05_Daily_Leads_Specification_v1.0.md)** – Lead generation pipeline, corporate lead assignment, and conversion tracking.
- 📝 **[Module 06 – Reports & Analytics](./version%201/module%20md%20files/Module_06_Reports_Analytics_Specification_v1.0.md)** – Executive dashboards, institution performance analytics, caller metrics, and export engines.
- 📝 **[Module 07 – Role-Based Dashboard](./version%201/module%20md%20files/Module_07_Role_Based_Dashboard_Specification_v1.0.md)** – Personalized role views for Coordinator, Team Leader, Director, CEO, and Admin.
- 📝 **[Module 08 – User Access Management (RBAC)](./version%201/module%20md%20files/Module_08_User_Access_Management_Specification_v1.0.md)** – Granular permissions, role assignment, audit logs, and access policies.
- 📝 **[Module 09 – Settings & Configuration](./version%201/module%20md%20files/Module_09_Settings_Configuration_Specification_v1.0.md)** – System constants, dropdown options, email/SMS notification templates, and system parameters.
- 📝 **[Module 10 – System Information & Administration](./version%201/module%20md%20files/Module_10_System_Information_Administration_Specification_v1.0.md)** – System health monitoring, background cron job status, database metrics, and audit log inspection.

---

## ⚡ Core Technical Principles & Standards

1. **Strict 3-Layer Pattern:** Request processing follows `Route ➔ Middleware ➔ Validator ➔ Controller ➔ Service ➔ Repository ➔ Model ➔ MongoDB`. No raw Mongoose queries in controllers/services; zero business rules in repositories.
2. **Thin Controllers & Fat Services:** Controllers are thin DTO translators (~15-20 lines max). Services contain 100% of business workflow logic and atomic Mongoose `startSession()` transaction management.
3. **Stateless Dual-Token Authentication:** 8-hour access token (memory-stored) + 7-day refresh token (`HttpOnly`, `SameSite=Strict` secure cookie) with silent Axios refresh interceptors.
4. **Dynamic RBAC Hierarchy:** Enforces granular action permissions (`create`, `read`, `update`, `delete`, `export`) across 5 operational roles (`Coordinator`, `Team Leader`, `Director`, `CEO`, `Administrator`).
5. **Soft Delete & 90-Day Recycle Bin:** Physical document deletion is prohibited; deleted resources move to `recycle_bin` with a 90-day retention TTL purge schedule.
6. **Automated Cron Jobs (`node-cron`):**
   - `00:00 AM IST`: Auto-locks previous day's `DRAFT` call tracker sheets.
   - `02:00 AM IST`: Purges expired items from `recycle_bin` older than 90 days.
7. **Git Flow & Conventional Commits:** Structured git flow branching strategy (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`) with mandatory conventional commit prefixes (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`).
8. **4-Tier Environment Lifecycle:** Strict separation of environment configurations across `DEV` ➔ `TEST` ➔ `STG` ➔ `PROD`.
9. **Comprehensive Quality & Testing Strategy:** Automated code analysis via ESLint + Prettier + Husky hooks, backed by multi-layer testing (Unit via Jest/Vitest, API Integration via Supertest, and E2E via Playwright).
10. **10 Security Golden Commandments:** Absolute input sanitization, NoSQL injection defense, rate limiting, strict CORS control, security headers (Helmet), and OWASP Top 10 compliance.

---

## 🛠 Local Setup & Installation

### Prerequisites
- **Node.js:** `v20.x LTS` or higher
- **Database:** `MongoDB v7.0+`
- **Package Manager:** `npm v10.x+`

### Environment Configuration (`.env`)
Create a `.env` file in the backend root directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ipoms_db
JWT_SECRET=your_super_secret_jwt_key_here
JWT_ACCESS_EXPIRATION=8h
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
TIMEZONE=Asia/Kolkata
```

---

## 🏢 Organization & Author

* **Project:** iPOMS (Infoziant Placement Operations Management System)
* **Organization:** Infoziant Systems
* **Repository:** [https://github.com/mohanaradha-13/ipoms](https://github.com/mohanaradha-13/ipoms)

---
