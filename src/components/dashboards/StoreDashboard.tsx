import type { ComponentType } from 'react';
import { getLowStockItems } from '@/actions/productActions';
import { prisma } from '@/lib/prisma';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Clock,
    ClipboardCheck,
    Package,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Types ───────────────────────────────────────────────────────────────── */

type LowStockItem = {
    p_id: string;
    p_name: string;
    p_count: number;
    safety_stock: number | null;
};

type PendingPartRequestItem = {
    request_id: number;
    request_number: string | null;
    item_name: string;
    quantity: number;
    priority: string;
    requested_by: string;
    tbl_maintenance_requests: {
        request_number: string | null;
        title: string;
        tbl_rooms: { room_code: string } | null;
    } | null;
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */

/** Small KPI tile used in the hero header */
function HeroKPI({ label, value, sub }: { label: string; value: number; sub: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1.5 text-2xl font-black tabular-nums leading-none text-slate-900">{value}</p>
            <p className="mt-2 text-[11px] text-slate-500 leading-snug">{sub}</p>
        </div>
    );
}

/** Horizontal bar inside the Operational Mix panel */
function MixBar({ label, value, total }: { label: string; value: number; total: number }) {
    const pct = Math.max((value / Math.max(total, 1)) * 100, value > 0 ? 10 : 3);
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="font-bold tabular-nums text-slate-900">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

/** Coloured task card that links to an action page */
function TaskCard({
    title, value, description, href, icon: Icon, tone,
}: {
    title: string; value: number; description: string;
    href: string; icon: ComponentType<{ className?: string }>;
    tone: 'indigo' | 'amber';
}) {
    const themes = {
        indigo: {
            wrap: 'border-indigo-100 from-indigo-50/60 to-white hover:border-indigo-200 hover:shadow-indigo-100/60',
            iconBg: 'bg-indigo-100 text-indigo-600',
            label: 'text-indigo-700',
        },
        amber: {
            wrap: 'border-amber-100 from-amber-50/60 to-white hover:border-amber-200 hover:shadow-amber-100/60',
            iconBg: 'bg-amber-100 text-amber-600',
            label: 'text-amber-700',
        },
    } as const;
    const t = themes[tone];

    return (
        <Link
            href={href}
            className={`group rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all hover:shadow-md ${t.wrap}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold uppercase tracking-wide ${t.label}`}>{title}</p>
                    <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{value}</p>
                    <p className="mt-2 text-sm leading-snug text-slate-500">{description}</p>
                </div>
                <div className={`shrink-0 rounded-xl p-3 ${t.iconBg}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <div className={`mt-4 flex items-center text-xs font-semibold ${t.label}`}>
                เปิดรายการ
                <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
        </Link>
    );
}

/** Section header with a left accent bar */
function SectionHeader({
    title, action,
}: {
    title: React.ReactNode; action?: React.ReactNode;
}) {
    return (
        <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
                <span className="h-5 w-0.5 rounded-full bg-indigo-500" />
                {title}
            </h3>
            {action && <div className="text-xs">{action}</div>}
        </div>
    );
}

/** Card wrapper for dashboard sections */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
            {children}
        </div>
    );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function StoreDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalProducts,
        recentMovements,
        todayMovements,
        lowStockResult,
        pendingVerificationCount,
        pendingPartRequestCount,
        pendingPurchaseReceiveCount,
        recentPendingPartRequests,
    ] = await Promise.all([
        prisma.tbl_products.count({ where: { active: true } }),
        prisma.tbl_product_movements.findMany({
            take: 6,
            orderBy: { movement_time: 'desc' },
        }),
        prisma.tbl_product_movements.count({
            where: { movement_time: { gte: today } },
        }),
        getLowStockItems(),
        prisma.tbl_maintenance_parts.count({ where: { status: 'pending_verification' } }),
        prisma.tbl_part_requests.count({ where: { status: 'pending' } }),
        prisma.tbl_approval_requests.count({
            where: {
                request_type: 'purchase',
                status: 'pending',
                current_step: 5,
            },
        }),
        prisma.tbl_part_requests.findMany({
            where: { status: 'pending' },
            include: {
                tbl_maintenance_requests: {
                    select: {
                        request_number: true,
                        title: true,
                        tbl_rooms: { select: { room_code: true } },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
    ]);

    const lowStockList: LowStockItem[] = lowStockResult.success
        ? ((lowStockResult.data as LowStockItem[]) ?? [])
        : [];
    const outOfStock = lowStockList.filter(p => p.p_count <= 0).length;

    /* product name lookup for movements */
    const productIds = recentMovements.map(m => m.p_id);
    const products = productIds.length
        ? await prisma.tbl_products.findMany({
            where: { p_id: { in: productIds } },
            select: { p_id: true, p_name: true },
        })
        : [];
    const productNameMap = new Map(products.map(p => [p.p_id, p.p_name]));

    /* derived metrics */
    const openWorkload = pendingVerificationCount + pendingPartRequestCount + pendingPurchaseReceiveCount + lowStockList.length;
    const fulfillmentRate = Math.max(
        0,
        100 - Math.min((pendingVerificationCount + pendingPartRequestCount + pendingPurchaseReceiveCount) * 5, 95),
    );

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 px-1">

            {/* ════ HERO ════ */}
            <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 p-6 shadow-sm sm:p-8">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">

                    {/* Left — title + KPIs */}
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            Store BI Workspace
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-indigo-600 p-2.5 shadow-md shadow-indigo-200">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                Store Dashboard
                            </h1>
                        </div>

                        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">
                            ภาพรวมงานคลังสินค้า การรับเข้า การเบิก การตรวจรับ
                            และรายการที่ต้องติดตามในมุมมองเดียวแบบ BI
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <HeroKPI label="สินค้าทั้งหมด" value={totalProducts} sub="รายการที่ยัง Active" />
                            <HeroKPI label="ความเคลื่อนไหววันนี้" value={todayMovements} sub="รับเข้า + เบิกออก" />
                            <HeroKPI label="สินค้าใกล้หมด" value={lowStockList.length} sub={outOfStock > 0 ? `หมดสต็อก ${outOfStock} รายการ` : 'ควรเติมสต็อก'} />
                            <HeroKPI label="รอตรวจรับ" value={pendingVerificationCount} sub="อะไหล่รอคลังตรวจนับ" />
                        </div>
                    </div>

                    {/* Right — Operational Mix */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Operational Mix
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-slate-800">สัดส่วนงานปัจจุบัน</p>
                            </div>
                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600">
                                Live
                            </span>
                        </div>

                        <div className="space-y-3">
                            <MixBar label="สินค้าต้องเติม" value={lowStockList.length} total={openWorkload} />
                            <MixBar label="รอตรวจรับอะไหล่" value={pendingVerificationCount} total={openWorkload} />
                            <MixBar label="คำขอเบิกอะไหล่" value={pendingPartRequestCount} total={openWorkload} />
                            <MixBar label="คำขอซื้อรอรับเข้า" value={pendingPurchaseReceiveCount} total={openWorkload} />
                            <MixBar label="หมดสต็อก" value={outOfStock} total={Math.max(lowStockList.length, 1)} />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Fulfillment Rate</p>
                                <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{fulfillmentRate}%</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Open Workload</p>
                                <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{openWorkload}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════ QUICK ACTIONS ════ */}
            <Panel className="p-6">
                <SectionHeader title="เมนูด่วน" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'ปรับสต็อก',         href: '/stock/adjust',      Icon: TrendingUp },
                        { label: 'เพิ่มสินค้าใหม่',   href: '/products/new',      Icon: Package },
                        { label: 'รับสินค้าเข้า',     href: '/purchase-orders',   Icon: ArrowDownRight },
                        { label: 'ยืม-คืนอุปกรณ์',   href: '/borrow',            Icon: Clock },
                    ].map(({ label, href, Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center transition-all hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-sm"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-transform group-hover:scale-105">
                                <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">{label}</span>
                        </Link>
                    ))}
                </div>
            </Panel>

            {/* ════ MAIN GRID ════ */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">

                {/* ── Left column ── */}
                <div className="space-y-6">

                    {/* Task Cards */}
                    <Panel className="p-6">
                        <SectionHeader title="งานที่ต้องทำของคลัง" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            <TaskCard
                                title="รอตรวจรับอะไหล่"
                                value={pendingVerificationCount}
                                description="รายการอะไหล่ที่ต้องตรวจนับและยืนยันรับเข้า"
                                href="/maintenance/parts"
                                icon={ClipboardCheck}
                                tone="amber"
                            />
                            <TaskCard
                                title="คำขอเบิกอะไหล่รอดำเนินการ"
                                value={pendingPartRequestCount}
                                description="รายการที่รอคลังตรวจสอบและจัดเตรียมสินค้า"
                                href="/maintenance/parts"
                                icon={ShieldCheck}
                                tone="indigo"
                            />
                            <TaskCard
                                title="คำขอซื้อรอ Store รับเข้า"
                                value={pendingPurchaseReceiveCount}
                                description="รายการที่จัดซื้อดำเนินการครบแล้วและรอคลังรับเข้าเพื่อตรวจรับและปิดงาน"
                                href="/purchase-request/manage"
                                icon={ArrowDownRight}
                                tone="amber"
                            />
                        </div>
                    </Panel>

                    {/* Pending Part Requests list */}
                    <Panel className="p-6">
                        <SectionHeader
                            title="คำขอเบิกอะไหล่รอคลังตอบกลับ"
                            action={
                                <Link href="/maintenance/parts" className="font-semibold text-indigo-600 hover:text-indigo-700">
                                    เปิดหน้าเบิกอะไหล่ →
                                </Link>
                            }
                        />

                        {recentPendingPartRequests.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                                ไม่มีคำขอเบิกอะไหล่ที่รอคลังตอบกลับ
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {(recentPendingPartRequests as PendingPartRequestItem[]).map(req => (
                                    <Link
                                        key={req.request_id}
                                        href="/maintenance/parts"
                                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900">{req.item_name}</p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {req.request_number ?? `REQ-${req.request_id}`} · ผู้ขอ {req.requested_by}
                                            </p>
                                            {req.tbl_maintenance_requests && (
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {req.tbl_maintenance_requests.request_number}
                                                    {req.tbl_maintenance_requests.tbl_rooms && (
                                                        <> / {req.tbl_maintenance_requests.tbl_rooms.room_code}</>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-bold text-slate-900">×{req.quantity}</p>
                                            <span
                                                className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                    req.priority === 'urgent'
                                                        ? 'bg-rose-50 text-rose-600'
                                                        : 'bg-amber-50 text-amber-600'
                                                }`}
                                            >
                                                {req.priority === 'urgent' ? 'ด่วน' : 'ปกติ'}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                {/* ── Right column ── */}
                <div className="space-y-6">

                    {/* Low Stock */}
                    <Panel className="overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-rose-50/60 to-white px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                                สินค้าต้องเติม
                            </h3>
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                                {lowStockList.length}
                            </span>
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                            {lowStockList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Package className="mb-3 h-10 w-10 opacity-20" />
                                    <p className="text-sm">สต็อกเพียงพอทุกรายการ</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {lowStockList.map(product => (
                                        <div
                                            key={product.p_id}
                                            className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                                        >
                                            <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                                                {product.p_name}
                                            </p>
                                            <div className="flex shrink-0 items-center gap-3">
                                                <span
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                                                        product.p_count <= 0
                                                            ? 'bg-rose-50 text-rose-600'
                                                            : 'bg-amber-50 text-amber-600'
                                                    }`}
                                                >
                                                    {product.p_count <= 0 ? 'หมด' : `เหลือ ${product.p_count}`}
                                                </span>
                                                <Link
                                                    href={`/stock/adjust?id=${product.p_id}`}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                                >
                                                    เติม
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* Recent Movements */}
                    <Panel className="overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                <Activity className="h-4 w-4 text-slate-400" />
                                ความเคลื่อนไหวล่าสุด
                            </h3>
                            <Link href="/movements" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                ดูทั้งหมด →
                            </Link>
                        </div>

                        {recentMovements.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-400">ยังไม่มีความเคลื่อนไหว</p>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {recentMovements.map(movement => {
                                    const isIn = movement.movement_type === 'รับเข้า';
                                    return (
                                        <div
                                            key={movement.movement_id}
                                            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                                        >
                                            <div
                                                className={`shrink-0 rounded-xl p-2 ${
                                                    isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                                                }`}
                                            >
                                                {isIn ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-900">
                                                    {productNameMap.get(movement.p_id) ?? `Item #${movement.p_id}`}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {new Date(movement.movement_time).toLocaleTimeString('th-TH', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                    {movement.remarks ? ` · ${movement.remarks}` : ''}
                                                </p>
                                            </div>
                                            <span
                                                className={`shrink-0 text-sm font-bold ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}
                                            >
                                                {isIn ? '+' : '−'}{movement.quantity}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}
