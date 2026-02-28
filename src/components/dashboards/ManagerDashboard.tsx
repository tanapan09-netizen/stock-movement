import { prisma } from '@/lib/prisma';
import { Clock, TrendingUp, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '@/components/DashboardCharts';


export default async function ManagerDashboard() {
    const pendingPR = await prisma.tbl_maintenance_requests.count({
        where: {
            // Example condition: wait_for_order or wait_for_parts that need approval
            status: { in: ['wait_for_order'] }
        }
    });

    const pendingPettyCash = await prisma.tbl_petty_cash.count({
        where: { status: 'pending' }
    });

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
                <div className="bg-white dark:bg-slate-800 border-blue-100/50 border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">ขอซื้ออะไหล่รออนุมัติ</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingPR}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border-orange-100/50 border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">เบิกเงินสดย่อยรออนุมัติ</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingPettyCash}</p>
                </div>
            </div>

            <div className="mt-8">
                <DashboardCharts />
            </div>
        </div >
    );
}
