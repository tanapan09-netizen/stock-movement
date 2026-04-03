'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Package, PieChart, TrendingUp, Activity } from 'lucide-react';
import { useKpiSummary, useKpiTrend } from '@/lib/kpi/hooks';
import type { KpiGrain, KpiMetric } from '@/lib/kpi/client';
import { DonutChart } from '@/components/DonutChart';

/* Section */
interface MovementTrend { date: string; in: number; out: number }
interface CategoryBreakdown { name: string; value: number; count: number; color: string }
type DonutSlice = CategoryBreakdown & { startAngle: number; endAngle: number; percent: number }
interface KpiTrendPoint { period: string; value: number }
interface KpiMetricOption { key: KpiMetric; label: string }
interface KpiGrainOption { key: KpiGrain; label: string }

/* Section */
const KPI_METRIC_OPTIONS: KpiMetricOption[] = [
    { key: 'approval_sla',       label: 'Approval SLA'       },
    { key: 'register_lead',      label: 'Register Lead Time' },
    { key: 'utilization',        label: 'Asset Utilization'  },
    { key: 'maintenance_sla',    label: 'Maintenance SLA'    },
    { key: 'inventory_accuracy', label: 'Inventory Accuracy' },
    { key: 'disposal_cycle',     label: 'Disposal Cycle'     },
];

const KPI_GRAIN_OPTIONS: KpiGrainOption[] = [
    { key: 'day',   label: 'Day'   },
    { key: 'week',  label: 'Week'  },
    { key: 'month', label: 'Month' },
];

const KPI_CARD_META = [
    { key: 'approval_sla'       as KpiMetric, label: 'Approval SLA',       accent: '#60A5FA', glow: '#3B82F620', suffix: '%',  },
    { key: 'register_lead'      as KpiMetric, label: 'Register Lead',       accent: '#34D399', glow: '#10B98120', suffix: ' d', },
    { key: 'utilization'        as KpiMetric, label: 'Utilization',         accent: '#A78BFA', glow: '#8B5CF620', suffix: '%',  },
    { key: 'maintenance_sla'    as KpiMetric, label: 'Maintenance SLA',     accent: '#FBBF24', glow: '#F59E0B20', suffix: '%',  },
    { key: 'inventory_accuracy' as KpiMetric, label: 'Inventory Accuracy',  accent: '#F472B6', glow: '#EC489920', suffix: '%',  },
    { key: 'disposal_cycle'     as KpiMetric, label: 'Disposal Cycle',      accent: '#FB923C', glow: '#F9731620', suffix: ' d', },
];

const DONUT_COLORS = ['#60A5FA','#34D399','#A78BFA','#FBBF24','#F472B6','#FB923C','#22D3EE','#A3E635'];

/* Section */
function toIsoDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatKpiValue(metric: KpiMetric, v: number) {
    if (!Number.isFinite(v)) return '0';
    return (metric === 'register_lead' || metric === 'disposal_cycle') ? v.toFixed(2) : v.toFixed(1);
}

function getKpiSummaryValue(metric: KpiMetric, data?: any): number {
    if (!data) return 0;
    const map: Record<KpiMetric, number> = {
        approval_sla: data.approval_sla_pct,
        register_lead: data.register_lead_days,
        utilization: data.utilization_pct,
        maintenance_sla: data.maintenance_sla_pct,
        inventory_accuracy: data.inventory_accuracy_pct,
        disposal_cycle: data.disposal_cycle_days,
    };
    return map[metric] ?? 0;
}

/* Section */
function KpiTrendBars({ data, accent }: { data: KpiTrendPoint[]; accent: string }) {
    const max = Math.max(...data.map(p => p.value), 1);
    const [hovered, setHovered] = useState<number | null>(null);
    const chartMinWidth = Math.max(data.length * 36, 360);

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex items-end gap-1.5 h-48" style={{ minWidth: `${chartMinWidth}px` }}>
                {data.map((pt, i) => {
                    const h = Math.max((pt.value / max) * 100, 3);
                    const isHov = hovered === i;
                    return (
                        <div
                            key={pt.period}
                            className="flex-1 min-w-[28px] sm:min-w-[30px] flex flex-col items-center gap-1.5 cursor-pointer"
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div className={`text-[10px] font-bold transition-all duration-200 px-2 py-0.5 rounded-full ${isHov ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                                 style={{ color: accent, background: `${accent}15` }}>
                                {pt.value.toFixed(1)}
                            </div>
                            <div className="w-full flex-1 relative flex items-end rounded-lg overflow-hidden"
                                 style={{ background: 'rgba(148,163,184,0.14)', boxShadow: isHov ? `0 0 16px ${accent}25` : 'none' }}>
                                <div
                                    className="w-full rounded-lg transition-all duration-500"
                                    style={{
                                        height: `${h}%`,
                                        background: isHov
                                            ? `linear-gradient(to top, ${accent}, ${accent}99)`
                                            : `linear-gradient(to top, ${accent}90, ${accent}40)`,
                                        boxShadow: isHov ? `0 -4px 20px ${accent}60` : 'none',
                                    }}
                                />
                            </div>
                            <span className={`text-[8px] sm:text-[9px] font-semibold tracking-wide transition-colors duration-200 ${isHov ? 'text-slate-800' : 'text-slate-500'}`}>
                                {pt.period}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Movement Chart ─────────────────────────────────────────────────────────
   Bars stretch to fill the full card width at all times.
   Horizontal scroll only activates when there are so many data points
   that each bar-pair would be narrower than MIN_BAR_PX pixels.
────────────────────────────────────────────────────────────────────────────── */
function MovementChart({ data, maxValue }: { data: MovementTrend[]; maxValue: number }) {
    const [hovered, setHovered] = useState<number | null>(null);
    const safeMax = maxValue > 0 ? maxValue : 1;

    const totalIn  = data.reduce((s, d) => s + d.in,  0);
    const totalOut = data.reduce((s, d) => s + d.out, 0);
    const net      = totalIn - totalOut;

    /* Only force a minWidth (enabling scroll) if bars would be too cramped */
    const MIN_BAR_PX = 32;
    const forceMinWidth = data.length > 20; // ~20 bars fit comfortably at 2/3 xl width
    const minWidth = forceMinWidth ? `${data.length * MIN_BAR_PX}px` : '100%';

    return (
        <div className="w-full space-y-3">
            {/* Summary pills */}
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">Total In</p>
                    <p className="text-sm font-bold text-emerald-800">{totalIn.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-wide text-rose-700 uppercase">Total Out</p>
                    <p className="text-sm font-bold text-rose-800">{totalOut.toLocaleString()}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${net >= 0 ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className={`text-[10px] font-semibold tracking-wide uppercase ${net >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Net</p>
                    <p className={`text-sm font-bold ${net >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>{net.toLocaleString()}</p>
                </div>
            </div>

            {/* Chart — scrollable wrapper only when needed */}
            <div className="w-full overflow-x-auto pb-1">
                <div
                    className="relative flex items-end gap-1 h-48 pt-6"
                    style={{ minWidth, width: forceMinWidth ? minWidth : '100%' }}
                >
                    {/* Grid lines */}
                    {[25, 50, 75].map(level => (
                        <div
                            key={level}
                            className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-200"
                            style={{ bottom: `calc(${(level / 100) * 144}px + 24px)` }}
                        />
                    ))}

                    {data.map((item, i) => {
                        const inH   = Math.min((item.in  / safeMax) * 100, 100);
                        const outH  = Math.min((item.out / safeMax) * 100, 100);
                        const isHov = hovered === i;

                        return (
                            <div
                                key={`${item.date}-${i}`}
                                className="flex-1 flex flex-col items-center gap-1 relative"
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                {/* Tooltip */}
                                {isHov && (
                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] whitespace-nowrap shadow-xl pointer-events-none">
                                        <p className="font-bold text-slate-800 mb-0.5">{item.date}</p>
                                        <div className="flex gap-3">
                                            <span className="text-emerald-600 font-semibold">▲ {item.in.toLocaleString()}</span>
                                            <span className="text-rose-600 font-semibold">▼ {item.out.toLocaleString()}</span>
                                        </div>
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-slate-200" />
                                    </div>
                                )}

                                {/* Bar group */}
                                <div
                                    className="w-full flex gap-0.5 items-end h-36 rounded-lg px-0.5 pb-0.5 border transition-all duration-200"
                                    style={{
                                        background:  isHov ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.06)',
                                        borderColor: isHov ? 'rgba(100,116,139,0.30)' : 'rgba(148,163,184,0.20)',
                                    }}
                                >
                                    <div
                                        className="flex-1 rounded-sm transition-all duration-300"
                                        style={{
                                            height: `${Math.max(inH, 4)}%`,
                                            background: 'linear-gradient(to top, #10B981, #6EE7B7)',
                                            boxShadow: isHov ? '0 -4px 12px rgba(16,185,129,0.35)' : 'none',
                                        }}
                                    />
                                    <div
                                        className="flex-1 rounded-sm transition-all duration-300"
                                        style={{
                                            height: `${Math.max(outH, 4)}%`,
                                            background: 'linear-gradient(to top, #F43F5E, #FDA4AF)',
                                            boxShadow: isHov ? '0 -4px 12px rgba(244,63,94,0.30)' : 'none',
                                        }}
                                    />
                                </div>

                                {/* Date label */}
                                <span
                                    className={`text-[8px] font-semibold tracking-wide leading-tight text-center w-full truncate transition-colors ${isHov ? 'text-slate-700' : 'text-slate-400'}`}
                                >
                                    {item.date}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-5 justify-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]" />
                    Stock In
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.35)]" />
                    Stock Out
                </div>
            </div>
        </div>
    );
}

function GlowDonutChart({ data }: { data: CategoryBreakdown[] }) {
    const [hov, setHov] = useState<number | null>(null);
    const total = data.reduce((s, d) => s + d.value, 0);

    const slices = data.reduce((acc, item) => {
        const pct = total > 0 ? item.value / total : 0;
        if (pct <= 0) return acc;
        const start = acc.cur;
        return { cur: start + pct, list: [...acc.list, { ...item, start, end: start + pct, pct }] };
    }, { cur: 0, list: [] as any[] }).list;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-44 h-44 shrink-0">
                <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90 drop-shadow-2xl">
                    <defs>
                        {DONUT_COLORS.map((c, i) => (
                            <filter key={i} id={`glow-${i}`}>
                                <feGaussianBlur stdDeviation="0.06" result="blur" />
                                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                        ))}
                    </defs>
                    {slices.map((s, i) => {
                        const sx = Math.cos(2*Math.PI*s.start), sy = Math.sin(2*Math.PI*s.start);
                        const ex = Math.cos(2*Math.PI*s.end),   ey = Math.sin(2*Math.PI*s.end);
                        const large = s.pct > 0.5 ? 1 : 0;
                        const color = DONUT_COLORS[i % DONUT_COLORS.length];
                        const scale = hov === i ? 1.06 : 1;
                        return (
                            <path
                                key={i}
                                d={`M 0 0 L ${sx} ${sy} A 1 1 0 ${large} 1 ${ex} ${ey} Z`}
                                fill={color}
                                opacity={hov === null || hov === i ? 1 : 0.35}
                                filter={hov === i ? `url(#glow-${i})` : undefined}
                                transform={`scale(${scale})`}
                                className="cursor-pointer transition-all duration-300 origin-center"
                                onMouseEnter={() => setHov(i)}
                                onMouseLeave={() => setHov(null)}
                            />
                        );
                    })}
                    <circle r="0.62" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.02" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hov !== null ? (
                        <>
                            <span className="text-[10px] text-slate-500 font-semibold">{data[hov]?.name}</span>
                            <span className="text-lg font-black text-slate-900">{(data[hov]?.value/1000).toFixed(1)}k</span>
                        </>
                    ) : (
                        <>
                            <span className="text-[10px] text-slate-500 font-semibold">Total</span>
                            <span className="text-lg font-black text-slate-900">{(total/1000).toFixed(1)}k</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full space-y-2">
                {data.slice(0,6).map((item, i) => {
                    const pct = total > 0 ? (item.value/total*100) : 0;
                    const color = DONUT_COLORS[i % DONUT_COLORS.length];
                    return (
                        <div key={i}
                             className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200"
                             style={{ background: hov === i ? `${color}12` : 'transparent' }}
                             onMouseEnter={() => setHov(i)}
                             onMouseLeave={() => setHov(null)}>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                            <span className="flex-1 text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors truncate">{item.name}</span>
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-900">{item.value.toLocaleString()} THB</div>
                                <div className="text-[10px] text-slate-500">{pct.toFixed(1)}%</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
             style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)' }}>
            {children}
        </div>
    );
}

function SectionHeader({ icon: Icon, label, sub, accent, className = 'mb-4' }: { icon: any; label: string; sub?: string; accent: string; className?: string }) {
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            <div className="p-2 rounded-xl shrink-0" style={{ background: `${accent}20` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-wide leading-tight">{label}</h3>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{sub}</p>}
            </div>
        </div>
    );
}

const selectClass = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors hover:bg-slate-50";
const inputClass  = selectClass;

function Skeleton({ h = 'h-44' }: { h?: string }) {
    return <div className={`${h} rounded-xl animate-pulse bg-slate-100`} />;
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="h-44 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <Package className="w-8 h-8 text-slate-400" />
            <p className="text-xs text-slate-500">{label}</p>
        </div>
    );
}

export default function DashboardCharts() {
    const [trendData,    setTrendData]    = useState<MovementTrend[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [period,       setPeriod]       = useState<'week'|'month'>('week');

    const [kpiTo,   setKpiTo]   = useState(() => toIsoDate(new Date()));
    const [kpiFrom, setKpiFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate()-29); return toIsoDate(d); });
    const [kpiMetric, setKpiMetric] = useState<KpiMetric>('approval_sla');
    const [kpiGrain,  setKpiGrain]  = useState<KpiGrain>('week');

    const kpiFilters = useMemo(() => ({ from: kpiFrom, to: kpiTo }), [kpiFrom, kpiTo]);
    const kpiSummary = useKpiSummary(kpiFilters, Boolean(kpiFrom && kpiTo));

    const kpiTrendReq = useMemo(() => ({ from: kpiFrom, to: kpiTo, metric: kpiMetric, grain: kpiGrain }), [kpiFrom, kpiTo, kpiMetric, kpiGrain]);
    const kpiTrend    = useKpiTrend(kpiTrendReq, Boolean(kpiFrom && kpiTo));

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/dashboard/charts?period=${period}`);
                if (res.ok) {
                    const data = await res.json();
                    setTrendData(data.trends ?? []);
                    setCategoryData(data.categories ?? []);
                }
            } catch { /* noop */ }
            finally { setLoading(false); }
        })();
    }, [period]);

    const maxValue = Math.max(...trendData.flatMap(d => [d.in, d.out]), 1);

    const inventoryValueDonutData = useMemo(() =>
        [...categoryData]
            .filter(i => i.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
            .map((item, idx) => ({
                label: item.name,
                value: Math.round(item.value),
                color: item.color || DONUT_COLORS[idx % DONUT_COLORS.length],
            })),
    [categoryData]);

    const productCategoryDonutData = useMemo(() =>
        categoryData.filter(i => i.count > 0).slice(0,8).map((item, idx) => ({
            label: item.name,
            value: item.count,
            color: item.color || DONUT_COLORS[idx % DONUT_COLORS.length],
        })),
    [categoryData]);

    const currentMetaAccent = KPI_CARD_META.find(m => m.key === kpiMetric)?.accent ?? '#60A5FA';

    return (
        <div className="space-y-5 p-1" style={{ background: '#F8FAFC', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

            {/* KPI Snapshot */}
            <Card>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <SectionHeader icon={Activity} label="Asset KPI Snapshot" sub="Live metrics for the selected date range" accent="#60A5FA" className="mb-0" />
                    <div className="flex gap-2 flex-wrap shrink-0">
                        <input type="date" value={kpiFrom} onChange={e => setKpiFrom(e.target.value)} className={inputClass} aria-label="KPI start date" />
                        <input type="date" value={kpiTo}   onChange={e => setKpiTo(e.target.value)}   className={inputClass} aria-label="KPI end date"   />
                    </div>
                </div>

                {kpiSummary.error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        KPI summary load failed: {kpiSummary.error}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                        {KPI_CARD_META.map(item => {
                            const value = getKpiSummaryValue(item.key, kpiSummary.data);
                            return (
                                <div key={item.key}
                                     className="group relative rounded-2xl p-4 border overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-0.5"
                                     style={{ borderColor: `${item.accent}25`, background: `linear-gradient(145deg, ${item.glow}, transparent)` }}>
                                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                                         style={{ background: item.accent }} />
                                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: item.accent }}>
                                        {item.label}
                                    </p>
                                    {kpiSummary.loading ? (
                                        <div className="h-7 w-16 rounded-lg animate-pulse bg-slate-200" />
                                    ) : (
                                        <div className="flex items-end gap-0.5">
                                            <span className="text-3xl font-black text-slate-900 leading-none tabular-nums">
                                                {formatKpiValue(item.key, value)}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-500 pb-1">{item.suffix}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Movement Trends (Full Row) */}
            <Card className="min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <SectionHeader icon={BarChart} label="Movement Trends" sub="Stock in / out activity" accent="#34D399" className="mb-0" />
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
                        {(['week','month'] as const).map(p => (
                            <button key={p} onClick={() => setPeriod(p)}
                                    className={`px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                                        period === p
                                            ? 'bg-slate-900 text-white'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}>
                                {p === 'week' ? 'Week' : 'Month'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <Skeleton h="h-52" /> :
                 trendData.length > 0 ? (
                    <MovementChart data={trendData} maxValue={maxValue} />
                ) : (
                    <EmptyState label="No movement data" />
                )}
            </Card>

            {/* KPI Trend — full row */}
            <Card className="min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <SectionHeader icon={TrendingUp} label="KPI Trend" sub="Historical performance over time" accent={currentMetaAccent} className="mb-0" />
                    <div className="flex gap-2 flex-wrap shrink-0">
                        <select value={kpiMetric} onChange={e => setKpiMetric(e.target.value as KpiMetric)} className={selectClass} aria-label="KPI metric">
                            {KPI_METRIC_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                        <select value={kpiGrain} onChange={e => setKpiGrain(e.target.value as KpiGrain)} className={selectClass} aria-label="KPI grain">
                            {KPI_GRAIN_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                {kpiTrend.loading ? <Skeleton /> :
                 kpiTrend.error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        KPI trend load failed: {kpiTrend.error}
                    </div>
                ) : kpiTrend.data?.points?.length ? (
                    <KpiTrendBars data={kpiTrend.data.points} accent={currentMetaAccent} />
                ) : (
                    <EmptyState label="No KPI trend data in selected date range" />
                )}
            </Card>

            {/* Donut Row: Inventory Value + Product Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Card className="min-w-0">
                    <SectionHeader icon={PieChart} label="Inventory Value" sub="Top categories by value" accent="#A78BFA" />
                    {loading ? <Skeleton h="h-52" /> :
                     inventoryValueDonutData.length > 0 ? (
                        <DonutChart data={inventoryValueDonutData} />
                    ) : (
                        <EmptyState label="No inventory data" />
                    )}
                </Card>

                <Card className="min-w-0">
                    <SectionHeader icon={PieChart} label="Product Categories" sub="Share of products by category count" accent="#FBBF24" />
                    {loading ? <Skeleton h="h-52" /> :
                     productCategoryDonutData.length > 0 ? (
                        <DonutChart data={productCategoryDonutData} />
                    ) : (
                        <EmptyState label="No category data" />
                    )}
                </Card>
            </div>
        </div>
    );
}
