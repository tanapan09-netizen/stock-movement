/**
 * Email Notification Service
 * Sends HTML emails using nodemailer
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    enabled: boolean;
}

/**
 * Create email transporter with SMTP configuration
 */
function createTransporter(): Transporter | null {
    try {
        // Check if email is enabled
        if (process.env.EMAIL_ENABLED === 'false') {
            console.log('[Email] Service disabled via env variable');
            return null;
        }

        // Check required env vars
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('[Email] SMTP credentials not configured');
            return null;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        return transporter;
    } catch (error) {
        console.error('[Email] Failed to create transporter:', error);
        return null;
    }
}

/**
 * Send an email notification
 */
export async function sendEmail(
    to: string | string[],
    subject: string,
    html: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const transporter = createTransporter();

        if (!transporter) {
            return { success: false, error: 'Email service not configured' };
        }

        const recipients = Array.isArray(to) ? to.join(',') : to;
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

        const info = await transporter.sendMail({
            from: `"ระบบแจ้งซ่อม" <${fromAddress}>`,
            to: recipients,
            subject: subject,
            html: html,
        });

        console.log('[Email] Message sent:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('[Email] Failed to send:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Generate HTML email for new part request
 */
export function generatePartRequestEmail(request: {
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
}): string {
    const priorityColor = {
        normal: '#3b82f6',
        urgent: '#f59e0b',
        critical: '#ef4444',
    }[request.priority] || '#6b7280';

    const priorityLabel = {
        normal: 'ปกติ',
        urgent: 'เร่งด่วน',
        critical: 'วิกฤต',
    }[request.priority] || request.priority;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>คำขออะไหล่ใหม่</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                🔔 คำขออะไหล่ใหม่
                            </h1>
                            <p style="margin: 5px 0 0 0; color: #dbeafe; font-size: 14px;">
                                ระบบแจ้งซ่อมและบำรุงรักษา
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                                มีคำขอซื้ออะไหล่ใหม่ที่ต้องการการอนุมัติ
                            </p>
                            
                            <!-- Request Details -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; width: 40%;">
                                        รายการ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px;">
                                        ${request.item_name}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        จำนวน
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.quantity} ชิ้น
                                    </td>
                                </tr>
                                ${request.description ? `
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        รายละเอียด
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.description}
                                    </td>
                                </tr>
                                ` : ''}
                                <tr ${request.description ? '' : 'style="background-color: #f9fafb;"'}>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ความเร่งด่วน
                                    </td>
                                    <td style="padding: 12px 16px; border-top: 1px solid #e5e7eb;">
                                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${priorityColor}; color: #ffffff; font-size: 12px; font-weight: 600;">
                                            ${priorityLabel}
                                        </span>
                                    </td>
                                </tr>
                                ${request.estimated_price ? `
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ราคาประมาณ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.estimated_price.toLocaleString()} บาท
                                    </td>
                                </tr>
                                ` : ''}
                                ${request.supplier ? `
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ผู้จำหน่าย
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.supplier}
                                    </td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ผู้ขอ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.requested_by}${request.department ? ` (${request.department})` : ''}
                                    </td>
                                </tr>
                                ${request.date_needed ? `
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ต้องการภายใน
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${new Date(request.date_needed).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                            
                            ${request.quotation_link ? `
                            <div style="margin-top: 20px; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                                <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: 600; font-size: 14px;">📎 ใบเสนอราคา</p>
                                <a href="${request.quotation_link}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
                                    ดูใบเสนอราคา →
                                </a>
                            </div>
                            ` : ''}
                            
                            <!-- Action Button -->
                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance/part-requests" 
                                   style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                    ดูรายละเอียดและอนุมัติ
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                อีเมลนี้ส่งโดยอัตโนมัติจากระบบแจ้งซ่อมและบำรุงรักษา<br>
                                กรุณาอย่าตอบกลับอีเมลนี้
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Generate HTML email for status change
 */
export function generateStatusChangeEmail(
    request: {
        item_name: string;
        requested_by: string;
    },
    oldStatus: string,
    newStatus: string
): string {
    const statusLabels: Record<string, string> = {
        pending: 'รออนุมัติ',
        approved: 'อนุมัติแล้ว',
        ordered: 'สั่งซื้อแล้ว',
        received: 'ได้รับแล้ว',
        rejected: 'ปฏิเสธ',
    };

    const statusColors: Record<string, string> = {
        pending: '#f59e0b',
        approved: '#10b981',
        ordered: '#3b82f6',
        received: '#059669',
        rejected: '#ef4444',
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>อัปเดตสถานะคำขออะไหล่</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                🔄 อัปเดตสถานะคำขออะไหล่
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                                สถานะของคำขอได้รับการอัปเดต
                            </p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px;">
                                        รายการ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px;">
                                        ${request.item_name}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ผู้ขอ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.requested_by}
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 6px;">
                                <div style="margin-bottom: 10px;">
                                    <span style="display: inline-block; padding: 8px 16px; border-radius: 12px; background-color: ${statusColors[oldStatus] || '#6b7280'}; color: #ffffff; font-size: 14px; font-weight: 600;">
                                        ${statusLabels[oldStatus] || oldStatus}
                                    </span>
                                </div>
                                <div style="margin: 10px 0; color: #6b7280; font-size: 20px;">↓</div>
                                <div style="margin-top: 10px;">
                                    <span style="display: inline-block; padding: 8px 16px; border-radius: 12px; background-color: ${statusColors[newStatus] || '#6b7280'}; color: #ffffff; font-size: 14px; font-weight: 600;">
                                        ${statusLabels[newStatus] || newStatus}
                                    </span>
                                </div>
                            </div>
                            
                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance/part-requests" 
                                   style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                    ดูรายละเอียด
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                อีเมลนี้ส่งโดยอัตโนมัติจากระบบแจ้งซ่อมและบำรุงรักษา
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
