import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Lock } from 'lucide-react';
import { auth } from '@/auth';
import { getRolePermissions } from '@/actions/roleActions';
import { PERMISSIONS } from '@/lib/permissions';
import PurchaseOrderActions from './PurchaseOrderActions';

export default async function POListPage() {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role || '';
    const userName = (session?.user as { name?: string })?.name || '';
    const userId = Number.parseInt(((session?.user as { id?: string })?.id || ''), 10);
    const isPurchasing = userRole.toLowerCase() === 'purchasing';
    const rolePermissions = await getRolePermissions(userRole);

    const canView = !!rolePermissions[PERMISSIONS.PO_VIEW];
    const canEdit = !!rolePermissions[PERMISSIONS.PO_EDIT] && isPurchasing;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์: PO_VIEW)</p>
            </div>
        );
    }

    const pos = await prisma.tbl_purchase_orders.findMany({
        where: isPurchasing
            ? undefined
            : {
                OR: [
                    ...(Number.isNaN(userId) ? [] : [{ created_by_user_id: userId }]),
                    { created_by: userName || '__NO_USER__' }
                ]
            },
        orderBy: { created_at: 'desc' },
    });

    const supplierIds = Array.from(new Set(pos.map(po => po.supplier_id).filter(Boolean))) as number[];
    const suppliers = await prisma.tbl_suppliers.findMany({ where: { id: { in: supplierIds } } });
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

    return (
        <div>
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800">ใบสั่งซื้อ (Purchase Orders)</h1>

                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/purchase-orders/issue" className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm">
                        ออกใบสั่งซื้อ
                    </Link>
                    <Link href="/purchase-orders/receive" className="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm">
                        รับใบสั่งซื้อ
                    </Link>
                    {canEdit && (
                        <Link href="/purchase-orders/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" /> สร้างใบสั่งซื้อ
                        </Link>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">PO Number</th>
                            <th className="px-6 py-3">Supplier</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pos.map(po => (
                            <tr key={po.po_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium">{po.po_number}</td>
                                <td className="px-6 py-4">{supplierMap.get(po.supplier_id!) || '-'}</td>
                                <td className="px-6 py-4">{po.order_date ? new Date(po.order_date).toLocaleDateString('th-TH') : '-'}</td>
                                <td className="px-6 py-4 text-right">{Number(po.total_amount).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${po.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <PurchaseOrderActions
                                        poId={po.po_id}
                                        status={po.status || 'draft'}
                                        canView={canView}
                                        canEdit={canEdit}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
