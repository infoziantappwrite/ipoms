**INFOZIANT**

_Secure. Scalable. Innovative._

**iPOMS**

Infoziant Placement Operations Management System

_"Empowering Placement Teams with Intelligent Operations."_

**Design Foundation - UI / UX Design Standards**

Document Version: v1.0

Status: Completed - Approved for Internal Review

Prepared By: A. Mohanaradha, Infoziant

Prepared for: Chief Executive Officer, Infoziant

Date: 23 July 2026

# Document Control

| **Version** | **Date**    | **Description**                                                                                                                                                                                 | **Prepared By**           | **Approved By** |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------- |
| v1.0        | 23-Jul-2026 | Initial Version 1.0 Design Foundation, consolidating brand identity, layout, navigation, authentication, dashboard strategy, and component/UX standards finalized across the design discussion. | A. Mohanaradha, Infoziant | Pending         |

# Table of Contents

[Document Control 2](#_Toc235727280)

[Table of Contents 2](#_Toc235727281)

[1\. Executive Summary 4](#_Toc235727282)

[2\. Purpose & Scope 4](#_Toc235727283)

[3\. Brand Identity 5](#_Toc235727284)

[3.1 Product Naming 5](#_Toc235727285)

[3.2 Logo 5](#_Toc235727286)

[4\. Visual Identity 5](#_Toc235727287)

[4.1 Colour Palette 5](#_Toc235727288)

[4.2 Typography 5](#_Toc235727289)

[4.3 Corner Radius 5](#_Toc235727290)

[4.4 Elevation 5](#_Toc235727291)

[4.5 Theme Strategy 5](#_Toc235727292)

[4.6 Design Language 6](#_Toc235727293)

[5\. Application Shell / Global Layout 7](#_Toc235727294)

[5.1 Sidebar Behaviour 7](#_Toc235727295)

[6\. Navigation 7](#_Toc235727296)

[6.1 Command Palette - Rejected 7](#_Toc235727297)

[6.2 Recently Visited - Deferred 7](#_Toc235727298)

[7\. Authentication & Login 8](#_Toc235727299)

[7.1 Login Screen Layout 8](#_Toc235727300)

[7.2 Login Method (Final) 8](#_Toc235727301)

[7.3 Forgot Password Workflow (Final) 8](#_Toc235727302)

[8\. User Profile & Header 8](#_Toc235727303)

[8.1 Header Profile Card 8](#_Toc235727304)

[8.2 Profile Dropdown Menu 8](#_Toc235727305)

[8.3 Notifications 8](#_Toc235727306)

[8.4 Global Search 9](#_Toc235727307)

[9\. Dashboard Strategy 10](#_Toc235727308)

[10\. Component Library 10](#_Toc235727309)

[11\. Data Grid Standards 10](#_Toc235727310)

[12\. Status Colour System 12](#_Toc235727311)

[13\. UX Principles 12](#_Toc235727312)

[14\. Deferred / Rejected Items 12](#_Toc235727313)

[15\. Design System Document Set 12](#_Toc235727314)

[16\. Governing Principle for Future Modules 13](#_Toc235727315)

[17\. Conclusion 13](#_Toc235727316)

[18\. Project Progress Snapshot 13](#_Toc235727317)

[19\. Next Module 13](#_Toc235727318)

[20\. Approval Sheet 14](#_Toc235727319)

# 1\. Executive Summary

This document is the Design Foundation for iPOMS - the Infoziant Placement Operations Management System. It consolidates every branding, layout, navigation, authentication, dashboard, and component decision finalized during the design discussion that preceded Module 04, and follows the same documentation structure established for Modules 01-03.

The purpose of this foundation is stated plainly in the discussion that produced it: rather than designing each module's screens independently, iPOMS defines its visual and interaction rules once - colours, typography, layout, components, grids, dialogs, and UX principles - so that every module, from User Management to Reports, feels like part of the same product.

# 2\. Purpose & Scope

This document does not describe a single module. It defines the reusable design language that all current and future modules (User Management, Master Company Database, Daily Tracker, Weekly Tracker, Monthly Tracker, Reports & Analytics, Settings) must follow. Individual module specifications will reference this document rather than redefining colours, components, or layout rules.

Business workflow is still designed first, module by module, exactly as it was for Modules 01-03; this document governs only how that workflow is presented, not what the workflow is.

# 3\. Brand Identity

## 3.1 Product Naming

| **Element**              | **Final Value**                                           |
| ------------------------ | --------------------------------------------------------- |
| Application Name (Final) | Infoziant Placement Operations Management System (iPOMS)  |
| Tagline                  | "Empowering Placement Teams with Intelligent Operations." |
| Footer / Copyright       | © 2025 Infoziant IT Solutions Inc. All rights reserved.   |
| Certification Line       | A SOC 2 \| ISO 27001:2022 Certified Company               |

## 3.2 Logo

The primary Infoziant logo has been received and is the source of the application's colour direction. Additional variants - a white/reversed logo for dark headers, an icon-only mark for the collapsed sidebar, and a favicon - are deferred to a future version and will be supplied later.

# 4\. Visual Identity

## 4.1 Colour Palette

Colours are derived from the Infoziant brand rather than introducing a separate theme. Option A (Blue/Green/Orange/Red/Grey) was selected as the base structure:

| **Role**             | **Colour**                     | **Usage**                                                  |
| -------------------- | ------------------------------ | ---------------------------------------------------------- |
| Primary              | Deep Blue                      | Brand identity, headers, primary buttons, active nav items |
| Secondary            | Cyan / Teal                    | Accents, links, secondary highlights                       |
| Success              | Green                          | Completed, positive, active states                         |
| Warning              | Amber                          | Follow-up, pending, soft-validation alerts                 |
| Error                | Red                            | Critical states, blocking validation                       |
| Neutral / Background | White with light-grey sections | Page background, card surfaces, dividers                   |

## 4.2 Typography

Font: Inter - selected for its clean, modern appearance and strong legibility in dense data tables.

## 4.3 Corner Radius

Medium - 8px - applied consistently to cards, buttons, inputs, and dialogs.

## 4.4 Elevation

Soft shadows - used for cards, popups, and dropdowns; no flat or heavy-shadow styling.

## 4.5 Theme Strategy

- Light Mode is the default and only theme shipped in Version 1.
- The colour system is being designed so that a Dark Mode toggle can be added later (in the profile/settings menu) without redesigning components - this is a forward-compatibility requirement, not a v1.0 feature.

## 4.6 Design Language

Described during the discussion as: Microsoft 365 + Linear + Airtable + Modern CRM + Excel Productivity - clean spacing, rounded cards, premium CRM layouts, large data tables, soft shadows, and a professional enterprise look. Explicitly avoided: heavy dashboards, dark-only themes, glassmorphism, and decorative gradients.  
<br/>**5\. Application Shell / Global Layout**

Every module in iPOMS is built on the same shell:

- Header (branding, global search, notifications, profile menu)
- Sidebar (primary navigation)
- Breadcrumb + Module Title
- Toolbar (module-specific actions)
- KPI Cards (optional, module-specific)
- Main Data Grid (the primary working area for most modules)
- Bottom Status Bar (save status, record counts, progress)

Design rationale: since iPOMS is table-first rather than dashboard-first, the sidebar is deliberately narrow so more horizontal space is available for data. Collapsed width: approximately 72-80px. Expanded width: approximately 240-260px.

## 5.1 Sidebar Behaviour

The sidebar is collapsible - expanded or collapsed via a toggle icon - rather than permanently fixed or auto-collapsing based on screen size alone.

# 6\. Navigation

Final sidebar menu order:

| **Order** | **Menu Item**           |
| --------- | ----------------------- |
| 1         | Dashboard               |
| 2         | User Management         |
| 3         | Master Company Database |
| 4         | Daily Tracker           |
| 5         | Weekly Tracker          |
| 6         | Monthly Tracker         |
| 7         | Reports & Analytics     |
| 8         | Settings                |

## 6.1 Command Palette - Rejected

A Ctrl+K command palette (as used in VS Code, Notion, or Linear) was proposed but explicitly rejected. Rationale: coordinators and team leaders use the same modules every day, and a well-organized sidebar is more intuitive for repetitive daily use than requiring users to recall exact search terms. Navigation in v1.0 is through the sidebar only.

## 6.2 Recently Visited - Deferred

A "Recently Visited" panel (last 5 modules / companies / reports) was proposed and deferred - not included in Version 1.

# 7\. Authentication & Login

## 7.1 Login Screen Layout

A two-panel login screen was chosen over a plain two-field form, to create a stronger first impression for an enterprise product:

- Left panel (branding): Infoziant logo, welcome message, product name, and tagline.
- Right panel (authentication): Username, Password, Remember Me, Forgot Password, Sign In.
- Footer: version number and copyright / certification line.

## 7.2 Login Method (Final)

Username + Password only for Version 1 - there is no email-based login in this version.

## 7.3 Forgot Password Workflow (Final)

Login Screen → Forgot Password → Enter Registered Email ID → Send OTP → OTP Verification Screen → OTP Valid?

- If OTP is invalid: show an error and allow retry.
- If OTP is valid: open the Reset Password screen - New Password, Confirm Password.

Reset Password screen behaviour:

- Save → validate → update password → success message → automatically redirect to the Login screen (no separate "Sign In" button is shown on this screen, since redirect is automatic).
- Cancel → return to Login without making changes.

Only two buttons appear on the Reset Password screen: Save and Cancel.

# 8\. User Profile & Header

## 8.1 Header Profile Card

- Profile Photo (real photo if uploaded; otherwise an initials-based coloured avatar - profile image upload itself is deferred to a future version)
- Full Name
- Role
- Assigned College(s)
- Status indicator - 🟢 Active / 🟡 Away (included in Version 1)

## 8.2 Profile Dropdown Menu

- My Profile
- Change Password
- Dark/Light Theme Toggle
- Logout

## 8.3 Notifications

The notification bell supports, in Version 1:

- Pending Follow-ups
- Missing Email Reminders
- Upcoming Drive Notifications
- System Notifications

## 8.4 Global Search

One unified search bar searches across Companies, HR Contacts, Colleges, Users (permission-based), and Reports (permission-based).

# 9\. Dashboard Strategy

Rather than maintaining separate Executive and Operational dashboards, iPOMS uses one dashboard framework whose widgets change based on the logged-in user's role - a single codebase with role-based visibility, not two different products.

Login routing: Login → Authenticate User → role-based dashboard (Placement Coordinator → Operational view; Team Leader → Executive view; Administrator → Executive view with full access; TPO → Executive view, read-only).

| **Role**              | **Dashboard Widgets Shown**                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Placement Coordinator | Operational Dashboard - Today's Calls, Positive Calls, Pending Follow-ups, Quick Actions, Daily Tracker snapshot. No unnecessary executive information.         |
| Team Leader           | Everything above, plus Team Performance, Coordinator Performance, Weekly Pipeline, Pending Reviews.                                                             |
| Administrator         | Everything above, plus User Statistics, Company Growth, Overall Analytics, System Health. Complete A-Z access to every module, report, configuration, and user. |
| TPO                   | Read-only Executive Dashboard - reports and placement statistics only.                                                                                          |

# 10\. Component Library

Components are designed once and reused across every module rather than being redesigned per screen:

- Buttons - Primary, Secondary, Danger, Warning, Success
- Text Fields / Textboxes
- Dropdowns
- Search Bars
- Tables (see Section 11)
- Cards & KPI Cards
- Dialogs - Add, Edit, Delete, Confirmation, Warning, Success
- Toast Notifications
- Status Chips
- Progress Indicators
- Date Pickers
- Empty States
- Loading Screens

# 11\. Data Grid Standards

Because iPOMS is data-heavy and table-first, every data grid in the application supports the same baseline behaviour:

- Sticky header
- Sort
- Filter
- Column resize
- Freeze first column
- Keyboard navigation
- Row selection
- Export
- Search
- Pagination - used only when needed, not forced on every grid

# 12\. Status Colour System

A single semantic colour system is applied consistently across the Daily Tracker, Weekly Tracker, Dashboard, Analytics, and Reports:

| **Colour**   | **Meaning**          | **Applied To**                              |
| ------------ | -------------------- | ------------------------------------------- |
| Green        | Success / Completed  | Positive outcome, closed successfully       |
| Blue         | Active / In Progress | Currently being worked                      |
| Amber/Yellow | Pending              | Awaiting action, not yet started            |
| Orange       | Follow-up / Warning  | Requires attention, soft-validation notices |
| Red          | Critical / Error     | Blocking issue, invalid data, failure       |
| Grey         | Inactive / Disabled  | Not applicable, disabled, resigned/closed   |

# 13\. UX Principles

Every screen in iPOMS, regardless of module, must follow these principles:

- Minimize clicks.
- Keyboard-first where appropriate (as established in Module 03's Daily Tracker interaction model).
- Never block users unnecessarily - prefer soft validation (warn, don't block) wherever the business allows it.
- Keep tables readable at high data density.
- Maintain consistent button placement across modules.
- Always show save status and progress clearly (auto-save indicators, last-saved time, completion progress).

# 14\. Deferred / Rejected Items

The following were explicitly discussed and either rejected or deferred, and should not be assumed to exist in Version 1:

- Command Palette (Ctrl+K) - rejected; sidebar-only navigation was chosen instead (Section 6.1).
- Recently Visited panel - deferred (Section 6.2).
- Additional logo variants (white/reversed, icon-only, favicon) - to be supplied later.
- Uploaded profile photos - deferred; initials-based avatars are the Version 1 fallback.
- Dark Mode - colour system is being designed to support it later, but only Light Mode ships in Version 1.

# 15\. Design System Document Set

This Design Foundation is the first of three foundational documents proposed for iPOMS. The remaining two are planned, not yet written, and should not be assumed complete:

- UI Design Standards Manual (this document) - visual language and reusable components. ✅ Complete.
- UX & Interaction Guidelines - navigation, workflows, validations, and user behaviour in detail. ⏳ Not yet started.
- Technical Design Standards - naming conventions, page layouts, component hierarchy, responsiveness, and accessibility. ⏳ Not yet started.

# 16\. Governing Principle for Future Modules

Business workflow is always designed before the interface. For every future module, the business process is discussed and finalized first - exactly as was done for Modules 01, 02, and 03 - and only then is the interface designed, using the components and rules defined in this document. The UI is never allowed to force users to adapt to the software; the software adapts to how the placement team actually works.

# 17\. Conclusion

With this Design Foundation complete, iPOMS has an established brand identity, application shell, navigation model, authentication flow, dashboard strategy, component direction, and theme strategy. Every module built from this point forward - beginning with Module 04 - will be assembled from these same standards rather than being designed as an independent screen.

# 18\. Project Progress Snapshot

| **Phase**                           | **Status** |
| ----------------------------------- | ---------- |
| Product Vision                      | Completed  |
| Module 01 - User Management         | Completed  |
| Module 02 - Master Company Database | Completed  |
| Module 03 - Daily Tracker           | Completed  |
| Design Foundation & UI Standards    | Completed  |
| Module 04 - Weekly Tracker          | Next       |

# 19\. Next Module

Module 04 - Weekly Tracker: unlike the Daily Tracker, this module does not record calls. It manages the complete lifecycle of every positive placement opportunity (Invite Sent, JD Requested/Received, Drive Scheduled, Drive In Progress, Interview Rounds, Awaiting Offers, Drive Completed), and will be designed business-workflow-first, then built using the components and standards defined in this document.

# 20\. Approval Sheet

This document requires review and sign-off before the Design Foundation is considered finalized and committed to the version-controlled repository as v1.0.

| **Role**                     | **Name** | **Signature** | **Date** |
| ---------------------------- | -------- | ------------- | -------- |
| Prepared By - A. Mohanaradha |          |               |          |
| Reviewed By (Technical Lead) |          |               |          |
| Approved By (CEO / Director) |          |               |          |