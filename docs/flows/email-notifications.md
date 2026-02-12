# Email Notification Flows

IT4U sends automated email notifications for key ticket lifecycle events.
**Sender Address:** `it4u-notify@geosoftglobal.com`

## Logic & Triggers

| Event Trigger | Recipient(s) | Template / Content |
| :--- | :--- | :--- |
| **Ticket Created** | **To:** Manager of Requester<br>**CC:** Requester | "New Ticket Approval Required - #{id}"<br>Includes link to Approve/Reject. |
| **Manager Approved** | **To:** IT Support Group (`itsupport@...`)<br>**CC:** Requester, Manager | "Ticket #{id} Approved - Ready for IT"<br>Signals IT to pick up the ticket. |
| **Manager Rejected** | **To:** Requester<br>**CC:** Manager | "Ticket #{id} Rejected"<br>Includes rejection reason. |
| **Assigned to IT** | **To:** Assigned IT User | "You have been assigned Ticket #{id}" |
| **Status Change**<br>(In Progress / Resolved) | **To:** Requester<br>**CC:** Manager | "Ticket #{id} Status Update: [NewStatus]" |
| **Ticket Closed** | **To:** Requester<br>**CC:** Manager | "Ticket #{id} Closed" |

## Configuration Keys
(Defined in `application.properties`)

*   `it4u.mail.enabled`: Master switch (true/false)
*   `notifications.it-support-group`: Distribution list for approved tickets.
*   `notifications.admin-group`: Fallback or Admin notification list.

## Troubleshooting
*   **Logs:** Check backend logs for `JavaMailSender` errors.
*   **Retries:** Application currently does **not** implement persistent retry queues; failed emails are logged as errors.
