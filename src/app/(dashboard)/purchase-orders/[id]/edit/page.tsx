import { prisma } from '@/lib/prisma';
import POForm from '@/components/POForm';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { getRolePermissions } from '@/actions/roleActions';
import { PERMISSIONS } from '@/lib/permissions';

export default async function EditPOPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const poId = parseInt(params.id);
    if (isNaN(poId)) notFound();

    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role || '';
    const isPurchasing = userRole.toLowerCase() === 'purchasing';
    const rolePermissions = await getRolePermissions(userRole);

    if (!rolePermissions[PERMISSIONS.PO_EDIT] || !isPurchasing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>Only purchasing role can edit purchase orders</p>
                <Link href="/purchase-orders" className="mt-4 text-blue-600 hover:underline">
                    กลับไปรายการ
                </Link>
            </div>
        );
    }

    const po = await prisma.tbl_purchase_orders.findUnique({
        where: { po_id: poId },
    });

    if (!po) notFound();

    if (po.status === 'received') {
        return (
            <div className="max-w-6xl mx-auto py-6">
                <Link href={`/purchase-orders/${poId}`} className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                    <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
                </Link>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-bold text-yellow-800 mb-2">ไม่สามารถแก้ไขได้</h3>
                    <p className="text-yellow-700">ใบสั่งซื้อนี้รับสินค้าแล้ว จึงไม่สามารถแก้ไขได้</p>
                </div>
            </div>
        );
    }

    const items = await prisma.tbl_po_items.findMany({
        where: { po_id: poId }
    });

    const [products, suppliers] = await Promise.all([
        prisma.tbl_products.findMany({ select: { p_id: true, p_name: true, price_unit: true }, where: { active: true } }),
        prisma.tbl_suppliers.findMany({ select: { id: true, name: true } })
    ]);

    const productsSerialized = products.map(p => ({
        ...p,
        price_unit: p.price_unit ? Number(p.price_unit) : 0
    }));

    const poSerialized = {
        ...po,
        status: po.status || 'draft',
        total_amount: Number(po.total_amount),
        tbl_po_items: items.map(item => ({
            ...item,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            line_total: Number(item.line_total),
            received_qty: item.received_qty
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
