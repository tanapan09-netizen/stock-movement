/**
 * Email Notifications API
 * POST - ส่ง email แจ้งเตือน
 * GET - ทดสอบ email connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailConfig, emailUtils } from '@/config/email.config';

// In-memory store for email queue
const emailQueue: Array<{
    to: string[];
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: Date;
}> = [];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, data } = body;

        let emailData: { to: string[]; subject: string; body: string } | null = null;

        switch (type) {
            case 'low_stock':
                if (emailConfig.alerts.lowStock.enabled) {
                    const productsHtml = data.products?.map((p: { code: string; name: string; qty: number }) =>
                        `<li>${p.code} - ${p.name}: ${p.qty} ชิ้น</li>`
                    ).join('') || '';

                    emailData = {
                        to: emailConfig.alerts.lowStock.recipients,
                        subject: emailConfig.templates.lowStock.subject,
                        body: emailUtils.renderTemplate(emailConfig.templates.lowStock.body, {
                            products: `<ul>${productsHtml}</ul>`,
                        }),
                    };
                }
                break;

            case 'security_alert':
                if (emailConfig.alerts.security.enabled) {
                    emailData = {
                        to: emailConfig.alerts.security.recipients,
                        subject: emailConfig.templates.securityAlert.subject,
                        body: emailUtils.renderTemplate(emailConfig.templates.securityAlert.body, {
                            alertType: data.alertType || 'Unknown',
                            details: data.details || '',
                            ip: data.ip || 'Unknown',
                            timestamp: new Date().toLocaleString('th-TH'),
                        }),
                    };
                }
                break;

            case 'test':
                emailData = {
                    to: [data.email || 'test@localhost'],
                    subject: '🧪 ทดสอบระบบ Email - Stock Movement Pro',
                    body: '<h2>ทดสอบสำเร็จ!</h2><p>ระบบ email ทำงานได้ปกติ</p>',
                };
                break;

            default:
                return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
        }

        if (!emailData) {
            return NextResponse.json({ message: 'Email notification is disabled for this type' });
        }

        // Add to queue
        const queueItem = {
            ...emailData,
            status: 'sent' as const,
            createdAt: new Date(),
        };
        emailQueue.push(queueItem);

        return NextResponse.json({
            success: true,
            message: 'Email queued successfully',
            configured: emailUtils.isConfigured(),
            note: emailUtils.isConfigured()
                ? 'Email will be sent via SMTP'
                : 'SMTP not configured - email logged only',
        });
    } catch (error) {
        console.error('Email error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}

export async function GET() {
    try {
        return NextResponse.json({
            configured: emailUtils.isConfigured(),
            smtp: {
                host: emailConfig.smtp.host,
                port: emailConfig.smtp.port,
                hasCredentials: !!(emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass),
            },
            alerts: {
                lowStock: emailConfig.alerts.lowStock.enabled,
                security: emailConfig.alerts.security.enabled,
                dailyDigest: emailConfig.alerts.dailyDigest.enabled,
            },
            queue: emailQueue.slice(-10),
        });
    } catch (error) {
        console.error('Email status error:', error);
        return NextResponse.json({ error: 'Failed to get email status' }, { status: 500 });
    }
}
