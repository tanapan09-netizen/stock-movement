import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CalendarClock, PlayCircle, Wallet, History, CheckCircle2 } from 'lucide-react';

import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { prisma } from '@/lib/prisma';
import { runMonthlyDepreciationSnapshot } from '@/lib/server/asset-depreciation';

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

function getSingleParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

async function runDepreciationNow() {
    'use server';

    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets/depreciation',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    if (!canEditPage) {
        redirect('/assets/depreciation');
    }

    const performedBy = session?.user?.name || 'Manual Run';
    const result = await runMonthlyDepreciationSnapshot({ performedBy });
    revalidatePath('/assets/depreciation');
    redirect(`/assets/depreciation?run=1&count=${result.successCount}`);
}

export default async function AssetDepreciationPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canReadPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets/depreciation',
        { isApprover: permissionContext.isApprover },
    );
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets/depreciation',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    if (!canReadPage) {
        redirect('/assets');
    }

    const params = (await searchParams) || {};
    const showRunSuccess = getSingleParam(params.run) === '1';
    const runCount = Number(getSingleParam(params.count) || 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [recentEntries, totalEntries, currentMonthSummary] = await Promise.all([
        prisma.tbl_asset_history.findMany({
            where: { action_type: 'Depreciation' },
            include: {
                tbl_assets: {
                    select: {
                        asset_code: true,
                        asset_name: true,
                    },
                },
            },
            orderBy: { action_date: 'desc' },
            take: 60,
        }),
        prisma.tbl_asset_history.count({
            where: { action_type: 'Depreciation' },
        }),
        prisma.tbl_asset_history.aggregate({
            where: {
                action_type: 'Depreciation',
                action_date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            _count: { _all: true },
            _sum: { cost: true },
        }),
    ]);

    const monthlyMap = new Map<string, { label: string; count: number; total: number }>();
    for (const row of recentEntries) {
        const actionDate = new Date(row.action_date);
        const month = actionDate.getMonth() + 1;
        const key = `${actionDate.getFullYear()}-${String(month).padStart(2, '0')}`;
        const previous = monthlyMap.get(key);
        const rowCost = Number(row.cost || 0);

        if (previous) {
            previous.count += 1;
            previous.total += rowCost;
        } else {
            monthlyMap.set(key, {
                label: actionDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
                count: 1,
                total: rowCost,
            });
        }
    }

    const monthlyRows = Array.from(monthlyMap.entries())
        .sort((left, right) => right[0].localeCompare(left[0]))
        .slice(0, 6)
        .map(([, value]) => value);

    const latestRunDate = recentEntries[0]?.action_date || null;
    const monthCount = currentMonthSummary._count._all || 0;
    const monthTotal = Number(currentMonthSummary._sum.cost || 0);

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">บันทึกค่าเสื่อมราคา</h1>
                        <p className="text-sm text-slate-600">จัดการการบันทึกค่าเสื่อมรายเดือน และติดตามประวัติการรันย้อนหลัง</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/assets"
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            กลับไปทะเบียนทรัพย์สิน
                        </Link>
                        {canEditPage && (
                            <form action={runDepreciationNow}>
                                <button
                                    type="submit"
                                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    บันทึกค่าเสื่อมเดือนนี้
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {showRunSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    บันทึกค่าเสื่อมสำเร็จ {runCount.toLocaleString('th-TH')} รายการ
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="card p-4">
                    <div className="text-xs text-slate-500">รายการบันทึกทั้งหมด</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">{totalEntries.toLocaleString('th-TH')}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">จำนวนรายการเดือนนี้</div>
                    <div className="mt-1 text-xl font-bold text-emerald-700">{monthCount.toLocaleString('th-TH')}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">มูลค่าค่าเสื่อมเดือนนี้</div>
                    <div className="mt-1 text-xl font-bold text-blue-700">{monthTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-slate-500">รันล่าสุด</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                        {latestRunDate ? new Date(latestRunDate).toLocaleString('th-TH') : 'ยังไม่มีข้อมูล'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-1">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarClock className="h-4 w-4 text-emerald-600" />
                        สรุปย้อนหลังล่าสุด
                    </div>
                    {monthlyRows.length === 0 ? (
                        <p className="text-sm text-slate-500">ยังไม่มีประวัติการบันทึกค่าเสื่อมราคา</p>
                    ) : (
                        <div className="space-y-2">
                            {monthlyRows.map((row) => (
                                <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="text-sm font-medium text-slate-800">{row.label}</div>
                                    <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                                        <span>{row.count.toLocaleString('th-TH')} รายการ</span>
                                        <span>{row.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-2">
                            <History className="h-4 w-4 text-blue-600" />
                            ประวัติการบันทึกล่าสุด
                        </span>
                    </div>
                    {recentEntries.length === 0 ? (
                        <div className="px-6 py-10 text-center text-slate-500">ยังไม่มีข้อมูลบันทึกค่าเสื่อมราคา</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                                    <tr>
                                        <th className="px-4 py-3">วันที่บันทึก</th>
                                        <th className="px-4 py-3">รหัสทรัพย์สิน</th>
                                        <th className="px-4 py-3">ชื่อทรัพย์สิน</th>
                                        <th className="px-4 py-3 text-right">ค่าเสื่อม (บาท)</th>
                                        <th className="px-4 py-3">ผู้บันทึก</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {recentEntries.map((row) => (
                                        <tr key={row.history_id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">{new Date(row.action_date).toLocaleString('th-TH')}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{row.tbl_assets.asset_code}</td>
                                            <td className="px-4 py-3">{row.tbl_assets.asset_name}</td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                                                <span className="inline-flex items-center gap-1">
                                                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                                                    {Number(row.cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{row.performed_by || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
