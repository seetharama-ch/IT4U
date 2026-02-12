# Integration Report

## ✅ Matched endpoints

| Method | Path | Frontend Context |
|---|---|---|

## ❌ Frontend calls missing in backend (Potential 404s)

| Method | Path | Location |
|---|---|---|
| GET | `/users/managers` | `D:\Workspace\gsg-IT4U\frontend\src\components\CreateTicket.jsx:46` |
| POST | `/tickets` | `D:\Workspace\gsg-IT4U\frontend\src\components\CreateTicket.jsx:185` |
| POST | `/tickets/${ticketId}/attachments` | `D:\Workspace\gsg-IT4U\frontend\src\components\CreateTicket.jsx:192` |
| GET | `/admin/logs` | `D:\Workspace\gsg-IT4U\frontend\src\components\DiagnosticsPanel.jsx:17` |
| GET | `/admin/email-audit` | `D:\Workspace\gsg-IT4U\frontend\src\components\EmailAuditDashboard.jsx:40` |
| GET | `/kb` | `D:\Workspace\gsg-IT4U\frontend\src\components\KnowledgeBase.jsx:21` |
| POST | `/kb` | `D:\Workspace\gsg-IT4U\frontend\src\components\KnowledgeBase.jsx:31` |
| DELETE | `/kb/${id}` | `D:\Workspace\gsg-IT4U\frontend\src\components\KnowledgeBase.jsx:46` |
| POST | `/auth/login` | `D:\Workspace\gsg-IT4U\frontend\src\components\Login.jsx:46` |
| GET | `/tickets/${id}` | `D:\Workspace\gsg-IT4U\frontend\src\components\TicketDetails.jsx:51` |
| GET | `/users` | `D:\Workspace\gsg-IT4U\frontend\src\components\TicketDetails.jsx:62` |
| POST | `/tickets/${id}/attachments` | `D:\Workspace\gsg-IT4U\frontend\src\components\TicketDetails.jsx:107` |
| POST | `/tickets/${id}/comments` | `D:\Workspace\gsg-IT4U\frontend\src\components\TicketDetails.jsx:125` |
| GET | `/users/template` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserImportModal.jsx:20` |
| POST | `/users/upload` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserImportModal.jsx:50` |
| GET | `/users` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:47` |
| POST | `/users/${selectedUser.id}/reset-password` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:84` |
| DELETE | `/users/${selectedUser.id}` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:97` |
| PUT | `/admin/users/${selectedUser.id}/role` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:151` |
| PUT | `/users/${selectedUser.id}` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:155` |
| POST | `/users` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:158` |
| POST | `/users/upload` | `D:\Workspace\gsg-IT4U\frontend\src\components\UserList.jsx:196` |
| GET | `/auth/me` | `D:\Workspace\gsg-IT4U\frontend\src\context\AuthContext.jsx:14` |
| GET | `/tickets` | `D:\Workspace\gsg-IT4U\frontend\src\api.js:15` |
| POST | `/tickets` | `D:\Workspace\gsg-IT4U\frontend\src\api.js:26` |

## ❌ Backend endpoints unused by frontend

| Method | Path | Source |
|---|---|---|
| GET | `/api/admin/reports/tickets` | Static |
| GET | `/api/admin/reports/tickets/export` | Static |
| GET | `/api/admin/reports/tickets/export/csv` | Static |
| GET | `/api/admin/test-email` | Static |
| PUT | `/api/admin/users/{id}/role` | Static |
| POST | `/api/auth/login` | Static |
| GET | `/api/auth/me` | Static |
| POST | `/api/health-logs/check/{serviceNodeId}` | Static |
| GET | `/api/health-logs/node/{serviceNodeId}` | Static |
| GET | `/api/health-logs/node/{serviceNodeId}/critical-count` | Static |
| GET | `/api/health-logs/node/{serviceNodeId}/recent` | Static |
| GET | `/api/health-logs/stats/summary` | Static |
| DELETE | `/api/kb/{id}` | Static |
| GET | `/api/service-nodes/{id}` | Static |
| PUT | `/api/service-nodes/{id}` | Static |
| DELETE | `/api/service-nodes/{id}` | Static |
| POST | `/api/service-nodes/{id}/health-check` | Static |
| POST | `/api/service-nodes/bulk-health-check` | Static |
| GET | `/api/service-nodes/environment/{environment}` | Static |
| GET | `/api/service-nodes/health/{healthStatus}` | Static |
| GET | `/api/service-nodes/node/{nodeId}` | Static |
| GET | `/api/service-nodes/owner/{owner}` | Static |
| GET | `/api/service-nodes/stats` | Static |
| GET | `/api/service-nodes/stats/by-environment` | Static |
| GET | `/api/service-nodes/stats/by-type` | Static |
| GET | `/api/service-nodes/status/{status}` | Static |
| GET | `/api/service-nodes/team/{team}` | Static |
| GET | `/api/service-nodes/type/{nodeType}` | Static |
| GET | `/api/tickets/{id}` | Static |
| POST | `/api/tickets/{id}/attachments` | Static |
| POST | `/api/tickets/{id}/comments` | Static |
| GET | `/api/tickets/approvals` | Static |
| GET | `/api/tickets/attachments/{filename:.+}` | Static |
| GET | `/api/tickets/my` | Static |
| DELETE | `/api/users/{id}` | Static |
| PUT | `/api/users/{id}` | Static |
| POST | `/api/users/{id}/reset-password` | Static |
| GET | `/api/users/managers` | Static |
| GET | `/api/users/template` | Static |
| POST | `/api/users/upload` | Static |

## 🔐 Auth/Route Issues

- Check these potential issues manually:
  - Frontend calls to `/api/auth/me` should handle 401 gracefully.
  - Routes should generally follow `/app/**` structure.
