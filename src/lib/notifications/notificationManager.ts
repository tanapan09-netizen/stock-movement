/**
 * Notification Manager
 * Centralized service to send notifications via multiple channels (LINE, Email)
 */

import { sendMulticastMessage, createPartRequestFlexMessage, createStatusChangeFlexMessage, createPettyCashFlexMessage, createStorePartsFlexMessage } from './lineMessaging';
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

    const results = await Promise.allSettled([
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
}): Promise<void> {
    console.log('[Notification] Sending notifications for new maintenance request:', request.request_number);

    const results = await Promise.allSettled([
        // LINE Messaging API (To Admin/Manager/Technician)
        (async () => {
            if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
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
                    } catch (err) {
                        // Fallback simple message if flex template not implemented
                        const fallbackMsg = {
                            type: 'text' as const,
                            text: `🛠️ แจ้งซ่อมใหม่: ${request.request_number}\n📍 สถานที่: ${request.room_code} - ${request.room_name}\n🔧 เรื่อง: ${request.title}\n👤 ผู้แจ้ง: ${request.reported_by}`
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
    },
    oldStatus: string,
    newStatus: string,
    notes?: string
): Promise<void> {
    console.log('[Notification] Sending maintenance status change:', request.request_number, oldStatus, '->', newStatus);

    // Note: Since we don't have requester email in tbl_users consistently,
    // we might only start by sending to Admin to track changes,
    // OR if we can find an email in the future.
    // For now, let's send to Approvers (Admin) so they know the job status updated.

    const results = await Promise.allSettled([
        (async () => {
            const recipients = getApproverEmails(); // Send to Admin for visibility
            if (recipients.length > 0 && process.env.EMAIL_ENABLED !== 'false') {
                const html = generateMaintenanceStatusChangeEmail(request, oldStatus, newStatus, notes);
                const subject = `📢 อัปเดตสถานะงานซ่อม: ${request.request_number}`;
                const result = await sendEmail(recipients, subject, html);
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
        eventType: 'request' | 'dispense' | 'clear' | 'reconcile';
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
            let targetUsers: string[] = [];
            let lineIds: string[] = [];

            if (data.eventType === 'request') {
                targetRoles = ['manager', 'accounting', 'admin'];
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
                const flexMessage = createPettyCashFlexMessage(data);
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
        eventType: 'pending' | 'approved' | 'rejected';
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
    console.log('[Notification] Approval Event:', data.eventType, data.request_number);

    try {
        if (process.env.LINE_MESSAGING_ENABLED !== 'false') {
            const { getLineIdsByRoles } = await import('@/actions/lineUserActions');
            const { sendPushMessage, sendMulticastMessage } = await import('./lineMessaging');

            const typeMap: Record<string, string> = {
                'ot': 'ขอทำงานล่วงเวลา (OT)',
                'leave': 'ขอลาหยุด',
                'expense': 'ขอเบิกค่าใช้จ่าย',
                'other': 'ขออนุมัติอื่นๆ'
            };

            const reqTypeName = typeMap[data.request_type] || 'ขออนุมัติ';

            let messageText = '';
            if (data.eventType === 'pending') {
                messageText = `📝 *มีรายการคำขอใหม่*\n\nประเภท: ${reqTypeName}\nเลขที่: ${data.request_number}\nผู้ขอ: ${data.requested_by}\n\n💬 เหตุผล: ${data.reason}`;

                if (data.request_type === 'ot' && data.start_time && data.end_time) {
                    const st = new Date(data.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    const et = new Date(data.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    messageText += `\nเวลา: ${st} - ${et}`;
                }
                if (data.request_type === 'expense' && data.amount) {
                    messageText += `\nยอดเงิน: ${Number(data.amount).toLocaleString()} บาท`;
                }
                if (data.reference_job) {
                    messageText += `\nอ้างอิงงาน: ${data.reference_job}`;
                }

                // Send to managers/admins
                const lineIds = await getLineIdsByRoles(['manager', 'admin']);
                if (lineIds.length > 0) {
                    const fallbackMsg = { type: 'text' as const, text: messageText };
                    await sendMulticastMessage(lineIds, fallbackMsg);
                    console.log(`[Notification] Approval pending sent to`, lineIds.length, 'managers');
                }
            } else {
                // Approved or Rejected - notify requester
                const statusStr = data.eventType === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ';
                messageText = `📢 *แจ้งผลคำขอ*\n\nประเภท: ${reqTypeName}\nเลขที่: ${data.request_number}\nผลการพิจารณา: ${statusStr}`;
                if (data.eventType === 'rejected' && data.rejection_reason) {
                    messageText += `\nเหตุผลที่ไม่อนุมัติ: ${data.rejection_reason}`;
                }

                if (data.requester_line_id) {
                    const fallbackMsg = { type: 'text' as const, text: messageText };
                    await sendPushMessage(data.requester_line_id, fallbackMsg);
                    console.log(`[Notification] Approval result sent to requester:`, data.requested_by);
                }
            }
        }
    } catch (err) {
        console.error('[Notification] Approval event failed:', err);
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
