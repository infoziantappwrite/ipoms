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

# 7\. Section Definitions

## 7.1 Companies in Pipeline

Companies where the invite email has been sent (or is yet to be sent) and no Job Description (JD) has been received yet.

## 7.2 Companies In Progress

Companies that have received the JD and are progressing - student database sharing, awaiting drive scheduling, drive date confirmation, or interview rounds (technical round, aptitude round, group discussion, HR round) in progress or awaiting results.

## 7.3 Companies Completed

Once all interview rounds are finished, the status becomes Drive Completed and the Offers field is filled with the count of students placed (e.g. 4, 5, 10). The record then automatically moves from Companies In Progress to Companies Completed.

## 7.4 Top Companies

A curated shortlist of the most promising companies, combining two mechanisms:

- Automatic qualification: CTC ≥ 3-4 LPA (final threshold to be confirmed at implementation), a technical/software-type role, and status still in Pipeline or In Progress (not rejected).
- Manual override: any record can be pinned via Pin to Top Companies regardless of the automatic rule, and unpinned the same way.

Company Insights (reviews from sites such as Glassdoor/AmbitionBox, website verification, hiring trends) were requested as a future capability - explicitly deferred to a later version, not part of Version 1.0.

## 7.5 Rejected by HR / Rejected by College

Filled in manually by coordinators or Team Leaders when a company or college declines to proceed. Kept as two distinct sections (not merged) per the team's existing process.

# 8\. Automatic Section Placement Rules

The system reads each record's Status/Offers and places it in the correct section without the user choosing a destination:

| **Condition**                                                                                                                                                     | **Section the Record Moves To** |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Status contains "Invite sent" / no JD yet / newly added with no other signal                                                                                      | Companies in Pipeline           |
| Status contains "JD received" / "Student DB shared" / "Drive scheduled" / interview-round progress                                                                | Companies in Progress           |
| Status contains "Drive Completed" and the Offers field is filled                                                                                                  | Companies Completed             |
| Status marked "Rejected" by HR                                                                                                                                    | Rejected by HR                  |
| Status marked "Rejected" by College / TPO                                                                                                                         | Rejected by College             |
| Manually pinned by a coordinator or Team Leader (Pin to Top Companies), or CTC ≥ 3-4 LPA in a technical role while still in Pipeline/In Progress and not rejected | Top Companies                   |

# 9\. Adding New Companies

Two combined methods are supported, per final decision:

## 9.1 Toolbar - "+ Add Company"

Opens a popup requesting: Company Name, Role, CDC, Company Type, CTC, Follow-up Date, Status, and Section (Pipeline / In Progress / Completed / Top Companies / Rejected by HR / Rejected by College). The user explicitly chooses the section on manual entry; on save, the record is appended to the end of the chosen section and the section immediately re-sorts by Follow-up Date (ascending).

## 9.2 Quick Action Menu - Insert Row Above / Below

Available from the menu on any existing row, for fast Excel-like row insertion within a section already open. A permanent visible "+" button on every row (or a single "+" in the table header) was considered and explicitly rejected in the final round - the Quick Action menu alone was judged sufficient and cleaner.

# 10\. Sorting & Filtering

- Default sort within every section: Follow-up Date (ascending), then Company Name where dates are equal.
- Manual sort also available by CTC, Company Name, Role, CDC, and Company Type.
- Filters available by College, Company Type, Date, and Coordinator.

Rationale: sorting by the nearest Follow-up Date lets a coordinator open the tracker each morning and immediately see who to contact first, without scanning the whole sheet.

# 11\. KPI Cards

Displayed at the top of the Weekly Tracker; each card is clickable and filters straight to its section:

| **KPI Card**         | **Calculation**                                                       |
| -------------------- | --------------------------------------------------------------------- |
| Pipeline             | Count of records currently in Companies in Pipeline.                  |
| In Progress          | Count of records currently in Companies In Progress.                  |
| Completed            | Count of records in Companies Completed; total Offers also tracked.   |
| Rejected             | Combined count across Rejected by HR and Rejected by College.         |
| Follow-ups Due Today | Count of records whose Follow-up Date is today or overdue.            |
| Top Companies        | Count of records currently pinned or auto-qualified as Top Companies. |

# 12\. Final Section Order

This order is maintained consistently throughout the module and reflects the actual order in which a coordinator works through their day:

| **Order** | **Section**           |
| --------- | --------------------- |
| 1         | Follow-up Due Today   |
| 2         | Companies Completed   |
| 3         | Companies In Progress |
| 4         | Companies In Pipeline |
| 5         | Top Companies         |
| 6         | Rejected by HR        |
| 7         | Rejected by College   |

Per-section summary line (shown below each section title): record count plus one relevant metric - e.g. "9 Companies • Last Updated: 10:42 AM" (In Progress), "15 Companies • Total Offers: 84" (Completed), "18 Companies • 6 Follow-ups Due This Week" (Pipeline), "10 Companies • Avg CTC: 7.2 LPA" (Top Companies).

# 13\. Follow-up Indicator

Each row displays a colour indicator based on how close its Follow-up Date is:

- Green - more than 7 days away
- Yellow - within the next 3 days
- Red - due today or overdue

This lets a coordinator identify urgent follow-ups without opening the Status text.

# 14\. Week Selector (Final)

The Week Selector does not use a rolling 7-day calculation from any arbitrary start date. It follows the organization's actual reporting cycle: Friday to the following Friday.

Display example: "◀ Previous Week - 18 Jul 2026 - 24 Jul 2026 - Next Week ▶", optionally labelled with a week number (e.g. "Week 30"). Coordinators and Team Leaders can review and update any previous week's tracker without leaving the module.

# 15\. Toolbar & Quick Actions

Toolbar: Weekly Tracker title, Week Selector, Search, Filter, Sort, Export, Refresh, + Add Company.

Every row's Quick Action menu:

| **Action (Quick Action Menu)** | **Behaviour**                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Edit                           | Opens the row for editing (all columns are editable).                                                                          |
| Insert Row Above / Below       | Adds a new blank editable row adjacent to the selected one - replaces the earlier idea of a permanent "+" button on every row. |
| Duplicate                      | Copies the row, e.g. when the same company recruits for another role.                                                          |
| Move                           | Moves the record to a different section (e.g. Pipeline → In Progress) when the automatic rule hasn't been triggered yet.       |
| Delete                         | Removes the row from the tracker.                                                                                              |
| Pin to Top Companies           | Manually forces the record into the Top Companies section regardless of the automatic CTC/role rule.                           |

# 16\. Sticky Section Headers

As the user scrolls within a section, that section's header remains visible at the top of the viewport (e.g. "Companies In Progress" stays pinned while scrolling through its rows). This keeps long sections - which may eventually contain dozens of companies - easy to navigate.

# 17\. Editing & Permissions

- Every column is fully editable by both the Placement Coordinator and the Team Leader - this was reaffirmed as the most important rule for this module.
- Administrators can view and edit everything across all coordinators' trackers.
- Completed companies remain editable in Version 1.0 - no automatic lock is applied after Drive Completed status is set (an earlier proposal to lock Completed records was not adopted).
- Deletion, duplication, moving between sections, and pinning to Top Companies are all available to Coordinators and Team Leaders via the Quick Action menu.

# 18\. Business Rules Summary

- A company has one row per Weekly Tracker record; multiple simultaneous roles are stored comma-separated in the single Role cell, not as separate rows.
- Status is a single free-text field; there is no separate dropdown "Current Stage" and no per-change history log in Version 1.0.
- Section placement (Pipeline / In Progress / Completed / Rejected) is automatic, driven by Status and the Offers field, per Section 8 - the user is not asked to choose a destination when a record is created via the Daily Tracker.
- Manually created records do require the user to choose an initial Section at creation time, via the Add Company popup.
- Top Companies combines an automatic CTC/role rule with a manual Pin override.
- Sections always sort by Follow-up Date ascending by default.
- Rejected by HR and Rejected by College are kept as two distinct sections.

# 19\. Deferred / Out of Scope for v1.0

- Per-change history log of status transitions - deferred; may be added in a future version.
- Company Insights panel (Glassdoor/AmbitionBox ratings, website verification, hiring trends, news) - deferred to a future (Version 2) release.
- Locking Completed records against further edits - not adopted; everything remains editable in v1.0.
- A permanent "+" button on every row - rejected in favour of the Quick Action menu.
- Renaming the module to "Placement Pipeline" - considered, but the existing name "Weekly Tracker" is retained since the team already uses and understands it.

# 20\. Integration With Other Modules

- Master Company Database (Module 02): supplies the underlying company/HR data referenced by Weekly Tracker records.
- Daily Tracker (Module 03): the primary automatic source of new Weekly Tracker entries, via positive Call Outcomes at Submit Day.
- Monthly Tracker (Module 05, next): will consolidate Daily and Weekly Tracker outcomes into monthly summaries, trends, and performance insights, rather than redefining any workflow already established here.

Confirmed data flow: Master Company Database → Daily Tracker → Weekly Tracker → (future) Monthly Tracker → Dashboard & Reports.

# 21\. Conclusion

Module 04 is considered functionally complete (Business Design Version 1.0). It replaces six manually-copied Excel tables with a single master dataset that automatically organizes itself into the same familiar sections coordinators already use, while adding Follow-up Date sorting, colour-coded urgency indicators, a Friday-to-Friday week selector, sticky section headers, and per-row quick actions. Coordinators and Team Leaders continue to work exactly as they do today - the software adapts to their process rather than the other way around.

# 22\. Next Module

Module 05 - Monthly Tracker: will consolidate the outcomes of the Daily Tracker and Weekly Tracker into monthly summaries, trends, and performance insights for management reporting.

# 23\. Approval Sheet

This document requires review and sign-off before Module 04 is considered finalized and committed to the version-controlled repository as v1.0.

| **Role**                     | **Name** | **Signature** | **Date** |
| ---------------------------- | -------- | ------------- | -------- |
| Prepared By - A. Mohanaradha |          |               |          |
| Reviewed By (Technical Lead) |          |               |          |
| Approved By (CEO / Director) |          |               |          |