# Database Overview

The IT4U application uses a **PostgreSQL** database for persistence.

## Connection Details
*   **Database Engine:** PostgreSQL (v14+)
*   **Database Name:** `it4u` (Prod), `it4u_dev` (Dev)
*   **Default Schema:** `public`
*   **Port:** 5432

## Connection String Format
`jdbc:postgresql://<HOST>:5432/it4u`

**Production Config:**
*   **Host:** `localhost` (Internal access only recommended)
*   **Username:** `it4u_user` (Configurable via `DB_USER`)
*   **Password:** *Managed via Environment Variable `DB_PASSWORD`*

## Schema Management
*   **Tool:** Flyway Migration
*   **Location:** `src/main/resources/db/migration`
*   **Strategy:** `validate` in PROD (Manual schema application required or careful migration), `update` allowed only in Dev.

## Key Tables
*   `users` - System users and roles.
*   `tickets` - Core ticket usage data.
*   `comments` - Threaded discussion on tickets.
*   `attachments` - File metadata (LOB storage).
