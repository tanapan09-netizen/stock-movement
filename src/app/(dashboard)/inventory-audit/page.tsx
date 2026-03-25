import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    ClipboardCheck,
    Clock3,
    FileSearch,
    Plus,
    ShieldCheck,
    Warehouse,
} from 'lucide-react';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessInventoryAudit } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import {
    INVENTORY_AUDIT_COPY,
    getInventoryAuditSessionStatusMeta,
} from '@/lib/inventory-audit';

const fmtDate = (value?: Date | string | null) =>
    value
        ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
        : '—';

const fmtNumber = (value: number) => new Intl.NumberFormat('th-TH').format(value || 0);
const fmtMoney = (value: number) => new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
}).format(value || 0);

export default async function InventoryAuditPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    if (!session?.user || !canAccessInventoryAudit(permissionContext.role, permissionContext.permissions)) {
        redirect('/');
    }

    const [draftCount, countingCount, reviewCount, approvedCount, recentAudits, openExceptionItems, recentEvents] = await Promise.all([
        prisma.tbl_inventory_audits.count({ where: { status: 'draft' } }),
        prisma.tbl_inventory_audits.count({ where: { status: 'counting' } }),
        prisma.tbl_inventory_audits.count({ where: { status: 'review' } }),
        prisma.tbl_inventory_audits.count({ where: { status: 'approved' } }),
        prisma.tbl_inventory_audits.findMany({
            orderBy: { created_at: 'desc' },
            take: 8,
            include: {
                tbl_warehouses: {
                    select: { warehouse_name: true, warehouse_code: true },
                },
            },
        }),
        prisma.tbl_audit_items.findMany({
            where: {
                tbl_inventory_audits: {
                    status: { in: ['counting', 'review', 'approved'] },
                },
                OR: [
                    { requires_recount: true },
                    { item_status: { in: ['recount_required', 'reason_required'] } },
                    {
                        AND: [
                            { variance_qty: { not: 0 } },
                            { reason_code: null },
                        ],
                    },
                ],
            },
            orderBy: { item_id: 'desc' },
            take: 10,
            select: {
                item_id: true,
                p_id: true,
                item_status: true,
                variance_qty: true,
                tbl_inventory_audits: {
                    select: {
                        audit_id: true,
                        audit_number: true,
                    },
                },
            },
        }),
        prisma.tbl_inventory_audit_events.findMany({
            orderBy: { performed_at: 'desc' },
            take: 10,
            select: {
                event_id: true,
                event_label: true,
                note: true,
                performed_by: true,
                performed_at: true,
                tbl_inventory_audits: {
                    select: {
                        audit_id: true,
                        audit_number: true,
                    },
                },
            },
        }),
    ]);

    const exceptionProductIds = [...new Set(openExceptionItems.map((item) => item.p_id))];
    const exceptionProducts = exceptionProductIds.length > 0
        ? await prisma.tbl_products.findMany({
            where: { p_id: { in: exceptionProductIds } },
            select: { p_id: true, p_name: true },
        })
        : [];
    const exceptionProductMap = new Map(exceptionProducts.map((product) => [product.p_id, product.p_name]));

    const statCards = [
        { label: 'ฉบับร่าง', value: draftCount, tone: 'bg-slate-50 text-slate-700', icon: ClipboardCheck },
        { label: 'กำลังนับ', value: countingCount, tone: 'bg-blue-50 text-blue-700', icon: Activity },
        { label: 'รอตรวจทาน', value: reviewCount, tone: 'bg-indigo-50 text-indigo-700', icon: FileSearch },
        { label: 'พร้อมโพสต์', value: approvedCount, tone: 'bg-emerald-50 text-emerald-700', icon: ShieldCheck },
    ];

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-blue-100 ring-1 ring-white/10">
                            INVENTORY AUDIT CONTROL
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">ศูนย์ควบคุมการตรวจนับสต็อก</h1>
                        <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                            จัดการเซสชันตรวจนับแบบมี snapshot ตามคลัง, บังคับสาเหตุสำหรับผลต่าง, ตรวจทานก่อนอนุมัติ และโพสต์ปรับยอดเข้าสต็อกอย่างเป็นระบบ
                        </p>
                    </div>

                    <Link
                        href="/inventory-audit/new"
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                    >
                        <Plus className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.createAudit}
                    </Link>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map(({ label, value, tone, icon: Icon }) => (
                    <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{label}</p>
                                <p className="mt-3 text-3xl font-semibold text-slate-900">{fmtNumber(value)}</p>
                            </div>
                            <div className={`rounded-2xl p-3 ${tone}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">{INVENTORY_AUDIT_COPY.latestSessions}</h2>
                            <p className="mt-1 text-sm text-slate-500">ทุกเซสชันผูกกับคลังและ workflow ตรวจนับเดียวกัน</p>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {recentAudits.length === 0 && (
                            <div className="px-5 py-12 text-center text-sm text-slate-500">{INVENTORY_AUDIT_COPY.noData}</div>
                        )}

                        {recentAudits.map((audit) => {
                            const status = getInventoryAuditSessionStatusMeta(audit.status);
                            return (
                                <Link
                                    key={audit.audit_id}
                                    href={`/inventory-audit/${audit.audit_id}`}
                                    className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900">{audit.audit_number || `Audit #${audit.audit_id}`}</p>
                                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.badgeClass}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Warehouse className="h-4 w-4" />
                                                {audit.tbl_warehouses?.warehouse_code
                                                    ? `${audit.tbl_warehouses.warehouse_code} - ${audit.tbl_warehouses.warehouse_name}`
                                                    : audit.tbl_warehouses?.warehouse_name || 'ไม่ระบุคลัง'}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="h-4 w-4" />
                                                {fmtDate(audit.audit_date || audit.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-400">รายการ</p>
                                            <p className="font-semibold text-slate-900">{fmtNumber(Number(audit.total_items || 0))}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">ผลต่างรวม</p>
                                            <p className="font-semibold text-slate-900">{fmtNumber(Number(audit.total_variance_abs || audit.total_discrepancy || 0))}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">มูลค่าผลต่าง</p>
                                            <p className="font-semibold text-slate-900">{fmtMoney(Number(audit.total_variance_value || 0))}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <h2 className="text-lg font-semibold text-slate-900">{INVENTORY_AUDIT_COPY.openExceptions}</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            {openExceptionItems.length === 0 && (
                                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    ไม่มีรายการ exception ที่ค้างอยู่
                                </div>
                            )}
                            {openExceptionItems.map((item) => (
                                <Link
                                    key={item.item_id}
                                    href={`/inventory-audit/${item.tbl_inventory_audits.audit_id}`}
                                    className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-amber-200 hover:bg-amber-50/70"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {exceptionProductMap.get(item.p_id) || item.p_id}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.tbl_inventory_audits.audit_number || `Audit #${item.tbl_inventory_audits.audit_id}`} • {item.p_id}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                            {item.item_status === 'recount_required'
                                                ? 'ต้องนับซ้ำ'
                                                : item.item_status === 'reason_required'
                                                    ? 'รอสาเหตุ'
                                                    : `ผลต่าง ${fmtNumber(Number(item.variance_qty || 0))}`}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-900">{INVENTORY_AUDIT_COPY.recentEvents}</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            {recentEvents.length === 0 && (
                                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    {INVENTORY_AUDIT_COPY.noData}
                                </div>
                            )}
                            {recentEvents.map((event) => (
                                <Link
                                    key={event.event_id}
                                    href={`/inventory-audit/${event.tbl_inventory_audits.audit_id}`}
                                    className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/70"
                                >
                                    <p className="text-sm font-semibold text-slate-900">{event.event_label || 'กิจกรรมตรวจนับ'}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {event.tbl_inventory_audits.audit_number || `Audit #${event.tbl_inventory_audits.audit_id}`} • {event.performed_by || 'System'} • {fmtDate(event.performed_at)}
                                    </p>
                                    {event.note && <p className="mt-2 text-sm text-slate-600">{event.note}</p>}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
