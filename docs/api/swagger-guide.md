# Swagger Usage Guide

The IT4U Backend provides interactive API documentation via Swagger UI. This allows developers and testers to explore endpoints and execute requests directly from the browser.

## 📍 Access
* **Swagger UI:** [http://localhost:8060/swagger-ui.html](http://localhost:8060/swagger-ui.html) (or port 8061 depending on config)
* **OpenAPI Spec (JSON):** [http://localhost:8060/v3/api-docs](http://localhost:8060/v3/api-docs)

## 🔐 Authorization
The API uses **Cookie-based Authentication** (`JSESSIONID`).

### How to Authorize in Swagger UI
1.  **Login** to the application (via the Frontend at `http://localhost:9092` or via `POST /api/auth/login`).
2.  Open your browser's Developer Tools (F12) -> **Application** -> **Cookies**.
3.  Copy the value of the `JSESSIONID` cookie.
4.  In Swagger UI, click the **Authorize** button (top right).
5.  Paste the `JSESSIONID` value into the `cookieAuth` field.
6.  Click **Authorize** and then **Close**.

Now all "Try it out" requests will send this session cookie.

## 🧪 Common "Try it out" Scenarios

### 1. Create a Ticket
*   **Endpoint:** `POST /api/tickets`
*   **Role Required:** Any (Employee)
*   **Sample Payload:** see [Payload Samples](../samples/payloads.md)

### 2. Admin Actions (Issue-11)
*   **Endpoint:** `PATCH /api/tickets/{id}/admin-actions`
*   **Role Required:** `ADMIN` or `IT_SUPPORT`
*   **Use Case:** Transition status (e.g., to `IN_PROGRESS`) or assign ticket.

### 3. Upload Attachment
*   **Endpoint:** `POST /api/tickets/{id}/attachments`
*   **Content-Type:** `multipart/form-data`
*   **File:** Select a file (< 2MB)
