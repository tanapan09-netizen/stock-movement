/**
 * Email Notification Service
 * Sends HTML emails using nodemailer
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getPrimaryMaintenanceImageUrl } from '@/lib/maintenance-images';

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

/**
 * Generate HTML email for New Maintenance Request
 */
export function generateMaintenanceRequestEmail(request: {
    request_number: string;
    title: string;
    description?: string | null;
    priority: string;
    room_code: string;
    room_name: string;
    reported_by: string;
    created_at: Date;
    image_url?: string | null;
}): string {
    const priorityColor = {
        normal: '#3b82f6',
        high: '#f59e0b',
        urgent: '#ef4444',
    }[request.priority] || '#6b7280';

    const priorityLabel = {
        normal: 'ปกติ',
        high: 'สูง',
        urgent: 'เร่งด่วน',
    }[request.priority] || request.priority;
    const primaryImageUrl = getPrimaryMaintenanceImageUrl(request.image_url);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>รายการแจ้งซ่อมใหม่</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                🛠️ รายการแจ้งซ่อมใหม่
                            </h1>
                            <p style="margin: 5px 0 0 0; color: #fecaca; font-size: 14px;">
                                ${request.request_number}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                                มีการแจ้งซ่อมเข้ามาใหม่ รายละเอียดดังนี้:
                            </p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; width: 30%;">
                                        สถานที่
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px;">
                                        ${request.room_code} - ${request.room_name}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ปัญหา/หัวข้อ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.title}
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
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ความเร่งด่วน
                                    </td>
                                    <td style="padding: 12px 16px; border-top: 1px solid #e5e7eb;">
                                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${priorityColor}; color: #ffffff; font-size: 12px; font-weight: 600;">
                                            ${priorityLabel}
                                        </span>
                                    </td>
                                </tr>
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ผู้แจ้ง
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.reported_by} <span style="color: #9ca3af; font-size: 12px;">(${new Date(request.created_at).toLocaleString('th-TH')})</span>
                                    </td>
                                </tr>
                            </table>
                            
                            ${false && request.image_url ? `
                            <div style="margin-top: 20px;">
                                <p style="margin: 0 0 8px 0; color: #6b7280; font-weight: 600; font-size: 14px;">รูปภาพประกอบ:</p>
                                <img src="${request.image_url}" alt="รูปภาพปัญหา" style="max-width: 100%; border-radius: 6px; border: 1px solid #e5e7eb;">
                            </div>
                            ` : ''}
                            ${primaryImageUrl ? `
                            <div style="margin-top: 20px;">
                                <p style="margin: 0 0 8px 0; color: #6b7280; font-weight: 600; font-size: 14px;">รูปภาพประกอบ:</p>
                                <img src="${primaryImageUrl}" alt="รูปภาพปัญหา" style="max-width: 100%; border-radius: 6px; border: 1px solid #e5e7eb;">
                            </div>
                            ` : ''}
                            
                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance" 
                                   style="display: inline-block; padding: 12px 32px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                    จัดการใบแจ้งซ่อม
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

/**
 * Generate HTML email for Job Assignment (To Technician)
 */
export function generateJobAssignmentEmail(request: {
    request_number: string;
    title: string;
    description?: string | null;
    priority: string;
    room_code: string;
    room_name: string;
    reported_by: string;
    assigned_by?: string;
}): string {
    const priorityColor = {
        normal: '#3b82f6',
        high: '#f59e0b',
        urgent: '#ef4444',
    }[request.priority] || '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ได้รับมอบหมายงานซ่อมใหม่</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                👷 ได้รับมอบหมายงานใหม่
                            </h1>
                            <p style="margin: 5px 0 0 0; color: #d1fae5; font-size: 14px;">
                                ${request.request_number}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                                คุณได้รับมอบหมายให้ดำเนินการงานซ่อมดังนี้:
                            </p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; width: 30%;">
                                        สถานที่
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px;">
                                        ${request.room_code} - ${request.room_name}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ปัญหา
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.title}
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
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ความเร่งด่วน
                                    </td>
                                    <td style="padding: 12px 16px; border-top: 1px solid #e5e7eb;">
                                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${priorityColor}; color: #ffffff; font-size: 12px; font-weight: 600;">
                                            ${request.priority}
                                        </span>
                                    </td>
                                </tr>
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ผู้แจ้ง
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.reported_by}
                                    </td>
                                </tr>
                            </table>

                             <div style="margin-top: 30px; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance" 
                                   style="display: inline-block; padding: 12px 32px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                    ดูงานของฉัน
                                </a>
                            </div>
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
 * Generate HTML email for Maintenance Status Update
 */
export function generateMaintenanceStatusChangeEmail(request: {
    request_number: string;
    title: string;
    room_code: string;
    room_name: string;
}, oldStatus: string, newStatus: string, notes?: string): string {
    const statusLabels: Record<string, string> = {
        pending: 'รอดำเนินการ',
        in_progress: 'กำลังซ่อม',
        completed: 'ซ่อมเสร็จสิ้น',
        cancelled: 'ยกเลิก',
    };

    const statusColors: Record<string, string> = {
        pending: '#f59e0b',
        in_progress: '#3b82f6',
        completed: '#10b981',
        cancelled: '#ef4444',
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>อัปเดตสถานะงานซ่อม</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                📢 อัปเดตสถานะงานซ่อม
                            </h1>
                            <p style="margin: 5px 0 0 0; color: #ddd6fe; font-size: 14px;">
                                ${request.request_number}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                                สถานะงานซ่อมของคุณมีการเปลี่ยนแปลง
                            </p>
                            
                             <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
                                <tr style="background-color: #f9fafb;">
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; width: 30%;">
                                        สถานที่
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px;">
                                        ${request.room_code} - ${request.room_name}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-weight: 600; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        หัวข้อ
                                    </td>
                                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; border-top: 1px solid #e5e7eb;">
                                        ${request.title}
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
                            
                            ${notes ? `
                            <div style="margin-top: 20px; padding: 16px; background-color: #fffbeb; border-radius: 6px; border: 1px solid #fcd34d;">
                                <p style="margin: 0 0 5px 0; font-weight: 600; color: #92400e; font-size: 14px;">หมายเหตุเพิ่มเติม:</p>
                                <p style="margin: 0; color: #b45309; font-size: 14px;">${notes}</p>
                            </div>
                            ` : ''}

                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance" 
                                   style="display: inline-block; padding: 12px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                    ตรวจสอบสถานะ
                                </a>
                            </div>
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
