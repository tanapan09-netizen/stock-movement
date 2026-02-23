import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import { receivePO } from '@/actions/poActions';

export default async function PODetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const poId = parseInt(id);
    if (isNaN(poId)) notFound();

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

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="mb-6 flex justify-between items-center">
                <Link href="/purchase-orders" className="flex items-center text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="w-5 h-5 mr-1" /> กลับ
                </Link>
                <div className="space-x-2">
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center inline-flex">
                        <Printer className="w-4 h-4 mr-2" /> Print
                    </button>
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

                <div className="p-6 grid grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-gray-500 text-sm uppercase font-semibold">Supplier</h3>
                        <div className="font-bold text-lg">{supplier?.name || 'Unknown'}</div>
                        <div className="text-gray-600">{supplier?.address}</div>
                        <div className="text-gray-600">{supplier?.phone}</div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-gray-500 text-sm uppercase font-semibold">Total Amount</h3>
                        <div className="font-bold text-2xl text-blue-600">{Number(po.total_amount).toLocaleString()} บาท</div>
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
            </div>

            {po.status !== 'received' && (
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
