import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, CalendarClock, CircleAlert, PackageOpen, PackageX } from 'lucide-react';

import { getMovementMonthlyReport } from '@/actions/reportActions';

type SearchParams = {
    month?: string;
};

type PageProps = {
    searchParams?: Promise<SearchParams>;
};

export const metadata = {
    title: 'รายงาน Movement รายเดือน | Stock Movement',
    description: 'รายงานความเคลื่อนไหวสินค้าแบบรายเดือน พร้อมสินค้าไม่เคลื่อนไหวและสินค้าหมดสต็อก',
};

function formatNumber(value: number) {
    return value.toLocaleString('th-TH');
}

function formatDate(value?: Date | string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date);
}

export default async function MovementReportPage({ searchParams }: PageProps) {
    const params = (await searchParams) || {};
    const reportResult = await getMovementMonthlyReport(params.month);

    if (!reportResult.success || !reportResult.data) {
        return (
            <div className="space-y-4">
                <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปรายงาน
                </Link>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                    โหลดข้อมูลรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
                </div>
            </div>
        );
    }

    const { data } = reportResult;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Link href="/reports" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปรายงาน
                    </Link>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                        <ArrowRightLeft className="h-7 w-7 text-blue-600" />
                        รายงาน Movement รายเดือน
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        สรุปการเคลื่อนไหวสินค้าเดือน {data.targetMonthLabel} พร้อมรายการสินค้าไม่เคลื่อนไหวและสินค้าหมดสต็อก
                    </p>
                </div>

                <form method="get" className="flex items-end gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div>
                        <label htmlFor="month" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            เลือกเดือน
                        </label>
                        <input
                            id="month"
                            name="month"
                            type="month"
                            defaultValue={data.targetMonth}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        แสดงรายงาน
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">จำนวนสินค้า</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{formatNumber(data.summary.totalProducts)}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">เคลื่อนไหวเดือนนี้</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{formatNumber(data.summary.movedProducts)}</p>
                    <p className="mt-1 text-xs text-blue-600">{formatNumber(data.summary.selectedMonthMovementCount)} รายการ movement</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">ไม่เคลื่อนไหวเดือนนี้</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">{formatNumber(data.summary.nonMovingProducts)}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">สินค้าหมดสต็อก</p>
                    <p className="mt-1 text-2xl font-bold text-rose-700">{formatNumber(data.summary.outOfStockProducts)}</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">ไม่เคลื่อนไหว + หมดสต็อก</p>
                    <p className="mt-1 text-2xl font-bold text-purple-700">{formatNumber(data.summary.nonMovingOutOfStockProducts)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">รับเข้าเดือนนี้</div>
                    <div className="mt-1 text-xl font-bold text-emerald-700">+{formatNumber(data.summary.selectedMonthInQty)}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">เบิกออกเดือนนี้</div>
                    <div className="mt-1 text-xl font-bold text-rose-700">-{formatNumber(data.summary.selectedMonthOutQty)}</div>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">สุทธิเดือนนี้</div>
                    <div className="mt-1 text-xl font-bold text-indigo-700">{formatNumber(data.summary.selectedMonthNetQty)}</div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                    <h2 className="font-semibold text-gray-800">สรุป Movement 12 เดือนล่าสุด</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">เดือน</th>
                                <th className="px-4 py-2 text-right">รับเข้า</th>
                                <th className="px-4 py-2 text-right">เบิกออก</th>
                                <th className="px-4 py-2 text-right">สุทธิ</th>
                                <th className="px-4 py-2 text-right">จำนวนรายการ</th>
                                <th className="px-4 py-2 text-right">สินค้าที่เคลื่อนไหว</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.monthSummary.map((row) => (
                                <tr key={row.monthKey} className={row.monthKey === data.targetMonth ? 'bg-blue-50/60' : 'hover:bg-gray-50'}>
                                    <td className="px-4 py-2 font-medium text-gray-800">{row.monthLabel}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-emerald-700">+{formatNumber(row.inQty)}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-rose-700">-{formatNumber(row.outQty)}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-indigo-700">{formatNumber(row.netQty)}</td>
                                    <td className="px-4 py-2 text-right">{formatNumber(row.movementCount)}</td>
                                    <td className="px-4 py-2 text-right">{formatNumber(row.uniqueProducts)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                    <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                        <PackageOpen className="h-4 w-4 text-blue-600" />
                        รายการสินค้าที่มี Movement ในเดือนที่เลือก
                    </h2>
                </div>
                <div className="max-h-[420px] overflow-auto">
                    <table className="w-full min-w-[980px] text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">สินค้า</th>
                                <th className="px-4 py-2 text-right">รับเข้า</th>
                                <th className="px-4 py-2 text-right">เบิกออก</th>
                                <th className="px-4 py-2 text-right">สุทธิ</th>
                                <th className="px-4 py-2 text-right">คงเหลือปัจจุบัน</th>
                                <th className="px-4 py-2 text-right">จำนวนครั้ง</th>
                                <th className="px-4 py-2 text-left">เคลื่อนไหวล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.movementProducts.length > 0 ? (
                                data.movementProducts.map((row) => (
                                    <tr key={row.p_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-gray-800">{row.p_name}</div>
                                            <div className="text-xs text-gray-500">{row.p_id} | {row.supplier || '-'}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-emerald-700">+{formatNumber(row.inQty)}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-rose-700">-{formatNumber(row.outQty)}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-indigo-700">{formatNumber(row.netQty)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <span className={row.currentStock <= 0 ? 'font-semibold text-rose-700' : 'font-medium text-gray-800'}>
                                                {formatNumber(row.currentStock)} {row.p_unit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">{formatNumber(row.movementCount)}</td>
                                        <td className="px-4 py-2 text-gray-600">{formatDate(row.lastMovementAt)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                                        ไม่พบการเคลื่อนไหวสินค้าในเดือนที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-sm">
                    <div className="border-b border-purple-100 bg-purple-50 px-4 py-3">
                        <h2 className="flex items-center gap-2 font-semibold text-purple-800">
                            <CircleAlert className="h-4 w-4" />
                            สินค้าไม่เคลื่อนไหวและหมดสต็อก
                        </h2>
                    </div>
                    <div className="max-h-[360px] overflow-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead className="sticky top-0 bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left">สินค้า</th>
                                    <th className="px-4 py-2 text-right">คงเหลือ</th>
                                    <th className="px-4 py-2 text-left">เคลื่อนไหวล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.nonMovingOutOfStockProducts.length > 0 ? (
                                    data.nonMovingOutOfStockProducts.map((row) => (
                                        <tr key={row.p_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <div className="font-medium text-gray-800">{row.p_name}</div>
                                                <div className="text-xs text-gray-500">{row.p_id} | {row.supplier || '-'}</div>
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold text-rose-700">
                                                {formatNumber(row.currentStock)} {row.p_unit}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">{formatDate(row.lastMovementAt)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                            ไม่พบสินค้าที่ไม่เคลื่อนไหวและหมดสต็อก
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
                    <div className="border-b border-rose-100 bg-rose-50 px-4 py-3">
                        <h2 className="flex items-center gap-2 font-semibold text-rose-800">
                            <PackageX className="h-4 w-4" />
                            สินค้าหมดสต็อกทั้งหมด
                        </h2>
                    </div>
                    <div className="max-h-[360px] overflow-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead className="sticky top-0 bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left">สินค้า</th>
                                    <th className="px-4 py-2 text-right">Safety Stock</th>
                                    <th className="px-4 py-2 text-left">เคลื่อนไหวล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.outOfStockProducts.length > 0 ? (
                                    data.outOfStockProducts.map((row) => (
                                        <tr key={row.p_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <div className="font-medium text-gray-800">{row.p_name}</div>
                                                <div className="text-xs text-gray-500">{row.p_id} | {row.supplier || '-'}</div>
                                            </td>
                                            <td className="px-4 py-2 text-right text-gray-700">
                                                {formatNumber(row.safetyStock)} {row.p_unit}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">{formatDate(row.lastMovementAt)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                            ไม่มีสินค้าหมดสต็อก
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                    <h2 className="flex items-center gap-2 font-semibold text-amber-800">
                        <CalendarClock className="h-4 w-4" />
                        รายการสินค้าไม่เคลื่อนไหวในเดือนที่เลือก
                    </h2>
                </div>
                <div className="max-h-[420px] overflow-auto">
                    <table className="w-full min-w-[840px] text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">สินค้า</th>
                                <th className="px-4 py-2 text-right">คงเหลือ</th>
                                <th className="px-4 py-2 text-right">Safety Stock</th>
                                <th className="px-4 py-2 text-left">เคลื่อนไหวล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.nonMovingProducts.length > 0 ? (
                                data.nonMovingProducts.map((row) => (
                                    <tr key={row.p_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-gray-800">{row.p_name}</div>
                                            <div className="text-xs text-gray-500">{row.p_id} | {row.supplier || '-'}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <span className={row.currentStock <= 0 ? 'font-semibold text-rose-700' : 'font-medium text-gray-800'}>
                                                {formatNumber(row.currentStock)} {row.p_unit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-700">
                                            {formatNumber(row.safetyStock)} {row.p_unit}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600">{formatDate(row.lastMovementAt)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                                        ทุกสินค้ามีการเคลื่อนไหวในเดือนที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

