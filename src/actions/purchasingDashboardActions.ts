'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function getPurchasingDashboardData() {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // We can do permission checks here, but UI layer also handles it.
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 1. Pending Purchase Requests (waiting for approval or processing)
        const pendingPRCount = await prisma.tbl_approval_requests.count({
            where: {
                request_type: 'purchase',
                status: 'pending'
            }
        });

        // 2. Approved Purchase Requests (ready for PO usually)
        const approvedPRCount = await prisma.tbl_approval_requests.count({
            where: {
                request_type: 'purchase',
                status: 'approved'
            }
        });

        // 3. Purchase Orders Issued this Month
        const monthlyPOIssuedCount = await prisma.tbl_purchase_orders.count({
            where: {
                order_date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        // 4. Monthly PO Spend
        const monthlyPOSpendResult = await prisma.tbl_purchase_orders.aggregate({
            _sum: {
                total_amount: true
            },
            where: {
                order_date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                status: {
                    not: 'cancelled'
                }
            }
        });
        const monthlyPOSpend = Number(monthlyPOSpendResult._sum.total_amount || 0);

        // 5. Recent Purchase Requests (Top 5)
        const recentPRsData = await prisma.tbl_approval_requests.findMany({
            where: {
                request_type: 'purchase'
            },
            include: {
                tbl_users: {
                    select: { username: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        });

        const recentPRs = recentPRsData.map(pr => ({
            ...pr,
            amount: pr.amount ? Number(pr.amount) : null,
            status: pr.status || 'pending'
        }));

        // 6. Recent Purchase Orders (Top 5)
        const recentPOsData = await prisma.tbl_purchase_orders.findMany({
            orderBy: {
                order_date: 'desc'
            },
            take: 5
        });

        // 7. Manually fetch supplier names since schema lacks direct relation
        const supplierIds = recentPOsData.map(po => po.supplier_id).filter((id): id is number => id !== null);
        const suppliers = await prisma.tbl_suppliers.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, name: true }
        });

        const recentPOs = recentPOsData.map(po => ({
            ...po,
            status: po.status || 'draft',
            total_amount: po.total_amount ? Number(po.total_amount) : null,
            tbl_suppliers: { s_name: suppliers.find(s => s.id === po.supplier_id)?.name || null }
        }));

        return {
            success: true,
            data: {
                summary: {
                    pendingPRCount,
                    approvedPRCount,
                    monthlyPOIssuedCount,
                    monthlyPOSpend
                },
                recentPRs,
                recentPOs
            }
        };

    } catch (error: unknown) {
        console.error('Error fetching purchasing dashboard data:', error);
        return { success: false, error: 'Failed to fetch purchasing dashboard data' };
    }
}
