# System Design Document - GSC-IT4U

## 1. Architecture Overview
The GSC-IT4U backend uses a layered architecture (Controller, Service, Repository) built on Spring Boot. The Notification System (GSC-1.3) introduces an Event-Driven components to decouple core logic from notification delivery.

## 2. Notification System Architecture

### 2.1 Event-Driven Logic
The system uses Spring's `ApplicationEventPublisher` to trigger notifications.

**Event Diagram:**
```mermaid
graph LR
    A[TicketService] -->|Publishes| B(TicketCreatedEvent)
    A -->|Publishes| C(TicketApprovedByManagerEvent)
    B -->|Consumed By| D[NotificationService]
    C -->|Consumed By| D
    D -->|Sends| E[Email Server (SMTP)]
```

### 2.2 Components

#### Event Classes
*   `TicketCreatedEvent`: Contains ticket details, triggered after successful ticket persistence.
*   `TicketApprovedByManagerEvent`: Contains ticket details, triggered after manager approval transaction.

#### Notification Service (`NotificationService`)
*   **Role:** Event Listener and Email Dispatcher.
*   **Annotation:** `@Async` for non-blocking execution.
*   **Methods:**
    *   `sendOnTicketCreated(TicketCreatedEvent event)`
    *   `sendOnManagerApproved(TicketApprovedByManagerEvent event)`

#### Email Flow Sequence
1.  **User Action:** Employee triggers `POST /api/tickets`.
2.  **Core Logic:** `TicketService` saves ticket to DB.
3.  **Event Publish:** `TicketService` publishes `TicketCreatedEvent`.
4.  **Async Listener:** `NotificationService` catches event.
5.  **Template Rendering:** Service populates HTML templates with ticket data.
6.  **SMTP Send:** Service sends email via `JavaMailSender`.

## 3. Configuration
The system uses `application.yml` (or `properties`) for configuration.
*   `spring.mail.*`: Standard Spring Boot Mail properties.
*   `notifications.*`: Custom flags (enabled/disabled) and target addresses (IT Support group email).
