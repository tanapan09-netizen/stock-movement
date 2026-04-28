/**
 * LINE Notify Service
 * Sends notifications to LINE groups/chats via LINE Notify API
 */
import { logLineNotificationAttempt } from '@/lib/logger';

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify';

export interface LineNotifyConfig {
    token?: string;
    enabled: boolean;
}

/**
 * Send a notification via LINE Notify
 * @param message Message text to send
 * @param token LINE Notify token (optional, uses env var if not provided)
 * @returns Success status
 */
export async function sendLineNotification(
    message: string,
    token?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const notifyToken = token || process.env.LINE_NOTIFY_TOKEN;

        // Skip if token not configured
        if (!notifyToken) {
            console.log('[LINE Notify] Token not configured, skipping notification');
            void logLineNotificationAttempt({
                channel: 'line_notify',
                mode: 'notify_api',
                success: false,
                message,
                error: 'Token not configured',
                context: 'sendLineNotification',
            });
            return { success: false, error: 'Token not configured' };
        }

        // Skip if explicitly disabled
        if (process.env.LINE_NOTIFY_ENABLED === 'false') {
            console.log('[LINE Notify] Disabled via env variable');
            void logLineNotificationAttempt({
                channel: 'line_notify',
                mode: 'notify_api',
                success: false,
                message,
                error: 'Service disabled',
                context: 'sendLineNotification',
            });
            return { success: false, error: 'Service disabled' };
        }

        const response = await fetch(LINE_NOTIFY_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${notifyToken}`,
            },
            body: new URLSearchParams({
                message: message,
            }),
        });

        const data = await response.json();

        if (response.ok && data.status === 200) {
            console.log('[LINE Notify] Message sent successfully');
            void logLineNotificationAttempt({
                channel: 'line_notify',
                mode: 'notify_api',
                success: true,
                message,
                context: 'sendLineNotification',
            });
            return { success: true };
        } else {
            console.error('[LINE Notify] Failed to send:', data);
            void logLineNotificationAttempt({
                channel: 'line_notify',
                mode: 'notify_api',
                success: false,
                message,
                error: data.message || 'Unknown error',
                context: 'sendLineNotification',
            });
            return { success: false, error: data.message || 'Unknown error' };
        }
    } catch (error) {
        console.error('[LINE Notify] Error:', error);
        void logLineNotificationAttempt({
            channel: 'line_notify',
            mode: 'notify_api',
            success: false,
            message,
            error: error instanceof Error ? error.message : 'Unknown error',
            context: 'sendLineNotification',
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Format a part request notification message for LINE
 */
export function formatPartRequestMessage(request: {
    item_name: string;
    quantity: number;
    priority: string;
    estimated_price?: number | null;
    requested_by: string;
    department?: string | null;
    date_needed?: Date | null;
}): string {
    const priorityEmoji = {
        normal: '🔵',
        urgent: '🟠',
        critical: '🔴',
    }[request.priority] || '⚪';

    let message = `🔔 คำขออะไหล่ใหม่\n\n`;
    message += `📦 รายการ: ${request.item_name}\n`;
    message += `🔢 จำนวน: ${request.quantity} ชิ้น\n`;
    message += `${priorityEmoji} ความเร่งด่วน: ${getPriorityLabel(request.priority)}\n`;

    if (request.estimated_price) {
        message += `💰 ราคาประมาณ: ${request.estimated_price.toLocaleString()} บาท\n`;
    }

    message += `\n👤 ผู้ขอ: ${request.requested_by}\n`;

    if (request.department) {
        message += `🏢 แผนก: ${request.department}\n`;
    }

    if (request.date_needed) {
        const dateStr = new Date(request.date_needed).toLocaleDateString('th-TH');
        message += `📅 ต้องการภายใน: ${dateStr}\n`;
    }

    message += `\n🔗 ดูรายละเอียด: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/maintenance/part-requests`;

    return message;
}

/**
 * Format a status change notification message for LINE
 */
export function formatStatusChangeMessage(request: {
    item_name: string;
    requested_by: string;
}, oldStatus: string, newStatus: string): string {
    const statusEmoji = {
        pending: '⏳',
        approved: '✅',
        ordered: '📦',
        received: '✔️',
        rejected: '❌',
    };

    let message = `🔄 อัปเดตสถานะคำขออะไหล่\n\n`;
    message += `📦 รายการ: ${request.item_name}\n`;
    message += `👤 ผู้ขอ: ${request.requested_by}\n\n`;
    message += `${statusEmoji[oldStatus as keyof typeof statusEmoji] || '◻️'} ${getStatusLabel(oldStatus)} → ${statusEmoji[newStatus as keyof typeof statusEmoji] || '◻️'} ${getStatusLabel(newStatus)}`;

    return message;
}

function getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
        normal: 'ปกติ',
        urgent: 'เร่งด่วน',
        critical: 'วิกฤต',
    };
    return labels[priority] || priority;
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending: 'รออนุมัติ',
        approved: 'อนุมัติแล้ว',
        ordered: 'สั่งซื้อแล้ว',
        received: 'ได้รับแล้ว',
        rejected: 'ปฏิเสธ',
    };
    return labels[status] || status;
}
