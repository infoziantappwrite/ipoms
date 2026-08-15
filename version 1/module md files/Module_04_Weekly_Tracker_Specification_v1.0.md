**INFOZIANT**

_Secure. Scalable. Innovative._

**iPOMS**

Infoziant Placement Operations Management System

**Module 04 - Weekly Tracker Specification**

Document Version: v1.0

Status: Completed - Business Design Approved for Internal Review

Prepared By: A. Mohanaradha, Infoziant

Prepared for: Chief Executive Officer, Infoziant

Date: 23 July 2026

# Document Control

| **Version** | **Date**    | **Description**                                                                                                                                                                       | **Prepared By**           | **Approved By** |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------- |
| v1.0        | 23-Jul-2026 | Initial Version 1.0 business-design specification of Module 04 - Weekly Tracker, derived from the requirements discussion and the team's existing multi-college Excel Weekly Tracker. | A. Mohanaradha, Infoziant | Pending         |

# Table of Contents

 Executive Summary

 Purpose

 Entry Into the Weekly Tracker

 Core Architecture - One Master Table, Multiple Views

 Data Model - Columns

 Multiple Roles Per Company

 Section Definitions  
7.1 Companies in Pipeline  
7.2 Companies In Progress  
7.3 Companies Completed  
7.4 Top Companies  
7.5 Rejected by HR / Rejected by College

 Automatic Section Placement Rules

 Adding New Companies  
9.1 Toolbar - "+ Add Company"  
9.2 Quick Action Menu - Insert Row Above / Below

 Sorting & Filtering

 KPI Cards

 Final Section Order

 Follow-up Indicator

 Week Selector (Final)

 Toolbar & Quick Actions

 Sticky Section Headers

 Editing & Permissions

 Business Rules Summary

 Deferred / Out of Scope for v1.0

 Integration With Other Modules

 Conclusion

 Next Module

 Approval Sheet

# 1\. Executive Summary

This document defines Module 04 - Weekly Tracker for iPOMS (Infoziant Placement Operations Management System), following the same structure established for Modules 01-03 and the Design Foundation. It is based directly on the team's existing multi-college Excel Weekly Tracker (reviewed section by section, including live sample entries) and on the requirements discussion that followed.

Where the Daily Tracker (Module 03) answers "What calls did we make today?", the Weekly Tracker answers "Where does every company stand in the placement journey - from first positive response until the drive is completed and offers are received?" It is the operational board that Coordinators, Team Leaders, and Administrators rely on every working day, not only once a week.

# 2\. Purpose

To monitor all ongoing placement activities and ensure no positive company is missed - tracking every stage from Invite Email Sent through JD received, student database sharing, drive scheduling, interview rounds, and final drive completion with offers.

# 3\. Entry Into the Weekly Tracker

Daily Tracker → Call Outcome = Invite Mail (or another positive outcome) → Submit Day → the company automatically appears in the Weekly Tracker, in Companies in Pipeline.

Companies may also enter the Weekly Tracker without going through the Daily Tracker - for example when a Team Leader receives a lead via LinkedIn, HR WhatsApp, personal contact, college management, or a previous email conversation. These are added manually (see Section 9).

# 4\. Core Architecture - One Master Table, Multiple Views

The team's current Excel process maintains six separate, manually-copied tables (Pipeline, In Progress, Completed, Top Companies, Rejected by HR, Rejected by College). In iPOMS, this becomes one master Weekly Tracker dataset per coordinator/college, with the different sections generated automatically from each record's Status.

The coordinator edits only one record. The system decides which section displays it, based on the automatic rules in Section 8. Nobody manually cuts, pastes, or re-sorts rows between sections.

This preserves the exact visual experience coordinators are already used to (the same named sections from their Excel sheets) while removing the copy/paste/delete/rearrange work that currently causes mistakes.

# 5\. Data Model - Columns

Reviewed directly against the team's sample Excel entries (multiple colleges, each on its own tab: KIOT, KLU-KARE, KPR, Karpagam, AIHT, SMVEC, DSU, MKCE, SONA, PSNA, KAMARAJ, NPR, ACHARIYA, and others). Final column set for Version 1.0:

| **Column**     | **Type**                          | **Notes**                                                                                                              |
| -------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| S.No           | Auto                              | Sequential row number within its section.                                                                              |
| Company Name   | Editable                          | Auto-suggested from Daily Tracker entries; manually addable via + Add Company.                                         |
| Role           | Editable                          | Free text; supports multiple roles in one cell, comma-separated (e.g. "Software Engineer, Data Analyst, AI Engineer"). |
| CDC            | Editable                          | Campus/college placement coordinator reference field.                                                                  |
| Company Type   | Editable                          | e.g. Software, BPO, Banking, AI, Education, Finance.                                                                   |
| CTC            | Editable                          | Compensation offered; used in Top Companies automation rules.                                                          |
| Follow-up Date | Editable                          | Date the coordinator plans to next contact the HR; drives sorting and the Follow-up Due Today section.                 |
| Status         | Editable - free text              | Single rich free-text field; supports natural notes such as "Invite email sent, awaiting JD, follow up on July 22".    |
| Offers         | Editable (Completed section only) | Number of students placed; appears only once a company reaches Companies Completed.                                    |

Design decision: an earlier proposal split Status into a dropdown "Current Stage" plus a separate free-text "Status/Remarks" field. This was rejected after reviewing the team's actual entries - real statuses such as "Invite email sent, awaiting JD, follow up on July 22" or "HR said currently they hire from Andhra regions, soon they will reach Tamil Nadu region" are live operational notes that a rigid stage dropdown would strip of context. Version 1.0 uses a single free-text Status column, plus the separate Follow-up Date column.

A history log of every status change was also proposed and explicitly deferred - not included in Version 1.0. Only the current Status and current Follow-up Date are retained per record.

# 6\. Multiple Roles Per Company

- A company is not duplicated into separate rows for each role it is hiring for.
- Multiple roles are typed into the single Role cell, comma-separated - e.g. "Software Engineer, Data Analyst, Full Stack Developer, AI Engineer".
- Company Name and Role are otherwise fully editable, alongside every other column.

# 7. Section Definitions (Weekly Tracker Operational Sections)

The Weekly Tracker operational board organizes placement activities into the following operational sections:

## 7.1 Companies in Pipeline
Companies where the invite email has been sent (or is slated to be sent) and no Job Description (JD) has been received yet.

## 7.2 Companies In Progress
Companies where the JD has been received and active operations are progressing (student database sharing, drive scheduling, interview rounds in progress or awaiting results).

## 7.3 Companies Completed
Companies where all interview rounds are finished (Status: "Drive Completed", `Offers` count recorded).

## 7.4 Top Companies
A curated shortlist of priority hiring partners, combining automatic qualification (CTC ≥ 3.5 LPA in technical/software roles while in Pipeline or In Progress) and manual override (`Pin to Top Companies` via row menu).

## 7.5 Rejected by HR
Companies where the employer/corporate HR declined to proceed with the hiring process.

## 7.6 Rejected by College
Companies where the college/TPO declined to proceed.

---

# 8. Automatic Section Placement & Movement Rules

The system reads each record's Status/Offers and places it in the correct operational section automatically:

| **Condition** | **Target Operational Section** |
|---|---|
| Status contains "Invite sent" / no JD yet / newly added with no other signal | **Companies in Pipeline** |
| Status contains "JD received" / "Student DB shared" / "Drive scheduled" / interview rounds | **Companies In Progress** |
| Status contains "Drive Completed" and Offers field is filled | **Companies Completed** |
| Status marked "Rejected" by HR | **Rejected by HR** |
| Status marked "Rejected" by College / TPO | **Rejected by College** |
| CTC ≥ 3.5 LPA in technical role (while in Pipeline/In Progress) OR Manually Pinned | **Top Companies** |

---

# 9. Adding New Companies

Two combined methods are supported:

## 9.1 Toolbar - "+ Add Company"
Opens a popup requesting: Company Name, Role, CDC, Company Type, CTC, Follow-up Date, Status, and Section (Pipeline / In Progress / Completed / Top Companies / Rejected by HR / Rejected by College). The record is appended and sorted by Follow-up Date (ascending).

## 9.2 Quick Action Menu - Insert Row Above / Below
Available from the menu on any existing row, for fast Excel-like row insertion within the current section.

---

# 10. Sorting & Filtering

- **Default Sort:** Follow-up Date (ascending), then Company Name where dates are equal.
- **Manual Sort:** CTC, Company Name, Role, CDC, and Company Type.
- **Filters:** College, Company Type, Date Range, and Coordinator.

---

# 11. KPI Cards

Displayed at the top of the Weekly Tracker, clickable to filter directly to that section:

| **KPI Card** | **Calculation** |
|---|---|
| **Pipeline** | Count of records currently in Companies in Pipeline |
| **In Progress** | Count of records currently in Companies In Progress |
| **Completed** | Count of records in Companies Completed + total Offers count |
| **Rejected** | Combined count across Rejected by HR and Rejected by College |
| **Follow-ups Due Today** | Count of records whose Follow-up Date is today or overdue |
| **Top Companies** | Count of records currently pinned or auto-qualified as Top Companies |

---

# 12. Final Section Display Order

The Weekly Tracker operational board renders its sections in the following consistent order:

| **Order** | **Section** | **Per-Section Header Summary Metric** |
|:---:|---|---|
| **1** | **Follow-up Due Today** | Urgent Follow-ups • Action Required Today |
| **2** | **Companies Completed** | Total Companies • Total Offers Placed |
| **3** | **Companies In Progress** | Active Companies • Drives Scheduled |
| **4** | **Companies in Pipeline** | Total Companies • Follow-ups Due This Week |
| **5** | **Top Companies** | Priority Companies • Average CTC |
| **6** | **Rejected by HR** | Employer Declines |
| **7** | **Rejected by College** | Institutional Declines |
*(Note: In Reports & Analytics, the Weekly Placement Report aggregates this operational data into the 7 approved report presentation sections: Completed, In Progress, Pipeline, Top Companies, Companies on Hold by TPO, Companies on Hold by HR, Rejected Companies).*

---

# 13. Follow-up Indicator

Each row displays a clear colour indicator based on Follow-up Date proximity:
- **Green:** > 7 days away
- **Yellow:** Within next 3 days
- **Red:** Due today or overdue

---

# 14. Week Selector (Final)

Follows the official organization reporting cycle: **Friday to Thursday / Friday to Friday**.  
Example: `◀ Previous Week | 18 Jul 2026 – 24 Jul 2026 (Week 30) | Next Week ▶`.

---

# 15. Toolbar, Quick Actions & Unified Export

### Toolbar
- Title, Week Selector, Search, Filter, Sort, **Export (PDF / Excel / CSV)**, Refresh, `+ Add Company`.

### Row-Level Quick Action Menu
Contextual menu on each row (no traditional cluttering Action column):
- **Edit:** Inline or focused edit.
- **Insert Row Above / Below:** Adds adjacent blank row.
- **Duplicate:** Copies company data for another role.
- **Move to Section:** Manually overrides section destination.
- **Delete:** Soft-deletes record to `recycle_bin`.
- **Pin / Unpin Top Companies:** Toggles Top Companies override.

---

# 16. Sticky Section Headers
Section headers remain pinned to the top of the viewport during scrolling.

---

# 17. Editing & Permissions
- **Coordinators & Team Leaders:** Full inline editing of all columns for assigned colleges.
- **Administrators:** Full system-wide visibility and editing.
- **TPO Role:** Restricted read-only access to own institution's weekly placement summaries.

---

# 18. Business Rules Summary
- Single master dataset dynamically rendered across the **7 finalized sections**.
- Status is a rich, natural free-text field; Follow-up Date is tracked in its own dedicated column.
- Multiple roles per company are stored comma-separated in the single `Role` field.
- Full soft-delete integration with the `recycle_bin` collection.
- Unified exports in **PDF, Excel, and CSV**.

---

# 19. Deferred / Out of Scope for v1.0
- Per-keystroke status audit history log (deferred; current Status and Follow-up Date retained).
- Live external company review scrapers (Glassdoor/AmbitionBox) — deferred to V2.
- Permanent "+" column button — replaced by Quick Action menu.

---

# 20. Integration With Other Modules
- **Master Company Database (Module 02):** Provides underlying company & HR metadata.
- **Daily Tracker (Module 03):** Feeds positive Call Outcomes directly into Section 3 (Pipeline).
- **Daily Leads (Module 05):** Synchronizes JD Received milestones.
- **Reports & Analytics (Module 06):** Feeds live data into the Weekly Placement Report.

---

# 21. Conclusion
Module 04 organizes the placement pipeline into 7 automated sections with Friday-to-Friday week tracking, inline auto-save, and unified exports.

---

# 22. Precedence Notice
Per `V1_DECISIONS.md`, the 7-section pipeline and rules in this document represent the authoritative Version 1 standard.

# 23\. Approval Sheet

This document requires review and sign-off before Module 04 is considered finalized and committed to the version-controlled repository as v1.0.

| **Role**                     | **Name** | **Signature** | **Date** |
| ---------------------------- | -------- | ------------- | -------- |
| Prepared By - A. Mohanaradha |          |               |          |
| Reviewed By (Technical Lead) |          |               |          |
| Approved By (CEO / Director) |          |               |          |