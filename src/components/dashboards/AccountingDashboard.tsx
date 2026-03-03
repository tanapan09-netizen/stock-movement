import { prisma } from '@/lib/prisma';
import { DollarSign, FileText, PiggyBank, Receipt, Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function AccountingDashboard() {
    const pendingPettyCashCount = await prisma.tbl_petty_cash.count({
        where: { status: 'pending' }
    });

    const totalMaintenanceCost = await prisma.tbl_maintenance_requests.aggregate({
        _sum: { actual_cost: true },
        where: { status: 'completed' }
    });

    const fixedAssetsCount = await prisma.tbl_assets.count({
        where: { status: 'Active' }
    });

    return (
        <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        Accounting Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm font-medium">
                        ภาพรวมสำหรับแผนกบัญชี (จัดการการเงิน, เบิกจ่าย)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/petty-cash" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-green-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">รอเคลียร์เงินสดย่อย</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingPettyCashCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-green-50 text-green-600">
                                <PiggyBank className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/maintenance/reports" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-orange-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">ค่าซ่อมบำรุงรวม</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {(totalMaintenanceCost._sum.actual_cost || 0).toLocaleString()} ฿
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                                <Receipt className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/assets" className="block group">
                    <div className="bg-white dark:bg-slate-800 border-orange-100/50 border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 mb-1">ทรัพย์สินถาวร</h3>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{fixedAssetsCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                                <Briefcase className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-slate-700 mt-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">ครุภัณฑ์และ<br />อุปกรณ์</span>
                                <span className="text-orange-500 flex items-center gap-1 font-medium group-hover:text-orange-600 transition-colors">
                                    คลิกเพื่อดูราย<br className="sm:hidden lg:block hidden" />ละเอียด
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
