import Link from 'next/link';
import { ArrowLeft, Lock, Printer } from 'lucide-react';

import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import {
    buildAssetRegistryOrderBy,
    buildAssetRegistryWhere,
    normalizeAssetRegistryFilters,
} from '@/lib/server/asset-registry-query';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { prisma } from '@/lib/prisma';

import PrintButton from './PrintButton';

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

function buildBackQueryString(filters: ReturnType<typeof normalizeAssetRegistryFilters>) {
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

const fmtDate = (value?: Date | string | null) =>
    value
        ? new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(value))
        : '-';

const fmtNumber = (value: number) => new Intl.NumberFormat('th-TH').format(value || 0);

const fmtMoney = (value: number) =>
    new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value || 0);

export default async function AssetGroupsPrintPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const session = await auth();
    if (!session?.user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-gray-500">
                <Lock className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium">Unauthorized</h3>
            </div>
        );
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    const canViewAssets = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets',
        { isApprover: permissionContext.isApprover },
    );

    if (!canViewAssets) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-gray-500">
                <Lock className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
            </div>
        );
    }

    const rawSearchParams = (await searchParams) || {};
    const filters = normalizeAssetRegistryFilters(rawSearchParams);
    const where = buildAssetRegistryWhere(filters);
    const orderBy = buildAssetRegistryOrderBy(filters.sort);

    const assets = await prisma.tbl_assets.findMany({
        where,
        orderBy,
    });

    const groupsMap = new Map<string, typeof assets>();
    for (const asset of assets) {
        const key = (asset.category || '').trim() || 'Uncategorized';
        if (!groupsMap.has(key)) {
            groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(asset);
    }

    const groups = Array.from(groupsMap.entries())
        .map(([groupName, items]) => ({
            groupName,
            items,
            totalValue: items.reduce((sum, item) => sum + Number(item.purchase_price || 0), 0),
        }))
        .sort((left, right) => left.groupName.localeCompare(right.groupName));

    const printedBy = session.user.name || 'System';
    const printedAt = new Date();
    const grandTotal = groups.reduce((sum, group) => sum + group.totalValue, 0);
    const backQuery = buildBackQueryString(filters);
    const backHref = `/assets${backQuery ? `?${backQuery}` : ''}`;

    return (
        <div className="min-h-screen bg-white p-8 print:p-0 text-black">
            <div className="mx-auto max-w-[210mm] print:max-w-none">
                <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับหน้าทะเบียน
                    </Link>
                    <PrintButton />
                </div>

                <div className="mb-5 border-b border-black pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-wide">รายงานกลุ่มสินทรัพย์</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                แสดงรายการทรัพย์สินและมูลค่ารวมแยกตามกลุ่ม/หมวดหมู่
                            </p>
                        </div>
                        <div className="text-right text-sm">
                            <div className="text-gray-500">พิมพ์เมื่อ</div>
                            <div className="font-medium">{fmtDate(printedAt)}</div>
                            <div className="mt-2 text-gray-500">พิมพ์โดย</div>
                            <div className="font-medium">{printedBy}</div>
                        </div>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">จำนวนกลุ่ม</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(groups.length)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">จำนวนทรัพย์สิน</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(assets.length)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">มูลค่ารวมทั้งหมด</div>
                        <div className="mt-1 text-lg font-bold">{fmtMoney(grandTotal)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">สถานะที่กรอง</div>
                        <div className="mt-1 font-bold">{filters.status === 'all' ? 'ทั้งหมด' : filters.status}</div>
                    </div>
                </div>

                <div className="space-y-6">
                    {groups.length === 0 ? (
                        <div className="border border-gray-300 p-6 text-center text-gray-500">
                            ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                        </div>
                    ) : (
                        groups.map((group) => (
                            <section key={group.groupName} className="break-inside-avoid">
                                <div className="flex items-center justify-between border border-black bg-gray-100 px-3 py-2">
                                    <h2 className="text-base font-bold">{group.groupName}</h2>
                                    <div className="text-sm font-semibold">
                                        {fmtNumber(group.items.length)} รายการ | {fmtMoney(group.totalValue)}
                                    </div>
                                </div>
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="border-x border-b border-black bg-white">
                                            <th className="px-2 py-2 text-left">#</th>
                                            <th className="px-2 py-2 text-left">รหัส</th>
                                            <th className="px-2 py-2 text-left">ชื่อทรัพย์สิน</th>
                                            <th className="px-2 py-2 text-left">สถานที่</th>
                                            <th className="px-2 py-2 text-center">สถานะ</th>
                                            <th className="px-2 py-2 text-right">มูลค่า</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.items.map((asset, index) => (
                                            <tr key={asset.asset_id} className="border-x border-b border-gray-300 align-top">
                                                <td className="px-2 py-2">{index + 1}</td>
                                                <td className="px-2 py-2 font-medium">{asset.asset_code}</td>
                                                <td className="px-2 py-2">{asset.asset_name}</td>
                                                <td className="px-2 py-2">{[asset.location, asset.room_section].filter(Boolean).join(' / ') || '-'}</td>
                                                <td className="px-2 py-2 text-center">{asset.status || '-'}</td>
                                                <td className="px-2 py-2 text-right">{fmtMoney(Number(asset.purchase_price || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        ))
                    )}
                </div>

                <div className="mt-10 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <div className="inline-flex items-center gap-2">
                        <Printer className="h-3.5 w-3.5" />
                        พิมพ์เมื่อ {fmtDate(printedAt)} โดย {printedBy}
                    </div>
                </div>
            </div>
        </div>
    );
}
