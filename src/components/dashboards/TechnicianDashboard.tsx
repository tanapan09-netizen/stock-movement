import { prisma } from '@/lib/prisma';
import { Wrench, Clock, AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { getPartRequests } from '@/actions/partRequestActions';

export default async function TechnicianDashboard() {
    const session = await auth();
    const userName = session?.user?.name || '';
    const userRole = (session?.user as any)?.role || '';
    const isApprover = (session?.user as any)?.is_approver || false;

    // Get jobs assigned to this technician that are in progress
    const assignedJobs = await prisma.tbl_maintenance_requests.count({
        where: {
            assigned_to: userName,
            status: 'in_progress'
        }
    });

    const pendingJobs = await prisma.tbl_maintenance_requests.count({
        where: { status: 'pending' }
    });

    // Fetch pending parts if user is approver
    let pendingPartTasks: any[] = [];
    if (isApprover || userRole === 'head_technician' || userRole === 'admin' || userRole === 'manager') {
        const partsRes = await getPartRequests({ status: 'pending' });
        if (partsRes.success && partsRes.data) {
            pendingPartTasks = (partsRes.data as any[]).filter(r => r.current_stage === 0 || r.current_stage === undefined || r.current_stage === null);
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Wrench className="w-6 h-6 text-blue-600" />
                        Technician Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-medium">
                        ภาพรวมงานสำหรับช่างซ่อมบำรุง
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/maintenance" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-blue-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">งานที่กำลังดำเนินการ</h3>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{assignedJobs}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/maintenance" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-yellow-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">งานใหม่รอดำเนินการ</h3>
                                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{pendingJobs}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Pending Part Requests (For Approvers) */}
            {(isApprover || userRole === 'admin' || userRole === 'manager' || userRole === 'head_technician') && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b flex items-center gap-2">
                        <ShoppingCart className="text-purple-500" size={20} />
                        <h3 className="font-semibold text-purple-700 dark:text-purple-400">รายการรออนุมัติเพื่อขอซื้ออะไหล่ ({pendingPartTasks.length})</h3>
                    </div>
                    <div className="divide-y dark:divide-slate-700">
                        {pendingPartTasks.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">ไม่มีรายการขอซื้อที่รออนุมัติ</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {pendingPartTasks.map(part => (
                                    <div key={part.request_id} className="p-4 border rounded-xl hover:shadow-md transition-shadow bg-gray-50 dark:bg-slate-700/50 flex flex-col gap-2">
                                        <div className="font-medium text-sm flex justify-between items-start">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{part.item_name}</span>
                                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded ml-2 whitespace-nowrap">รออนุมัติ</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>จำนวน: <strong className="text-gray-700 dark:text-gray-300">{part.quantity}</strong></span>
                                            <span>ผู้ขอ: <strong>{part.requested_by}</strong></span>
                                        </div>
                                        {part.tbl_maintenance_requests?.request_number && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                อ้างอิงงานซ่อม: {part.tbl_maintenance_requests.request_number}
                                            </div>
                                        )}
                                        <div className="mt-2 flex justify-end">
                                            <Link href="/maintenance/part-requests" className="text-blue-500 hover:text-blue-600 hover:underline text-xs flex items-center font-medium">
                                                ดูรายละเอียดและอนุมัติ <ArrowRight size={14} className="ml-1" />
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
