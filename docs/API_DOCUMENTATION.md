# API & Backend Documentation - GSC-IT4U

## 1. REST API
Standard REST endpoints for Tickets, Users, and Auth.

## 2. Notification Events (Internal) (GSC-1.3)

### 2.1 TicketCreatedEvent
*   **Source:** `TicketService.createTicket()`
*   **Payload:**
    *   `Ticket` object (ID, Title, Description, Priority, Category)
    *   `User` (Creator)
    *   `User` (Manager)

### 2.2 TicketApprovedByManagerEvent
*   **Source:** `TicketService.approveTicket()`
*   **Payload:**
    *   `Ticket` object
    *   `User` (Approver/Manager)

## 3. Email Payload Structure

### 3.1 Common Fields
*   `ref_id`: `TICKET-{ID}` (Used for threading)
*   `timestamp`: ISO-8601

## 4. SMTP Configuration
Required Environment Variables or Properties:
*   `SPRING_MAIL_HOST`
*   `SPRING_MAIL_PORT`
*   `SPRING_MAIL_USERNAME`
*   `SPRING_MAIL_PASSWORD`
