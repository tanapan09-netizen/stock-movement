import { prisma } from '@/lib/prisma';
import { Wrench, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';

export default async function TechnicianDashboard() {
    const session = await auth();
    const userName = session?.user?.name || '';

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
        </div>
    );
}
