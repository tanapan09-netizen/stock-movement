'use client';

import { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { getCostTrend, getTechnicianPerformance } from '@/actions/reportActions';
import { TrendingUp, Users } from 'lucide-react';

export default function ReportsDashboardClient() {
    const [costData, setCostData] = useState<any[]>([]);
    const [techData, setTechData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [costRes, techRes] = await Promise.all([
                    getCostTrend(),
                    getTechnicianPerformance()
                ]);

                if (costRes.success) setCostData((costRes.data || []) as any[]);
                if (techRes.success) setTechData((techRes.data || []) as any[]);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">กำลังโหลดข้อมูลกราฟ...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        แนวโน้มค่าใช้จ่ายซ่อมบำรุง (6 เดือนล่าสุด)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">แสดงยอดรวมค่าใช้จ่ายจริงในแต่ละเดือน</p>
                </div>

                <div className="h-[300px] w-full">
                    {costData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={costData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `฿${value}`}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    formatter={(value: any) => [`฿${(Number(value) || 0).toLocaleString()}`, 'ค่าใช้จ่าย']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cost"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorCost)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            ไม่มีข้อมูลค่าใช้จ่าย
                        </div>
                    )}
                </div>
            </div>

            {/* Technician Performance Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        ประสิทธิภาพช่าง (Top 10)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">จำนวนงานซ่อมที่ดำเนินการเสร็จสิ้น</p>
                </div>

                <div className="h-[300px] w-full">
                    {techData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={techData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="completed"
                                    fill="#8b5cf6"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                    name="งานสำเร็จ"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            ไม่มีข้อมูลประสิทธิภาพช่าง
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
