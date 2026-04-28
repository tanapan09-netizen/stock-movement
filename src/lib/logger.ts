
import { prisma } from './prisma';

const IMPORTANT_ONLY_MODE = process.env.SYSTEM_LOG_IMPORTANT_ONLY !== 'false';
const NON_ESSENTIAL_ACTIONS = new Set(['PAGE_VIEW']);
const MAX_LOG_DETAILS_LENGTH = 2000;
const MAX_LINE_MESSAGE_PREVIEW_LENGTH = 240;

function shouldPersistSystemLog(action: string): boolean {
    const normalizedAction = (action || '').trim().toUpperCase();
    if (!normalizedAction) return false;
    if (!IMPORTANT_ONLY_MODE) return true;
    return !NON_ESSENTIAL_ACTIONS.has(normalizedAction);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLogDetails(details: any): string {
    let detailsString = '';
    if (typeof details === 'string') {
        detailsString = details;
    } else {
        try {
            detailsString = JSON.stringify(details ?? null);
        } catch {
            detailsString = String(details);
        }
    }

    if (detailsString.length <= MAX_LOG_DETAILS_LENGTH) return detailsString;
    return `${detailsString.slice(0, MAX_LOG_DETAILS_LENGTH)}...[truncated]`;
}

export async function logSystemAction(
    action: string,
    entity: string | null,
    entityId: string | number | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: any,
    userId?: number | null,
    username?: string | null,
    ipAddress?: string
) {
    try {
        if (!shouldPersistSystemLog(action)) {
            return;
        }

        const detailsString = normalizeLogDetails(details);

        await prisma.tbl_system_logs.create({
            data: {
                action,
                entity,
                entity_id: entityId?.toString(),
                details: detailsString,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                user_id: (userId || null) as any,
                username: username || null,
                ip_address: ipAddress || 'unknown',
            },
        });
    } catch (error) {
        console.error('Failed to create system log:', error);
        // Don't throw, we don't want to block the main action from completing just because logging failed
    }
}

type LineNotificationLogInput = {
    channel: 'line_messaging_api' | 'line_notify';
    mode: 'push' | 'multicast' | 'broadcast' | 'notify_api';
    recipients?: string[];
    success: boolean;
    message?: unknown;
    error?: string | null;
    context?: string | null;
};

function buildLineMessagePreview(message: unknown): string | null {
    if (typeof message === 'string') {
        const compact = message.replace(/\s+/g, ' ').trim();
        if (!compact) return null;
        return compact.length > MAX_LINE_MESSAGE_PREVIEW_LENGTH
            ? `${compact.slice(0, MAX_LINE_MESSAGE_PREVIEW_LENGTH)}...`
            : compact;
    }

    if (message && typeof message === 'object') {
        const maybeRecord = message as Record<string, unknown>;
        if (maybeRecord.type === 'text' && typeof maybeRecord.text === 'string') {
            return buildLineMessagePreview(maybeRecord.text);
        }
        if (typeof maybeRecord.altText === 'string') {
            return buildLineMessagePreview(maybeRecord.altText);
        }
        try {
            const asJson = JSON.stringify(maybeRecord);
            return buildLineMessagePreview(asJson);
        } catch {
            return null;
        }
    }

    return null;
}

export async function logLineNotificationAttempt(input: LineNotificationLogInput) {
    try {
        const recipientIds = Array.from(
            new Set(
                (input.recipients || [])
                    .map((value) => String(value || '').trim())
                    .filter((value) => value.length > 0),
            ),
        );

        const [lineUsers, lineCustomers, systemUsers] = recipientIds.length > 0
            ? await Promise.all([
                prisma.tbl_line_users.findMany({
                    where: { line_user_id: { in: recipientIds } },
                    select: {
                        line_user_id: true,
                        display_name: true,
                        full_name: true,
                        role: true,
                    },
                }),
                prisma.tbl_line_customers.findMany({
                    where: { line_user_id: { in: recipientIds } },
                    select: {
                        line_user_id: true,
                        full_name: true,
                        room_number: true,
                    },
                }),
                prisma.tbl_users.findMany({
                    where: { line_user_id: { in: recipientIds } },
                    select: {
                        line_user_id: true,
                        username: true,
                        role: true,
                    },
                }),
            ])
            : [[], [], []];

        const lineUserById = new Map(lineUsers.map((row) => [row.line_user_id, row]));
        const lineCustomerById = new Map(lineCustomers.map((row) => [row.line_user_id, row]));
        const systemUserById = new Map(systemUsers.map((row) => [row.line_user_id || '', row]));

        const recipients = recipientIds.map((recipientId) => {
            const lineUser = lineUserById.get(recipientId);
            const customer = lineCustomerById.get(recipientId);
            const systemUser = systemUserById.get(recipientId);

            return {
                line_user_id: recipientId,
                display_name: lineUser?.display_name || null,
                line_full_name: lineUser?.full_name || null,
                line_role: lineUser?.role || null,
                customer_name: customer?.full_name || null,
                customer_room: customer?.room_number || null,
                system_username: systemUser?.username || null,
                system_role: systemUser?.role || null,
            };
        });

        const action = input.success ? 'LINE_NOTIFY_SENT' : 'LINE_NOTIFY_FAILED';
        const details = {
            channel: input.channel,
            mode: input.mode,
            success: input.success,
            context: input.context || null,
            recipient_count: recipientIds.length,
            recipients,
            message_preview: buildLineMessagePreview(input.message),
            error: input.error || null,
        };

        await logSystemAction(
            action,
            'LineNotification',
            recipientIds.length > 0 ? recipientIds.join(',') : null,
            details,
            null,
            'system',
            'internal',
        );
    } catch (error) {
        console.error('Failed to create line notification log:', error);
    }
}
