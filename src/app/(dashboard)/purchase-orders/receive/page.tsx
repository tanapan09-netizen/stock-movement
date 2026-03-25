import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Lock } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { receivePO } from '@/actions/poActions';
import { isDepartmentRole } from '@/lib/roles';
import { canReceivePurchaseOrders, canViewPurchaseOrders } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { getProcurementStatusBadgeClass, getProcurementStatusLabel } from '@/lib/procurement-status';

export default async function POReceivePage() {
    const session = await auth();
    const { role, permissions: rolePermissions } = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const userName = (session?.user as { name?: string })?.name || '';
    const userId = Number.parseInt(((session?.user as { id?: string })?.id || ''), 10);
    const isPurchasing = isDepartmentRole(role, 'purchasing');

    if (!canViewPurchaseOrders(rolePermissions)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>คุณไม่มีสิทธิ์เข้าถึงหน้ารับใบสั่งซื้อ</p>
            </div>
        );
    }

    const rows = await prisma.tbl_purchase_orders.findMany({
        where: {
            ...(isPurchasing
                ? {}
                : {
                    OR: [
                        ...(Number.isNaN(userId) ? [] : [{ created_by_user_id: userId }]),
                        { created_by: userName || '__NO_USER__' }
                    ]
                }),
            status: { in: ['approved', 'ordered', 'pending'] }
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
                    <h1 className="text-2xl font-bold text-gray-800">รับใบสั่งซื้อ</h1>
                    <p className="text-sm text-gray-500">{isPurchasing ? 'ยืนยันรับสินค้าเข้าคลังจากใบสั่งซื้อ' : 'ติดตามสถานะการรับสินค้าในใบสั่งซื้อของคุณ'}</p>
                </div>
                <Link href="/purchase-orders" className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">กลับหน้ารายการ</Link>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 text-left">PO Number</th>
                            <th className="px-4 py-3 text-left">Supplier</th>
                            <th className="px-4 py-3 text-left">ผู้สร้าง</th>
                            <th className="px-4 py-3 text-left">วันที่สั่งซื้อ</th>
                            <th className="px-4 py-3 text-right">ยอดรวม</th>
                            <th className="px-4 py-3 text-center">สถานะ</th>
                            <th className="px-4 py-3 text-right">การทำงาน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">ไม่มีใบสั่งซื้อที่รอรับสินค้า</td>
                            </tr>
                        ) : rows.map(po => (
                            <tr key={po.po_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{po.po_number}</td>
                                <td className="px-4 py-3">{supplierMap.get(po.supplier_id || 0) || '-'}</td>
                                <td className="px-4 py-3">{po.created_by || '-'}</td>
                                <td className="px-4 py-3">{po.order_date ? new Date(po.order_date).toLocaleDateString('th-TH') : '-'}</td>
                                <td className="px-4 py-3 text-right">{Number(po.total_amount || 0).toLocaleString('th-TH')}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getProcurementStatusBadgeClass(po.status || 'draft')}`}>
                                        {getProcurementStatusLabel(po.status || 'draft')}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-2">
                                        <Link href={`/purchase-orders/${po.po_id}`} className="text-blue-600 hover:underline text-xs">ดู</Link>
                                        {isPurchasing && canReceivePurchaseOrders(rolePermissions) && (
                                            <form
                                                action={async () => {
                                                    'use server';
                                                    await receivePO(po.po_id);
                                                }}
                                            >
                                                <button type="submit" className="px-2.5 py-1.5 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700 inline-flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> รับเข้า
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
