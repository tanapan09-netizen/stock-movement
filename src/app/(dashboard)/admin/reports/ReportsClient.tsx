'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import {
    DollarSign, CheckCircle, TrendingUp, Package, Calendar, Download
} from 'lucide-react';
import {
    getReportSummary, getCostTrend, getTechnicianPerformance, getCategoryStats
} from '@/actions/reportActions';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsClient() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [costTrend, setCostTrend] = useState<any[]>([]);
    const [techStats, setTechStats] = useState<any[]>([]);
    const [categoryStats, setCategoryStats] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [sumRes, trendRes, techRes, catRes] = await Promise.all([
                getReportSummary(),
                getCostTrend(),
                getTechnicianPerformance(),
                getCategoryStats()
            ]);

            if (sumRes.success) setSummary(sumRes.data);
            if (trendRes.success) setCostTrend((trendRes.data || []) as any[]);
            if (techRes.success) setTechStats((techRes.data || []) as any[]);
            if (catRes.success) setCategoryStats((catRes.data || []) as any[]);

        } catch (error) {
            console.error('Error loading report data:', error);
        }
        setLoading(false);
    }

    if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลรายงาน...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="text-blue-600" /> รายงานและสถิติ (Reports)
                    </h1>
                    <p className="text-gray-500">ภาพรวมประสิทธิภาพและค่าใช้จ่ายในการซ่อมบำรุง</p>
                </div>
                <button
                    disabled
                    className="px-4 py-2 bg-white border text-gray-400 rounded-lg flex items-center gap-2 cursor-not-allowed"
                    title="ยังไม่เปิดใช้งาน"
                >
                    <Download size={18} /> Export PDF
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">ค่าใช้จ่ายรวม (Total Cost)</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    ฿{summary.totalCost.toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">รวมค่าอะไหล่และค่าแรง</div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">งานเสร็จสิ้น (Completed)</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    {summary.completedTasks} / {summary.totalTasks}
                                </h3>
                            </div>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle size={20} />
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                            อัตราความสำเร็จ {summary.completionRate.toFixed(1)}%
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">มูลค่าสต็อก (Inventory)</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    ฿{summary.inventoryValue.toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <Package size={20} />
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">มูลค่ารวมสินค้าคงคลังปัจจุบัน</div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">ค่าอะไหล่ (Parts)</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    ฿{summary.totalPartCost.toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">จากการเบิกจ่ายอะไหล่</div>
                    </div>
                </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cost Trend - Wide */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6">แนวโน้มค่าใช้จ่าย (Cost Trend - 6 Months)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={costTrend}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: any) => [`฿${(Number(value) || 0).toLocaleString()}`, 'Cost']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="cost" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">สัดส่วนงานซ่อม (By Category)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6">ประสิทธิภาพการทำงานของช่าง (Top Technicians)</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={techStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="completed" name="งานที่เสร็จสิ้น" fill="#10B981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
