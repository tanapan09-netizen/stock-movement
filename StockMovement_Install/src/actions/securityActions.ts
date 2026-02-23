'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function cleanupAuditLogs(retentionDays: number) {
    try {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - retentionDays);

        // Clean up tbl_system_logs
        const deletedSystemLogs = await prisma.tbl_system_logs.deleteMany({
            where: {
                created_at: {
                    lt: dateThreshold
                }
            }
        });

        // Clean up tbl_action_log (Legacy?) - Optional but good to check
        const deletedActionLogs = await prisma.tbl_action_log.deleteMany({
            where: {
                created_at: {
                    lt: dateThreshold
                }
            }
        });

        // Clean up prisma audit_log/audit_logs if they are used
        // Based on schema, they exist. Let's clean them too for completeness.
        await prisma.audit_log.deleteMany({
            where: {
                created_at: {
                    lt: dateThreshold
                }
            }
        });
        await prisma.audit_logs.deleteMany({
            where: {
                created_at: {
                    lt: dateThreshold
                }
            }
        });

        revalidatePath('/admin/security');

        return {
            success: true,
            message: `Cleanup effective. Deleted ${deletedSystemLogs.count} system logs.`
        };
    } catch (error) {
        console.error('Error cleaning logs:', error);
        return { success: false, error: 'Failed to clean logs' };
    }
}
