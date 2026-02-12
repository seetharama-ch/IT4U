# IT4U Server Documentation

Welcome to the IT4U Service Portal documentation. This repository contains all necessary guides for API usage, deployment, database management, and security.

## 📚 Documentation Index

### 🚀 **Runbooks (Validation & Ops)**
* [Deployment Runbook](runbooks/prod-deployment.md) - How to deploy to production.
* [Health Checks](runbooks/health-checks.md) - How to verify system health.

### 🔌 **API & Integration**
* [Swagger Usage Guide](api/swagger-guide.md) - How to use and authorize with Swagger UI.
* [Swagger Export Guide](api/swagger-export.md) - How to export the OpenAPI JSON contract.
* [Payload Samples](samples/payloads.md) - Ready-to-use JSON payloads for testing tickets, approvals, and admin actions.

### 🔄 **Process Flows**
* [Ticket Lifecycle](flows/ticket-lifecycle.md) - Complete flow diagram and permission matrix.
* [Email Notifications](flows/email-notifications.md) - Triggers, recipients, and template rules.

### 💾 **Database**
* [Database Overview](db/database-overview.md) - Connection details and architecture.
* [Schema Reference](db/schema.md) - Tables, columns, and relationships.

### 🔐 **Security**
* [Admin Access](security/admin-access.md) - Secure credential management for administrators.

---
**Note:** Do not store sensitive credentials (passwords, secrets) in this documentation. Refer to the [Admin Access](security/admin-access.md) guide for secure storage patterns.
