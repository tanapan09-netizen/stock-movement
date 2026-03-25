import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { canAccessPettyCashDashboard } from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';

export async function getPettyCashAnalytics() {
    try {
        const session = await auth();
        if (!session?.user) {
            throw new Error('Unauthorized');
        }

        const permissionContext = await getUserPermissionContext(session.user);

        if (!canAccessPettyCashDashboard(permissionContext.role, permissionContext.permissions)) {
            throw new Error('Permission denied');
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // 1. Total dispensed this month
        const monthlyDispensed = await prisma.tbl_petty_cash.aggregate({
            where: {
                status: { in: ['dispensed', 'clearing', 'reconciled'] },
                dispensed_at: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _sum: {
                actual_spent: true,
                dispensed_amount: true
            }
        });

        // 2. Pending verifications (receipts missing)
        const pendingReceiptsCount = await prisma.tbl_petty_cash.count({
            where: {
                status: { in: ['clearing', 'reconciled'] },
                has_original_receipt: false
            }
        });

        // 3. Summary by purpose (simple categorization based on text matching for demonstration)
        // Since we don't have strict categories, we group by who requested it for the chart
        const expensesByUser = await prisma.tbl_petty_cash.groupBy({
            by: ['requested_by'],
            where: {
                status: { in: ['dispensed', 'clearing', 'reconciled'] },
                dispensed_at: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _sum: {
                actual_spent: true,
                dispensed_amount: true
            }
        });

        // 4. Monthly Trend (last 6 months)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const requestsLast6Months = await prisma.tbl_petty_cash.findMany({
            where: {
                status: { in: ['reconciled', 'clearing', 'dispensed'] },
                dispensed_at: {
                    gte: sixMonthsAgo
                }
            },
            select: {
                dispensed_at: true,
                actual_spent: true,
                dispensed_amount: true
            }
        });

        // Process monthly trend data
        const trendMap = new Map();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('th-TH', { month: 'short' });
            trendMap.set(monthName, 0);
        }

        requestsLast6Months.forEach(req => {
            if (req.dispensed_at) {
                const monthName = req.dispensed_at.toLocaleString('th-TH', { month: 'short' });
                const amount = Number(req.actual_spent || req.dispensed_amount || 0);
                if (trendMap.has(monthName)) {
                    trendMap.set(monthName, trendMap.get(monthName) + amount);
                }
            }
        });

        const trendData = Array.from(trendMap.entries()).map(([month, total]) => ({
            month,
            total
        }));

        // Process user data for chart
        const userData = expensesByUser.map(item => ({
            name: item.requested_by,
            amount: Number(item._sum.actual_spent || item._sum.dispensed_amount || 0)
        })).sort((a, b) => b.amount - a.amount).slice(0, 5); // Top 5

        return {
            success: true,
            data: {
                monthlyTotal: Number(monthlyDispensed._sum.actual_spent || monthlyDispensed._sum.dispensed_amount || 0),
                pendingReceiptsCount,
                trendData,
                userData
            }
        };

    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        return { success: false, error: error.message };
    }
}
