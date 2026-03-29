'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, LineChart, Package, PieChart } from 'lucide-react';
import { useKpiSummary, useKpiTrend } from '@/lib/kpi/hooks';
import type { KpiGrain, KpiMetric } from '@/lib/kpi/client';

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

type DonutSlice = CategoryBreakdown & {
    startAngle: number;
    endAngle: number;
    percent: number;
};

interface KpiTrendPoint {
    period: string;
    value: number;
}

interface KpiMetricOption {
    key: KpiMetric;
    label: string;
}

interface KpiGrainOption {
    key: KpiGrain;
    label: string;
}

const KPI_METRIC_OPTIONS: KpiMetricOption[] = [
    { key: 'approval_sla', label: 'Approval SLA' },
    { key: 'register_lead', label: 'Register Lead Time' },
    { key: 'utilization', label: 'Asset Utilization' },
    { key: 'maintenance_sla', label: 'Maintenance SLA' },
    { key: 'inventory_accuracy', label: 'Inventory Accuracy' },
    { key: 'disposal_cycle', label: 'Disposal Cycle' },
];

const KPI_GRAIN_OPTIONS: KpiGrainOption[] = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
];

const KPI_CARD_META: Array<{
    key: KpiMetric;
    label: string;
    accent: string;
    suffix: string;
}> = [
    { key: 'approval_sla', label: 'Approval SLA', accent: '#2563EB', suffix: '%' },
    { key: 'register_lead', label: 'Register Lead', accent: '#0EA5E9', suffix: ' days' },
    { key: 'utilization', label: 'Utilization', accent: '#10B981', suffix: '%' },
    { key: 'maintenance_sla', label: 'Maintenance SLA', accent: '#F59E0B', suffix: '%' },
    { key: 'inventory_accuracy', label: 'Inventory Accuracy', accent: '#8B5CF6', suffix: '%' },
    { key: 'disposal_cycle', label: 'Disposal Cycle', accent: '#EF4444', suffix: ' days' },
];

function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatKpiValue(metric: KpiMetric, rawValue: number): string {
    if (!Number.isFinite(rawValue)) return '0';

    const fixed = metric === 'register_lead' || metric === 'disposal_cycle'
        ? rawValue.toFixed(2)
        : rawValue.toFixed(1);

    return fixed;
}

function getKpiSummaryValue(metric: KpiMetric, data?: {
    approval_sla_pct: number;
    register_lead_days: number;
    utilization_pct: number;
    maintenance_sla_pct: number;
    inventory_accuracy_pct: number;
    disposal_cycle_days: number;
} | null): number {
    if (!data) return 0;

    switch (metric) {
        case 'approval_sla':
            return data.approval_sla_pct;
        case 'register_lead':
            return data.register_lead_days;
        case 'utilization':
            return data.utilization_pct;
        case 'maintenance_sla':
            return data.maintenance_sla_pct;
        case 'inventory_accuracy':
            return data.inventory_accuracy_pct;
        case 'disposal_cycle':
            return data.disposal_cycle_days;
        default:
            return 0;
    }
}

function KpiTrendBars({ data }: { data: KpiTrendPoint[] }) {
    const maxValue = Math.max(...data.map((point) => point.value), 1);

    return (
        <div className="overflow-x-auto w-full pb-3">
            <div
                className="flex items-end gap-2 h-48 min-w-[520px]"
                style={{ minWidth: `${Math.max(data.length * 48, 520)}px` }}
            >
                {data.map((point) => {
                    const ratio = maxValue > 0 ? point.value / maxValue : 0;
                    const height = Math.max(ratio * 100, 4);

                    return (
                        <div key={point.period} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group">
                            <div className="w-full h-36 flex items-end rounded-md bg-slate-100 px-1.5 py-1">
                                <div
                                    className="w-full rounded-sm bg-gradient-to-t from-indigo-600 to-blue-400 transition-all duration-300 group-hover:from-indigo-700 group-hover:to-blue-500"
                                    style={{ height: `${height}%` }}
                                    title={`${point.period}: ${point.value.toFixed(2)}`}
                                />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{point.period}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
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
                                <div
                                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm relative group-hover:from-emerald-600 group-hover:to-emerald-500 transition-all duration-300"
                                    style={{ height: `${Math.max(inHeight, 4)}%` }}
                                ></div>

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

    const colors = [
        '#3B82F6',
        '#8B5CF6',
        '#F59E0B',
        '#10B981',
        '#EC4899',
        '#6366F1'
    ];

    const slices = data.reduce(
        (acc, item) => {
            const percent = total > 0 ? item.value / total : 0;
            if (percent <= 0) return acc;

            const startAngle = acc.currentAngle;
            const endAngle = startAngle + percent;
            const nextSlice: DonutSlice = {
                ...item,
                startAngle,
                endAngle,
                percent,
            };

            return {
                currentAngle: endAngle,
                slices: [...acc.slices, nextSlice],
            };
        },
        { currentAngle: 0, slices: [] as DonutSlice[] }
    ).slices;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90 overflow-visible">
                    {slices.map((item, index) => {
                        const startX = Math.cos(2 * Math.PI * item.startAngle);
                        const startY = Math.sin(2 * Math.PI * item.startAngle);

                        const endX = Math.cos(2 * Math.PI * item.endAngle);
                        const endY = Math.sin(2 * Math.PI * item.endAngle);

                        const largeArcFlag = item.percent > 0.5 ? 1 : 0;
                        const color = colors[index % colors.length];

                        return (
                            <path
                                key={`${item.name}-${index}`}
                                d={`M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                                fill={color}
                                stroke="transparent"
                                className="transition-all duration-300 hover:opacity-90 cursor-pointer hover:scale-105 origin-center"
                            />
                        );
                    })}
                    <circle r="0.7" fill="white" />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-500 font-semibold">มูลค่ารวม</span>
                    <span className="text-sm font-bold text-gray-900">{(total / 1000).toFixed(1)}k</span>
                </div>
            </div>

            <div className="flex-1 w-full space-y-3">
                {data.slice(0, 5).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="group flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div
                            className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white"
                            style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <div className="flex-1 flex justify-between items-center">
                            <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                {item.name}
                            </span>
                            <div className="text-right">
                                <div className="font-bold text-gray-900">{item.value.toLocaleString()} ฿</div>
                                <div className="text-[10px] text-gray-500 font-medium">{item.count} รายการ</div>
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

    const [kpiTo, setKpiTo] = useState(() => toIsoDate(new Date()));
    const [kpiFrom, setKpiFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return toIsoDate(d);
    });
    const [kpiMetric, setKpiMetric] = useState<KpiMetric>('approval_sla');
    const [kpiGrain, setKpiGrain] = useState<KpiGrain>('week');

    const kpiFilters = useMemo(
        () => ({ from: kpiFrom, to: kpiTo }),
        [kpiFrom, kpiTo]
    );

    const kpiSummary = useKpiSummary(kpiFilters, Boolean(kpiFrom && kpiTo));
    const kpiTrendRequest = useMemo(
        () => ({
            from: kpiFrom,
            to: kpiTo,
            metric: kpiMetric,
            grain: kpiGrain,
        }),
        [kpiFrom, kpiTo, kpiMetric, kpiGrain]
    );
    const kpiTrend = useKpiTrend(kpiTrendRequest, Boolean(kpiFrom && kpiTo));

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/dashboard/charts?period=${period}`);
                if (res.ok) {
                    const data = await res.json();
                    setTrendData(data.trends || []);
                    setCategoryData(data.categories || []);
                }
            } catch {
                console.error('Failed to fetch chart data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period]);

    const maxValue = Math.max(...trendData.flatMap((d) => [d.in, d.out]), 1);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <LineChart className="w-5 h-5" />
                        </div>
                        Asset KPI Snapshot
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={kpiFrom}
                            onChange={(e) => setKpiFrom(e.target.value)}
                            className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200"
                            aria-label="KPI start date"
                        />
                        <input
                            type="date"
                            value={kpiTo}
                            onChange={(e) => setKpiTo(e.target.value)}
                            className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200"
                            aria-label="KPI end date"
                        />
                    </div>
                </div>

                {kpiSummary.error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        KPI summary load failed: {kpiSummary.error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {KPI_CARD_META.map((item) => {
                            const value = getKpiSummaryValue(item.key, kpiSummary.data);

                            return (
                                <div
                                    key={item.key}
                                    className="rounded-xl border bg-slate-50 dark:bg-slate-900/40 px-4 py-3"
                                    style={{ borderColor: `${item.accent}40` }}
                                >
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                        {item.label}
                                    </p>
                                    <div className="mt-1 flex items-end gap-1">
                                        {kpiSummary.loading ? (
                                            <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                                        ) : (
                                            <>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
                                                    {formatKpiValue(item.key, value)}
                                                </p>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 pb-0.5">
                                                    {item.suffix}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                            <LineChart className="w-5 h-5" />
                        </div>
                        KPI Trend
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={kpiMetric}
                            onChange={(e) => setKpiMetric(e.target.value as KpiMetric)}
                            className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200"
                            aria-label="KPI metric"
                        >
                            {KPI_METRIC_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={kpiGrain}
                            onChange={(e) => setKpiGrain(e.target.value as KpiGrain)}
                            className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-200"
                            aria-label="KPI grain"
                        >
                            {KPI_GRAIN_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {kpiTrend.loading ? (
                    <div className="h-44 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
                ) : kpiTrend.error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        KPI trend load failed: {kpiTrend.error}
                    </div>
                ) : kpiTrend.data?.points?.length ? (
                    <KpiTrendBars data={kpiTrend.data.points} />
                ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Package className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-sm">ไม่มีข้อมูล KPI trend ในช่วงวันที่เลือก</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    {loading ? (
                        <div className="h-48 bg-gray-100 dark:bg-slate-700/40 rounded-xl animate-pulse" />
                    ) : trendData.length > 0 ? (
                        <ModernBarChart data={trendData} maxValue={maxValue} />
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Package className="w-8 h-8 opacity-20 mb-2" />
                            <span className="text-sm">ไม่มีข้อมูลการเคลื่อนไหว</span>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
                                <PieChart className="w-5 h-5" />
                            </div>
                            Inventory Value
                        </h3>
                    </div>

                    {loading ? (
                        <div className="h-48 bg-gray-100 dark:bg-slate-700/40 rounded-xl animate-pulse" />
                    ) : categoryData.length > 0 ? (
                        <ModernDonutChart data={categoryData} />
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Package className="w-8 h-8 opacity-20 mb-2" />
                            <span className="text-sm">ไม่มีข้อมูลสินค้า</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

