'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function getPurchasingDashboardData() {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const reviewQueueWhere = {
            request_type: 'purchase',
            status: 'pending',
            current_step: 1,
        } as const;

        const issuePOQueueWhere = {
            request_type: 'purchase',
            status: 'pending',
            current_step: 4,
        } as const;

        const [reviewQueueCount, issuePOQueueCount, monthlyPOIssuedCount, monthlyPOSpendResult, recentPRsData, recentPOsData] = await Promise.all([
            prisma.tbl_approval_requests.count({ where: reviewQueueWhere }),
            prisma.tbl_approval_requests.count({ where: issuePOQueueWhere }),
            prisma.tbl_purchase_orders.count({
                where: {
                    order_date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            }),
            prisma.tbl_purchase_orders.aggregate({
                _sum: {
                    total_amount: true,
                },
                where: {
                    order_date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    status: {
                        not: 'cancelled',
                    },
                },
            }),
            prisma.tbl_approval_requests.findMany({
                where: {
                    request_type: 'purchase',
                    status: 'pending',
                    current_step: {
                        in: [1, 4],
                    },
                },
                include: {
                    tbl_users: {
                        select: { username: true },
                    },
                },
                orderBy: {
                    updated_at: 'desc',
                },
                take: 5,
            }),
            prisma.tbl_purchase_orders.findMany({
                orderBy: {
                    order_date: 'desc',
                },
                take: 5,
            }),
        ]);

        const monthlyPOSpend = Number(monthlyPOSpendResult._sum.total_amount || 0);

        const recentPRs = recentPRsData.map((pr) => ({
            ...pr,
            amount: pr.amount ? Number(pr.amount) : null,
            status: pr.status || 'pending',
            queue_label: pr.current_step === 4 ? 'รอจัดซื้อออก PO' : 'รอจัดซื้อทบทวน',
        }));

        const supplierIds = recentPOsData
            .map((po) => po.supplier_id)
            .filter((id): id is number => id !== null);

        const suppliers = await prisma.tbl_suppliers.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, name: true },
        });

        const recentPOs = recentPOsData.map((po) => ({
            ...po,
            status: po.status || 'draft',
            total_amount: po.total_amount ? Number(po.total_amount) : null,
            tbl_suppliers: { s_name: suppliers.find((supplier) => supplier.id === po.supplier_id)?.name || null },
        }));

        return {
            success: true,
            data: {
                summary: {
                    reviewQueueCount,
                    issuePOQueueCount,
                    monthlyPOIssuedCount,
                    monthlyPOSpend,
                },
                recentPRs,
                recentPOs,
            },
        };
    } catch (error: unknown) {
        console.error('Error fetching purchasing dashboard data:', error);
        return { success: false, error: 'Failed to fetch purchasing dashboard data' };
    }
}
