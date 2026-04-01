/**
 * Notification Manager
 * Centralized service to send notifications via multiple channels (LINE, Email)
 */

import {
    createPettyCashDecisionFlexMessage,
    sendMulticastMessage,
    createTextMessage,
    createApprovalDecisionFlexMessage,
    createApprovalPendingFlexMessage,
    createPartRequestFlexMessage,
    createStatusChangeFlexMessage,
    createPettyCashFlexMessage,
    createStorePartsFlexMessage,
} from './lineMessaging';
import { sendEmail, generatePartRequestEmail, generateStatusChangeEmail, generateMaintenanceRequestEmail, generateJobAssignmentEmail, generateMaintenanceStatusChangeEmail } from './emailService';

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

function buildApprovalNotificationHref(data: {
    eventType: 'pending' | 'approved' | 'rejected' | 'returned';
    request_type: string;
    request_id?: number | null;
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (data.eventType === 'pending') {
        return `${appUrl}${data.request_type === 'purchase' ? '/purchase-request/manage' : '/approvals/manage'}`;
    }

    if (data.request_type === 'purchase') {
        if (data.eventType === 'returned' && data.request_id) {
            return `${appUrl}/purchase-request?edit=${data.request_id}`;
        }

        return `${appUrl}/purchase-request`;
    }

    return `${appUrl}/approvals`;
}

function formatLineSection(title: string, rows: Array<[string, string | number | null | undefined]>) {
    const lines = rows
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([label, value]) => `• ${label}: ${String(value).trim()}`);

    if (lines.length === 0) return [];
    return [title, ...lines];
}

async function resolveApprovalRequesterLineIds(data: {
    requested_by: string;
    requester_line_id?: string | null;
}): Promise<string[]> {
    const ids = new Set<string>();

    if (data.requester_line_id) {
        ids.add(data.requester_line_id);
    }

    if (!data.requested_by?.trim()) {
        return [...ids];
    }

    const { prisma } = await import('@/lib/prisma');
    const requesterName = data.requested_by.trim();

    const [requesterUser, requesterTech, requesterLineUser] = await Promise.all([
        prisma.tbl_users.findUnique({
            where: { username: requesterName },
            select: { line_user_id: true },
        }),
        prisma.tbl_technicians.findFirst({
            where: { name: requesterName, status: 'active' },
            select: { line_user_id: true },
        }),
        prisma.tbl_line_users.findFirst({
            where: {
                OR: [
                    { display_name: requesterName },
                    { full_name: requesterName },
                ],
            },
            select: { line_user_id: true },
        }),
    ]);

    if (requesterUser?.line_user_id) ids.add(requesterUser.line_user_id);
    if (requesterTech?.line_user_id) ids.add(requesterTech.line_user_id);
    if (requesterLineUser?.line_user_id) ids.add(requesterLineUser.line_user_id);

    return [...ids];
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
                const { getLineIdsByRoles } = await import('@/actions/lineUserActions');
                // Target: Purchasing and Manager for part requests
                const lineIds = await getLineIdsByRoles(['purchasing', 'manager']);

                if (lineIds.length > 0) {
                    const flexMessage = createPartRequestFlexMessage(request);
                    const result = await sendMulticastMessage(lineIds, flexMessage);
                    if (result.success) {
                        console.log('[Notification] LINE messages sent to', lineIds.length, 'users');
                    } else {
                        console.warn('[Notification] LINE messaging failed:', result.error);
                    }
                } else {
                    console.log('[Notification] No relevant LINE approvers found for part request');
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
                const { getLineIdsByRoles } = await import('@/actions/lineUserActions');
                // Target: Purchasing and Manager (Assuming status change relates to Part Request mostly)
                // TODO: Differentiate status changes (maybe send to requester if available)
                const lineIds = await getLineIdsByRoles(['purchasing', 'manager']);

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

export async function notifyMaintenanceWithdrawalRequesterStatusChange(data: {
    item_name: string;
    quantity: number;
    requested_by: string;
    status: 'approved' | 'rejected';
    decided_by: string;
    maintenance_request_number?: string | null;
    fallback_technician_name?: string | null;
    room_code?: string | null;
    room_name?: string | null;
}): Promise<void> {
    const { prisma } = await import('@/lib/prisma');

    const candidateNames = [...new Set([
        data.requested_by?.trim(),
        data.fallback_technician_name?.trim(),
    ].filter((name): name is string => Boolean(name)))];

    const userNameOr = candidateNames.map((name) => ({ username: name }));
    const technicianNameOr = candidateNames.map((name) => ({ name, status: 'active' as const }));
    const lineNameOr = candidateNames.flatMap((name) => ([
        { display_name: name },
        { full_name: name },
    ]));

    const [requesterUsers, requesterTechs, requesterLineUsers] = await Promise.all([
        userNameOr.length > 0
            ? prisma.tbl_users.findMany({
                where: { OR: userNameOr },
                select: { line_user_id: true, email: true },
            })
            : Promise.resolve([]),
        technicianNameOr.length > 0
            ? prisma.tbl_technicians.findMany({
                where: { OR: technicianNameOr },
                select: { line_user_id: true, email: true },
            })
            : Promise.resolve([]),
        lineNameOr.length > 0
            ? prisma.tbl_line_users.findMany({
                where: { OR: lineNameOr },
                select: { line_user_id: true },
            })
            : Promise.resolve([]),
    ]);

    const lineRecipientIds = new Set<string>();
    const emailRecipients = new Set<string>();

    requesterUsers.forEach((user) => {
        if (user.line_user_id) lineRecipientIds.add(user.line_user_id);
        if (user.email) emailRecipients.add(user.email);
    });

    requesterTechs.forEach((tech) => {
        if (tech.line_user_id) lineRecipientIds.add(tech.line_user_id);
        if (tech.email) emailRecipients.add(tech.email);
    });

    requesterLineUsers.forEach((lineUser) => {
        if (lineUser.line_user_id) lineRecipientIds.add(lineUser.line_user_id);
    });

    const statusLabel = data.status === 'approved' ? 'พร้อมจ่ายแล้ว' : 'ไม่พร้อมจ่าย';
    const lines = [
        '📦 อัปเดตคำขอเบิกอะไหล่',
        '',
        ...formatLineSection('ข้อมูลคำขอ', [
            ['รายการ', data.item_name],
            ['จำนวน', data.quantity],
            ['ใบงาน', data.maintenance_request_number || null],
            ['ห้อง', data.room_code || data.room_name ? `${data.room_code || '-'}${data.room_name ? ` - ${data.room_name}` : ''}` : null],
        ]),
        '',
        ...formatLineSection('ผลการตรวจสอบจากคลัง', [
            ['สถานะ', statusLabel],
            ['อัปเดตโดย', data.decided_by || 'System'],
        ]),
        '',
        `ดูรายละเอียด: ${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}/maintenance/parts`,
    ];

    const results = await Promise.allSettled([
        (async () => {
            if (process.env.LINE_MESSAGING_ENABLED === 'false' || lineRecipientIds.size === 0) {
                return;
            }

            const result = await sendMulticastMessage(
                [...lineRecipientIds],
                createTextMessage(lines.join('\n')),
            );

            if (!result.success) {
                console.warn('[Notification] Failed to send maintenance withdrawal requester LINE:', result.error);
            }
        })(),
        (async () => {
            if (process.env.EMAIL_ENABLED === 'false' || emailRecipients.size === 0) {
                return;
            }

            const statusColor = data.status === 'approved' ? '#059669' : '#dc2626';
            const html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                    <h2 style="margin-bottom: 12px;">อัปเดตคำขอเบิกอะไหล่</h2>
                    <p>คำขอเบิกอะไหล่ของคุณมีการอัปเดตจากคลังแล้ว</p>
                    <table style="border-collapse: collapse; width: 100%; max-width: 520px; margin: 16px 0;">
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">รายการ</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${data.item_name}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">จำนวน</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${data.quantity}</td></tr>
                        ${data.maintenance_request_number ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;">ใบงาน</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${data.maintenance_request_number}</td></tr>` : ''}
                        ${(data.room_code || data.room_name) ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;">ห้อง</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${data.room_code || '-'}${data.room_name ? ` - ${data.room_name}` : ''}</td></tr>` : ''}
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">สถานะ</td><td style="padding: 8px; border: 1px solid #e5e7eb; color: ${statusColor}; font-weight: 700;">${statusLabel}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">อัปเดตโดย</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${data.decided_by || 'System'}</td></tr>
                    </table>
                    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance/parts">เปิดหน้าอะไหล่งานซ่อม</a></p>
                </div>
            `;

            const result = await sendEmail(
                [...emailRecipients],
                `📦 ${statusLabel}: ${data.item_name}`,
                html,
            );

            if (!result.success) {
                console.warn('[Notification] Failed to send maintenance withdrawal requester email:', result.error);
            }
        })(),
    ]);

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`[Notification] Maintenance withdrawal requester channel ${index} failed:`, result.reason);
        }
    });
}

/**
 * Send notification for Job Assignment
 */
/**
 * Send notification for Job Assignment
 */
export async function notifyJobAssignment(
    request: {
        request_number: string;
        title: string;
        description?: string | null;
        priority: string;
        room_code: string;
        room_name: string;
        reported_by: string;
    },
    technicianName: string,
    assignedBy?: string
): Promise<void> {
    console.log('[Notification] Sending job assignment notification:', request.request_number, 'to', technicianName);

    const { prisma } = await import('@/lib/prisma');

    // Find Technician's details (LINE ID and Email)
    const technician = await prisma.tbl_technicians.findFirst({
        where: { name: technicianName, status: 'active' },
        select: { line_user_id: true, email: true }
    });

    if (!technician) {
        console.warn(`[Notification] Technician ${technicianName} not found or inactive.`);
        return;
    }

    await Promise.allSettled([
        // LINE Messaging API
        (async () => {
            if (process.env.LINE_MESSAGING_ENABLED !== 'false' && technician.line_user_id) {
                const { createJobAssignmentFlexMessage, sendPushMessage } = await import('./lineMessaging');
                const flexMessage = createJobAssignmentFlexMessage(request);
                const result = await sendPushMessage(technician.line_user_id, flexMessage);

                if (result.success) {
                    console.log(`[Notification] Job assignment LINE sent to ${technicianName}`);
                } else {
                    console.error(`[Notification] Failed to send job assignment LINE to ${technicianName}:`, result.error);
                }
            }
        })(),

        // Email Notification
        (async () => {
            if (process.env.EMAIL_ENABLED !== 'false' && technician.email) {
                const html = generateJobAssignmentEmail({ ...request, assigned_by: assignedBy });
                const subject = `👷 งานซ่อมใหม่: ${request.request_number}`;
                const result = await sendEmail([technician.email], subject, html);

                if (result.success) {
                    console.log(`[Notification] Job assignment Email sent to ${technicianName}`);
                } else {
                    console.warn(`[Notification] Job assignment Email failed for ${technicianName}:`, result.error);
                }
            }
        })()
    ]);
}

/**
 * Send notifications for New Maintenance Request
 */
export async function notifyNewMaintenanceRequest(request: {
    request_number: string;
    title: string;
    description?: string | null;
    priority: string;
    room_code: string;
    room_name: string;
    reported_by: string;
    created_at: Date;
    image_url?: string | null;
}, options?: {
    disableLine?: boolean;
}): Promise<void> {
    console.log('[Notification] Sending notifications for new maintenance request:', request.request_number);

    await Promise.allSettled([
        // LINE Messaging API (To Admin/Manager/Technician)
        (async () => {
            if (!options?.disableLine && process.env.LINE_MESSAGING_ENABLED !== 'false') {
                const { getLineIdsByRoles } = await import('@/actions/lineUserActions');
                // Target: Technician and Manager for new maintenance requests
                const lineIds = await getLineIdsByRoles(['technician', 'manager']);

                if (lineIds.length > 0) {
                    const { createMaintenanceRequestFlexMessage } = await import('./lineMessaging');
                    // Ensure the flex message exists, otherwise fallback to text
                    try {
                        const flexMessage = createMaintenanceRequestFlexMessage(request);
                        const result = await sendMulticastMessage(lineIds, flexMessage);
                        if (result.success) {
                            console.log('[Notification] New Maintenance Request LINE sent to', lineIds.length, 'users');
                        } else {
                            console.warn('[Notification] New Maintenance Request LINE messaging failed:', result.error);
                        }
                    } catch {
                        // Fallback simple message if flex template not implemented
                        const fallbackMsg = {
                            type: 'text' as const,
                            text: [
                                '🛠️ แจ้งซ่อมใหม่',
                                '',
                                ...formatLineSection('ข้อมูลใบงาน', [
                                    ['เลขที่', request.request_number],
                                    ['ห้อง', `${request.room_code} - ${request.room_name}`],
                                    ['เรื่อง', request.title],
                                    ['ผู้แจ้ง', request.reported_by],
                                    ['ความเร่งด่วน', request.priority],
                                ]),
                                '',
                                `เปิดงาน: ${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}/maintenance?req=${request.request_number}`,
                            ].join('\n')
                        };
                        await sendMulticastMessage(lineIds, fallbackMsg);
                    }
                }
            }
        })(),

        // Email (To Admin/Approvers)
        (async () => {
            const recipients = getApproverEmails();
            if (recipients.length > 0 && process.env.EMAIL_ENABLED !== 'false') {
                const html = generateMaintenanceRequestEmail(request);
                const subject = `🛠️ แจ้งซ่อมใหม่: ${request.request_number} - ${request.room_code}`;
                const result = await sendEmail(recipients, subject, html);
                if (result.success) {
                    console.log('[Notification] Maintenance Request Email sent successfully');
                } else {
                    console.warn('[Notification] Maintenance Request Email failed:', result.error);
                }
            }
        })()
    ]);
}

/**
 * Send notifications for Maintenance Status Change
 */
export async function notifyMaintenanceStatusChange(
    request: {
        request_number: string;
        title: string;
        room_code: string;
        room_name: string;
        reported_by?: string | null;
        assigned_to?: string | null;
    },
    oldStatus: string,
    newStatus: string,
    notes?: string
): Promise<void> {
    console.log('[Notification] Sending maintenance status change:', request.request_number, oldStatus, '->', newStatus);

    const { prisma } = await import('@/lib/prisma');
    const { getLineIdsByRoles } = await import('@/actions/lineUserActions');
    const statusLabelMap: Record<string, string> = {
        pending: 'Pending',
        approved: 'Forwarded',
        in_progress: 'In Progress',
        confirmed: 'Awaiting Approval',
        completed: 'Completed',
        cancelled: 'Cancelled',
    };
    const statusMetaMap: Record<string, { headline: string; subjectPrefix: string; summary: string }> = {
        pending: {
            headline: '[Maintenance Reopened/Unassigned]',
            subjectPrefix: '[Maintenance] Pending',
            summary: 'The maintenance request is waiting for the next action.',
        },
        approved: {
            headline: '[Maintenance Forwarded]',
            subjectPrefix: '[Maintenance] Forwarded',
            summary: 'The request has been forwarded to the maintenance workflow.',
        },
        in_progress: {
            headline: '[Maintenance In Progress]',
            subjectPrefix: '[Maintenance] In Progress',
            summary: 'Work has started on this request.',
        },
        confirmed: {
            headline: '[Maintenance Awaiting Approval]',
            subjectPrefix: '[Maintenance] Awaiting Approval',
            summary: 'The technician submitted the job for final approval.',
        },
        completed: {
            headline: '[Maintenance Completed]',
            subjectPrefix: '[Maintenance] Completed',
            summary: 'The maintenance job has been completed.',
        },
        cancelled: {
            headline: '[Maintenance Cancelled]',
            subjectPrefix: '[Maintenance] Cancelled',
            summary: 'The maintenance request has been cancelled.',
        },
    };
    const statusMeta = statusMetaMap[newStatus] || {
        headline: '[Maintenance Status Update]',
        subjectPrefix: '[Maintenance] Status Update',
        summary: 'The maintenance request status has changed.',
    };

    const [reporterUser, reporterCustomer, assignedUser, assignedTech] = await Promise.all([
        request.reported_by
            ? prisma.tbl_users.findUnique({
                where: { username: request.reported_by },
                select: { line_user_id: true, email: true }
            })
            : Promise.resolve(null),
        request.reported_by
            ? prisma.tbl_line_customers.findFirst({
                where: { full_name: request.reported_by },
                select: { line_user_id: true }
            })
            : Promise.resolve(null),
        request.assigned_to
            ? prisma.tbl_users.findUnique({
                where: { username: request.assigned_to },
                select: { line_user_id: true, email: true }
            })
            : Promise.resolve(null),
        request.assigned_to
            ? prisma.tbl_technicians.findFirst({
                where: { name: request.assigned_to, status: 'active' },
                select: { line_user_id: true, email: true }
            })
            : Promise.resolve(null),
    ]);

    const lineRecipientIds = new Set<string>();
    const emailRecipients = new Set<string>();
    const shouldNotifyApprovers = ['approved', 'confirmed', 'completed', 'cancelled'].includes(newStatus);
    const shouldNotifyAssignee = ['approved', 'in_progress', 'pending'].includes(newStatus);

    if (reporterUser?.line_user_id) lineRecipientIds.add(reporterUser.line_user_id);
    if (reporterCustomer?.line_user_id) lineRecipientIds.add(reporterCustomer.line_user_id);
    if (reporterUser?.email) emailRecipients.add(reporterUser.email);

    if (shouldNotifyAssignee) {
        if (assignedUser?.line_user_id) lineRecipientIds.add(assignedUser.line_user_id);
        if (assignedTech?.line_user_id) lineRecipientIds.add(assignedTech.line_user_id);
        if (assignedUser?.email) emailRecipients.add(assignedUser.email);
        if (assignedTech?.email) emailRecipients.add(assignedTech.email);
    }

    if (shouldNotifyApprovers) {
        const roleLineIds = await getLineIdsByRoles(['manager', 'leader_technician']);
        roleLineIds.forEach((lineId) => lineRecipientIds.add(lineId));
        getApproverEmails().forEach((email) => emailRecipients.add(email));
    }

    const lineMessage = createTextMessage([
        statusMeta.headline,
        '',
        ...formatLineSection('ข้อมูลงานซ่อม', [
            ['เลขที่', request.request_number],
            ['ห้อง', `${request.room_code} - ${request.room_name}`],
            ['เรื่อง', request.title],
            ['ผู้รับผิดชอบ', request.assigned_to || null],
        ]),
        '',
        ...formatLineSection('อัปเดตสถานะ', [
            ['สรุป', statusMeta.summary],
            ['สถานะ', `${statusLabelMap[oldStatus] || oldStatus} -> ${statusLabelMap[newStatus] || newStatus}`],
            ['หมายเหตุ', notes || null],
        ]),
        '',
        `เปิดงาน: ${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}/maintenance?req=${request.request_number}`,
    ].join('\n'));

    await Promise.allSettled([
        (async () => {
            if (lineRecipientIds.size > 0 && process.env.LINE_MESSAGING_ENABLED !== 'false') {
                const result = await sendMulticastMessage(Array.from(lineRecipientIds), lineMessage);
                if (result.success) {
                    console.log('[Notification] Maintenance status LINE sent to', lineRecipientIds.size, 'recipients');
                } else {
                    console.warn('[Notification] Maintenance status LINE failed:', result.error);
                }
            }
        })(),
        (async () => {
            if (emailRecipients.size > 0 && process.env.EMAIL_ENABLED !== 'false') {
                const html = generateMaintenanceStatusChangeEmail(request, oldStatus, newStatus, notes);
                const subject = `${statusMeta.subjectPrefix}: ${request.request_number}`;
                const result = await sendEmail(Array.from(emailRecipients), subject, html);
                if (result.success) {
                    console.log('[Notification] Maintenance Status Email sent successfully');
                } else {
                    console.warn('[Notification] Maintenance Status Email failed:', result.error);
                }
            }
        })()
    ]);
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

/**
 * Send notifications for Petty Cash events
 */
export async function notifyPettyCashEvent(
    data: {
        eventType: 'request' | 'approved' | 'rejected' | 'dispense' | 'clear' | 'reconcile';
        request_number: string;
        requested_by: string;
        purpose: string;
        amount: number;
        notes?: string;
    }
): Promise<void> {
    console.log('[Notification] Petty Cash Event:', data.eventType, data.request_number);

    try {
        if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
            const { getLineIdsByRoles, getLineIdByUsername } = await import('@/actions/lineUserActions');

            let targetRoles: string[] = [];
            const targetUsers: string[] = [];
            let lineIds: string[] = [];

            if (data.eventType === 'request') {
                targetRoles = ['manager', 'accounting', 'admin'];
            } else if (data.eventType === 'approved' || data.eventType === 'rejected') {
                targetRoles = ['manager', 'accounting', 'admin'];
                targetUsers.push(data.requested_by);
            } else if (data.eventType === 'dispense' || data.eventType === 'reconcile') {
                targetUsers.push(data.requested_by);
            } else if (data.eventType === 'clear') {
                targetRoles = ['manager', 'accounting', 'admin'];
            }

            if (targetRoles.length > 0) {
                const roleIds = await getLineIdsByRoles(targetRoles);
                lineIds = [...lineIds, ...roleIds];
            }
            if (targetUsers.length > 0) {
                const userLineIds = await Promise.all(targetUsers.map(u => getLineIdByUsername(u)));
                lineIds = [...lineIds, ...userLineIds.filter(Boolean) as string[]];
            }

            lineIds = [...new Set(lineIds)];

            if (lineIds.length > 0) {
                const flexMessage = data.eventType === 'approved' || data.eventType === 'rejected'
                    ? createPettyCashDecisionFlexMessage({
                        requestNumber: data.request_number,
                        requesterName: data.requested_by,
                        amount: data.amount,
                        purpose: data.purpose,
                        status: data.eventType,
                        note: data.notes,
                        href: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/petty-cash`,
                    })
                    : createPettyCashFlexMessage(data);
                const result = await sendMulticastMessage(lineIds, flexMessage);
                if (result.success) {
                    console.log(`[Notification] Petty Cash ${data.eventType} sent to`, lineIds.length, 'users');
                } else {
                    console.warn(`[Notification] Petty Cash ${data.eventType} failed:`, result.error);
                }
            } else {
                console.log('[Notification] No relevant LINE users found for Petty Cash event');
            }
        }
    } catch (err) {
        console.error('[Notification] Petty Cash event failed:', err);
    }
}

/**
 * Send notifications for General Approval events
 */
export async function notifyApprovalEvent(
    data: {
        eventType: 'pending' | 'approved' | 'rejected' | 'returned';
        request_id?: number | null;
        request_number: string;
        request_type: string;
        requested_by: string; // The username of requester
        requester_line_id?: string | null;
        reason: string;
        amount?: number | null;
        start_time?: Date | null;
        end_time?: Date | null;
        reference_job?: string | null;
        rejection_reason?: string | null;
    }
): Promise<void> {
    return notifyApprovalEventFlex(data);

    console.log('[Notification] Approval Event:', data.eventType, data.request_number);

    try {
        if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
            const { getApprovalRecipientLineIds } = await import('@/actions/lineUserActions');
            const { sendPushMessage, sendMulticastMessage } = await import('./lineMessaging');

            const typeMap: Record<string, string> = {
                'ot': 'ขอทำงานล่วงเวลา (OT)',
                'leave': 'ขอลาหยุด',
                'expense': 'ขอเบิกค่าใช้จ่าย',
                'purchase': 'ขอซื้อ',
                'other': 'ขออนุมัติอื่นๆ'
            };

            const reqTypeName = typeMap[data.request_type] || 'ขออนุมัติ';

            let messageText = '';
            if (data.eventType === 'pending') {
                messageText = `📝 *มีรายการคำขอใหม่*\n\nประเภท: ${reqTypeName}\nเลขที่: ${data.request_number}\nผู้ขอ: ${data.requested_by}\n\n💬 เหตุผล: ${data.reason}`;

                if (data.request_type === 'ot' && data.start_time && data.end_time) {
                    const st = new Date(data.start_time!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    const et = new Date(data.end_time!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    messageText += `\nเวลา: ${st} - ${et}`;
                }
                if ((data.request_type === 'expense' || data.request_type === 'purchase') && data.amount) {
                    messageText += `\nยอดเงิน: ${Number(data.amount).toLocaleString()} บาท`;
                }
                if (data.reference_job) {
                    messageText += `\nอ้างอิงงาน: ${data.reference_job}`;
                }

                const lineIds = await getApprovalRecipientLineIds(data.request_type);
                if (lineIds.length > 0) {
                    const fallbackMsg = { type: 'text' as const, text: messageText };
                    await sendMulticastMessage(lineIds, fallbackMsg);
                    console.log(`[Notification] Approval pending sent to`, lineIds.length, 'managers');
                }
            } else {
                // Approved or Rejected - notify requester
                const statusStr = data.eventType === 'approved'
                    ? '✅ อนุมัติแล้ว'
                    : data.eventType === 'returned'
                        ? '↩️ ตีกลับแก้ไข'
                        : '❌ ไม่อนุมัติ';
                messageText = `📢 *แจ้งผลคำขอ*\n\nประเภท: ${reqTypeName}\nเลขที่: ${data.request_number}\nผลการพิจารณา: ${statusStr}`;
                if ((data.eventType === 'rejected' || data.eventType === 'returned') && data.rejection_reason) {
                    messageText += `\nเหตุผล: ${data.rejection_reason}`;
                }

                const requesterLineIds = await resolveApprovalRequesterLineIds(data);
                if (requesterLineIds.length > 0) {
                    const fallbackMsg = { type: 'text' as const, text: messageText };
                    await sendMulticastMessage(requesterLineIds, fallbackMsg);
                    console.log(`[Notification] Approval result sent to requester:`, data.requested_by);
                }
            }
        }
    } catch (err) {
        console.error('[Notification] Approval event failed:', err);
    }
}

export async function notifyApprovalEventFlex(
    data: {
        eventType: 'pending' | 'approved' | 'rejected' | 'returned';
        request_id?: number | null;
        request_number: string;
        request_type: string;
        requested_by: string;
        requester_line_id?: string | null;
        reason: string;
        amount?: number | null;
        start_time?: Date | null;
        end_time?: Date | null;
        reference_job?: string | null;
        rejection_reason?: string | null;
    }
): Promise<void> {
    console.log('[Notification] Approval Event Flex:', data.eventType, data.request_number);

    try {
        if (process.env.LINE_MESSAGING_ENABLED === 'false') {
            return;
        }

        const { getApprovalRecipientLineIds, getLineIdsByRoles } = await import('@/actions/lineUserActions');

        const requestTypeLabel =
            data.request_type === 'ot' ? 'OT'
                : data.request_type === 'leave' ? 'ลา'
                    : data.request_type === 'expense' ? 'เบิกค่าใช้จ่าย'
                        : data.request_type === 'purchase' ? 'จัดซื้อ'
                            : 'อื่นๆ';

        if (data.eventType === 'pending') {
            const lineIds = data.request_type === 'purchase'
                ? await getLineIdsByRoles(['purchasing', 'leader_purchasing'])
                : await getApprovalRecipientLineIds(data.request_type);
            if (lineIds.length === 0) {
                return;
            }

            const timeRange =
                data.request_type === 'ot' && data.start_time && data.end_time
                    ? `${new Date(data.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(data.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                    : null;

            await sendMulticastMessage(lineIds, createApprovalPendingFlexMessage({
                requestNumber: data.request_number,
                requestType: requestTypeLabel,
                requesterName: data.requested_by,
                reason: data.reason,
                amount: data.amount ?? null,
                referenceJob: data.reference_job ?? null,
                timeRange,
                href: buildApprovalNotificationHref(data),
            }));
            return;
        }

        const requesterLineIds = await resolveApprovalRequesterLineIds(data);
        if (requesterLineIds.length === 0) {
            return;
        }

        await sendMulticastMessage(
            requesterLineIds,
            createApprovalDecisionFlexMessage({
                requestNumber: data.request_number,
                requestType: requestTypeLabel,
                requesterName: data.requested_by,
                status: data.eventType,
                rejectionReason: data.rejection_reason ?? null,
                href: buildApprovalNotificationHref(data),
            })
        );
    } catch (err) {
        console.error('[Notification] Approval event flex failed:', err);
    }
}

/**
 * Send notifications for Store Parts events (e.g., withdraw, confirm usage)
 */
export async function notifyStorePartsEvent(
    data: {
        eventType: 'withdraw' | 'pending_verification';
        request_number: string;
        item_name: string;
        quantity: number;
        withdrawn_by: string;
        notes?: string;
    }
): Promise<void> {
    console.log('[Notification] Store Parts Event:', data.eventType, data.request_number);

    try {
        if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
            const { getLineIdsByRoles } = await import('@/actions/lineUserActions');

            // Find users with the 'store' role
            const lineIds = await getLineIdsByRoles(['store']);

            if (lineIds.length > 0) {
                const flexMessage = createStorePartsFlexMessage(data);
                const result = await sendMulticastMessage(lineIds, flexMessage);
                if (result.success) {
                    console.log(`[Notification] Store Parts ${data.eventType} sent to`, lineIds.length, 'users');
                } else {
                    console.warn(`[Notification] Store Parts ${data.eventType} failed:`, result.error);
                }
            } else {
                console.log('[Notification] No store roles with LINE IDs found.');
            }
        }
    } catch (err) {
        console.error('[Notification] Store Parts event failed:', err);
    }
}
