Absolutely. Below is the **Complete Business Documentation** for **Module 7 - Role-Based Dashboard** of the **Infoziant Placement Operations Management System (iPOMS)**. This document consolidates **every discussion, improvement, business rule, workflow, and decision** we made throughout the planning process.

**Module 7 - Role-Based Dashboard**

**Module Name**

**Role-Based Dashboard (Operational Command Center)**

**Module Objective**

The Role-Based Dashboard is the **Home Screen**, **Landing Page**, and **Operational Command Center** of iPOMS.

It is the first screen displayed immediately after a successful login.

Its objective is **not** to allow users to perform operational work. Instead, it provides a live operational overview, highlights priorities, and guides users to the correct module where the actual work is performed.

The dashboard should answer three important questions within a few seconds:

- What is my priority today?
- What requires my immediate attention?
- Where should I go next?

The dashboard is therefore an **intelligent navigation center**, not a data-entry screen.

**Dashboard Philosophy**

The dashboard is designed with a very simple philosophy.

**Inform the user. Guide the user. Never make the user work from the dashboard.**

All operational work is completed inside dedicated modules such as:

- Daily Tracker
- Weekly Tracker
- Daily Leads
- Reports & Analytics

The dashboard only summarizes important information and provides direct navigation.

**Dashboard Workflow**

Login

│

▼

Role Detection

│

▼

Role-Based Dashboard

│

├──────── Daily Tracker

├──────── Weekly Tracker

├──────── Daily Leads

├──────── Reports

├──────── Notifications

└──────── Settings

Navigation is **bidirectional**.

Users can move freely between the dashboard and all modules without losing context.

Example

Dashboard

↓

Daily Tracker

↓

Weekly Tracker

↓

Reports

↓

Dashboard

**Types of Dashboards**

Three dashboards will be available.

**1\. Placement Coordinator Dashboard**

Purpose

Daily operational management.

Primary Question

What should I do today?

**2\. Team Leader Dashboard**

Purpose

Monitor and guide coordinators.

Primary Question

How is my team performing today?

Additional capability

Assign work directly to coordinators.

**3\. Administrator Dashboard**

Purpose

Organization-wide monitoring and management.

Primary Question

How is the complete placement operation progressing?

Administrator permissions include:

- Organization KPIs
- User Management
- Settings
- Broadcast announcements
- Notifications
- Reports

Administrator does not perform coordinator operational work.

**Dashboard Characteristics**

**Rule 1**

Dashboard is Interactive.

Cards

Widgets

Buttons

Quick Navigation

Everything responds to user interaction.

**Rule 2**

Dashboard is Non-Editable.

Operational data cannot be edited here.

Dashboard is View Mode only.

**Rule 3**

Dashboard is Live.

No manual refresh.

Every widget automatically reflects the latest data from:

Daily Tracker

Weekly Tracker

Daily Leads

Reports

Assigned Work

Notifications

**Rule 4**

Dashboard must remain Minimal.

Avoid clutter.

Avoid unnecessary graphics.

Avoid excessive animations.

Maintain sufficient white space.

Professional appearance.

High-priority information should always appear first.

**Dashboard Layout**

Final layout

Greeting

↓

Notifications

↓

Assigned Work

↓

Priority College

↓

Today's Tasks

↓

Today's KPI Summary

↓

Quick Navigation

↓

Insights

**Greeting Section**

Greeting changes automatically according to system time.

Morning

Good Morning, Lokesh 👋

Afternoon

Good Afternoon, Lokesh ☀️

Evening

Good Evening, Lokesh 🌇

After 8 PM

Burning the midnight oil?

Thanks for your dedication, Lokesh 🌙

The greeting uses the logged-in user's name.

**Notifications Widget**

Notifications appear immediately below the greeting.

Possible senders:

CEO

Director

Team Leader

System

Examples

CEO

Please prioritize XYZ College this week.

Team Leader

Follow up with TCS today.

System

Weekly Report submission is due today.

**Assigned Work Widget**

This became the signature feature of Module 7.

Purpose

Allow Team Leaders to assign operational work directly to coordinators.

Assigned Work is **not** a chat system.

It is an operational task assignment mechanism.

**Assigned Work Workflow**

Team Leader Dashboard

↓

Create Assignment

↓

Select Coordinator

↓

Select College

↓

Enter Details

↓

Send

↓

Coordinator Dashboard

↓

Assigned Work Widget

**Assigned Work Card Example**

Assigned Work

High Priority

College

ABC Engineering College

Task

Call these five companies before 11 AM.

Actions

Load to Metadata

Mark Completed

View Details

**Assigned Work Action Buttons**

**Load to Metadata**

Loads the assigned company contact into the Metadata Database.

Performs intelligent merge.

**Mark Completed**

Marks assignment complete.

Immediately removes it from dashboard.

**View Details**

Displays complete assignment information.

**Assignment Priority**

Three levels

High

Medium

Low

Dashboard automatically sorts according to priority.

**Assignment Lifecycle**

Assigned

↓

Received

↓

Viewed

↓

Load to Metadata

↓

Mark Completed

↓

Hidden from Dashboard

↓

Automatically deleted from operational storage after 7 days

Completed assignments disappear immediately from dashboard.

Operational storage automatically cleans itself after seven days.

**Dashboard Personalization**

Dashboard is automatically personalized.

Coordinator A

Only sees

Assigned Colleges

Assigned Work

Own KPIs

Own Reports

Own Notifications

Own Follow-ups

Coordinator B

Sees only their own information.

No manual filtering.

No searching.

**Priority College Widget**

Each coordinator usually manages multiple colleges.

One college is considered priority.

Dashboard displays

Priority College

Today's Calls

Pending Follow-ups

Status

**Today's Tasks**

Only three tasks maximum.

Examples

Follow up with Infosys.

Share student database.

Generate Weekly Report (Friday).

No long task list.

**KPI Summary**

Dashboard KPIs

Calls Assigned

Calls Completed

Pending Calls

Positive Responses

JD Received

Compact view only.

**Quick Navigation**

Shortcut cards

Daily Tracker

Weekly Tracker

Daily Leads

Reports

Settings

One-click navigation.

**Insights Widget**

Displays short operational insights.

Examples

Follow-up workload increased today.

Student database pending for two companies.

Weekly report due today.

**Team Leader Dashboard**

Additional features

View coordinator performance.

Assign work.

Monitor assignment completion.

View acknowledgements.

Track overall progress.

**Administrator Dashboard**

View organization-wide KPIs.

Broadcast announcements.

View all reports.

Manage users.

Manage settings.

View coordinator performance.

**Metadata Merge Engine**

Whenever coordinator selects

Load to Metadata

System performs intelligent merge.

Metadata Database remains the **single source of truth**.

**Merge Case 1**

Company does not exist.

Result

Create entirely new company.

Example

Infosys

Rahul

9876543210

<rahul@infosys.com>

**Merge Case 2**

Company exists.

HR different.

Mobile different.

Email different.

Result

Add as another contact under same company.

**Merge Case 3**

Company same.

HR same.

Mobile different.

Result

Append new mobile.

Example

Old

9876543210

New

9988776655

Result

9876543210

9988776655

**Merge Case 4**

Company same.

HR same.

Email different.

Append new email.

**Merge Case 5**

Company same.

HR different.

Everything different.

Store as another HR contact under same company.

**Metadata Audit Fields**

Every contact stores

Added By

Added Date

Assigned By

Example

| **Company** | **HR** | **Mobile** | **Email**                                     | **Added By** | **Added Date** | **Assigned By** |
| ----------- | ------ | ---------- | --------------------------------------------- | ------------ | -------------- | --------------- |
| Infosys     | Rahul  | 9876543210 | [rahul@infosys.com](mailto:rahul@infosys.com) | Lokesh       | 23-Mar-2026    | Team Leader A   |

Assigned Date was discussed and intentionally omitted to keep the design simple.

**Assigned Work Storage Strategy**

Assigned Work is **temporary**.

Purpose

Operational inbox only.

Workflow

Assignment

↓

Load to Metadata

↓

Completed

↓

Hidden from Dashboard

↓

Deleted after 7 Days

Permanent storage remains only inside Metadata Database.

**Metadata Database Philosophy**

Single Source of Truth.

Every valid contact eventually resides here.

Assigned Work never becomes permanent storage.

**Auto Merge Logic**

Whenever

Company already exists

↓

System checks

HR

↓

Mobile

↓

Email

↓

Only new values are inserted.

Duplicate values ignored automatically.

**Smart Contact Management**

Example

Existing

Infosys

Rahul

9876543210

Incoming

Infosys

Rahul

9988776655

Result

Infosys

Rahul

9876543210

9988776655

No duplicate numbers.

**Module Integrations**

Dashboard integrates with

Authentication

↓

Assigned Work

↓

Metadata Database

↓

Daily Tracker

↓

Weekly Tracker

↓

Reports & Analytics

↓

Notifications

Everything remains synchronized automatically.

**UI Design Principles**

Minimal

Professional

Responsive

White-space friendly

Fast loading

Interactive

No unnecessary animations

No clutter

High-priority information first

Responsive widgets

Modern enterprise appearance

**Final Architecture**

User Login

↓

Authentication

↓

Role Detection

↓

Role-Based Dashboard

↓

Notifications

↓

Assigned Work

↓

Priority College

↓

Today's Tasks

↓

KPI Summary

↓

Quick Navigation

↓

Daily Tracker

↓

Weekly Tracker

↓

Reports

↓

Metadata Database

**Final Business Decisions**

✅ Three role-based dashboards.

✅ Dashboard is informational, not operational.

✅ Dashboard remains live.

✅ No manual refresh.

✅ Dashboard personalized automatically.

✅ Team Leaders assign work directly.

✅ Assigned Work appears as a dashboard widget.

✅ Metadata Database becomes the single source of truth.

✅ Intelligent merge engine prevents duplicate company records.

✅ Audit fields stored with every metadata entry (Added By, Added Date, Assigned By).

✅ Assigned Work hidden immediately after completion.

✅ Operational Assigned Work deleted automatically after seven days.

✅ Dashboard remains minimal, clean, and enterprise-focused.

**Module 7 Status**

**Status:** ✅ **Business Design Completed**

This module is now fully defined from a business, workflow, UI, and architectural perspective and is ready to move into UI/UX wireframing and implementation.