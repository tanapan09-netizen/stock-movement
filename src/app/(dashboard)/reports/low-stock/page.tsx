import { prisma } from '@/lib/prisma';
import { AlertTriangle, ArrowLeft, Package, Boxes } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function LowStockReportPage() {
    // Fetch products below or equal to safety stock
    const lowStockProducts = await prisma.tbl_products.findMany({
        where: {
            active: true,
            p_count: {
                lte: prisma.tbl_products.fields.safety_stock
            }
        },
        orderBy: {
            p_count: 'asc'
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/reports" className="text-gray-500 hover:text-gray-700 flex items-center mb-2 transition">
                        <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                        รายงานสินค้าเหลือน้อย
                    </h1>
                    <p className="text-gray-500">รายการสินค้าที่มีจำนวนคงเหลือต่ำกว่าจุดสั่งซื้อ (Safety Stock)</p>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <Boxes className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-800">สินค้าที่ต้องสั่งซื้อเพิ่ม</h3>
                    <p className="text-red-600">พบ {lowStockProducts.length} รายการ ที่ต่ำกว่าเกณฑ์ Safety Stock</p>
                </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="px-6 py-4 text-left">สินค้า</th>
                                <th className="px-6 py-4 text-left">หมวดหมู่</th>
                                <th className="px-6 py-4 text-left">Supplier</th>
                                <th className="px-6 py-4 text-right">คงเหลือ</th>
                                <th className="px-6 py-4 text-right">Safety Stock</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lowStockProducts.length > 0 ? (
                                lowStockProducts.map((product) => (
                                    <tr key={product.p_id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative border">
                                                    {product.p_image ? (
                                                        <Image
                                                            src={`/uploads/${product.p_image}`}
                                                            alt={product.p_name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <Package className="w-6 h-6 opacity-30" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{product.p_name}</div>
                                                    <div className="text-xs text-gray-500">{product.p_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {product.main_category || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {product.supplier || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-red-600 text-lg">
                                                {product.p_count}
                                            </span>
                                            <span className="text-gray-400 text-xs ml-1">{product.p_unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-medium text-gray-700">
                                                {product.safety_stock}
                                            </span>
                                            <span className="text-gray-400 text-xs ml-1">{product.p_unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {product.p_count === 0 ? (
                                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                    สินค้าหมด
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                    ควรสั่งเพิ่ม
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
                                                <Boxes className="w-8 h-8 text-green-500" />
                                            </div>
                                            <p className="text-lg font-medium text-gray-700">ไม่มีสินค้าคงเหลือต่ำกว่าเกณฑ์</p>
                                            <p className="text-sm">สินค้าทุกรายการมีจำนวนเพียงพอในสต็อก</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
