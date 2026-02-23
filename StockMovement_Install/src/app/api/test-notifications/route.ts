/**
 * Test Notification API Route
 * Use this endpoint to test LINE Notify and Email configuration
 * 
 * GET /api/test-notifications
 */

import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/notifications/notificationManager';

export async function GET() {
    try {
        console.log('[Test Notifications] Starting notification test...');

        const results = await sendTestNotification();

        return NextResponse.json({
            success: true,
            message: 'Notification test completed',
            results: {
                line: {
                    enabled: !!process.env.LINE_NOTIFY_TOKEN,
                    status: results.line.success ? 'SUCCESS' : 'FAILED',
                    error: results.line.error,
                },
                email: {
                    enabled: !!process.env.SMTP_HOST && !!process.env.SMTP_USER,
                    recipients: process.env.APPROVER_EMAILS ? process.env.APPROVER_EMAILS.split(',').length : 0,
                    status: results.email.success ? 'SUCCESS' : 'FAILED',
                    error: results.email.error,
                },
            },
            configuration: {
                lineNotifyToken: process.env.LINE_NOTIFY_TOKEN ? '***configured***' : 'NOT_SET',
                smtpHost: process.env.SMTP_HOST || 'NOT_SET',
                smtpUser: process.env.SMTP_USER || 'NOT_SET',
                approverEmails: process.env.APPROVER_EMAILS || 'NOT_SET',
            },
        }, { status: 200 });
    } catch (error) {
        console.error('[Test Notifications] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
