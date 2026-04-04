
import { prisma } from './prisma';

const IMPORTANT_ONLY_MODE = process.env.SYSTEM_LOG_IMPORTANT_ONLY !== 'false';
const NON_ESSENTIAL_ACTIONS = new Set(['PAGE_VIEW']);
const MAX_LOG_DETAILS_LENGTH = 2000;

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
