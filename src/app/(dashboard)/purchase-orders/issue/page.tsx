import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Lock } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getRolePermissions } from '@/actions/roleActions';
import { PERMISSIONS } from '@/lib/permissions';

export default async function POIssuePage() {
    const session = await auth();
    const role = ((session?.user as { role?: string })?.role || '').toLowerCase();
    const userName = (session?.user as { name?: string })?.name || '';
    const userId = Number.parseInt(((session?.user as { id?: string })?.id || ''), 10);
    const isPurchasing = role === 'purchasing';
    const rolePermissions = await getRolePermissions(role);

    if (!rolePermissions[PERMISSIONS.PO_VIEW]) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>คุณไม่มีสิทธิ์เข้าถึงหน้าออกใบสั่งซื้อ</p>
            </div>
        );
    }

    const rows = await prisma.tbl_purchase_orders.findMany({
        where: isPurchasing
            ? undefined
            : {
                OR: [
                    ...(Number.isNaN(userId) ? [] : [{ created_by_user_id: userId }]),
                    { created_by: userName || '__NO_USER__' }
                ]
            },
        orderBy: { created_at: 'desc' },
        take: 100,
    });

    const supplierIds = Array.from(new Set(rows.map(r => r.supplier_id).filter(Boolean))) as number[];
    const suppliers = await prisma.tbl_suppliers.findMany({ where: { id: { in: supplierIds } } });
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

    if (!isPurchasing && !rows.length && !userName) {
        redirect('/purchase-orders');
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ออกใบสั่งซื้อ</h1>
                    <p className="text-sm text-gray-500">{isPurchasing ? 'สร้างและติดตามใบสั่งซื้อทั้งหมด' : 'ดูสถานะใบสั่งซื้อที่คุณสร้าง'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/purchase-orders" className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">รายการทั้งหมด</Link>
                    {isPurchasing && (
                        <Link href="/purchase-orders/new" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm">
                            <Plus className="w-4 h-4" /> สร้างใบสั่งซื้อ
                        </Link>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 text-left">PO Number</th>
                            <th className="px-4 py-3 text-left">Supplier</th>
                            <th className="px-4 py-3 text-left">ผู้สร้าง</th>
                            <th className="px-4 py-3 text-left">วันที่</th>
                            <th className="px-4 py-3 text-right">ยอดรวม</th>
                            <th className="px-4 py-3 text-center">สถานะ</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">ไม่พบใบสั่งซื้อ</td>
                            </tr>
                        ) : rows.map(po => (
                            <tr key={po.po_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{po.po_number}</td>
                                <td className="px-4 py-3">{supplierMap.get(po.supplier_id || 0) || '-'}</td>
                                <td className="px-4 py-3">{po.created_by || '-'}</td>
                                <td className="px-4 py-3">{po.order_date ? new Date(po.order_date).toLocaleDateString('th-TH') : '-'}</td>
                                <td className="px-4 py-3 text-right">{Number(po.total_amount || 0).toLocaleString('th-TH')}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${po.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link href={`/purchase-orders/${po.po_id}`} className="text-blue-600 hover:underline">ดู</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
