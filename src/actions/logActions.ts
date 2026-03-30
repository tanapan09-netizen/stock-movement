'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { canManageAdminSecurity } from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';

// ... existing imports

// createSystemLog removed in favor of @/lib/logger

export async function getSystemLogs(page = 1, limit = 20, filters?: any) {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user);
    if (!session || !canManageAdminSecurity(permissionContext.role, permissionContext.permissions)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const where: any = {};
        if (filters?.action && filters.action !== 'all') where.action = filters.action;
        if (filters?.username) where.username = { contains: filters.username };
        if (filters?.startDate || filters?.endDate) {
            const createdAtWhere: { gte?: Date; lte?: Date } = {};

            if (filters?.startDate) {
                createdAtWhere.gte = new Date(`${filters.startDate}T00:00:00`);
            }

            if (filters?.endDate) {
                createdAtWhere.lte = new Date(`${filters.endDate}T23:59:59.999`);
            }

            where.created_at = createdAtWhere;
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.tbl_system_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                include: {
                    tbl_users: {
                        select: {
                            role: true
                        }
                    }
                }
            }),
            prisma.tbl_system_logs.count({ where })
        ]);

        return { success: true, data: logs, total, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        console.error('Error fetching logs:', error);
        return { success: false, error: 'Failed to fetch logs' };
    }
}
