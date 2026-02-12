# Deployment Manual - GSC-IT4U

## 1. Prerequisites
*   Java 17+
*   PostgreSQL (optional, H2 used by default)
*   SMTP Server (Required for GSC-1.3 Notifications)

## 2. SMTP Setup
For the notification system to work, you must configure the mail server settings.

### 2.1 Environment Variables
Set the following environment variables on the server/container:

```bash
export SPRING_MAIL_HOST=smtp.gmail.com  # or your SMTP server
export SPRING_MAIL_PORT=587
export SPRING_MAIL_USERNAME=your-email@example.com
export SPRING_MAIL_PASSWORD=your-app-password
export NOTIFICATIONS_EMAIL_ENABLED=true
export NOTIFICATIONS_IT_SUPPORT_GROUP=itsupport@company.com
export NOTIFICATIONS_EMAIL_ENABLED=true
export NOTIFICATIONS_IT_SUPPORT_GROUP=itsupport@company.com
export NOTIFICATIONS_SENDER_ADDRESS=no-reply@geosoftglobal.com
export IT4U_TEST_MODE=true  # Set to true to enable qa_ prefix and safe testing
```

### 2.3 Automated Verification
To run the production verification suite (Playwright):
```bash
npx playwright test --config=playwright.prod.config.ts
```

### 2.2 Testing Email Triggers
To verify email sending without a live user flow:
1.  Ensure `spring.mail.test-connection=true` (optional debug flag)
2.  Watch logs for: `Sending email to...`
