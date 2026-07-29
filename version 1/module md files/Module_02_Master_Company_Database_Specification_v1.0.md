**INFOZIANT**

_Secure. Scalable. Innovative._

**iPOMS**

Infoziant Placement Operations Management System

_"Empowering Placement Teams with Intelligent Operations."_

**Module 02 - Master Company Database Specification**

Document Version: v1.0

Status: Final Draft - Approved for Internal Review

Prepared By: A. Mohanaradha, Infoziant

Prepared for: Chief Executive Officer, Infoziant

Date: 23 July 2026

# Document Control

| **Version** | **Date**    | **Description**                                                                                                        | **Prepared By**           | **Approved By** |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------- |
| v1.0        | 23-Jul-2026 | Initial Version 1.0 functional specification of Module 02 - Master Company Database, based on requirements discussion. | A. Mohanaradha, Infoziant | Pending         |

# Table of Contents

[Document Control 2](#_Toc235697610)

[Table of Contents 2](#_Toc235697611)

[1\. Executive Summary 3](#_Toc235697612)

[2\. Purpose 3](#_Toc235697613)

[3\. Objectives 3](#_Toc235697614)

[4\. Company Identity 3](#_Toc235697615)

[5\. Scale & Volume 3](#_Toc235697616)

[6\. Company & Contact Data Model 4](#_Toc235697617)

[6.1 Company / Contact Fields 4](#_Toc235697618)

[6.2 Fields Explicitly Out of Scope for v1.0 4](#_Toc235697619)

[7\. HR Contact Model & Business Rules 4](#_Toc235697620)

[8\. Search Experience 4](#_Toc235697621)

[9\. Main Screen Layout 6](#_Toc235697622)

[10\. Editing Workflow 6](#_Toc235697623)

[11\. Duplicate Detection Workflow 6](#_Toc235697624)

[12\. Delete Workflow 6](#_Toc235697625)

[13\. Company Type 6](#_Toc235697626)

[14\. Multi-User Collaboration 8](#_Toc235697627)

[15\. Audit Trail 8](#_Toc235697628)

[16\. Import & Future Bulk Paste 8](#_Toc235697629)

[17\. Role-Based Permission Matrix 8](#_Toc235697630)

[18\. Business Rules Summary 10](#_Toc235697631)

[19\. Integration with Other Modules 10](#_Toc235697632)

[20\. Deferred / Open Items 10](#_Toc235697633)

[21\. Future Enhancements 10](#_Toc235697634)

[22\. Conclusion 11](#_Toc235697635)

[23\. Next Module 11](#_Toc235697636)

[24\. Approval Sheet 12](#_Toc235697637)

# 1\. Executive Summary

This document defines Module 02 - Master Company Database for the AMR Coordinator Portal (Placement Operations Management System / POMS). It captures every business and system-behaviour decision finalized across the requirements discussion, and follows the same documentation structure established in Module 01 - User Management.

The Master Company Database is deliberately not a CRM. It is a live, Excel-like operational repository of company and HR contact information that placement coordinators search before making calls, and that quietly stays in sync with the Daily Tracker (Module 03) as coordinators work through their day.

# 2\. Purpose

The Master Company Database serves as the central repository for all company and HR contact information used by placement coordinators. Every coordinator searches this database before making calls. It is the single source of truth for company and contact data across the system.

# 3\. Objectives

- Maintain a single master database of companies and HR contacts.
- Allow Coordinators, Team Leaders, and Administrators to manage company information.
- Feed the Daily Tracker (Module 03) with company and HR details.
- Prevent unnecessary duplicate records while allowing multiple genuine contacts per company.
- Support future reporting and analytics.

# 4\. Company Identity

A company is identified by its Company Name alone - there is no Company ID, Website ID, or other internal identifier. The same company name may legitimately appear multiple times in the database, once per distinct HR contact.

Example: Infosys → HR 1, HR 2, HR 3 - one company, multiple contacts, not multiple company records.

# 5\. Scale & Volume

- The Master Company Database currently holds approximately 5,000-8,000 companies, expected to grow to 10,000+.
- A separate, larger working "meta database" (~40,000 records) exists from daily calling activity; the Master Company Database is the curated 5,000-8,000-company core drawn from it.
- Each coordinator makes roughly 50-70 calls per day, so the database is expected to grow continuously through daily operations.

# 6\. Company & Contact Data Model

## 6.1 Company / Contact Fields

| **Field**        | **Status**             | **Notes**                                                                                                                 |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Company Name     | Mandatory              | Free text; may repeat across multiple HR contacts.                                                                        |
| HR Name          | Mandatory              | Name of the contact person at the company.                                                                                |
| HR Mobile Number | Mandatory              | One or more numbers; multiple numbers are stored as separate rows, multiple HR names sharing one number can share a cell. |
| HR Email ID      | Mandatory              | Primary email of the HR contact.                                                                                          |
| Company Type     | Optional (Recommended) | Controlled list - see Section 11.                                                                                         |

## 6.2 Fields Explicitly Out of Scope for v1.0

Per business decision, the following fields are not part of Version 1.0: Industry, Website, Headquarters, Company Size, Hiring Category, Remarks. LinkedIn Company Page and Website (click-to-view only, no verification logic) are noted as Future Enhancements - see Section 16.

# 7\. HR Contact Model & Business Rules

A company may have one HR contact, several HR contacts, or effectively unlimited HR contacts - this is driven entirely by what the business receives, not by any system limit. All genuinely distinct contacts must be stored.

Duplicate detection is based on the combination of Company Name, HR Name, Mobile Number, and Email ID:

| **Company** | **HR Name** | **Mobile No.** | **Email ID** | **System Behaviour**                                       |
| ----------- | ----------- | -------------- | ------------ | ---------------------------------------------------------- |
| Same        | Different   | Different      | -            | Allowed - new HR contact for the same company.             |
| Same        | Different   | Same           | -            | Allowed - different HR may share a mobile/extension.       |
| Same        | Same        | Same           | Same         | Duplicate - save blocked, warning shown.                   |
| Same        | Same        | Same           | Different    | Possible duplicate - allowed only after user confirmation. |

Coordinators, Team Leaders, and Administrators may all add new HR contacts discovered during calls, and may update a contact's company if an HR is confirmed to have moved employers.

# 8\. Search Experience

- Search is performed by Company Name or Mobile Number only - not by HR name, email, or industry.
- Search uses "starts-with" autocomplete: typing "ACC" instantly lists Accenture, ACC Limited, Accops, etc.
- Results appear instantly as the user types (live filtering), not only after pressing Enter.
- Each matching HR contact is shown as its own row (not grouped under a collapsible company), because coordinators call people, not companies, and grouping would add an extra click per lookup across 70+ calls a day.

9\. Main Screen Layout

The Master Company Database screen requires no dashboard - it is a searchable working table. Its layout:

- Search bar at the top.
- Company/contact data table as the main working area, with each HR contact as its own row.
- Action buttons: Add, Edit, Delete, Export to Excel, Recycle Bin.

No statistics widgets are included in v1.0; dashboard-style summaries are deferred to a future version.

# 10\. Editing Workflow

Editing is performed via an Edit popup, not inline/direct table editing (Option B, as selected). This was chosen for better validation, a cleaner UI, easier mistake prevention, and easier duplicate checking before save.

- Coordinator selects a record and clicks Edit.
- A popup opens with all editable fields.
- Duplicate validation runs before the update is saved (see Section 7).
- Changes are committed only after the user confirms Save.

# 11\. Duplicate Detection Workflow

When a save would create a possible duplicate, the system does not simply reject it - it explains why and shows the conflicting record:

- "Possible Duplicate Found" popup displays the company, HR, and mobile number being saved alongside the existing matching record and its row reference.
- Three options are presented: View Existing, Continue Save, Cancel.
- An exact match on Company + HR + Mobile + Email blocks the save outright until the user reviews it.
- A match that varies only by email is allowed after explicit user confirmation.

# 12\. Delete Workflow

- Deletion always requires a confirmation popup ("Are you sure?") before proceeding.
- Deleted records are never purged immediately - they move to a Recycle Bin rather than being permanently removed.
- Only Team Leaders and Administrators can restore records from the Recycle Bin.

Note: an earlier draft of this workflow proposed an automatic email notification to the Team Leader on every deletion. This was superseded during discussion - the Recycle Bin (with restore rights for Team Leader/Admin) was adopted instead as the safety mechanism, and the email-on-delete requirement was dropped.

# 13\. Company Type

For Version 1.0, Company Type is a controlled (dropdown) list, kept deliberately small for consistent reporting:

| **Company Type (v1.0 controlled list)** |
| --------------------------------------- |
| Software                                |
| AI                                      |
| BPO                                     |
| Banking                                 |
| Education                               |
| Finance                                 |

A fully configurable/extensible list is planned for a future version.

# 14\. Multi-User Collaboration

The Master Company Database is simultaneously editable by all Coordinators, Team Leaders, and Administrators - edits are never blocked or locked to a single user.

- Active presence is shown at the top of the screen: users currently viewing or editing the database are listed by name.
- A green indicator marks a user who is actively viewing; a purple/violet indicator marks a user who is actively editing a specific record or cell - similar in spirit to the collaborator presence shown in Microsoft Excel Online.
- Where feasible, the specific cell being edited is highlighted with the editor's name/avatar shown at its corner.
- Saving requires a confirmation click on Save; the system validates all entered/pasted rows for that session before committing.
- If another user has already updated the same record since the current user opened it, a warning is shown naming the user and time, e.g. "This record was updated by Radha at 10:42 AM. Please review the latest changes before saving." The current user then manually decides whether to save over it or skip - this confirmation is a manual business decision, not an automated merge.

# 15\. Audit Trail

Every record permanently displays, not just stores, the following fields so any team member can immediately see who last changed a number or contact:

- Created By
- Created On
- Last Updated By
- Last Updated On

# 16\. Import & Future Bulk Paste

- The Master Company Database is always maintained in Excel format; there is a single, one-time initial import from Excel into the dashboard system.
- After the initial import, new companies/contacts are added directly through the application - the Excel file is not re-uploaded repeatedly.
- Future Enhancement - Bulk Paste: a popup where a coordinator pastes multiple copied Excel rows (Company, HR, Mobile, Email) at once; the system validates each row, detects duplicates per the Section 7 rules, imports valid rows, and reports any errors. This directly matches the real scenario where a Team Leader hands over 10-20 new contacts at once.

# 17\. Role-Based Permission Matrix

| **Feature / Action**                       | **Coordinator** | **Team Leader** | **Administrator** |
| ------------------------------------------ | --------------- | --------------- | ----------------- |
| Search companies / contacts                | **Y**           | **Y**           | **Y**             |
| Add company / HR contact                   | **Y**           | **Y**           | **Y**             |
| Edit company / HR contact                  | **Y**           | **Y**           | **Y**             |
| Delete record (move to Recycle Bin)        | **Y**           | **Y**           | **Y**             |
| Restore record from Recycle Bin            | **N**           | **Y**           | **Y**             |
| Permanently purge Recycle Bin              | **N**           | **N**           | **Y**             |
| Export database to Excel                   | **Y**           | **Y**           | **Y**             |
| Bulk import (initial Excel load)           | **N**           | **N**           | **Y**             |
| Bulk paste new contacts (future)           | **Y**           | **Y**           | **Y**             |
| View audit trail (Created/Updated By & On) | **Y**           | **Y**           | **Y**             |

# 18\. Business Rules Summary

- Company names may repeat; identity is name-based with no internal ID.
- A company can have unlimited genuine HR contacts.
- Same company + different HR + different mobile = allowed.
- Same company + different HR + same mobile = allowed.
- Same company + same HR + same mobile + same email = duplicate, save blocked.
- Same company + same HR + same mobile + different email = allowed only after confirmation.
- Coordinators, Team Leaders, and Administrators may all add, edit, and delete (to Recycle Bin) records.
- Only Team Leaders and Administrators may restore records from the Recycle Bin.
- Every record is always editable - no field or record is permanently locked.

# 19\. Integration with Other Modules

The Master Company Database supplies data to, and stays in sync with, the following modules:

- Module 03 - Daily Tracker: coordinators search/select contacts here; any new contact added while working the Daily Tracker is silently written back to the Master Company Database in the background, with duplicate checks applied automatically.
- Weekly Report / Monthly Report: positive-lead and activity data ultimately sourced from these contacts feeds reporting.
- Dashboard & Analytics: future summary statistics will draw on this data.

Design note carried forward from this discussion: the Master Company Database is intentionally the supporting module, while the Daily Tracker (Module 03) is the coordinator's primary daily workspace. Coordinators should never need to leave the Daily Tracker to maintain the Master Company Database - it updates automatically as they work.

# 20\. Deferred / Open Items

The following items were intentionally not decided in this version and are carried forward rather than assumed:

- Company History (originally proposed Section 6) - left undecided; current direction is that call/response history belongs to the Daily Tracker, not to a per-company history log, but this was not finalized.
- Detailed Business Rules for mandatory-field validation and inactive-company handling (originally proposed Section 9) - deferred to a later phase.
- Website verification and AI-generated company review/suggestion features - explicitly deferred; only a plain clickable Website link is in scope for now (see Section 21).

# 21\. Future Enhancements

- LinkedIn Company Page link as an additional column.
- Clickable Company Website link (no automated verification).
- Fully configurable/extensible Company Type list.
- "Generate Today's Invite List" automation, compiling positive-lead contact details (Company - HR - Mobile - Email) for handover to the Team Leader, replacing today's manual WhatsApp copy-paste process.
- Advanced reporting and analytics built on Master Company Database activity.

# 22\. Conclusion

The Master Company Database is designed as a live, Excel-familiar operational repository - simple, collaborative, and scalable - rather than a traditional CRM. It gives Coordinators, Team Leaders, and Administrators shared, simultaneous, auditable access to company and HR contact data, while quietly supporting the Daily Tracker as the true center of coordinators' day-to-day work. This Version 1.0 specification is considered functionally complete pending validation against sample Excel trackers.

# 23\. Next Module

Module 03 - Daily Tracker: the coordinator's primary daily workspace, covering the live call list, call timer, response tracking, new-contact discovery flowing back into the Master Company Database, and end-of-day summary reporting.

# 24\. Approval Sheet

This document requires review and sign-off before Module 02 is considered finalized and committed to the version-controlled repository as v1.0.

| **Role**                     | **Name** | **Signature** | **Date** |
| ---------------------------- | -------- | ------------- | -------- |
| Prepared By - A. Mohanaradha |          |               |          |
| Reviewed By (Technical Lead) |          |               |          |
| Approved By (CEO / Director) |          |               |          |