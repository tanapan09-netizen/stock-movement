'use server';

import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { th } from 'date-fns/locale';

export async function getReportSummary(startDate?: Date, endDate?: Date) {
    try {
        const dateFilter = startDate && endDate ? {
            created_at: {
                gte: startDate,
                lte: endDate
            }
        } : {};

        // 1. Total Maintenance Cost
        const maintenanceCost = await prisma.tbl_maintenance_requests.aggregate({
            _sum: {
                actual_cost: true
            },
            where: {
                status: 'completed',
                ...dateFilter
            }
        });

        // 2. Total Part Request Cost
        const partRequestCost = await prisma.tbl_part_requests.aggregate({
            _sum: {
                estimated_price: true // Note: using estimated_price as actual price might not be tracked in this table directly
            },
            where: {
                status: 'approved',
                ...dateFilter
            }
        });

        // 3. Task Completion Rate
        const totalTasks = await prisma.tbl_maintenance_requests.count({ where: dateFilter });
        const completedTasks = await prisma.tbl_maintenance_requests.count({
            where: {
                status: 'completed',
                ...dateFilter
            }
        });

        // 4. Inventory Value
        const inventory = await prisma.tbl_products.findMany();
        const inventoryValue = inventory.reduce((sum, item) => sum + (Number(item.price_unit ?? 0) * (item.p_count ?? 0)), 0);

        return {
            success: true,
            data: {
                totalMaintenanceCost: maintenanceCost._sum.actual_cost || 0,
                totalPartCost: partRequestCost._sum.estimated_price || 0,
                totalCost: (Number(maintenanceCost._sum.actual_cost) || 0) + (Number(partRequestCost._sum.estimated_price) || 0),
                totalTasks,
                completedTasks,
                completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                inventoryValue
            }
        };

    } catch (error) {
        console.error('Error fetching report summary:', error);
        return { success: false, error: 'Failed to fetch report summary' };
    }
}

export async function getCostTrend() {
    try {
        // Last 6 months
        const today = new Date();
        const sixMonthsAgo = subMonths(today, 5);
        const start = startOfMonth(sixMonthsAgo);

        const requests = await prisma.tbl_maintenance_requests.findMany({
            where: {
                status: 'completed',
                created_at: { gte: start }
            },
            select: {
                created_at: true,
                actual_cost: true
            }
        });

        // Group by month
        const monthlyData: Record<string, number> = {};

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const date = subMonths(today, i);
            const key = format(date, 'MMM yyyy', { locale: th });
            monthlyData[key] = 0;
        }

        requests.forEach(req => {
            const key = format(req.created_at, 'MMM yyyy', { locale: th });
            if (req.actual_cost) {
                // If key exists (it might be older if we didn't filter perfectly matching loop, but here it matches)
                if (monthlyData[key] !== undefined) {
                    monthlyData[key] += Number(req.actual_cost);
                }
            }
        });

        // Convert to array and reverse to chronological order
        const data = Object.entries(monthlyData)
            .map(([name, cost]) => ({ name, cost }))
            .reverse();

        return { success: true, data };

    } catch (error) {
        console.error('Error fetching cost trend:', error);
        return { success: false, error: 'Failed to fetch cost trend' };
    }
}

export async function getTechnicianPerformance() {
    try {
        // Count tasks completed by each technician (assigned_to)
        // Note: assigned_to is a string name in this schema, not a relation ID (unfortunately)
        // Group by assigned_to
        const tasks = await prisma.tbl_maintenance_requests.groupBy({
            by: ['assigned_to'],
            where: {
                status: 'completed',
                assigned_to: { not: null }
            },
            _count: {
                request_id: true
            }
        });

        const data = tasks
            .filter(t => t.assigned_to !== null && t.assigned_to !== '')
            .map(t => ({
                name: t.assigned_to,
                completed: t._count.request_id
            }))
            .sort((a, b) => b.completed - a.completed)
            .slice(0, 10); // Top 10

        return { success: true, data };

    } catch (error) {
        console.error('Error fetching technician performance:', error);
        return { success: false, error: 'Failed to fetch technician stats' };
    }
}

export async function getCategoryStats() {
    try {
        const tasks = await prisma.tbl_maintenance_requests.groupBy({
            by: ['category'],
            _count: {
                request_id: true
            }
        });

        const data = tasks.map(t => ({
            name: t.category || 'Other',
            value: t._count.request_id
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching category stats:', error);
        return { success: false, error: 'Failed to fetch category stats' };
    }
}
