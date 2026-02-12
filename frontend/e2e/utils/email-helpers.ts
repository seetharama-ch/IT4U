import { APIRequestContext, expect } from '@playwright/test';

export async function getLatestEmail(request: APIRequestContext, to: string, subjectIncludes: string) {
    // Retry logic to wait for email
    for (let i = 0; i < 20; i++) {
        // Fetch audit logs sorted by sentAt DESC
        const response = await request.get('/api/admin/email-audit', {
            params: {
                page: 0,
                size: 20,
                sort: 'sentAt,desc'
            }
        });

        if (response.ok()) {
            const data = await response.json();
            // Spring Page<T> response has 'content' array
            const emails = data.content || [];

            const matchedEmail = emails.find((email: any) =>
                email.recipient === to &&
                email.subject.includes(subjectIncludes) &&
                email.status === 'SENT'
            );

            if (matchedEmail) {
                return matchedEmail;
            }
        } else {
            console.log(`Warning: Email audit fetch failed with status ${response.status()}`);
        }

        await new Promise(res => setTimeout(res, 1000)); // Wait 1s
    }

    throw new Error(`Email to ${to} with subject "${subjectIncludes}" not found in Email Audit Log.`);
}

