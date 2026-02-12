# Product Requirements Document (PRD) - GSC-IT4U

## 1. Introduction
The GSC-IT4U Portal is a comprehensive IT service desk solution. This document outlines the product requirements, including the new Notification System introduced in GSC-1.3.

## 2. Notification System Requirements (New in GSC-1.3)

### 2.1 Overview
The system must send email notifications to relevant stakeholders (Employee, Manager, IT Support) during critical stages of the ticket lifecycle.

### 2.2 Triggers and Notifications

#### Trigger 1: Employee Creates a Ticket
**Scenario:** An employee submits a new ticket via the portal.
**Actions:**
1.  **Email to Employee:**
    *   **Subject:** Ticket Created Successfully
    *   **Purpose:** Confirmation and details.
2.  **Email to Manager:**
    *   **Subject:** Approval Required – Ticket #ID
    *   **Purpose:** Request approval or rejection.
3.  **Email to IT Support:**
    *   **Subject:** New Ticket Created – Awaiting Manager Approval
    *   **Purpose:** Pre-notification for the IT team.

**Data Included:**
*   Ticket ID
*   Title
*   Category
*   Priority
*   Description (short)
*   Employee Name/Email
*   Manager Name/Email
*   Current Status (Pending Manager Approval)

#### Trigger 2: Manager Approves Ticket
**Scenario:** A manager approves a ticket in `PENDING` state.
**Actions:**
1.  **Email to IT Support:**
    *   **Subject:** Ticket #ID Approved – Action Required
    *   **Purpose:** IT must take ownership and begin work.

### 2.3 Non-Functional Requirements
*   **Asynchronous Processing:** Email sending must not block the main API response.
*   **Threading:** Emails should support conversational threading if possible (same reference ID).
*   **Extensibility:** System should support future channels (SMS, Push) without major refactoring.

## 3. Future Roadmap (Post GSC-1.3)
*   SMS Notifications
*   Multi-channel push notifications
*   WhatsApp Business API support
