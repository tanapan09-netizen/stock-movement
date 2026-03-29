import { prisma } from '@/lib/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;
const APPROVAL_SLA_HOURS = 24;
const MAINTENANCE_NORMAL_SLA_HOURS = 72;
const MAINTENANCE_URGENT_SLA_HOURS = 4;
const DISPOSAL_ACTION_TYPES = ['Dispose', 'Disposed', 'Retire', 'Retired'];

export const KPI_METRICS = [
    'approval_sla',
    'register_lead',
    'utilization',
    'maintenance_sla',
    'inventory_accuracy',
    'disposal_cycle',
] as const;

export const KPI_GRAINS = ['day', 'week', 'month'] as const;

export type KpiMetric = (typeof KPI_METRICS)[number];
export type KpiGrain = (typeof KPI_GRAINS)[number];

export interface KpiFilters {
    from: Date;
    to: Date;
    location?: string;
    category?: string;
    department?: string;
}

export interface KpiSummary {
    approval_sla_pct: number;
    register_lead_days: number;
    utilization_pct: number;
    maintenance_sla_pct: number;
    inventory_accuracy_pct: number;
    disposal_cycle_days: number;
}

export interface KpiTrendPoint {
    period: string;
    value: number;
}

type RatioAccumulator = {
    total: number;
    matched: number;
};

type AverageAccumulator = {
    sum: number;
    count: number;
};

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function getDateRangeWhere(range: KpiFilters): { gte: Date; lt: Date } {
    return {
        gte: range.from,
        lt: addDays(range.to, 1),
    };
}

function safePercent(matched: number, total: number): number {
    if (total <= 0) return 0;
    return Number(((matched * 100) / total).toFixed(2));
}

function safeAverage(sum: number, count: number): number {
    if (count <= 0) return 0;
    return Number((sum / count).toFixed(2));
}

function diffHours(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}

function diffDays(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / DAY_MS;
}

function isMaintenanceTicketOnTime(priority: string | null | undefined, hoursTaken: number): boolean {
    const normalizedPriority = String(priority || '').trim().toLowerCase();
    const threshold = normalizedPriority === 'urgent'
        ? MAINTENANCE_URGENT_SLA_HOURS
        : MAINTENANCE_NORMAL_SLA_HOURS;

    return hoursTaken >= 0 && hoursTaken <= threshold;
}

function normalizeAssetStatus(status: string | null | undefined): string {
    return String(status || '').trim().toLowerCase();
}

function isAssetDisposedStatus(status: string | null | undefined): boolean {
    const normalized = normalizeAssetStatus(status);
    return normalized === 'disposed' || normalized === 'retired';
}

function isAssetInUseStatus(status: string | null | undefined): boolean {
    const normalized = normalizeAssetStatus(status);
    return normalized === 'active' || normalized === 'in_use' || normalized === 'in use';
}

function normalizeCountedQty(item: {
    final_count_qty: number | null;
    recount_qty: number | null;
    counted_qty: number | null;
}): number | null {
    if (item.final_count_qty !== null && item.final_count_qty !== undefined) {
        return item.final_count_qty;
    }
    if (item.recount_qty !== null && item.recount_qty !== undefined) {
        return item.recount_qty;
    }
    if (item.counted_qty !== null && item.counted_qty !== undefined) {
        return item.counted_qty;
    }
    return null;
}

function getAssetFilterWhere(filters: KpiFilters): Record<string, string> {
    const where: Record<string, string> = {};
    if (filters.category) where.category = filters.category;
    if (filters.location) where.location = filters.location;
    return where;
}

function toDateKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
    const dayStart = startOfUtcDay(date);
    const day = dayStart.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    dayStart.setUTCDate(dayStart.getUTCDate() + mondayOffset);
    return dayStart;
}

function startOfUtcMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getBucketDate(date: Date, grain: KpiGrain): Date {
    if (grain === 'week') return startOfUtcWeek(date);
    if (grain === 'month') return startOfUtcMonth(date);
    return startOfUtcDay(date);
}

function toBucketKey(date: Date, grain: KpiGrain): string {
    const bucketDate = getBucketDate(date, grain);
    if (grain === 'month') {
        const year = bucketDate.getUTCFullYear();
        const month = String(bucketDate.getUTCMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    return toDateKey(bucketDate);
}

function buildBuckets(from: Date, to: Date, grain: KpiGrain): string[] {
    const fromBucket = getBucketDate(from, grain);
    const toBucket = getBucketDate(to, grain);
    const buckets: string[] = [];
    const cursor = new Date(fromBucket);

    while (cursor.getTime() <= toBucket.getTime()) {
        buckets.push(toBucketKey(cursor, grain));
        if (grain === 'month') {
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        } else if (grain === 'week') {
            cursor.setUTCDate(cursor.getUTCDate() + 7);
        } else {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
    }

    return buckets;
}

async function getApprovalSla(range: KpiFilters): Promise<number> {
    const rows = await prisma.tbl_approval_requests.findMany({
        where: {
            status: { in: ['approved', 'rejected', 'returned'] },
            created_at: getDateRangeWhere(range),
        },
        select: {
            created_at: true,
            updated_at: true,
            approved_at: true,
            status: true,
        },
    });

    let total = 0;
    let onTime = 0;

    for (const row of rows) {
        const decisionAt = row.status === 'approved'
            ? (row.approved_at || row.updated_at)
            : row.updated_at;
        if (!decisionAt) continue;

        total += 1;
        const hoursTaken = diffHours(row.created_at, decisionAt);
        if (hoursTaken >= 0 && hoursTaken <= APPROVAL_SLA_HOURS) {
            onTime += 1;
        }
    }

    return safePercent(onTime, total);
}

async function getRegisterLeadDays(range: KpiFilters): Promise<number> {
    const assetWhere = getAssetFilterWhere(range);
    const assets = await prisma.tbl_assets.findMany({
        where: {
            created_at: getDateRangeWhere(range),
            ...assetWhere,
        },
        select: {
            purchase_date: true,
            created_at: true,
        },
    });

    let sum = 0;
    let count = 0;

    for (const asset of assets) {
        const days = diffDays(asset.purchase_date, asset.created_at);
        if (!Number.isFinite(days)) continue;

        sum += Math.max(days, 0);
        count += 1;
    }

    return safeAverage(sum, count);
}

async function getUtilization(range: KpiFilters): Promise<number> {
    const assetWhere = getAssetFilterWhere(range);
    const assets = await prisma.tbl_assets.findMany({
        where: assetWhere,
        select: {
            status: true,
        },
    });

    let activeCount = 0;
    let inUseCount = 0;

    for (const asset of assets) {
        if (!isAssetDisposedStatus(asset.status)) {
            activeCount += 1;
        }
        if (isAssetInUseStatus(asset.status)) {
            inUseCount += 1;
        }
    }

    return safePercent(inUseCount, activeCount);
}

async function getMaintenanceSla(range: KpiFilters): Promise<number> {
    const where: Record<string, unknown> = {
        completed_at: {
            gte: range.from,
            lt: addDays(range.to, 1),
        },
    };
    if (range.department) {
        where.department = range.department;
    }

    const rows = await prisma.tbl_maintenance_requests.findMany({
        where,
        select: {
            created_at: true,
            completed_at: true,
            priority: true,
        },
    });

    let total = 0;
    let onTime = 0;

    for (const row of rows) {
        if (!row.completed_at) continue;

        total += 1;
        const hoursTaken = diffHours(row.created_at, row.completed_at);
        if (isMaintenanceTicketOnTime(row.priority, hoursTaken)) {
            onTime += 1;
        }
    }

    return safePercent(onTime, total);
}

async function getInventoryAccuracy(range: KpiFilters): Promise<number> {
    const audits = await prisma.tbl_inventory_audits.findMany({
        where: {
            audit_date: getDateRangeWhere(range),
        },
        select: {
            tbl_audit_items: {
                select: {
                    counted_qty: true,
                    recount_qty: true,
                    final_count_qty: true,
                    system_qty: true,
                },
            },
        },
    });

    let total = 0;
    let matched = 0;

    for (const audit of audits) {
        for (const item of audit.tbl_audit_items) {
            const countedQty = normalizeCountedQty(item);
            if (countedQty === null) continue;

            total += 1;
            if (countedQty === item.system_qty) {
                matched += 1;
            }
        }
    }

    return safePercent(matched, total);
}

async function getDisposalCycleDays(range: KpiFilters): Promise<number> {
    const assetWhere = getAssetFilterWhere(range);
    const where: Record<string, unknown> = {
        action_type: {
            in: DISPOSAL_ACTION_TYPES,
        },
        action_date: getDateRangeWhere(range),
    };

    if (Object.keys(assetWhere).length > 0) {
        where.tbl_assets = {
            is: assetWhere,
        };
    }

    const histories = await prisma.tbl_asset_history.findMany({
        where,
        select: {
            action_date: true,
            tbl_assets: {
                select: {
                    purchase_date: true,
                },
            },
        },
    });

    let sum = 0;
    let count = 0;

    for (const history of histories) {
        const days = diffDays(history.tbl_assets.purchase_date, history.action_date);
        if (!Number.isFinite(days)) continue;

        sum += Math.max(days, 0);
        count += 1;
    }

    return safeAverage(sum, count);
}

export async function getKpiSummary(filters: KpiFilters): Promise<KpiSummary> {
    const [
        approval_sla_pct,
        register_lead_days,
        utilization_pct,
        maintenance_sla_pct,
        inventory_accuracy_pct,
        disposal_cycle_days,
    ] = await Promise.all([
        getApprovalSla(filters),
        getRegisterLeadDays(filters),
        getUtilization(filters),
        getMaintenanceSla(filters),
        getInventoryAccuracy(filters),
        getDisposalCycleDays(filters),
    ]);

    return {
        approval_sla_pct,
        register_lead_days,
        utilization_pct,
        maintenance_sla_pct,
        inventory_accuracy_pct,
        disposal_cycle_days,
    };
}

export async function getKpiTrend(filters: KpiFilters, metric: KpiMetric, grain: KpiGrain): Promise<KpiTrendPoint[]> {
    const buckets = buildBuckets(filters.from, filters.to, grain);

    if (metric === 'utilization') {
        const utilization = await getUtilization(filters);
        return buckets.map((period) => ({ period, value: utilization }));
    }

    if (metric === 'approval_sla') {
        const rows = await prisma.tbl_approval_requests.findMany({
            where: {
                status: { in: ['approved', 'rejected', 'returned'] },
                updated_at: getDateRangeWhere(filters),
            },
            select: {
                created_at: true,
                updated_at: true,
                approved_at: true,
                status: true,
            },
        });

        const map = new Map<string, RatioAccumulator>();
        for (const bucket of buckets) {
            map.set(bucket, { total: 0, matched: 0 });
        }

        for (const row of rows) {
            const decisionAt = row.status === 'approved'
                ? (row.approved_at || row.updated_at)
                : row.updated_at;
            if (!decisionAt) continue;
            if (decisionAt < filters.from || decisionAt >= addDays(filters.to, 1)) continue;

            const key = toBucketKey(decisionAt, grain);
            const bucket = map.get(key);
            if (!bucket) continue;

            bucket.total += 1;
            const hoursTaken = diffHours(row.created_at, decisionAt);
            if (hoursTaken >= 0 && hoursTaken <= APPROVAL_SLA_HOURS) {
                bucket.matched += 1;
            }
        }

        return buckets.map((period) => {
            const bucket = map.get(period) || { total: 0, matched: 0 };
            return {
                period,
                value: safePercent(bucket.matched, bucket.total),
            };
        });
    }

    if (metric === 'register_lead') {
        const assetWhere = getAssetFilterWhere(filters);
        const rows = await prisma.tbl_assets.findMany({
            where: {
                created_at: getDateRangeWhere(filters),
                ...assetWhere,
            },
            select: {
                created_at: true,
                purchase_date: true,
            },
        });

        const map = new Map<string, AverageAccumulator>();
        for (const bucket of buckets) {
            map.set(bucket, { sum: 0, count: 0 });
        }

        for (const row of rows) {
            const key = toBucketKey(row.created_at, grain);
            const bucket = map.get(key);
            if (!bucket) continue;

            const days = Math.max(diffDays(row.purchase_date, row.created_at), 0);
            if (!Number.isFinite(days)) continue;

            bucket.sum += days;
            bucket.count += 1;
        }

        return buckets.map((period) => {
            const bucket = map.get(period) || { sum: 0, count: 0 };
            return {
                period,
                value: safeAverage(bucket.sum, bucket.count),
            };
        });
    }

    if (metric === 'maintenance_sla') {
        const where: Record<string, unknown> = {
            completed_at: getDateRangeWhere(filters),
        };
        if (filters.department) where.department = filters.department;

        const rows = await prisma.tbl_maintenance_requests.findMany({
            where,
            select: {
                created_at: true,
                completed_at: true,
                priority: true,
            },
        });

        const map = new Map<string, RatioAccumulator>();
        for (const bucket of buckets) {
            map.set(bucket, { total: 0, matched: 0 });
        }

        for (const row of rows) {
            if (!row.completed_at) continue;

            const key = toBucketKey(row.completed_at, grain);
            const bucket = map.get(key);
            if (!bucket) continue;

            bucket.total += 1;
            const hoursTaken = diffHours(row.created_at, row.completed_at);
            if (isMaintenanceTicketOnTime(row.priority, hoursTaken)) {
                bucket.matched += 1;
            }
        }

        return buckets.map((period) => {
            const bucket = map.get(period) || { total: 0, matched: 0 };
            return {
                period,
                value: safePercent(bucket.matched, bucket.total),
            };
        });
    }

    if (metric === 'inventory_accuracy') {
        const audits = await prisma.tbl_inventory_audits.findMany({
            where: {
                audit_date: getDateRangeWhere(filters),
            },
            select: {
                audit_date: true,
                tbl_audit_items: {
                    select: {
                        counted_qty: true,
                        recount_qty: true,
                        final_count_qty: true,
                        system_qty: true,
                    },
                },
            },
        });

        const map = new Map<string, RatioAccumulator>();
        for (const bucket of buckets) {
            map.set(bucket, { total: 0, matched: 0 });
        }

        for (const audit of audits) {
            if (!audit.audit_date) continue;

            const key = toBucketKey(audit.audit_date, grain);
            const bucket = map.get(key);
            if (!bucket) continue;

            for (const item of audit.tbl_audit_items) {
                const countedQty = normalizeCountedQty(item);
                if (countedQty === null) continue;
                bucket.total += 1;
                if (countedQty === item.system_qty) {
                    bucket.matched += 1;
                }
            }
        }

        return buckets.map((period) => {
            const bucket = map.get(period) || { total: 0, matched: 0 };
            return {
                period,
                value: safePercent(bucket.matched, bucket.total),
            };
        });
    }

    const assetWhere = getAssetFilterWhere(filters);
    const where: Record<string, unknown> = {
        action_type: {
            in: DISPOSAL_ACTION_TYPES,
        },
        action_date: getDateRangeWhere(filters),
    };
    if (Object.keys(assetWhere).length > 0) {
        where.tbl_assets = {
            is: assetWhere,
        };
    }

    const rows = await prisma.tbl_asset_history.findMany({
        where,
        select: {
            action_date: true,
            tbl_assets: {
                select: {
                    purchase_date: true,
                },
            },
        },
    });

    const map = new Map<string, AverageAccumulator>();
    for (const bucket of buckets) {
        map.set(bucket, { sum: 0, count: 0 });
    }

    for (const row of rows) {
        const key = toBucketKey(row.action_date, grain);
        const bucket = map.get(key);
        if (!bucket) continue;

        const days = Math.max(diffDays(row.tbl_assets.purchase_date, row.action_date), 0);
        if (!Number.isFinite(days)) continue;

        bucket.sum += days;
        bucket.count += 1;
    }

    return buckets.map((period) => {
        const bucket = map.get(period) || { sum: 0, count: 0 };
        return {
            period,
            value: safeAverage(bucket.sum, bucket.count),
        };
    });
}
