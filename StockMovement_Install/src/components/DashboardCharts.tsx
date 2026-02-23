'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Package, ArrowDownCircle, ArrowUpCircle, PieChart, BarChart } from 'lucide-react';

interface MovementTrend {
    date: string;
    in: number;
    out: number;
}

interface CategoryBreakdown {
    name: string;
    value: number;
    count: number;
    color: string;
}

// Modern Bar Chart
function ModernBarChart({ data, maxValue }: { data: MovementTrend[]; maxValue: number }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const safeMax = maxValue > 0 ? maxValue : 1;

    return (
        <div className="overflow-x-auto w-full pb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <div className="flex items-end justify-between gap-3 h-48 pt-6 min-w-[800px]">
                {data.map((item, index) => {
                    const inHeight = Math.min((item.in / safeMax) * 100, 100);
                    const outHeight = Math.min((item.out / safeMax) * 100, 100);

                    return (
                        <div
                            key={index}
                            className="flex-1 flex flex-col items-center gap-2 group relative min-w-[20px]"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Tooltip */}
                            {hoveredIndex === index && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-2 shadow-xl whitespace-nowrap z-20 transition-all">
                                    <div className="font-semibold mb-0.5">{item.date}</div>
                                    <div className="flex gap-2">
                                        <span className="text-emerald-300">เข้า: {item.in}</span>
                                        <span className="text-red-300">ออก: {item.out}</span>
                                    </div>
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                            )}

                            <div className="w-full flex gap-1 items-end h-32 bg-gray-50/50 dark:bg-gray-700/30 rounded-lg p-1 relative hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                {/* IN bar */}
                                <div
                                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm relative group-hover:from-emerald-600 group-hover:to-emerald-500 transition-all duration-300"
                                    style={{ height: `${Math.max(inHeight, 4)}%` }} // Min height for visibility
                                ></div>

                                {/* OUT bar */}
                                <div
                                    className="flex-1 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-sm relative group-hover:from-rose-600 group-hover:to-rose-500 transition-all duration-300"
                                    style={{ height: `${Math.max(outHeight, 4)}%` }}
                                ></div>
                            </div>
                            <span className={`text-[10px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${hoveredIndex === index ? 'text-gray-900 dark:text-gray-900' : 'text-gray-600 dark:text-gray-500'}`}>
                                {item.date}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Modern Donut Chart
function ModernDonutChart({ data }: { data: CategoryBreakdown[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Use refined colors
    const colors = [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#F59E0B', // Amber
        '#10B981', // Emerald
        '#EC4899', // Pink
        '#6366F1'  // Indigo
    ];

    // Pre-calculate slices
    let currentAngle = 0;
    const slices = data.map((item) => {
        const percent = total > 0 ? item.value / total : 0;
        if (percent <= 0) return null;

        const startAngle = currentAngle;
        currentAngle += percent;

        return {
            ...item,
            startAngle,
            endAngle: currentAngle,
            percent
        };
    }).filter(Boolean);

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90 overflow-visible">
                    {slices.map((item: any, index: number) => {
                        const startX = Math.cos(2 * Math.PI * item.startAngle);
                        const startY = Math.sin(2 * Math.PI * item.startAngle);

                        const endX = Math.cos(2 * Math.PI * item.endAngle);
                        const endY = Math.sin(2 * Math.PI * item.endAngle);

                        const largeArcFlag = item.percent > 0.5 ? 1 : 0;
                        const color = colors[index % colors.length];

                        return (
                            <path
                                key={index}
                                d={`M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                                fill={color}
                                stroke="transparent"
                                className="transition-all duration-300 hover:opacity-90 cursor-pointer hover:scale-105 origin-center"
                            />
                        );
                    })}
                    {/* Inner Circle for Donut Effect */}
                    <circle r="0.7" fill="white" />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-500 font-semibold">มูลค่ารวม</span>
                    <span className="text-sm font-bold text-gray-900">{(total / 1000).toFixed(1)}k</span>
                </div>
            </div>

            <div className="flex-1 w-full space-y-3">
                {data.slice(0, 5).map((item, index) => (
                    <div key={index} className="group flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div
                            className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white"
                            style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <div className="flex-1 flex justify-between items-center">
                            <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                {item.name}
                            </span>
                            <div className="text-right">
                                <div className="font-bold text-gray-900">
                                    {(item.value).toLocaleString()} ฿
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium">
                                    {item.count} รายการ
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DashboardCharts() {
    const [trendData, setTrendData] = useState<MovementTrend[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month'>('week');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/dashboard/charts?period=${period}`);
                if (res.ok) {
                    const data = await res.json();
                    setTrendData(data.trends || []);
                    setCategoryData(data.categories || []);
                }
            } catch (error) {
                console.error('Failed to fetch chart data');
            }
            setLoading(false);
        };

        fetchData();
    }, [period]);

    const maxValue = Math.max(...trendData.flatMap(d => [d.in, d.out]), 1);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
                        <div className="h-48 bg-gray-100 rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movement Trend Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                            <BarChart className="w-5 h-5" />
                        </div>
                        Movement Trends
                    </h3>
                    <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                        <button
                            onClick={() => setPeriod('week')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${period === 'week'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setPeriod('month')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${period === 'month'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Month
                        </button>
                    </div>
                </div>

                {trendData.length > 0 ? (
                    <ModernBarChart data={trendData} maxValue={maxValue} />
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Package className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-sm">ไม่มีข้อมูลการเคลื่อนไหว</span>
                    </div>
                )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
                            <PieChart className="w-5 h-5" />
                        </div>
                        Inventory Value
                    </h3>
                </div>

                {categoryData.length > 0 ? (
                    <ModernDonutChart data={categoryData} />
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Package className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-sm">ไม่มีข้อมูลสินค้า</span>
                    </div>
                )}
            </div>
        </div>
    );
}
