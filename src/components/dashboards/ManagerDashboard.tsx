import { prisma } from '@/lib/prisma';
import { Clock, TrendingUp, AlertTriangle, FileText, CheckCircle, DollarSign, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '@/components/DashboardCharts';
import { getAssetFinancialSummary } from '@/actions/assetActions';


export default async function ManagerDashboard() {
    const [pendingPR, pendingPettyCash, assetSummary] = await Promise.all([
        prisma.tbl_maintenance_requests.count({
            where: {
                // Example condition: wait_for_order or wait_for_parts that need approval
                status: { in: ['wait_for_order'] }
            }
        }),
        prisma.tbl_petty_cash.count({
            where: { status: 'pending' }
        }),
        getAssetFinancialSummary()
    ]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Manager Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-medium">
                        ภาพรวมสำหรับผู้จัดการ (รอการอนุมัติ)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/maintenance" className="block transform transition-all hover:-translate-y-1 hover:shadow-md bg-white dark:bg-slate-800 border-blue-100/50 border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">ขอซื้ออะไหล่รออนุมัติ</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingPR}</p>
                </Link>
                <Link href="/petty-cash" className="block transform transition-all hover:-translate-y-1 hover:shadow-md bg-white dark:bg-slate-800 border-orange-100/50 border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">เบิกเงินสดย่อยรออนุมัติ</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingPettyCash}</p>
                </Link>
                <Link href="/assets" className="block transform transition-all hover:-translate-y-1 hover:shadow-md bg-white dark:bg-slate-800 border-emerald-100/50 border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-500">มูลค่าทรัพย์สินรวม</h3>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(assetSummary.totalValue || 0).toLocaleString()} <span className="text-lg font-normal opacity-70">฿</span></p>
                </Link>
                <Link href="/assets" className="block transform transition-all hover:-translate-y-1 hover:shadow-md bg-white dark:bg-slate-800 border-rose-100/50 border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-500">ค่าเสื่อมราคาสะสม</h3>
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(assetSummary.totalAccumulatedDepreciation || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-lg font-normal opacity-70">฿</span></p>
                </Link>
            </div>

            <div className="mt-8">
                <DashboardCharts />
            </div>
        </div >
    );
}
