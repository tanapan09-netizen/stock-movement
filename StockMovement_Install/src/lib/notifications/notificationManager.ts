/**
 * Notification Manager
 * Centralized service to send notifications via multiple channels (LINE, Email)
 */

import { sendMulticastMessage, createPartRequestFlexMessage, createStatusChangeFlexMessage } from './lineMessaging';
import { sendEmail, generatePartRequestEmail, generateStatusChangeEmail } from './emailService';

export interface PartRequestData {
    request_id: number;
    item_name: string;
    quantity: number;
    description?: string | null;
    priority: string;
    estimated_price?: number | null;
    requested_by: string;
    department?: string | null;
    supplier?: string | null;
    date_needed?: Date | null;
    quotation_link?: string | null;
    quotation_file?: string | null;
}

/**
 * Send notifications for a new part request
 */
export async function notifyNewPartRequest(request: PartRequestData): Promise<void> {
    console.log('[Notification] Sending notifications for new part request:', request.request_id);

    const results = await Promise.allSettled([
        // LINE Messaging API
        (async () => {
            if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
                const { getApproverLineIds } = await import('@/actions/lineUserActions');
                const lineIds = await getApproverLineIds();

                if (lineIds.length > 0) {
                    const flexMessage = createPartRequestFlexMessage(request);
                    const result = await sendMulticastMessage(lineIds, flexMessage);
                    if (result.success) {
                        console.log('[Notification] LINE messages sent to', lineIds.length, 'users');
                    } else {
                        console.warn('[Notification] LINE messaging failed:', result.error);
                    }
                } else {
                    console.log('[Notification] No LINE approvers configured');
                }
            }
        })(),

        // Email
        (async () => {
            const recipients = getApproverEmails();
            if (recipients.length > 0 && process.env.EMAIL_ENABLED !== 'false') {
                const html = generatePartRequestEmail(request);
                const subject = `🔔 คำขออะไหล่ใหม่: ${request.item_name}`;
                const result = await sendEmail(recipients, subject, html);
                if (result.success) {
                    console.log('[Notification] Email notification sent successfully');
                } else {
                    console.warn('[Notification] Email notification failed:', result.error);
                }
            }
        })(),
    ]);

    // Log any errors but don't throw
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`[Notification] Channel ${index} failed:`, result.reason);
        }
    });
}

/**
 * Send notifications for status change
 */
export async function notifyStatusChange(
    request: { item_name: string; requested_by: string },
    oldStatus: string,
    newStatus: string
): Promise<void> {
    console.log('[Notification] Sending status change notifications:', oldStatus, '->', newStatus);

    const results = await Promise.allSettled([
        // LINE Messaging API
        (async () => {
            if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
                const { getApproverLineIds } = await import('@/actions/lineUserActions');
                const lineIds = await getApproverLineIds();

                if (lineIds.length > 0) {
                    const flexMessage = createStatusChangeFlexMessage(request, oldStatus, newStatus);
                    const result = await sendMulticastMessage(lineIds, flexMessage);
                    if (result.success) {
                        console.log('[Notification] LINE status change sent to', lineIds.length, 'users');
                    } else {
                        console.warn('[Notification] LINE status change failed:', result.error);
                    }
                } else {
                    console.log('[Notification] No LINE approvers configured');
                }
            }
        })(),

        // Email
        (async () => {
            const recipients = getApproverEmails();
            if (recipients.length > 0 && process.env.EMAIL_ENABLED !== 'false') {
                const html = generateStatusChangeEmail(request, oldStatus, newStatus);
                const subject = `🔄 อัปเดตสถานะ: ${request.item_name}`;
                const result = await sendEmail(recipients, subject, html);
                if (result.success) {
                    console.log('[Notification] Email status change sent successfully');
                } else {
                    console.warn('[Notification] Email status change failed:', result.error);
                }
            }
        })(),
    ]);

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`[Notification] Status change channel ${index} failed:`, result.reason);
        }
    });
}

/**
 * Get approver email addresses from environment variable
 */
function getApproverEmails(): string[] {
    const emails = process.env.APPROVER_EMAILS || '';
    return emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
}

/**
 * Send a test notification to verify configuration
 */
export async function sendTestNotification(): Promise<{
    line: { success: boolean; error?: string };
    email: { success: boolean; error?: string };
}> {
    const { getApproverLineIds } = await import('@/actions/lineUserActions');
    const lineIds = await getApproverLineIds();

    const testLineMessage = {
        type: 'text' as const,
        text: `🧪 ทดสอบการแจ้งเตือน\n\nระบบแจ้งเตือน LINE Messaging API ทำงานปกติ\n\n${new Date().toLocaleString('th-TH')}`
    };

    const testEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #2563eb; margin: 0 0 20px 0;">🧪 ทดสอบการแจ้งเตือน</h1>
        <p style="color: #374151; font-size: 16px;">ระบบแจ้งเตือนอีเมลทำงานปกติ</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">${new Date().toLocaleString('th-TH')}</p>
    </div>
</body>
</html>
    `;

    const [lineResult, emailResult] = await Promise.allSettled([
        lineIds.length > 0
            ? sendMulticastMessage(lineIds, testLineMessage)
            : Promise.resolve({ success: false, error: 'No LINE users' }),
        sendEmail(getApproverEmails(), '🧪 ทดสอบการแจ้งเตือน', testEmailHtml),
    ]);

    return {
        line: lineResult.status === 'fulfilled' ? lineResult.value : { success: false, error: 'Promise rejected' },
        email: emailResult.status === 'fulfilled' ? emailResult.value : { success: false, error: 'Promise rejected' },
    };
}
