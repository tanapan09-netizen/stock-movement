
import { prisma } from './prisma';

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
        const detailsString = typeof details === 'string' ? details : JSON.stringify(details);

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
