'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// ... existing imports

// createSystemLog removed in favor of @/lib/logger

export async function getSystemLogs(page = 1, limit = 20, filters?: any) {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const where: any = {};
        if (filters?.action && filters.action !== 'all') where.action = filters.action;
        if (filters?.username) where.username = { contains: filters.username };
        if (filters?.startDate && filters?.endDate) {
            where.created_at = {
                gte: new Date(filters.startDate),
                lte: new Date(new Date(filters.endDate).setHours(23, 59, 59))
            };
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
