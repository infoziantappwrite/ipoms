**INFOZIANT**

_Secure. Scalable. Innovative._

**AMR COORDINATOR PORTAL**

Placement Operations Management System (POMS)

**Module 01 - User Management Specification**

Document Version: v1.0

Status: Draft - Approved for Internal Review

Prepared for: Chief Executive Officer, Infoziant

Date: 22 July 2026

# Document Control

| **Version** | **Date**    | **Description**                                                                               | **Prepared By**            | **Approved By** |
| ----------- | ----------- | --------------------------------------------------------------------------------------------- | -------------------------- | --------------- |
| v1.0        | 22-Jul-2026 | Initial draft of Module 01 - User Management specification, based on requirements discussion. | Project Documentation Team | Pending         |

# Table of Contents

[Document Control 1](#_Toc235642415)

[Table of Contents 1](#_Toc235642416)

[1\. Executive Summary 1](#_Toc235642417)

[2\. Purpose & Scope 1](#_Toc235642418)

[2.1 Purpose 1](#_Toc235642419)

[2.2 Scope 1](#_Toc235642420)

[3\. Objectives 1](#_Toc235642421)

[4\. Stakeholders 1](#_Toc235642422)

[5\. User Roles & Responsibilities 1](#_Toc235642423)

[5.1 Placement Coordinator 1](#_Toc235642424)

[5.2 Team Leader 1](#_Toc235642425)

[5.3 Administrator (CEO / Director) 1](#_Toc235642426)

[5.4 Training & Placement Officer (TPO) 1](#_Toc235642427)

[6\. Login Architecture & Screen Design 1](#_Toc235642428)

[6.1 Login Architecture 1](#_Toc235642429)

[6.2 Login Screen Fields 1](#_Toc235642430)

[7\. User Profile Data Model 1](#_Toc235642431)

[8\. Role-Based Permission Matrix 1](#_Toc235642432)

[9\. Company Data Classification 1](#_Toc235642433)

[9.1 Master Company Information (Protected) 1](#_Toc235642434)

[9.2 Contact Information (Operational) 1](#_Toc235642435)

[10\. Password Management 1](#_Toc235642436)

[11\. Account Creation Rules 1](#_Toc235642437)

[12\. Session Management 1](#_Toc235642438)

[13\. Account Status Lifecycle 1](#_Toc235642439)

[14\. Business Rules 1](#_Toc235642440)

[15\. Security Rules 1](#_Toc235642441)

[16\. User Journeys 1](#_Toc235642442)

[16.1 Placement Coordinator 1](#_Toc235642443)

[16.2 Team Leader 1](#_Toc235642444)

[16.3 Administrator 1](#_Toc235642445)

[16.4 Training & Placement Officer (TPO) 1](#_Toc235642446)

[17\. Future Enhancements 1](#_Toc235642447)

[18\. Next Module 1](#_Toc235642448)

[19\. Approval Sheet 1](#_Toc235642449)

# 1\. Executive Summary

This document defines Module 01 - User Management for the AMR Coordinator Portal (Placement Operations Management System / POMS), an internal platform built to help Infoziant's placement team track daily company outreach, recalls, positive leads, and reporting across a distributed team of coordinators, team leaders, administrators, and the client-facing Training & Placement Officer (TPO).

This module establishes the security foundation for the entire system: how each of the 20+ employees logs in, what each role is permitted to see and do, how accounts are created and managed, and how user activity is tracked. It is the first of several modules planned for the platform and follows the structure agreed for the overall Software Requirements Specification (SRS).

# 2\. Purpose & Scope

## 2.1 Purpose

To provide a secure, role-based authentication and authorization system for the Placement Operations Management System, ensuring that every user accesses only the modules and features required for their responsibilities while maintaining data security, accountability, and workflow efficiency.

## 2.2 Scope

Module 01 covers user authentication, role definitions, permission control, user profile data, password and session management, and account lifecycle. It does not cover the functional detail of downstream modules (Company Database, Daily Tracker, Recall Management, Reports, etc.), which are addressed in their own module specifications.

# 3\. Objectives

- Authenticate all users securely.
- Provide role-based access control (RBAC) across all modules.
- Restrict unauthorized operations by role.
- Maintain accurate, auditable user information.
- Track login activity and session history.
- Support self-service and assisted password management.
- Control access to every module in the system from a single point of authentication.

# 4\. Stakeholders

| **Stakeholder**                    | **Interest in the System**                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Placement Coordinator              | Operational user; makes company calls and maintains daily records.                 |
| Team Leader                        | Supervises coordinators; verifies and corrects data; manages the company database. |
| Administrator (CEO / Director)     | System owner; unrestricted access; responsible for governance and configuration.   |
| Training & Placement Officer (TPO) | External/read-only stakeholder monitoring placement performance.                   |

# 5\. User Roles & Responsibilities

## 5.1 Placement Coordinator

The operational user responsible for company outreach and daily placement activities.

- Company calling
- Daily tracker maintenance
- Recall management
- Positive lead updates
- Weekly progress monitoring
- Company database updates (operational fields only)

## 5.2 Team Leader

Operational supervisor responsible for monitoring multiple coordinators.

- Monitor coordinators
- Verify data
- Correct records
- Manage company database
- Import / export databases
- Monitor reports

## 5.3 Administrator (CEO / Director)

System owner with unrestricted administrative privileges.

- User management
- System configuration
- Analytics
- Database administration
- Security
- Application settings

## 5.4 Training & Placement Officer (TPO)

Read-only stakeholder responsible for monitoring placement activities.

- Weekly reports
- Monthly reports
- Placement statistics
- Dashboard monitoring

# 6\. Login Architecture & Screen Design

## 6.1 Login Architecture

A single, unified login screen serves all roles. After successful authentication, the system automatically detects the user's assigned role and redirects them to the corresponding dashboard - there is no separate login page per role.

## 6.2 Login Screen Fields

- Username
- Password
- Remember Me
- Forgot Password
- Login button

_A motivational placement-related message is displayed below the login button, e.g. "Every positive call creates a new opportunity for our students."_

# 7\. User Profile Data Model

Every user profile in the system shall contain the following fields:

| **Field**           | **Description**                                 |
| ------------------- | ----------------------------------------------- |
| Employee ID         | Unique internal identifier                      |
| Full Name           | Legal / display name                            |
| Username            | Login identifier                                |
| Password            | Stored encrypted                                |
| Official Email ID   | Primary contact / notifications                 |
| Mobile Number       | Contact number                                  |
| Assigned College(s) | One or more colleges per user                   |
| Department          | Organizational department                       |
| Role                | Coordinator / Team Leader / Administrator / TPO |
| Account Status      | Active / Inactive / On Leave / Resigned         |
| Date Created        | Account creation timestamp                      |
| Last Login          | Most recent successful login                    |

# 8\. Role-Based Permission Matrix

The matrix below consolidates allowed (Y) and restricted (N) actions across all four roles. "Y\*" indicates an action allowed only where company policy permits.

| **Feature / Action**                      | **Coordinator**   | **Team Leader** | **Administrator** | **TPO**      |
| ----------------------------------------- | ----------------- | --------------- | ----------------- | ------------ |
| Login / Logout                            | **Y**             | **Y**           | **Y**             | **Y**        |
| Change own password                       | **Y**             | **Y**           | **Y**             | **N**        |
| View own dashboard                        | **Y**             | **Y**           | **Y**             | **Y**        |
| Daily Call Tracker                        | **Y**             | **Y (monitor)** | **Y (monitor)**   | **N**        |
| Recall Management                         | **Y**             | **Y (monitor)** | **Y (monitor)**   | **N**        |
| Positive Leads                            | **Y**             | **Y (monitor)** | **Y (monitor)**   | **Y (view)** |
| View weekly / monthly reports             | **Y**             | **Y**           | **Y**             | **Y**        |
| Export reports                            | **N**             | **Y**           | **Y**             | **Y**        |
| Search companies                          | **Y**             | **Y**           | **Y**             | **N**        |
| Edit company contact info (operational)   | **Y**             | **Y**           | **Y**             | **N**        |
| Edit master company info (protected)      | **N**             | **Y**           | **Y**             | **N**        |
| View other coordinators' trackers         | **Y (read-only)** | **Y**           | **Y**             | **N**        |
| Delete company records                    | **N**             | **Y**           | **Y**             | **N**        |
| Import company database                   | **N**             | **Y**           | **Y**             | **N**        |
| Export master database                    | **N**             | **Y**           | **Y**             | **N**        |
| Create coordinator accounts               | **N**             | **Y\***         | **Y**             | **N**        |
| Create Team Leader / Admin / TPO accounts | **N**             | **N**           | **Y**             | **N**        |
| Delete / disable users                    | **N**             | **N**           | **Y**             | **N**        |
| Reset user passwords                      | **N**             | **Y\***         | **Y**             | **N**        |
| System / application configuration        | **N**             | **N**           | **Y**             | **N**        |
| View analytics                            | **N**             | **Y**           | **Y**             | **Y**        |
| View audit logs                           | **N**             | **N**           | **Y**             | **N**        |

# 9\. Company Data Classification

To prevent accidental modification of core company records while still allowing coordinators to keep contact details current, company data is split into two categories:

## 9.1 Master Company Information (Protected)

- Company Name
- Website
- Industry
- Address
- Company ID

Editable only by Team Leader and Administrator.

## 9.2 Contact Information (Operational)

- HR Name
- Mobile Number
- Email ID
- Designation
- Remarks

Editable by Coordinators, since they discover and update contacts during daily calling.

# 10\. Password Management

- Coordinators, Team Leaders, and Administrators may change their own password.
- Forgot Password requests for Coordinators are handled by a Team Leader or Administrator.
- TPO accounts are read-only and do not initiate password reset requests through operational staff.

# 11\. Account Creation Rules

- Coordinator accounts may be created by a Team Leader (if company policy permits) or an Administrator.
- Team Leader, Administrator, and TPO accounts may be created only by an Administrator.

# 12\. Session Management

- Remember Me
- Secure login
- Logout
- Automatic logout after inactivity
- Last login information displayed to the user
- Active session tracking

# 13\. Account Status Lifecycle

Every account carries exactly one status at a time: Active, Inactive, On Leave, or Resigned. Historical data associated with a user is never deleted when their account becomes inactive - it is retained for audit and continuity.

# 14\. Business Rules

- One user may have one or more assigned colleges.
- Coordinators may update company contact information but cannot delete companies.
- Team Leaders may delete company records.
- Team Leaders may import and export the master database.
- Administrators have unrestricted access.
- TPO access is strictly read-only.
- Passwords shall be encrypted at rest.
- Every login attempt shall be recorded.

# 15\. Security Rules

- Passwords stored securely (encrypted, never in plain text).
- Role-based authorization enforced on every request.
- Session timeout after a defined period of inactivity.
- Login audit trail maintained.
- Activity logging across sensitive operations.
- Permission validation before every sensitive operation.

# 16\. User Journeys

## 16.1 Placement Coordinator

Login → Dashboard → Daily Tracker → Recall → Positive Leads → Weekly Report → Logout

## 16.2 Team Leader

Login → Dashboard → Coordinator Monitoring → Company Database → Reports → Analytics → Logout

## 16.3 Administrator

Login → System Dashboard → User Management → Database → Reports → Settings → Logout

## 16.4 Training & Placement Officer (TPO)

Login → Placement Dashboard → Reports → Analytics → Logout

# 17\. Future Enhancements

- Two-Factor Authentication (2FA)
- Biometric login
- Face recognition
- Single Sign-On (SSO)
- Microsoft / Google Workspace integration

# 18\. Next Module

Module 02 - Master Company Database, covering the full schema, import/export rules, and data validation for the company records referenced throughout this module.

# 19\. Approval Sheet

This document requires review and sign-off before Module 01 is considered finalized and committed to the version-controlled repository as v1.0.

| **Role**                     | **Name** | **Signature** | **Date** |
| ---------------------------- | -------- | ------------- | -------- |
| Prepared By                  |          |               |          |
| Reviewed By (Technical Lead) |          |               |          |
| Approved By (CEO / Director) |          |               |          |