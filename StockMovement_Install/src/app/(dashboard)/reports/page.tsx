import { prisma } from '@/lib/prisma';
import { BarChart3, TrendingUp, Package, DollarSign, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function ReportsPage() {
    // ดึงข้อมูลสินค้าทั้งหมด
    const products = await prisma.tbl_products.findMany({
        where: { active: true },
        select: {
            p_id: true,
            p_name: true,
            p_count: true,
            price_unit: true,
            main_category: true,
            safety_stock: true
        }
    });

    // คำนวณ ABC Analysis
    const productValues = products.map(p => ({
        ...p,
        totalValue: p.p_count * Number(p.price_unit || 0)
    })).sort((a, b) => b.totalValue - a.totalValue);

    const totalValue = productValues.reduce((sum, p) => sum + p.totalValue, 0);

    let cumulativePercent = 0;
    const abcProducts = productValues.map(p => {
        const percent = totalValue > 0 ? (p.totalValue / totalValue) * 100 : 0;
        cumulativePercent += percent;

        let category: 'A' | 'B' | 'C';
        if (cumulativePercent <= 80) {
            category = 'A';
        } else if (cumulativePercent <= 95) {
            category = 'B';
        } else {
            category = 'C';
        }

        return { ...p, percent, cumulativePercent, category };
    });

    const classA = abcProducts.filter(p => p.category === 'A');
    const classB = abcProducts.filter(p => p.category === 'B');
    const classC = abcProducts.filter(p => p.category === 'C');

    // Low stock products
    const lowStock = products.filter(p => p.p_count <= p.safety_stock);

    // Category breakdown
    const categoryStats: Record<string, { count: number; value: number }> = {};
    products.forEach(p => {
        const cat = p.main_category || 'อื่นๆ';
        if (!categoryStats[cat]) categoryStats[cat] = { count: 0, value: 0 };
        categoryStats[cat].count++;
        categoryStats[cat].value += p.p_count * Number(p.price_unit || 0);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-purple-600" />
                        รายงานขั้นสูง
                    </h1>
                    <p className="text-gray-500">วิเคราะห์ข้อมูลสินค้าและคลัง</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">มูลค่าสต็อกทั้งหมด</p>
                            <p className="text-2xl font-bold text-gray-800">฿{totalValue.toLocaleString()}</p>
                        </div>
                        <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">สินค้าทั้งหมด</p>
                            <p className="text-2xl font-bold text-gray-800">{products.length}</p>
                        </div>
                        <Package className="w-10 h-10 text-blue-500 opacity-50" />
                    </div>
                </div>
                <Link href="/reports/low-stock" className="bg-white rounded-xl shadow p-6 hover:shadow-md transition cursor-pointer border border-transparent hover:border-red-200 block">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">สต็อกต่ำ (คลิกดู)</p>
                            <p className="text-2xl font-bold text-red-600">{lowStock.length}</p>
                        </div>
                        <AlertTriangle className="w-10 h-10 text-red-500 opacity-50" />
                    </div>
                </Link>
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">หมวดหมู่</p>
                            <p className="text-2xl font-bold text-gray-800">{Object.keys(categoryStats).length}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* ABC Analysis */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                        ABC Analysis (Pareto)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        แบ่งกลุ่มสินค้าตามมูลค่า: A (80% มูลค่า), B (15% มูลค่า), C (5% มูลค่า)
                    </p>
                </div>

                {/* ABC Summary */}
                <div className="grid grid-cols-3 divide-x">
                    <div className="p-6 text-center bg-green-50">
                        <div className="w-12 h-12 mx-auto bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-2">A</div>
                        <p className="text-2xl font-bold text-green-700">{classA.length}</p>
                        <p className="text-sm text-green-600">สินค้าสำคัญที่สุด</p>
                        <p className="text-xs text-gray-500 mt-1">~80% ของมูลค่ารวม</p>
                    </div>
                    <div className="p-6 text-center bg-yellow-50">
                        <div className="w-12 h-12 mx-auto bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-2">B</div>
                        <p className="text-2xl font-bold text-yellow-700">{classB.length}</p>
                        <p className="text-sm text-yellow-600">สินค้าสำคัญปานกลาง</p>
                        <p className="text-xs text-gray-500 mt-1">~15% ของมูลค่ารวม</p>
                    </div>
                    <div className="p-6 text-center bg-gray-50">
                        <div className="w-12 h-12 mx-auto bg-gray-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-2">C</div>
                        <p className="text-2xl font-bold text-gray-700">{classC.length}</p>
                        <p className="text-sm text-gray-600">สินค้าทั่วไป</p>
                        <p className="text-xs text-gray-500 mt-1">~5% ของมูลค่ารวม</p>
                    </div>
                </div>

                {/* Top A Class Products */}
                <div className="p-6">
                    <h3 className="font-medium mb-4">สินค้า Class A (Top 10)</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">รหัส</th>
                                <th className="px-4 py-2 text-left">ชื่อสินค้า</th>
                                <th className="px-4 py-2 text-right">จำนวน</th>
                                <th className="px-4 py-2 text-right">มูลค่า</th>
                                <th className="px-4 py-2 text-right">สัดส่วน</th>
                                <th className="px-4 py-2 text-center">Class</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {classA.slice(0, 10).map((p, idx) => (
                                <tr key={p.p_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{p.p_id}</td>
                                    <td className="px-4 py-3">{p.p_name}</td>
                                    <td className="px-4 py-3 text-right">{p.p_count.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                        ฿{p.totalValue.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">{p.percent.toFixed(1)}%</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                            A
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold mb-4">มูลค่าตามหมวดหมู่</h2>
                <div className="space-y-3">
                    {Object.entries(categoryStats)
                        .sort((a, b) => b[1].value - a[1].value)
                        .map(([cat, stats]) => {
                            const percent = totalValue > 0 ? (stats.value / totalValue) * 100 : 0;
                            return (
                                <div key={cat}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{cat}</span>
                                        <span className="text-gray-500">
                                            {stats.count} รายการ | ฿{stats.value.toLocaleString()} ({percent.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
