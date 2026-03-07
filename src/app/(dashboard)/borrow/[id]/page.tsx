import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import ReturnForm from '@/components/ReturnForm';

export default async function BorrowDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) notFound();

    const request = await prisma.borrow_requests.findUnique({
        where: { id: requestId },
        include: {
            borrow_items: true,
        },
    });

    if (!request) notFound();

    const isReturned = request.status === 'returned';

    // Get product details for items to show names
    const pIds = request.borrow_items.map(i => i.p_id);
    const products = await prisma.tbl_products.findMany({
        where: { p_id: { in: pIds } },
        select: { p_id: true, p_name: true }
    });
    const productMap: Record<string, string> = {};
    products.forEach(p => { productMap[p.p_id] = p.p_name; });

    // Check if there are items remaining to return
    const hasItemsToReturn = request.borrow_items.some(
        item => item.qty - (item.returned_qty || 0) > 0
    );

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center">
                    <Link href="/borrow" className="text-gray-500 hover:text-gray-700 mr-4">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">รายละเอียดคำขอยืม #{request.id}</h1>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {request.created_at ? new Date(request.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                        </div>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-sm ${isReturned ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isReturned ? 'คืนแล้ว' : 'รอคืน/กำลังยืม'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-gray-700 flex items-center mb-4">
                            <User className="w-5 h-5 mr-2" /> ผู้ยืม
                        </h3>
                        <div className="text-lg font-medium text-gray-900">{request.borrower_name}</div>
                        {request.note && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="text-xs text-gray-500 uppercase font-semibold">หมายเหตุ</span>
                                <p className="text-gray-600 mt-1">{request.note}</p>
                            </div>
                        )}
                    </div>

                    {!isReturned && hasItemsToReturn && (
                        <ReturnForm
                            requestId={requestId}
                            items={request.borrow_items.map(item => ({
                                id: item.id,
                                p_id: item.p_id,
                                qty: item.qty,
                                unit: item.unit,
                                returned_qty: item.returned_qty || 0
                            }))}
                            productMap={productMap}
                        />
                    )}
                </div>

                {/* Items List */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50">
                            <h3 className="font-bold text-gray-700">รายการสินค้า ({request.borrow_items.length})</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {request.borrow_items.map((item) => {
                                const remaining = item.qty - (item.returned_qty || 0);
                                return (
                                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {productMap[item.p_id] || 'Unknown Product'}
                                            </div>
                                            <div className="text-xs text-gray-500">รหัส: {item.p_id}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="font-bold text-lg">{item.qty}</span>
                                                <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                                            </div>
                                            {item.returned_qty !== undefined && item.returned_qty > 0 && (
                                                <div className={`px-2 py-1 rounded text-xs font-medium ${remaining === 0
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {remaining === 0 ? 'คืนแล้ว' : `คืนแล้ว ${item.returned_qty}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
