import Link from 'next/link';
import { FloatingSearchInput } from '@/components/FloatingField';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    MapPin,
    Plus,
    Printer,
} from 'lucide-react';

import { auth } from '@/auth';
import AssetActions from '@/components/AssetActions';
import AssetImage from '@/components/AssetImage';
import { canAccessDashboardPage } from '@/lib/rbac';
import {
    ASSET_REGISTRY_PAGE_SIZE,
    buildAssetRegistryOrderBy,
    buildAssetRegistryWhere,
    normalizeAssetRegistryFilters,
} from '@/lib/server/asset-registry-query';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { prisma } from '@/lib/prisma';

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

type AssetDepreciationSnapshot = {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    netBookValue: number;
    totalDepreciable: number;
};

function calculateAssetDepreciationSnapshot(input: {
    cost: number;
    salvage: number;
    life: number;
    purchaseDate: Date;
    cutoffDate: Date;
}): AssetDepreciationSnapshot {
    const { cost, salvage, life, purchaseDate, cutoffDate } = input;
    if (life <= 0 || cost <= salvage || cutoffDate.getTime() < purchaseDate.getTime()) {
        return {
            annualDepreciation: 0,
            accumulatedDepreciation: 0,
            netBookValue: cost,
            totalDepreciable: Math.max(0, cost - salvage),
        };
    }

    const totalDepreciable = Math.max(0, cost - salvage);
    const annualDepreciation = totalDepreciable / life;
    const msPerDay = 1000 * 60 * 60 * 24;
    const endOfLifeDate = new Date(purchaseDate);
    endOfLifeDate.setFullYear(purchaseDate.getFullYear() + life);
    const scheduleEndDate = cutoffDate.getTime() < endOfLifeDate.getTime() ? cutoffDate : endOfLifeDate;
    const purchaseYear = purchaseDate.getFullYear();
    const currentYear = scheduleEndDate.getFullYear();

    let accumulatedDepreciation = 0;

    for (let year = purchaseYear; year <= currentYear; year++) {
        const periodStart = new Date(Math.max(purchaseDate.getTime(), new Date(year, 0, 1).getTime()));
        const periodEnd = new Date(Math.min(scheduleEndDate.getTime(), new Date(year, 11, 31).getTime()));
        if (periodEnd.getTime() < periodStart.getTime()) continue;

        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const daysInThisYear = isLeapYear ? 366 : 365;
        const daysUsed = Math.floor((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1;
        let expense = (annualDepreciation / daysInThisYear) * daysUsed;

        if (accumulatedDepreciation + expense > totalDepreciable) {
            expense = totalDepreciable - accumulatedDepreciation;
        }

        accumulatedDepreciation += expense;
        if (accumulatedDepreciation >= totalDepreciable) break;
    }

    return {
        annualDepreciation,
        accumulatedDepreciation,
        netBookValue: cost - accumulatedDepreciation,
        totalDepreciable,
    };
}

function getImageUrl(url: string | null) {
    if (!url) return null;
    try {
        const parsed = JSON.parse(url);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
        // ignore JSON parse error
    }
    if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
    return `/uploads/${url}`;
}

function getStatusBadgeClass(status: string | null | undefined) {
    if (status === 'Active') return 'bg-green-100 text-green-800';
    if (status === 'InRepair') return 'bg-amber-100 text-amber-800';
    if (status === 'DepreciationPaused') return 'bg-violet-100 text-violet-800';
    if (status === 'Disposed') return 'bg-red-100 text-red-800';
    if (status === 'Sold') return 'bg-rose-100 text-rose-800';
    if (status === 'Lost') return 'bg-slate-200 text-slate-800';
    return 'bg-slate-100 text-slate-700';
}

function getStatusLabel(status: string | null | undefined) {
    switch (status) {
        case 'Active':
            return 'ใช้งาน';
        case 'InRepair':
            return 'ซ่อม';
        case 'DepreciationPaused':
            return 'พักค่าเสื่อม';
        case 'Disposed':
            return 'จำหน่าย';
        case 'Sold':
            return 'ขายแล้ว';
        case 'Lost':
            return 'สูญหาย';
        default:
            return status || 'ไม่ระบุ';
    }
}

function buildQueryString(
    filters: ReturnType<typeof normalizeAssetRegistryFilters>,
    page: number,
) {
    const params = new URLSearchParams();

    if (filters.q) params.set('q', filters.q);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.location) params.set('location', filters.location);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.sort && filters.sort !== 'created_desc') params.set('sort', filters.sort);
    if (page > 1) params.set('page', String(page));

    return params.toString();
}

function buildExportQueryString(filters: ReturnType<typeof normalizeAssetRegistryFilters>) {
    const params = new URLSearchParams();

    if (filters.q) params.set('q', filters.q);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.location) params.set('location', filters.location);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.sort && filters.sort !== 'created_desc') params.set('sort', filters.sort);

    return params.toString();
}

function buildStatusQuickFilterHref(
    filters: ReturnType<typeof normalizeAssetRegistryFilters>,
    status: string,
) {
    const query = buildQueryString(
        {
            ...filters,
            status,
        },
        1,
    );
    return `/assets${query ? `?${query}` : ''}`;
}

export default async function AssetsPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    const rawSearchParams = (await searchParams) || {};
    const filters = normalizeAssetRegistryFilters(rawSearchParams);
    const where = buildAssetRegistryWhere(filters);
    const orderBy = buildAssetRegistryOrderBy(filters.sort);
    const statusScopeWhere = buildAssetRegistryWhere({
        ...filters,
        status: 'all',
    });

    const [
        totalFiltered,
        totalAssets,
        totalValueAggregate,
        statusGroups,
        categoryRows,
        locationRows,
    ] = await Promise.all([
        prisma.tbl_assets.count({ where }),
        prisma.tbl_assets.count(),
        prisma.tbl_assets.aggregate({ _sum: { purchase_price: true } }),
        prisma.tbl_assets.groupBy({
            by: ['status'],
            where: statusScopeWhere,
            _count: { _all: true },
        }),
        prisma.tbl_assets.findMany({
            distinct: ['category'],
            select: { category: true },
            orderBy: { category: 'asc' },
        }),
        prisma.tbl_assets.findMany({
            distinct: ['location'],
            select: { location: true },
            where: { location: { not: null } },
            orderBy: { location: 'asc' },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalFiltered / ASSET_REGISTRY_PAGE_SIZE));
    const currentPage = Math.min(filters.page, totalPages);

    const assets = await prisma.tbl_assets.findMany({
        where,
        orderBy,
        skip: (currentPage - 1) * ASSET_REGISTRY_PAGE_SIZE,
        take: ASSET_REGISTRY_PAGE_SIZE,
    });

    const pausedAssetIds = assets
        .filter((asset) => asset.status === 'DepreciationPaused')
        .map((asset) => asset.asset_id);

    const pauseHistories = pausedAssetIds.length > 0
        ? await prisma.tbl_asset_history.findMany({
            where: {
                asset_id: { in: pausedAssetIds },
                action_type: 'DepreciationPause',
            },
            orderBy: [{ asset_id: 'asc' }, { action_date: 'desc' }],
            select: {
                asset_id: true,
                action_date: true,
            },
        })
        : [];

    const pauseDateByAsset = new Map<number, Date>();
    for (const row of pauseHistories) {
        if (!pauseDateByAsset.has(row.asset_id)) {
            pauseDateByAsset.set(row.asset_id, new Date(row.action_date));
        }
    }

    const now = new Date();
    const depreciationRows = assets.map((asset) => {
        const cost = Number(asset.purchase_price || 0);
        const salvage = Number(asset.salvage_value || 0);
        const life = Number(asset.useful_life_years || 0);
        const purchaseDate = new Date(asset.purchase_date);
        const cutoffDate = asset.status === 'DepreciationPaused'
            ? (pauseDateByAsset.get(asset.asset_id) || now)
            : now;
        const snapshot = calculateAssetDepreciationSnapshot({
            cost,
            salvage,
            life,
            purchaseDate,
            cutoffDate,
        });

        return {
            asset_id: asset.asset_id,
            asset_code: asset.asset_code,
            asset_name: asset.asset_name,
            status: asset.status,
            purchaseDate,
            cutoffDate,
            cost,
            salvage,
            life,
            ...snapshot,
        };
    });

    const totalAccumulatedDepreciationInPage = depreciationRows.reduce(
        (sum, row) => sum + row.accumulatedDepreciation,
        0,
    );
    const totalNetBookValueInPage = depreciationRows.reduce((sum, row) => sum + row.netBookValue, 0);

    const statusCountMap = statusGroups.reduce<Record<string, number>>((acc, row) => {
        acc[row.status || 'Unknown'] = row._count._all;
        return acc;
    }, {});

    const activeCount = statusCountMap.Active || 0;
    const disposedCount = statusCountMap.Disposed || 0;
    const inRepairCount = statusCountMap.InRepair || 0;
    const pausedCount = statusCountMap.DepreciationPaused || 0;
    const totalValue = Number(totalValueAggregate._sum.purchase_price || 0);
    const statusScopeTotal = statusGroups.reduce((sum, row) => sum + row._count._all, 0);

    const categories = categoryRows
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value));

    const locations = locationRows
        .map((row) => row.location)
        .filter((value): value is string => Boolean(value));

    const safeFilters = {
        ...filters,
        page: currentPage,
    };

    const exportQuery = buildExportQueryString(safeFilters);
    const exportHref = `/api/assets/export${exportQuery ? `?${exportQuery}` : ''}`;
    const printHref = `/print/assets${exportQuery ? `?${exportQuery}` : ''}`;
    const printGroupsHref = `/print/assets/groups${exportQuery ? `?${exportQuery}` : ''}`;

    const prevHref = (() => {
        const query = buildQueryString(safeFilters, Math.max(1, currentPage - 1));
        return `/assets${query ? `?${query}` : ''}`;
    })();

    const nextHref = (() => {
        const query = buildQueryString(safeFilters, Math.min(totalPages, currentPage + 1));
        return `/assets${query ? `?${query}` : ''}`;
    })();

    const quickStatusFilters = [
        { value: 'all', label: 'ทั้งหมด', count: statusScopeTotal },
        { value: 'Active', label: 'ใช้งาน', count: activeCount },
        { value: 'InRepair', label: 'ซ่อม', count: inRepairCount },
        { value: 'DepreciationPaused', label: 'พักค่าเสื่อม', count: pausedCount },
        { value: 'Disposed', label: 'จำหน่าย', count: disposedCount },
    ].filter((item) => item.value === filters.status || item.count > 0 || item.value === 'all');

    const startItem = totalFiltered === 0 ? 0 : (currentPage - 1) * ASSET_REGISTRY_PAGE_SIZE + 1;
    const endItem = totalFiltered === 0 ? 0 : Math.min(currentPage * ASSET_REGISTRY_PAGE_SIZE, totalFiltered);

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-sky-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">ทะเบียนทรัพย์สิน</h1>
                        <p className="text-sm text-slate-600">ค้นหา กรอง และติดตามข้อมูลทรัพย์สินทั้งหมดในระบบ</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/assets/rooms"
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <MapPin className="mr-2 h-4 w-4" /> รายละเอียดตามห้อง
                        </Link>
                        <Link
                            href={exportHref}
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Link>
                        <Link
                            href={printHref}
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <Printer className="mr-2 h-4 w-4" /> พิมพ์ทะเบียน
                        </Link>
                        <Link
                            href={printGroupsHref}
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <Printer className="mr-2 h-4 w-4" /> พิมพ์รายงานกลุ่ม
                        </Link>
                        {canEditPage && (
                            <details className="group relative">
                                <summary className="inline-flex list-none cursor-pointer items-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 [&::-webkit-details-marker]:hidden">
                                    <Plus className="mr-2 h-4 w-4" /> เพิ่มสินทรัพย์
                                    <ChevronDown className="ml-1 h-4 w-4 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                                    <Link
                                        href="/assets/new?mode=purchase"
                                        className="block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        ซื้อสินทรัพย์ผ่านใหม่
                                    </Link>
                                    <Link
                                        href="/assets/new?mode=opening"
                                        className="block border-t border-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        เพิ่มสินทรัพย์ยกมา
                                    </Link>
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="card p-4">
                    <div className="text-xs text-slate-500">ทรัพย์สินทั้งหมด</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">{totalAssets.toLocaleString('th-TH')}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">ใช้งานปกติ</div>
                    <div className="mt-1 text-xl font-bold text-green-700">{activeCount.toLocaleString('th-TH')}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">ส่งซ่อม</div>
                    <div className="mt-1 text-xl font-bold text-amber-700">{inRepairCount.toLocaleString('th-TH')}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">หยุดคิดค่าเสื่อม</div>
                    <div className="mt-1 text-xl font-bold text-violet-700">{pausedCount.toLocaleString('th-TH')}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">มูลค่าซื้อรวม</div>
                    <div className="mt-1 text-xl font-bold text-blue-700">{totalValue.toLocaleString('th-TH')}</div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Filter className="h-4 w-4 text-cyan-600" />
                        กรองสถานะแบบเร็ว
                    </div>
                    <span className="text-sm text-slate-500">ผลลัพธ์ {totalFiltered.toLocaleString('th-TH')} รายการ</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {quickStatusFilters.map((item) => {
                        const isActive = filters.status === item.value;
                        return (
                            <Link
                                key={item.value}
                                href={buildStatusQuickFilterHref(safeFilters, item.value)}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${isActive
                                    ? 'border-cyan-300 bg-cyan-100 text-cyan-800'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:text-cyan-700'
                                    }`}
                            >
                                <span>{item.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-cyan-200 text-cyan-900' : 'bg-slate-100 text-slate-600'}`}>
                                    {item.count.toLocaleString('th-TH')}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <input type="hidden" name="page" value="1" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                    <div className="xl:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">ค้นหา</label>
                        <FloatingSearchInput
                            type="text"
                            name="q"
                            label="ค้นหาทรัพย์สิน"
                            defaultValue={filters.q}
                            placeholder="รหัส, ชื่อ, S/N, สถานที่..."
                            dense
                            className="text-sm"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">สถานะ</label>
                        <select name="status" defaultValue={filters.status} className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm">
                            <option value="all">ทั้งหมด</option>
                            <option value="Active">Active</option>
                            <option value="InRepair">InRepair</option>
                            <option value="DepreciationPaused">DepreciationPaused</option>
                            <option value="Disposed">Disposed</option>
                            <option value="Sold">Sold</option>
                            <option value="Lost">Lost</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">หมวดหมู่</label>
                        <select name="category" defaultValue={filters.category} className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm">
                            <option value="all">ทั้งหมด</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">สถานที่</label>
                        <input
                            name="location"
                            list="asset-location-list"
                            defaultValue={filters.location}
                            placeholder="พิมพ์หรือเลือก"
                            className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm"
                        />
                        <datalist id="asset-location-list">
                            {locations.map((location) => (
                                <option key={location} value={location} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">ตั้งแต่วันที่ซื้อ</label>
                        <input type="date" name="fromDate" defaultValue={filters.fromDate} className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm" />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">ถึงวันที่ซื้อ</label>
                        <input type="date" name="toDate" defaultValue={filters.toDate} className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm" />
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                    <select name="sort" defaultValue={filters.sort} className="rounded-xl border border-slate-300 py-2 px-3 text-sm">
                        <option value="created_desc">ล่าสุดก่อน</option>
                        <option value="created_asc">เก่าสุดก่อน</option>
                        <option value="code_asc">รหัส A-Z</option>
                        <option value="code_desc">รหัส Z-A</option>
                        <option value="name_asc">ชื่อ A-Z</option>
                        <option value="name_desc">ชื่อ Z-A</option>
                        <option value="value_desc">มูลค่าสูง-ต่ำ</option>
                        <option value="value_asc">มูลค่าต่ำ-สูง</option>
                    </select>

                    <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        ค้นหา/กรอง
                    </button>

                    <Link href="/assets" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        ล้างตัวกรอง
                    </Link>
                </div>
            </form>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {assets.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-500">
                        ไม่พบข้อมูลทรัพย์สินตามเงื่อนไขที่ค้นหา
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-slate-200 md:hidden">
                            {assets.map((asset) => (
                                <article key={asset.asset_id} className="space-y-3 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">{asset.asset_code}</div>
                                            <div className="text-sm text-slate-700">{asset.asset_name}</div>
                                        </div>
                                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(asset.status)}`}>
                                            {getStatusLabel(asset.status)}
                                        </span>
                                    </div>

                                    <div className="flex gap-3">
                                        {asset.image_url ? (
                                            <AssetImage
                                                src={getImageUrl(asset.image_url) || ''}
                                                className="h-12 w-12 rounded-lg object-cover"
                                                alt=""
                                                fallbackText="Asset"
                                            />
                                        ) : (
                                            <div className="h-12 w-12 rounded-lg bg-slate-100" />
                                        )}
                                        <div className="min-w-0 flex-1 text-sm text-slate-600">
                                            <div className="truncate">หมวดหมู่: {asset.category || '-'}</div>
                                            <div className="truncate">S/N: {asset.serial_number || '-'}</div>
                                            <div className="truncate">
                                                สถานที่: {[asset.location, asset.room_section].filter(Boolean).join(' / ') || '-'}
                                            </div>
                                            <div className="font-medium text-slate-800">
                                                ราคาซื้อ: {Number(asset.purchase_price || 0).toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link href={`/assets/${asset.asset_id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-blue-700">
                                            รายละเอียด
                                        </Link>
                                        {canEditPage && (
                                            <AssetActions
                                                asset={{
                                                    asset_id: asset.asset_id,
                                                    asset_code: asset.asset_code,
                                                    asset_name: asset.asset_name,
                                                }}
                                                isAdmin={canEditPage}
                                            />
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                                    <tr>
                                        <th className="px-6 py-3">รหัสทรัพย์สิน</th>
                                        <th className="px-6 py-3">ชื่อทรัพย์สิน</th>
                                        <th className="px-6 py-3">หมวดหมู่</th>
                                        <th className="px-6 py-3">สถานที่ตั้ง</th>
                                        <th className="px-6 py-3 text-right">ราคาซื้อ</th>
                                        <th className="px-6 py-3 text-center">สถานะ</th>
                                        <th className="px-6 py-3 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {assets.map((asset) => (
                                        <tr key={asset.asset_id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-900">{asset.asset_code}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    {asset.image_url && (
                                                        <AssetImage
                                                            src={getImageUrl(asset.image_url) || ''}
                                                            className="mr-2 h-8 w-8 rounded object-cover"
                                                            alt=""
                                                            fallbackText="Asset"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-slate-900">{asset.asset_name}</div>
                                                        <div className="text-xs text-slate-500">S/N: {asset.serial_number || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{asset.category || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center text-slate-600">
                                                        <MapPin className="mr-1 h-3 w-3" /> {asset.location || '-'}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{asset.room_section || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">{Number(asset.purchase_price || 0).toLocaleString('th-TH')}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(asset.status)}`}>
                                                    {getStatusLabel(asset.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link href={`/assets/${asset.asset_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                                        รายละเอียด
                                                    </Link>
                                                    {canEditPage && (
                                                        <AssetActions
                                                            asset={{
                                                                asset_id: asset.asset_id,
                                                                asset_code: asset.asset_code,
                                                                asset_name: asset.asset_name,
                                                            }}
                                                            isAdmin={canEditPage}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-3 border-t bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-slate-600">
                        แสดง {startItem.toLocaleString('th-TH')}-{endItem.toLocaleString('th-TH')} จาก {totalFiltered.toLocaleString('th-TH')} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={prevHref}
                            aria-disabled={currentPage <= 1}
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 ${currentPage <= 1
                                ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            ก่อนหน้า
                        </Link>
                        <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700">
                            หน้า {currentPage.toLocaleString('th-TH')} / {totalPages.toLocaleString('th-TH')}
                        </span>
                        <Link
                            href={nextHref}
                            aria-disabled={currentPage >= totalPages}
                            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 ${currentPage >= totalPages
                                ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                        >
                            ถัดไป
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">ตารางค่าเสื่อมของรายการสินทรัพย์</h2>
                            <p className="text-xs text-slate-500">คำนวณแบบ Straight-line ถึงวันที่ปัจจุบัน หรือวันที่หยุดคิดค่าเสื่อม</p>
                        </div>
                        <div className="text-right text-xs text-slate-600">
                            <div>ค่าเสื่อมสะสมรวม (หน้านี้): {totalAccumulatedDepreciationInPage.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div>มูลค่าคงเหลือรวม (หน้านี้): {totalNetBookValueInPage.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                </div>
                {depreciationRows.length === 0 ? (
                    <div className="px-6 py-10 text-center text-slate-500">ไม่มีรายการให้คำนวณค่าเสื่อม</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-[1100px] w-full text-left text-sm text-slate-600">
                            <thead className="bg-white text-xs uppercase text-slate-700">
                                <tr>
                                    <th className="px-4 py-3">รหัสทรัพย์สิน</th>
                                    <th className="px-4 py-3">ชื่อทรัพย์สิน</th>
                                    <th className="px-4 py-3">วันซื้อ</th>
                                    <th className="px-4 py-3">คำนวณถึง</th>
                                    <th className="px-4 py-3 text-right">ราคาซื้อ</th>
                                    <th className="px-4 py-3 text-right">มูลค่าซาก</th>
                                    <th className="px-4 py-3 text-right">ค่าเสื่อม/ปี</th>
                                    <th className="px-4 py-3 text-right">ค่าเสื่อมสะสม</th>
                                    <th className="px-4 py-3 text-right">มูลค่าคงเหลือ</th>
                                    <th className="px-4 py-3 text-center">รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {depreciationRows.map((row) => (
                                    <tr key={`dep-${row.asset_id}`} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{row.asset_code}</td>
                                        <td className="px-4 py-3">{row.asset_name}</td>
                                        <td className="px-4 py-3">{row.purchaseDate.toLocaleDateString('th-TH')}</td>
                                        <td className="px-4 py-3">
                                            <div>{row.cutoffDate.toLocaleDateString('th-TH')}</div>
                                            {row.status === 'DepreciationPaused' && (
                                                <div className="text-[11px] text-violet-700">หยุดคิดค่าเสื่อม</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">{row.cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right">{row.salvage.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right">{row.annualDepreciation.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right">{row.accumulatedDepreciation.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-900">{row.netBookValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Link href={`/assets/${row.asset_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                                ดูตารางรายปี
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

