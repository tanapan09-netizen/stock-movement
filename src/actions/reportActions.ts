'use server';

import { prisma } from '@/lib/prisma';
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
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

type MovementDirection = 'in' | 'out' | 'other';

export interface MovementMonthlyTrendRow {
    monthKey: string;
    monthLabel: string;
    inQty: number;
    outQty: number;
    netQty: number;
    movementCount: number;
    uniqueProducts: number;
}

export interface MovementProductRow {
    p_id: string;
    p_name: string;
    p_unit: string;
    supplier: string;
    currentStock: number;
    inQty: number;
    outQty: number;
    netQty: number;
    movementCount: number;
    lastMovementAt: Date | null;
}

export interface MovementInactiveProductRow {
    p_id: string;
    p_name: string;
    p_unit: string;
    supplier: string;
    currentStock: number;
    safetyStock: number;
    lastMovementAt: Date | null;
}

export interface MovementMonthlyReportData {
    targetMonth: string;
    targetMonthLabel: string;
    periodStart: Date;
    periodEnd: Date;
    monthSummary: MovementMonthlyTrendRow[];
    movementProducts: MovementProductRow[];
    nonMovingProducts: MovementInactiveProductRow[];
    outOfStockProducts: MovementInactiveProductRow[];
    nonMovingOutOfStockProducts: MovementInactiveProductRow[];
    summary: {
        totalProducts: number;
        movedProducts: number;
        nonMovingProducts: number;
        outOfStockProducts: number;
        nonMovingOutOfStockProducts: number;
        selectedMonthInQty: number;
        selectedMonthOutQty: number;
        selectedMonthNetQty: number;
        selectedMonthMovementCount: number;
    };
}

function resolveTargetMonthStart(targetMonth?: string): Date {
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
        return startOfMonth(new Date());
    }

    const [yearText, monthText] = targetMonth.split('-');
    const year = Number.parseInt(yearText, 10);
    const month = Number.parseInt(monthText, 10);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return startOfMonth(new Date());
    }

    return new Date(year, month - 1, 1);
}

function classifyMovementDirection(movementType?: string | null): MovementDirection {
    if (!movementType) return 'other';

    const normalized = movementType.trim().toLowerCase();
    if (!normalized) return 'other';

    const compact = normalized.replace(/\s+/g, '');

    const inboundMatch =
        compact === 'in'
        || compact === 'add'
        || compact === 'stockin'
        || compact === 'receive'
        || compact === 'received'
        || normalized.includes('รับ')
        || normalized.includes('เข้า')
        || normalized.includes('เพิ่ม');

    if (inboundMatch) return 'in';

    const outboundMatch =
        compact === 'out'
        || compact === 'stockout'
        || compact === 'withdraw'
        || compact === 'issue'
        || compact === 'remove'
        || normalized.includes('เบิก')
        || normalized.includes('ออก')
        || normalized.includes('ลด');

    if (outboundMatch) return 'out';

    return 'other';
}

type MutableMonthBucket = {
    monthKey: string;
    monthLabel: string;
    inQty: number;
    outQty: number;
    movementCount: number;
    products: Set<string>;
};

type MutableProductBucket = {
    inQty: number;
    outQty: number;
    movementCount: number;
    lastMovementAt: Date | null;
};

function toLocaleSortKey(value?: string | null) {
    return (value || '').trim().toLowerCase();
}

export async function getMovementMonthlyReport(targetMonth?: string) {
    try {
        const targetMonthStart = resolveTargetMonthStart(targetMonth);
        const targetMonthEnd = endOfMonth(targetMonthStart);
        const targetMonthKey = format(targetMonthStart, 'yyyy-MM');

        const periodStart = startOfMonth(subMonths(targetMonthStart, 11));
        const periodEnd = targetMonthEnd;

        const [products, movementRows, latestMovementRows] = await Promise.all([
            prisma.tbl_products.findMany({
                where: { active: true },
                select: {
                    p_id: true,
                    p_name: true,
                    p_unit: true,
                    supplier: true,
                    p_count: true,
                    safety_stock: true,
                },
                orderBy: { p_id: 'asc' },
            }),
            prisma.tbl_product_movements.findMany({
                where: {
                    movement_time: {
                        gte: periodStart,
                        lte: periodEnd,
                    },
                },
                select: {
                    p_id: true,
                    movement_type: true,
                    quantity: true,
                    movement_time: true,
                },
                orderBy: { movement_time: 'asc' },
            }),
            prisma.tbl_product_movements.groupBy({
                by: ['p_id'],
                _max: { movement_time: true },
            }),
        ]);

        const monthlyBuckets = new Map<string, MutableMonthBucket>();
        for (let offset = 0; offset < 12; offset += 1) {
            const monthDate = addMonths(periodStart, offset);
            const monthKey = format(monthDate, 'yyyy-MM');
            monthlyBuckets.set(monthKey, {
                monthKey,
                monthLabel: format(monthDate, 'MMM yyyy', { locale: th }),
                inQty: 0,
                outQty: 0,
                movementCount: 0,
                products: new Set<string>(),
            });
        }

        const selectedMonthProductBuckets = new Map<string, MutableProductBucket>();

        movementRows.forEach((row) => {
            const monthKey = format(row.movement_time, 'yyyy-MM');
            const monthBucket = monthlyBuckets.get(monthKey);
            if (!monthBucket) return;

            const direction = classifyMovementDirection(row.movement_type);
            const quantity = Number(row.quantity || 0);

            if (direction === 'in') monthBucket.inQty += quantity;
            if (direction === 'out') monthBucket.outQty += quantity;

            monthBucket.movementCount += 1;
            monthBucket.products.add(row.p_id);

            if (monthKey !== targetMonthKey) return;

            const productBucket = selectedMonthProductBuckets.get(row.p_id) || {
                inQty: 0,
                outQty: 0,
                movementCount: 0,
                lastMovementAt: null,
            };

            if (direction === 'in') productBucket.inQty += quantity;
            if (direction === 'out') productBucket.outQty += quantity;

            productBucket.movementCount += 1;
            if (!productBucket.lastMovementAt || row.movement_time > productBucket.lastMovementAt) {
                productBucket.lastMovementAt = row.movement_time;
            }

            selectedMonthProductBuckets.set(row.p_id, productBucket);
        });

        const productMap = new Map(products.map((product) => [product.p_id, product]));
        const latestMovementMap = new Map(latestMovementRows.map((row) => [row.p_id, row._max.movement_time]));

        const monthSummary: MovementMonthlyTrendRow[] = Array.from(monthlyBuckets.values()).map((bucket) => ({
            monthKey: bucket.monthKey,
            monthLabel: bucket.monthLabel,
            inQty: bucket.inQty,
            outQty: bucket.outQty,
            netQty: bucket.inQty - bucket.outQty,
            movementCount: bucket.movementCount,
            uniqueProducts: bucket.products.size,
        }));

        const movementProducts: MovementProductRow[] = Array.from(selectedMonthProductBuckets.entries())
            .map(([p_id, bucket]) => {
                const product = productMap.get(p_id);
                return {
                    p_id,
                    p_name: product?.p_name || p_id,
                    p_unit: product?.p_unit || '-',
                    supplier: product?.supplier || '-',
                    currentStock: product?.p_count ?? 0,
                    inQty: bucket.inQty,
                    outQty: bucket.outQty,
                    netQty: bucket.inQty - bucket.outQty,
                    movementCount: bucket.movementCount,
                    lastMovementAt: bucket.lastMovementAt || null,
                };
            })
            .sort((a, b) => {
                const movementA = a.inQty + a.outQty;
                const movementB = b.inQty + b.outQty;
                if (movementB !== movementA) return movementB - movementA;
                return toLocaleSortKey(a.p_id).localeCompare(toLocaleSortKey(b.p_id));
            });

        const movedProductIds = new Set(selectedMonthProductBuckets.keys());
        const nonMovingProducts: MovementInactiveProductRow[] = products
            .filter((product) => !movedProductIds.has(product.p_id))
            .map((product) => ({
                p_id: product.p_id,
                p_name: product.p_name,
                p_unit: product.p_unit || '-',
                supplier: product.supplier || '-',
                currentStock: product.p_count ?? 0,
                safetyStock: product.safety_stock ?? 0,
                lastMovementAt: latestMovementMap.get(product.p_id) || null,
            }))
            .sort((a, b) => {
                const aTime = a.lastMovementAt ? a.lastMovementAt.getTime() : Number.NEGATIVE_INFINITY;
                const bTime = b.lastMovementAt ? b.lastMovementAt.getTime() : Number.NEGATIVE_INFINITY;
                if (aTime !== bTime) return aTime - bTime;
                return toLocaleSortKey(a.p_id).localeCompare(toLocaleSortKey(b.p_id));
            });

        const outOfStockProducts: MovementInactiveProductRow[] = products
            .filter((product) => (product.p_count ?? 0) <= 0)
            .map((product) => ({
                p_id: product.p_id,
                p_name: product.p_name,
                p_unit: product.p_unit || '-',
                supplier: product.supplier || '-',
                currentStock: product.p_count ?? 0,
                safetyStock: product.safety_stock ?? 0,
                lastMovementAt: latestMovementMap.get(product.p_id) || null,
            }))
            .sort((a, b) => {
                const aName = toLocaleSortKey(a.p_name || a.p_id);
                const bName = toLocaleSortKey(b.p_name || b.p_id);
                const nameCompare = aName.localeCompare(bName);
                if (nameCompare !== 0) return nameCompare;
                return toLocaleSortKey(a.p_id).localeCompare(toLocaleSortKey(b.p_id));
            });

        const nonMovingOutOfStockProducts = nonMovingProducts.filter((product) => product.currentStock <= 0);

        const selectedMonthSummary = monthSummary.find((row) => row.monthKey === targetMonthKey) || {
            inQty: 0,
            outQty: 0,
            netQty: 0,
            movementCount: 0,
            uniqueProducts: 0,
        };

        const data: MovementMonthlyReportData = {
            targetMonth: targetMonthKey,
            targetMonthLabel: format(targetMonthStart, 'MMMM yyyy', { locale: th }),
            periodStart,
            periodEnd,
            monthSummary,
            movementProducts,
            nonMovingProducts,
            outOfStockProducts,
            nonMovingOutOfStockProducts,
            summary: {
                totalProducts: products.length,
                movedProducts: movementProducts.length,
                nonMovingProducts: nonMovingProducts.length,
                outOfStockProducts: outOfStockProducts.length,
                nonMovingOutOfStockProducts: nonMovingOutOfStockProducts.length,
                selectedMonthInQty: selectedMonthSummary.inQty,
                selectedMonthOutQty: selectedMonthSummary.outQty,
                selectedMonthNetQty: selectedMonthSummary.netQty,
                selectedMonthMovementCount: selectedMonthSummary.movementCount,
            },
        };

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching movement monthly report:', error);
        return { success: false, error: 'Failed to fetch movement monthly report' };
    }
}
