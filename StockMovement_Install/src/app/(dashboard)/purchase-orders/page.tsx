import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { auth } from '@/auth';

export default async function POListPage() {
    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role === 'admin';

    const pos = await prisma.tbl_purchase_orders.findMany({
        orderBy: { created_at: 'desc' },
        // Prisma doesn't support direct join with raw SQL table relationships easily if not defined in schema
        // But we likely have relation if introspection worked?
        // Schema shows no direct relation field in `tbl_purchase_orders` to `tbl_suppliers`?
        // `supplier_id` is Int? but no relation defined?
        // Let's check schema again. `tbl_purchase_orders` line 224: `supplier_id Int?`. No relation line.
        // So I have to fetch suppliers manually or unfiltered.
    });

    const supplierIds = Array.from(new Set(pos.map(po => po.supplier_id).filter(Boolean))) as number[];
    const suppliers = await prisma.tbl_suppliers.findMany({ where: { id: { in: supplierIds } } });
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">ใบสั่งซื้อ (Purchase Orders)</h1>
                <Link href="/purchase-orders/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> สร้างใบสั่งซื้อ
                </Link>
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
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                ${po.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                            `}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {/* Add Link to Detail */}
                                    <span className="text-gray-400">View</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
