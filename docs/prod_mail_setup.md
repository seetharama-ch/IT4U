# Production Email Setup Guide

## Purpose
Enable email notifications for IT4U ticket lifecycle events in production environment.

## Prerequisites

1. **Office 365 Mailbox**
   - Dedicated mailbox: `it4u-notify@geosoftglobal.com`
   - SMTP AUTH enabled for the mailbox

2. **App Password** (CRITICAL)
   - **DO NOT use normal account password**
   - Generate Office 365 App Password:
     1. Login to Office 365
     2. Go to Security Settings → App Passwords
     3. Create new app password for "IT4U Notifications"
     4. Copy the generated password (one-time display)

3. **Network Requirements**
   - Outbound TCP port 587 allowed
   - DNS resolution for `smtp.office365.com`

---

## Environment Variables (MANDATORY)

Set these before starting the backend:

### Windows (PowerShell)
```powershell
$env:MAIL_PASSWORD="your-app-password-here"
```

### Linux/Mac (Bash)
```bash
export MAIL_PASSWORD="your-app-password-here"
```

### Docker/Kubernetes
```yaml
env:
  - name: MAIL_PASSWORD
    value From:
      secretKeyRef:
        name: it4u-mail-secret
        key: password
```

---

## Configuration Reference

`backend/src/main/resources/application-prod.properties` already contains:

```properties
# Email Service Enable Flag
it4u.mail.enabled=true

# SMTP Configuration (Microsoft 365)
spring.mail.host=smtp.office365.com
spring.mail.port=587
spring.mail.username=it4u-notify@geosoftglobal.com
spring.mail.password=${MAIL_PASSWORD}

# SMTP Authentication & Security
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true

# Timeouts (Production Safety)
spring.mail.properties.mail.smtp.connectiontimeout=10000
spring.mail.properties.mail.smtp.timeout=10000
spring.mail.properties.mail.smtp.writetimeout=10000

# Sender Address
notifications.sender-address=it4u-notify@geosoftglobal.com
```

**⚠️ CRITICAL**: `${MAIL_PASSWORD}` must be provided via environment variable. Never hardcode passwords in properties files.

---

## Validation Steps

### 1. Set Environment Variable
```powershell
$env:MAIL_PASSWORD="xxxxxxxxxxxxxxxx"
```

### 2. Start Backend
```bash
cd backend
java -jar target/it4u-1.4.1.jar --spring.profiles.active=prod --server.port=8060
```

### 3. Verify Startup Logs
Look for these log entries:
```
═══════════════════════════════════════════════════════════
  MAIL SERVICE CONFIGURATION STATUS
═══════════════════════════════════════════════════════════
  Mail Enabled:    true
  SMTP Host:       smtp.office365.com
  SMTP Username:   it4u-notify@geosoftglobal.com
  Sender Address:  it4u-notify@geosoftglobal.com
═══════════════════════════════════════════════════════════
✅ Mail service is ENABLED. Email notifications will be sent for ticket events.

NotificationService initialized with Mail Service ENABLED.
```

**❌ If you see**:
```
⚠️  WARNING: Mail service is DISABLED!
```
Then `it4u.mail.enabled` is not set to `true` in `application-prod.properties`.

### 4. Create Test Ticket
- Login as Employee
- Create a new ticket
- Assign to a manager

### 5. Verify Email Audit (Database)
Connect to PostgreSQL and run:
```sql
SELECT id, ticket_id, event_type, status, error_message, sent_at
FROM email_audit
ORDER BY sent_at DESC
LIMIT 10;
```

**Expected Results**:

#### ✅ Success (SMTP Configured Correctly)
```
id  | ticket_id | event_type                     | status  | error_message | sent_at
----|-----------|--------------------------------|---------|---------------|-------------------
123 | 65        | MANAGER_APPROVAL_REQUESTED     | SENT    | NULL          | 2025-12-26 19:30:00
```

#### ⚠️ SMTP Authentication Failure (Wrong Password)
```
id  | ticket_id | event_type                     | status  | error_message                       | sent_at
----|-----------|--------------------------------|---------|-------------------------------------|-------------------
123 | 65        | MANAGER_APPROVAL_REQUESTED     | FAILED  | 535 5.7.3 Authentication unsuccessful| 2025-12-26 19:30:00
```

#### ❌ No Rows (Mail Service Not Enabled)
```
(0 rows)
```
→ Check `it4u.mail.enabled=true` and restart backend.

### 6. Check Email Delivery
If `status = SENT` in database:
- Check employee inbox for "Ticket Created" email
- Check manager inbox for "Manager Approval Requested" email
- Check CC recipients (IT Support, Admin) inboxes

**If audit shows SENT but no email received**:
- Check spam/junk folders
- Verify Office 365 mail flow rules
- Check backend logs for SMTP response codes

---

## Troubleshooting

### Issue: No Email Audit Records Created

**Symptoms**:
```sql
SELECT COUNT(*) FROM email_audit; -- Returns 0
```

**Causes**:
1. `it4u.mail.enabled=false` → Check `application-prod.properties`
2. Mail service bean not initialized → Check startup logs
3. Event listeners not firing → Check for transaction errors

**Fix**:
```properties
# Ensure this is set in application-prod.properties
it4u.mail.enabled=true
```

### Issue: Email Audits with status="FAILED"

**Symptoms**:
```sql
SELECT error_message FROM email_audit WHERE status = 'FAILED';
```

**Common Errors**:

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `535 5.7.3 Authentication unsuccessful` | Wrong password | Generate new app password |
| `Connection timed out` | Firewall blocking port 587 | Allow outbound TCP 587 |
| `Could not connect to SMTP host` | DNS issue | Verify `smtp.office365.com` resolves |
| `530 5.7.57 Client not authenticated` | App password not generated | Create app password in Office 365 |

**Fix**:
1. Verify `$env:MAIL_PASSWORD` is set correctly
2. Restart backend
3. Create new test ticket
4. Verify `status = SENT` in `email_audit` table

### Issue: Emails Delayed or Not Received

**Symptoms**:
- `email_audit.status = SENT`
- No email in inbox (even after 10 minutes)

**Causes**:
- Office 365 mail flow rules blocking
- Tenant restrictions
- SPF/DKIM issues

**Fix**:
- Check Office 365 Message Trace
- Verify sender domain SPF record
- Contact Office 365 admin

---

## Event Types and Email Triggers

| Event Type | Trigger | TO Recipients | CC Recipients |
|------------|---------|---------------|---------------|
| `MANAGER_APPROVAL_REQUESTED` | Ticket created (needs approval) | Manager | Employee, IT Support, Admin |
| `TICKET_CREATED` | Ticket created (direct to support) | IT Support | Employee, Admin |
| `MANAGER_APPROVED` | Manager approves ticket | Employee, IT Support | Manager, Admin |
| `MANAGER_REJECTED` | Manager rejects ticket | Employee | Manager, Admin |
| `ADMIN_STATUS_CHANGED` | Status updated (In Progress, Resolved) | Employee | IT Support, Admin |

---

## Production Checklist

Before going live:

- [ ] Office 365 app password generated
- [ ] `MAIL_PASSWORD` environment variable set
- [ ] Backend started with `--spring.profiles.active=prod`
- [ ] Startup logs show "Mail service is ENABLED"
- [ ] Test ticket created
- [ ] Email audit record exists with `status = SENT`
- [ ] Email received in inbox
- [ ] All email event types tested (create, approve, reject, resolve)

---

## Security Notes

1. **Never commit passwords to Git**
   - Use `.env` files (add to `.gitignore`)
   - Use secrets management (Azure Key Vault, AWS Secrets Manager)

2. **App Password vs Account Password**
   - Always use app passwords for SMTP
   - App passwords can be revoked without affecting account access

3. **Firewall Rules**
   - Only allow outbound connections
   - Restrict to `smtp.office365.com:587`

---

## Contact

For issues with email setup, contact:
- **IT Operations**: ops@geosoftglobal.com
- **Office 365 Admin**: admin@geosoftglobal.com

---

**Last Updated**: 2025-12-26  
**Created by**: Seetharama  
**Team**: IT4U Development Team
