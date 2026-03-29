import Link from 'next/link';
import { Download, MapPin, Plus, Search } from 'lucide-react';

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
        prisma.tbl_assets.groupBy({ by: ['status'], _count: { _all: true } }),
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

    const statusCountMap = statusGroups.reduce<Record<string, number>>((acc, row) => {
        acc[row.status || 'Unknown'] = row._count._all;
        return acc;
    }, {});

    const activeCount = statusCountMap.Active || 0;
    const disposedCount = statusCountMap.Disposed || 0;
    const inRepairCount = statusCountMap.InRepair || 0;
    const totalValue = Number(totalValueAggregate._sum.purchase_price || 0);

    const categories = categoryRows
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value));

    const locations = locationRows
        .map((row) => row.location)
        .filter((value): value is string => Boolean(value));

    const exportQuery = buildExportQueryString(filters);
    const exportHref = `/api/assets/export${exportQuery ? `?${exportQuery}` : ''}`;

    const prevHref = (() => {
        const query = buildQueryString(filters, Math.max(1, currentPage - 1));
        return `/assets${query ? `?${query}` : ''}`;
    })();

    const nextHref = (() => {
        const query = buildQueryString(filters, Math.min(totalPages, currentPage + 1));
        return `/assets${query ? `?${query}` : ''}`;
    })();

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ทะเบียนทรัพย์สิน</h1>
                    <p className="text-sm text-gray-500">ค้นหา กรอง และติดตามข้อมูลทรัพย์สินทั้งหมดในระบบ</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/assets/rooms"
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <MapPin className="mr-2 h-4 w-4" /> รายละเอียดตามห้อง
                    </Link>
                    <Link
                        href={exportHref}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Link>
                    {canEditPage && (
                        <Link
                            href="/assets/new"
                            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="mr-2 h-4 w-4" /> เพิ่มทรัพย์สิน
                        </Link>
                    )}
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-xs text-gray-500">ทรัพย์สินทั้งหมด</div>
                    <div className="mt-1 text-xl font-bold text-gray-900">{totalAssets.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-xs text-gray-500">ใช้งานปกติ</div>
                    <div className="mt-1 text-xl font-bold text-green-700">{activeCount.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-xs text-gray-500">ส่งซ่อม</div>
                    <div className="mt-1 text-xl font-bold text-amber-700">{inRepairCount.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-xs text-gray-500">จำหน่ายแล้ว</div>
                    <div className="mt-1 text-xl font-bold text-red-700">{disposedCount.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-xs text-gray-500">มูลค่าซื้อรวม</div>
                    <div className="mt-1 text-xl font-bold text-blue-700">{totalValue.toLocaleString()}</div>
                </div>
            </div>

            <form method="get" className="mb-4 rounded-lg bg-white p-4 shadow">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                    <div className="xl:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">ค้นหา</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                name="q"
                                defaultValue={filters.q}
                                placeholder="รหัส, ชื่อ, S/N, สถานที่..."
                                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-500">สถานะ</label>
                        <select name="status" defaultValue={filters.status} className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm">
                            <option value="all">ทั้งหมด</option>
                            <option value="Active">Active</option>
                            <option value="InRepair">InRepair</option>
                            <option value="Disposed">Disposed</option>
                            <option value="Lost">Lost</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-500">หมวดหมู่</label>
                        <select name="category" defaultValue={filters.category} className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm">
                            <option value="all">ทั้งหมด</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-500">สถานที่</label>
                        <input
                            name="location"
                            list="asset-location-list"
                            defaultValue={filters.location}
                            placeholder="พิมพ์หรือเลือก"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                        />
                        <datalist id="asset-location-list">
                            {locations.map((location) => (
                                <option key={location} value={location} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-500">ตั้งแต่วันที่ซื้อ</label>
                        <input type="date" name="fromDate" defaultValue={filters.fromDate} className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm" />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-500">ถึงวันที่ซื้อ</label>
                        <input type="date" name="toDate" defaultValue={filters.toDate} className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm" />
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select name="sort" defaultValue={filters.sort} className="rounded-md border border-gray-300 py-2 px-3 text-sm">
                        <option value="created_desc">ล่าสุดก่อน</option>
                        <option value="created_asc">เก่าสุดก่อน</option>
                        <option value="code_asc">รหัส A-Z</option>
                        <option value="code_desc">รหัส Z-A</option>
                        <option value="name_asc">ชื่อ A-Z</option>
                        <option value="name_desc">ชื่อ Z-A</option>
                        <option value="value_desc">มูลค่าสูง-ต่ำ</option>
                        <option value="value_asc">มูลค่าต่ำ-สูง</option>
                    </select>

                    <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        ค้นหา/กรอง
                    </button>

                    <Link href="/assets" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        ล้างตัวกรอง
                    </Link>

                    <span className="ml-auto text-sm text-gray-500">ผลลัพธ์ {totalFiltered.toLocaleString()} รายการ</span>
                </div>
            </form>

            <div className="rounded-lg bg-white shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
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
                        <tbody className="divide-y divide-gray-200">
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">ไม่พบข้อมูลทรัพย์สินตามเงื่อนไขที่ค้นหา</td>
                                </tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset.asset_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{asset.asset_code}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {asset.image_url && (
                                                    <AssetImage
                                                        src={getImageUrl(asset.image_url) || ''}
                                                        className="h-8 w-8 rounded mr-2 object-cover"
                                                        alt=""
                                                        fallbackText="Asset"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">{asset.asset_name}</div>
                                                    <div className="text-xs text-gray-500">S/N: {asset.serial_number || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{asset.category || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="inline-flex items-center text-gray-500">
                                                    <MapPin className="mr-1 h-3 w-3" /> {asset.location || '-'}
                                                </span>
                                                <span className="text-xs text-gray-400">{asset.room_section || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">{Number(asset.purchase_price).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${asset.status === 'Active'
                                                ? 'bg-green-100 text-green-800'
                                                : asset.status === 'Disposed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link href={`/assets/${asset.asset_id}`} className="text-blue-600 hover:text-blue-900 font-medium text-sm">
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3 text-sm">
                    <div className="text-gray-500">หน้า {currentPage} / {totalPages}</div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={prevHref}
                            aria-disabled={currentPage <= 1}
                            className={`rounded-md border px-3 py-1.5 ${currentPage <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-white'}`}
                        >
                            ก่อนหน้า
                        </Link>
                        <Link
                            href={nextHref}
                            aria-disabled={currentPage >= totalPages}
                            className={`rounded-md border px-3 py-1.5 ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-white'}`}
                        >
                            ถัดไป
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
