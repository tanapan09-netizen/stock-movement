import { prisma } from '@/lib/prisma';
import POForm from '@/components/POForm';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { canEditPurchaseOrders } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function EditPOPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const poId = parseInt(params.id);
    if (isNaN(poId)) notFound();

    const session = await auth();
    const { permissions: rolePermissions } = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    // Check Edit Permission
    if (!canEditPurchaseOrders(rolePermissions)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>คุณไม่มีสิทธิ์แก้ไขใบสั่งซื้อ (ต้องการสิทธิ์: PO_EDIT)</p>
                <Link href="/purchase-orders" className="mt-4 text-blue-600 hover:underline">
                    กลับไปหน้ารายการ
                </Link>
            </div>
        );
    }

    // Fetch PO Data
    const po = await prisma.tbl_purchase_orders.findUnique({
        where: { po_id: poId },
    });

    if (!po) notFound();

    // Prevent editing if received (consistent with backend check)
    if (po.status === 'received') {
        return (
            <div className="max-w-6xl mx-auto py-6">
                <Link href={`/purchase-orders/${poId}`} className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                    <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
                </Link>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-bold text-yellow-800 mb-2">ไม่สามารถแก้ไขได้</h3>
                    <p className="text-yellow-700">ใบสั่งซื้อนี้ได้รับการรับสินค้าแล้ว ไม่สามารถแก้ไขได้</p>
                </div>
            </div>
        );
    }

    // Fetch Items separately since relation is not defined in schema model for include
    const items = await prisma.tbl_po_items.findMany({
        where: { po_id: poId }
    });

    const [products, suppliers] = await Promise.all([
        prisma.tbl_products.findMany({ select: { p_id: true, p_name: true, price_unit: true }, where: { active: true } }),
        prisma.tbl_suppliers.findMany({ select: { id: true, name: true } })
    ]);

    // Convert Decimal to number for client component
    const productsSerialized = products.map(p => ({
        ...p,
        price_unit: p.price_unit ? Number(p.price_unit) : 0
    }));

    // Serialize PO Data
    const poSerialized = {
        ...po,
        status: po.status || 'draft', // Handle null or enum
        total_amount: Number(po.total_amount),
        tbl_po_items: items.map(item => ({
            ...item,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            line_total: Number(item.line_total),
            received_qty: item.received_qty,
            notes: item.notes,
        }))
    };

    return (
        <div className="max-w-6xl mx-auto py-6">
            <Link href="/purchase-orders" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> ยกเลิกการแก้ไข
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">แก้ไขใบสั่งซื้อ (PO)</h1>
            <POForm
                products={productsSerialized}
                suppliers={suppliers}
                initialData={poSerialized}
            />
        </div>
    );
}
