import { prisma } from '@/lib/prisma';
import { AlertCircle, FileCheck2, FileText, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default async function PurchasingDashboard() {
    const [
        maintenanceWaitForPartsCount,
        reviewQueueCount,
        issuePOQueueCount,
        openPOCount,
    ] = await Promise.all([
        prisma.tbl_maintenance_requests.count({
            where: { status: 'wait_for_parts' },
        }),
        prisma.tbl_approval_requests.count({
            where: {
                request_type: 'purchase',
                status: 'pending',
                current_step: 1,
            },
        }),
        prisma.tbl_approval_requests.count({
            where: {
                request_type: 'purchase',
                status: 'pending',
                current_step: 4,
            },
        }),
        prisma.tbl_purchase_orders.count({
            where: { status: { in: ['pending', 'approved', 'ordered', 'partial'] } },
        }),
    ]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6 text-purple-600" />
                        Purchasing Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-medium">
                        ติดตามคิวทบทวนคำขอซื้อ ออก PO และภาระงานจัดซื้อจากหน้าจอเดียว
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/maintenance" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-purple-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">งานซ่อมรอจัดหาอะไหล่</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{maintenanceWaitForPartsCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                                <FileCheck2 className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/purchase-request/manage" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-amber-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">คำขอซื้อรอทบทวน</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{reviewQueueCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/purchase-request/manage" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-blue-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">คำขอซื้อรอออก PO</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{issuePOQueueCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/purchase-orders" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-emerald-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">PO เปิดค้าง</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{openPOCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                                <FileText className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
