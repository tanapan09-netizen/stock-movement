'use server';

// LINE Notify helper for maintenance notifications
// Uses LINE Messaging API push for direct and group alerts
import { isMaintenanceTechnician } from '@/lib/rbac';
import { sendConfiguredLineGroupTextNotification } from '@/lib/notifications/lineGroup';
import { logLineNotificationAttempt } from '@/lib/logger';

const LINE_ADMIN_ID = process.env.LINE_ADMIN_ID || '';
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const STATUS_LABEL_MAP: Record<string, string> = {
    pending: 'รอเรื่อง',
    approved: 'แจ้งเรื่องต่อ',
    in_progress: 'ดำเนินการ',
    confirmed: 'รอหัวหน้าช่างตรวจรับ',
    completed: 'ปิดงานแล้ว',
    cancelled: 'ยกเลิก',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
    low: 'ต่ำ',
    normal: 'ปกติ',
    high: 'สูง',
    urgent: 'เร่งด่วน',
};

const getPriorityHeadline = (priority: string) => {
    const normalized = (priority || '').trim().toLowerCase();
    if (normalized === 'urgent') return '🚨 เร่งด่วน';
    if (normalized === 'high') return '⚠️ สูง';
    return '';
};

const getPriorityLabel = (priority: string) => {
    const normalized = (priority || '').trim().toLowerCase();
    return PRIORITY_LABEL_MAP[normalized] || priority || '-';
};

const getStatusLabel = (status?: string | null) => {
    const normalized = (status || '').trim().toLowerCase();
    if (!normalized) return '';
    return STATUS_LABEL_MAP[normalized] || status || '';
};

function buildNewMaintenanceMessage(params: {
    roleTag: string;
    title: string;
    roomCode: string;
    roomName: string;
    priority: string;
    reportedBy: string;
    requestNumber?: string | null;
    status?: string | null;
    openUrl?: string | null;
}) {
    const priorityHeadline = getPriorityHeadline(params.priority);
    const priorityLabel = getPriorityLabel(params.priority);
    const statusLabel = getStatusLabel(params.status);

    return [
        `🔧 แจ้งซ่อมใหม่ ${priorityHeadline} [ถึงฝ่าย: ${params.roleTag}]`,
        '',
        'ข้อมูลงานซ่อม',
        ...(params.requestNumber ? [`• เลขที่: ${params.requestNumber}`] : []),
        `• ห้อง: ${params.roomCode} - ${params.roomName}`,
        `• เรื่อง: ${params.title}`,
        `• ผู้แจ้ง: ${params.reportedBy}`,
        `• ความเร่งด่วน: ${priorityLabel}`,
        ...(statusLabel ? [`• สถานะ: ${statusLabel}`] : []),
        ...(params.openUrl ? ['', `เปิดงาน: ${params.openUrl}`] : []),
    ].join('\n');
}

export async function sendLineNotify(message: string): Promise<boolean> {
    console.log(`[LINE] sendLineNotify called. AdminID present: ${!!LINE_ADMIN_ID}`);

    const groupResult = await sendConfiguredLineGroupTextNotification(`📣 [System Alert]\n${message}`);
    if (groupResult.success) {
        void logLineNotificationAttempt({
            channel: 'line_messaging_api',
            mode: 'broadcast',
            success: true,
            message,
            context: 'sendLineNotify:group-broadcast',
        });
        return true;
    }

    // Legacy support: redirect "Notify" calls to the admin/group via Messaging API
    if (!LINE_ADMIN_ID) {
        console.warn('[LINE] No LINE group target or LINE_ADMIN_ID configured. Broadcast notifications will be skipped.');
        void logLineNotificationAttempt({
            channel: 'line_messaging_api',
            mode: 'broadcast',
            success: false,
            message,
            error: 'No LINE group target or LINE_ADMIN_ID configured',
            context: 'sendLineNotify:missing-admin-target',
        });
        return false;
    }

    return await sendLineMessage(LINE_ADMIN_ID, `📢 [System Alert]\n${message}`);
}

// Send notification to a specific LINE user via LINE Messaging API
export async function sendLineMessage(userId: string, message: string): Promise<boolean> {
    console.log(`[LINE] sendLineMessage to ${userId}`);

    if (!LINE_CHANNEL_TOKEN) {
        console.error('[LINE] LINE_CHANNEL_ACCESS_TOKEN not configured, skipping push message');
        void logLineNotificationAttempt({
            channel: 'line_messaging_api',
            mode: 'push',
            recipients: [userId],
            success: false,
            message,
            error: 'LINE_CHANNEL_ACCESS_TOKEN not configured',
            context: 'sendLineMessage',
        });
        return false;
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: userId,
                messages: [
                    {
                        type: 'text',
                        text: message,
                    },
                ],
            }),
        });

        if (response.ok) {
            console.log(`[LINE] Success: Message sent to ${userId}`);
            void logLineNotificationAttempt({
                channel: 'line_messaging_api',
                mode: 'push',
                recipients: [userId],
                success: true,
                message,
                context: 'sendLineMessage',
            });
            return true;
        }

        const errorText = await response.text();
        console.error('[LINE] Failed:', errorText);
        void logLineNotificationAttempt({
            channel: 'line_messaging_api',
            mode: 'push',
            recipients: [userId],
            success: false,
            message,
            error: errorText,
            context: 'sendLineMessage',
        });
        return false;
    } catch (error) {
        console.error('[LINE] Exception:', error);
        void logLineNotificationAttempt({
            channel: 'line_messaging_api',
            mode: 'push',
            recipients: [userId],
            success: false,
            message,
            error: error instanceof Error ? error.message : 'Unknown error',
            context: 'sendLineMessage',
        });
        return false;
    }
}

// Send maintenance notification to all active technicians
export async function notifyTechniciansViaLine(
    title: string,
    roomCode: string,
    roomName: string,
    priority: string,
    reportedBy: string,
): Promise<number> {
    const { prisma } = await import('@/lib/prisma');

    const technicians = await prisma.tbl_technicians.findMany({
        where: {
            status: 'active',
            line_user_id: { not: null },
        },
        select: { line_user_id: true, name: true },
    });

    console.log(`[LINE] Found ${technicians.length} technicians with LINE ID`);

    const message = buildNewMaintenanceMessage({
        roleTag: 'technician',
        title,
        roomCode,
        roomName,
        priority,
        reportedBy,
    });

    if (technicians.length === 0) {
        console.log('[LINE] No technicians found, sending broadcast via sendLineNotify');
        await sendLineNotify(message);
        return 0;
    }

    let sentCount = 0;
    for (const tech of technicians) {
        if (tech.line_user_id) {
            const success = await sendLineMessage(tech.line_user_id, message);
            if (success) sentCount += 1;
        }
    }

    // Also send to LINE Notify as backup
    await sendLineNotify(message);

    return sentCount;
}

// Send maintenance notification to users by target role
export async function notifyRoleViaLine(
    targetRole: string,
    title: string,
    roomCode: string,
    roomName: string,
    priority: string,
    reportedBy: string,
    details?: {
        requestNumber?: string | null;
        status?: string | null;
        openUrl?: string | null;
    },
): Promise<number> {
    const { prisma } = await import('@/lib/prisma');

    const role = targetRole || 'technician';
    console.log(`[LINE] notifyRoleViaLine start role=${role} title="${title}" room=${roomCode}`);

    const lineUsers = await prisma.tbl_line_users.findMany({
        where: {
            role,
            is_active: true,
            line_user_id: { not: '' },
        },
        select: { line_user_id: true },
    });
    console.log(`[LINE] role=${role} tbl_line_users matches=${lineUsers.length}`);

    const users = await prisma.tbl_users.findMany({
        where: {
            role,
            deleted_at: null,
            line_user_id: { not: null },
        },
        select: { line_user_id: true },
    });
    console.log(`[LINE] role=${role} tbl_users matches=${users.length}`);

    const lineIds = new Set<string>();
    lineUsers.forEach((user) => user.line_user_id && lineIds.add(user.line_user_id));
    users.forEach((user) => user.line_user_id && lineIds.add(user.line_user_id));

    if (isMaintenanceTechnician(role)) {
        const techs = await prisma.tbl_technicians.findMany({
            where: {
                status: 'active',
                line_user_id: { not: null },
            },
            select: { line_user_id: true },
        });
        console.log(`[LINE] role=technician tbl_technicians matches=${techs.length}`);
        techs.forEach((tech) => tech.line_user_id && lineIds.add(tech.line_user_id));
    }

    console.log(`[LINE] role=${role} unique lineIds=${lineIds.size}`);

    const message = buildNewMaintenanceMessage({
        roleTag: role,
        title,
        roomCode,
        roomName,
        priority,
        reportedBy,
        requestNumber: details?.requestNumber || null,
        status: details?.status || null,
        openUrl: details?.openUrl || null,
    });

    if (lineIds.size === 0) {
        console.log(`[LINE] No users found for role: ${role}, sending broadcast via sendLineNotify`);
        await sendLineNotify(message);
        return 0;
    }

    let sentCount = 0;
    for (const lineId of lineIds) {
        const success = await sendLineMessage(lineId, message);
        if (success) sentCount += 1;
    }

    // Still send group notification as backup
    console.log(`[LINE] role=${role} sent=${sentCount}, sending admin/group backup`);
    await sendLineNotify(message);

    return sentCount;
}
