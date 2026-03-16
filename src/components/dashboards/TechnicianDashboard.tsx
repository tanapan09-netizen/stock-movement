import { prisma } from '@/lib/prisma';
import { Wrench, Clock, AlertCircle, ShoppingCart, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { getPartRequests } from '@/actions/partRequestActions';
import { DonutChart } from '@/components/DonutChart';

export default async function TechnicianDashboard() {
    const session = await auth();
    const userName = session?.user?.name || '';
    const userRole = (session?.user as any)?.role || '';
    const isApprover = (session?.user as any)?.is_approver || false;

    // --- Global Stats (All Tasks) ---
    const globalPending = await prisma.tbl_maintenance_requests.count({
        where: { status: 'pending' }
    });

    const globalInProgress = await prisma.tbl_maintenance_requests.count({
        where: { status: 'in_progress' }
    });

    const globalConfirmed = await prisma.tbl_maintenance_requests.count({
        where: { status: 'confirmed' }
    });

    const globalCompleted = await prisma.tbl_maintenance_requests.count({
        where: { status: { in: ['completed', 'verified'] } }
    });

    const globalTotal = await prisma.tbl_maintenance_requests.count();

    // --- User Specific Stats ---
    const userAssigned = await prisma.tbl_maintenance_requests.count({
        where: { assigned_to: userName, status: 'in_progress' }
    });

    const userTotal = await prisma.tbl_maintenance_requests.count({
        where: { assigned_to: userName }
    });

    let pendingPartTasks: any[] = [];
    if (isApprover || userRole === 'head_technician' || userRole === 'admin' || userRole === 'manager') {
        const partsRes = await getPartRequests({ status: 'pending' });
        if (partsRes.success && partsRes.data) {
            pendingPartTasks = (partsRes.data as any[]).filter(
                r => r.current_stage === 0 || r.current_stage === undefined || r.current_stage === null
            );
        }
    }

    const chartData = [
        { label: 'รอดำเนินการ',    value: globalPending,  color: '#F59E0B' },
        { label: 'กำลังดำเนินการ', value: globalInProgress, color: '#3B82F6' },
        { label: 'รอตรวจรับ',      value: globalConfirmed, color: '#8B5CF6' },
        { label: 'เสร็จสิ้นแล้ว',  value: globalCompleted, color: '#10B981' },
    ].filter(d => d.value > 0);

    const statsCards = [
        {
            href: '/maintenance?status=pending',
            label: 'งานใหม่รอดำเนินการ',
            value: globalPending,
            icon: AlertCircle,
            colorClass: 'text-amber-600 dark:text-amber-400',
            bgClass: 'bg-amber-50 dark:bg-amber-900/30',
            borderClass: 'border-amber-100 dark:border-amber-800/40',
            iconColor: 'text-amber-600',
        },
        {
            href: '/maintenance?status=in_progress',
            label: 'งานกำลังดำเนินการ',
            value: globalInProgress,
            icon: Clock,
            colorClass: 'text-blue-600 dark:text-blue-400',
            bgClass: 'bg-blue-50 dark:bg-blue-900/30',
            borderClass: 'border-blue-100 dark:border-blue-800/40',
            iconColor: 'text-blue-600',
        },
        {
            href: '/maintenance?status=confirmed',
            label: 'งานรอตรวจรับ',
            value: globalConfirmed,
            icon: Wrench,
            colorClass: 'text-purple-600 dark:text-purple-400',
            bgClass: 'bg-purple-50 dark:bg-purple-900/30',
            borderClass: 'border-purple-100 dark:border-purple-800/40',
            iconColor: 'text-purple-600',
        },
        {
            href: '/maintenance',
            label: 'งานทั้งหมดในระบบ',
            value: globalTotal,
            icon: TrendingUp,
            colorClass: 'text-emerald-600 dark:text-emerald-400',
            bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
            borderClass: 'border-emerald-100 dark:border-emerald-800/40',
            iconColor: 'text-emerald-600',
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                            <Wrench className="w-5 h-5 text-blue-600" />
                        </div>
                        Technician Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        ภาพรวมงานสำหรับช่างซ่อมบำรุง · ยินดีต้อนรับ, <span className="font-semibold text-gray-700 dark:text-gray-300">{userName}</span>
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statsCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link key={card.label} href={card.href} className="block group">
                            <div className={`bg-white dark:bg-slate-800 border ${card.borderClass} rounded-2xl p-5 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{card.label}</p>
                                        <p className={`text-3xl font-bold ${card.colorClass}`}>{card.value}</p>
                                    </div>
                                    <div className={`p-2.5 rounded-xl ${card.bgClass}`}>
                                        <Icon className={`w-5 h-5 ${card.iconColor}`} />
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                                    <span className="text-xs text-gray-400 group-hover:text-blue-500 flex items-center gap-1 transition-colors">
                                        ดูรายละเอียด <ArrowRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Chart + Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Donut Chart */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">สัดส่วนสถานะงาน</h3>
                    </div>
                    {chartData.length > 0 ? (
                        <DonutChart data={chartData} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
                            <CheckCircle2 className="w-8 h-8 opacity-30" />
                            ยังไม่มีงานที่ได้รับมอบหมาย
                        </div>
                    )}
                </div>

                {/* Quick Summary */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">สรุปภาพรวมงานทั้งหมด</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { label: 'รอดำเนินการ',    value: globalPending,  total: globalTotal || 1, color: 'bg-amber-400' },
                            { label: 'กำลังดำเนินการ', value: globalInProgress, total: globalTotal || 1, color: 'bg-blue-500' },
                            { label: 'รอตรวจรับ',      value: globalConfirmed,  total: globalTotal || 1, color: 'bg-purple-500' },
                            { label: 'เสร็จสิ้น',      value: globalCompleted, total: globalTotal || 1, color: 'bg-emerald-500' },
                        ].map(item => {
                            const pct = globalTotal > 0 ? Math.round((item.value / globalTotal) * 100) : 0;
                            return (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.value} งาน <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.color} transition-all duration-700`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-gray-400">งานทั้งหมดในระบบ</span>
                        <span className="text-lg font-bold text-gray-800 dark:text-white">{globalTotal} งาน</span>
                    </div>
                </div>
            </div>

            {/* Pending Part Requests (For Approvers) */}
            {(isApprover || userRole === 'admin' || userRole === 'manager' || userRole === 'head_technician') && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                                <ShoppingCart className="text-purple-500 w-4 h-4" />
                            </div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                รายการรออนุมัติขอซื้ออะไหล่
                            </h3>
                        </div>
                        {pendingPartTasks.length > 0 && (
                            <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {pendingPartTasks.length} รายการ
                            </span>
                        )}
                    </div>

                    <div className="p-5">
                        {pendingPartTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                                <ShoppingCart className="w-8 h-8 opacity-25" />
                                <p className="text-sm">ไม่มีรายการขอซื้อที่รออนุมัติ</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingPartTasks.map(part => (
                                    <div
                                        key={part.request_id}
                                        className="group p-4 border border-gray-100 dark:border-slate-700 rounded-xl hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-md transition-all bg-gray-50/50 dark:bg-slate-700/30 flex flex-col gap-3"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 leading-snug">{part.item_name}</span>
                                            <span className="shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                                รออนุมัติ
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-slate-700">
                                                <p className="text-gray-400 mb-0.5">จำนวน</p>
                                                <p className="font-semibold text-gray-700 dark:text-gray-300">{part.quantity}</p>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-slate-700">
                                                <p className="text-gray-400 mb-0.5">ผู้ขอ</p>
                                                <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{part.requested_by}</p>
                                            </div>
                                        </div>

                                        {part.tbl_maintenance_requests?.request_number && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                อ้างอิง: <span className="font-medium text-gray-500 dark:text-gray-400">{part.tbl_maintenance_requests.request_number}</span>
                                            </p>
                                        )}

                                        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-slate-700">
                                            <Link
                                                href="/maintenance/part-requests"
                                                className="flex items-center justify-between text-xs font-medium text-blue-500 hover:text-blue-600 group-hover:underline transition-colors"
                                            >
                                                ดูรายละเอียดและอนุมัติ
                                                <ArrowRight size={13} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
