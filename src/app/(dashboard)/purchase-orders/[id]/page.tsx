import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Printer, Lock, Box } from 'lucide-react';
import { receivePO } from '@/actions/poActions';
import { auth } from '@/auth';
import { getRolePermissions } from '@/actions/roleActions';
import { PERMISSIONS } from '@/lib/permissions';

export default async function PODetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const poId = parseInt(params.id);
    if (isNaN(poId)) notFound();

    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role || '';
    const rolePermissions = await getRolePermissions(userRole);

    // Check View Permission
    if (!rolePermissions[PERMISSIONS.PO_VIEW]) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
                <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์: PO_VIEW)</p>
            </div>
        );
    }

    const po = await prisma.tbl_purchase_orders.findUnique({
        where: { po_id: poId },
    });

    if (!po) return <div>ไม่พบใบสั่งซื้อ</div>;

    const items = await prisma.tbl_po_items.findMany({
        where: { po_id: poId }
    });

    // Merge items into PO object for compatibility if needed, or pass separately
    const poWithItems = { ...po, tbl_po_items: items };

    // Get Product Names
    const pIds = poWithItems.tbl_po_items.map(i => i.p_id);
    const products = await prisma.tbl_products.findMany({ where: { p_id: { in: pIds } }, select: { p_id: true, p_name: true } });
    const productMap = new Map(products.map(p => [p.p_id, p.p_name]));

    // Get Supplier
    const supplier = po.supplier_id ? await prisma.tbl_suppliers.findUnique({ where: { id: po.supplier_id } }) : null;

    async function handleReceive() {
        'use server';
        await receivePO(poId);
        redirect(`/purchase-orders/${poId}`);
    }

    // Calculate real subtotal and tax in case DB fields are 0 for older records
    const calculatedSubtotal = poWithItems.tbl_po_items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
    const displaySubtotal = Number(po.subtotal) > 0 ? Number(po.subtotal) : calculatedSubtotal;
    const calculatedTax = Number(po.total_amount) - displaySubtotal;
    const displayTax = Number(po.tax_amount) > 0 ? Number(po.tax_amount) : (calculatedTax > 0 ? calculatedTax : 0);

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="mb-6 flex justify-between items-center">
                <Link href="/purchase-orders" className="flex items-center text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="w-5 h-5 mr-1" /> กลับ
                </Link>
                <div className="space-x-2 flex">
                    {/* Edit Permission */}
                    {po.status !== 'received' && rolePermissions[PERMISSIONS.PO_EDIT] && (
                        <Link
                            href={`/purchase-orders/${poId}/edit`}
                            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center inline-flex"
                        >
                            <Box className="w-4 h-4 mr-2" /> Edit
                        </Link>
                    )}
                    {/* Print Permission */}
                    {rolePermissions[PERMISSIONS.PO_PRINT] && (
                        <Link
                            href={`/print/purchase-orders/${poId}`}
                            target="_blank"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center inline-flex"
                        >
                            <Printer className="w-4 h-4 mr-2" /> Print
                        </Link>
                    )}
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                <div className={`px-6 py-4 border-b flex justify-between items-center ${po.status === 'received' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">PO #{po.po_number}</h1>
                        <div className="text-sm text-gray-500">
                            Date: {po.order_date ? new Date(po.order_date).toLocaleDateString('th-TH') : '-'}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${po.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {po.status}
                        </span>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-2 gap-6 pb-4">
                    <div>
                        <h3 className="text-gray-500 text-sm uppercase font-semibold">Supplier</h3>
                        <div className="font-bold text-lg">{supplier?.name || 'Unknown'}</div>
                        <div className="text-gray-600">{supplier?.address}</div>
                        <div className="text-gray-600">{supplier?.phone}</div>
                    </div>
                </div>

                <div className="border-t">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-3">Product</th>
                                <th className="px-6 py-3 text-right">Qty</th>
                                <th className="px-6 py-3 text-right">Unit Price</th>
                                <th className="px-6 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {poWithItems.tbl_po_items.map(item => (
                                <tr key={item.item_id}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium">{productMap.get(item.p_id)}</div>
                                        <div className="text-xs text-gray-400">{item.p_id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.quantity}</td>
                                    <td className="px-6 py-4 text-right">{Number(item.unit_price).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold">{Number(item.line_total).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section */}
                <div className="bg-gray-50 p-6 border-t flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{displaySubtotal.toLocaleString()}</span>
                        </div>
                        {displayTax > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>VAT (7%)</span>
                                <span>{displayTax.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg text-blue-600 border-t pt-3">
                            <span>Total Amount</span>
                            <span>{Number(po.total_amount).toLocaleString()} บาท</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receive Permission */}
            {po.status !== 'received' && rolePermissions[PERMISSIONS.PO_RECEIVE] && (
                <form action={handleReceive} className="bg-white p-6 rounded-lg shadow flex flex-col items-center justify-center text-center">
                    <h3 className="font-bold text-gray-800 mb-2">ดำเนินการรับสินค้า</h3>
                    <p className="text-gray-500 text-sm mb-4">เมื่อกดปุ่มนี้ ระบบจะปรับสถานะเป็น "Received" และเพิ่มสต็อกสินค้าอัตโนมัติ</p>
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center transition transform hover:scale-105">
                        <CheckCircle className="w-5 h-5 mr-2" /> ยืนยันรับสินค้าเข้าคลัง
                    </button>
                </form>
            )}
        </div>
    );
}
