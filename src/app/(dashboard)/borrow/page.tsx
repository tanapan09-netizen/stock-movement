import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Search, FileText, CheckCircle, Clock } from 'lucide-react';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function BorrowListPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/borrow',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    const requests = await prisma.borrow_requests.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            _count: {
                select: { borrow_items: true }
            }
        }
    });

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">รายการยืม-คืน</h1>
                    <p className="text-sm text-gray-500">จัดการคำขอยืมและคืนสินค้าทั้งหมด</p>
                </div>
                {canEditPage && (
                <Link
                    href="/borrow/new"
                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" /> สร้างรายการยืม
                </Link>
                )}
            </div>

            <div className="rounded-lg bg-white shadow overflow-hidden">
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">ผู้เบิก</th>
                                <th className="px-6 py-3">จำนวนรายการ</th>
                                <th className="px-6 py-3">วันที่</th>
                                <th className="px-6 py-3 text-center">สถานะ</th>
                                <th className="px-6 py-3 text-right">ดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                                            <p>ไม่มีรายการยืมในระบบ</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">#{req.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold">{req.borrower_name}</div>
                                            <div className="text-xs text-gray-400">{req.note || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">{req._count.borrow_items} รายการ</td>
                                        <td className="px-6 py-4">{req.created_at ? new Date(req.created_at).toLocaleDateString('th-TH') : '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        req.status === 'returned' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {req.status === 'pending' ? 'รอรับคืน' :
                                                    req.status === 'approved' ? 'อนุมัติแล้ว' :
                                                        req.status === 'returned' ? 'คืนแล้ว' : req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/borrow/${req.id}`} className="text-blue-600 hover:underline">
                                                ดูรายละเอียด
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
