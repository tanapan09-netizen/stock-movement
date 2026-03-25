import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    FileSearch,
    Play,
    Printer,
    RefreshCcw,
    ShieldCheck,
    Warehouse,
    XCircle,
} from 'lucide-react';

import { auth } from '@/auth';
import {
    approveAudit,
    cancelAudit,
    postAuditAdjustments,
    reopenAuditForCounting,
    startAudit,
    submitAuditForReview,
} from '@/actions/auditActions';
import { AuditItemRow } from '@/components/AuditItemRow';
import {
    INVENTORY_AUDIT_COPY,
    INVENTORY_AUDIT_DETAIL_TABLE_HEADERS,
    INVENTORY_AUDIT_TRAIL_ACTION_META,
    getInventoryAuditItemStatusMeta,
    getInventoryAuditSessionStatusMeta,
} from '@/lib/inventory-audit';
import { prisma } from '@/lib/prisma';
import { canAccessInventoryAudit, canApproveInventoryAudit } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

const fmtDate = (value?: Date | string | null) =>
    value
        ? new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value))
        : '—';

const fmtMoney = (value: number) =>
    new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 0,
    }).format(value || 0);

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auditId = Number.parseInt(id, 10);
    if (!Number.isFinite(auditId)) notFound();

    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    if (!session?.user || !canAccessInventoryAudit(permissionContext.role, permissionContext.permissions)) {
        redirect('/inventory-audit');
    }

    const audit = await prisma.tbl_inventory_audits.findUnique({
        where: { audit_id: auditId },
        include: {
            tbl_audit_items: {
                orderBy: { p_id: 'asc' },
            },
            tbl_warehouses: {
                select: {
                    warehouse_name: true,
                    warehouse_code: true,
                },
            },
            tbl_inventory_audit_events: {
                orderBy: { performed_at: 'desc' },
                take: 20,
            },
        },
    });

    if (!audit) notFound();

    const productIds = audit.tbl_audit_items.map((item) => item.p_id);
    const [products, liveStockRows] = await Promise.all([
        productIds.length > 0
            ? prisma.tbl_products.findMany({
                where: { p_id: { in: productIds } },
                select: { p_id: true, p_name: true, p_unit: true },
            })
            : Promise.resolve([]),
        audit.warehouse_id && productIds.length > 0
            ? prisma.tbl_warehouse_stock.findMany({
                where: {
                    warehouse_id: audit.warehouse_id,
                    p_id: { in: productIds },
                },
                select: { p_id: true, quantity: true },
            })
            : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((product) => [product.p_id, product]));
    const liveQtyMap = new Map(liveStockRows.map((row) => [row.p_id, Number(row.quantity || 0)]));
    const statusMeta = getInventoryAuditSessionStatusMeta(audit.status);
    const canApprove = canApproveInventoryAudit(
        permissionContext.role,
        permissionContext.permissions,
        permissionContext.isApprover,
    );

    const summary = {
        totalItems: Number(audit.total_items || 0),
        counted: audit.tbl_audit_items.filter((item) => item.final_count_qty !== null || item.counted_qty !== null).length,
        recounts: Number(audit.recounted_items || 0),
        reasonPending: Number(audit.reason_pending_items || 0),
        varianceAbs: Number(audit.total_variance_abs || audit.total_discrepancy || 0),
        varianceValue: Number(audit.total_variance_value || 0),
    };

    const warehouseLabel = audit.tbl_warehouses?.warehouse_code
        ? `${audit.tbl_warehouses.warehouse_code} - ${audit.tbl_warehouses.warehouse_name}`
        : audit.tbl_warehouses?.warehouse_name || 'ไม่ระบุคลัง';

    const actionCards = [
        { label: 'นับแล้ว', value: summary.counted },
        { label: 'ต้องนับซ้ำ', value: summary.recounts },
        { label: 'รอสาเหตุ', value: summary.reasonPending },
        { label: 'ผลต่างรวม', value: summary.varianceAbs },
        { label: 'มูลค่าผลต่าง', value: summary.varianceValue, isMoney: true },
    ];

    const startAuditAction = async (_formData: FormData) => {
        'use server';
        await startAudit(auditId);
    };

    const submitAuditForReviewAction = async (_formData: FormData) => {
        'use server';
        await submitAuditForReview(auditId);
    };

    const cancelAuditAction = async (_formData: FormData) => {
        'use server';
        await cancelAudit(auditId);
    };

    const reopenAuditForCountingAction = async (_formData: FormData) => {
        'use server';
        await reopenAuditForCounting(auditId);
    };

    const approveAuditAction = async (_formData: FormData) => {
        'use server';
        await approveAudit(auditId);
    };

    const postAuditAdjustmentsAction = async (_formData: FormData) => {
        'use server';
        await postAuditAdjustments(auditId);
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <Link href="/inventory-audit" className="inline-flex items-center text-sm text-slate-500 transition hover:text-slate-700">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.backToList}
                    </Link>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                            {audit.audit_number || `Audit #${audit.audit_id}`}
                        </h1>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                        </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                            <Warehouse className="h-4 w-4" />
                            {warehouseLabel}
                        </span>
                        <span>{INVENTORY_AUDIT_COPY.auditDate}: {fmtDate(audit.audit_date || audit.created_at)}</span>
                        <span>ผู้สร้าง: {audit.created_by || '—'}</span>
                        <span>จำนวนสินค้า: {summary.totalItems}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/print/inventory-audit/${auditId}`}
                        className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                        <Printer className="mr-2 h-4 w-4" /> พิมพ์รายงาน
                    </Link>

                    {audit.status === 'draft' && (
                        <form action={startAuditAction}>
                            <button type="submit" className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                                <Play className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.startAudit}
                            </button>
                        </form>
                    )}

                    {audit.status === 'counting' && (
                        <>
                            <form action={submitAuditForReviewAction}>
                                <button type="submit" className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                                    <FileSearch className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.submitForReview}
                                </button>
                            </form>
                            <form action={cancelAuditAction}>
                                <button type="submit" className="inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                                    <XCircle className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.cancelAudit}
                                </button>
                            </form>
                        </>
                    )}

                    {audit.status === 'review' && canApprove && (
                        <>
                            <form action={reopenAuditForCountingAction}>
                                <button type="submit" className="inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                                    <RefreshCcw className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.reopenForCounting}
                                </button>
                            </form>
                            <form action={approveAuditAction}>
                                <button type="submit" className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                                    <ShieldCheck className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.approveAudit}
                                </button>
                            </form>
                        </>
                    )}

                    {audit.status === 'approved' && canApprove && (
                        <>
                            <form action={reopenAuditForCountingAction}>
                                <button type="submit" className="inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                                    <RefreshCcw className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.reopenForCounting}
                                </button>
                            </form>
                            <form action={postAuditAdjustmentsAction}>
                                <button type="submit" className="inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.postAudit}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                {actionCards.map((card) => (
                    <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
                        <p className="text-sm font-medium text-slate-500">{card.label}</p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                            {card.isMoney ? fmtMoney(card.value) : card.value}
                        </p>
                    </div>
                ))}
            </section>

            {(summary.reasonPending > 0 || audit.tbl_audit_items.some((item) => item.requires_recount)) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="font-medium">ยังมีรายการที่ต้องติดตามก่อนปิดงาน</p>
                            <p className="mt-1">
                                ตรวจสอบรายการที่ต้องนับซ้ำและรายการที่ยังไม่ระบุสาเหตุให้ครบก่อนส่งตรวจทานหรืออนุมัติ
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {audit.status === 'draft' ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
                    <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
                    <h2 className="mt-4 text-xl font-semibold text-slate-900">{INVENTORY_AUDIT_COPY.draftStateTitle}</h2>
                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{INVENTORY_AUDIT_COPY.draftStateBody}</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {INVENTORY_AUDIT_DETAIL_TABLE_HEADERS.map((header) => (
                                        <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {audit.tbl_audit_items.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-500">
                                            {INVENTORY_AUDIT_COPY.noProductsInWarehouse}
                                        </td>
                                    </tr>
                                )}

                                {audit.tbl_audit_items.map((item, index) => {
                                    const product = productMap.get(item.p_id);

                                    return (
                                        <AuditItemRow
                                            key={item.item_id}
                                            item={{
                                                ...item,
                                                variance_value: item.variance_value ? Number(item.variance_value) : 0,
                                            }}
                                            index={index}
                                            productName={product?.p_name || item.p_id}
                                            unit={product?.p_unit || '-'}
                                            liveQty={liveQtyMap.get(item.p_id) ?? 0}
                                            readOnly={audit.status !== 'counting'}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">{INVENTORY_AUDIT_COPY.auditEvents}</h2>
                    <p className="mt-1 text-sm text-slate-500">ทุกขั้นตอนของเซสชันนี้จะถูกบันทึกไว้ใน event log</p>
                </div>
                <div className="divide-y divide-slate-100">
                    {audit.tbl_inventory_audit_events.length === 0 && (
                        <div className="px-5 py-10 text-center text-sm text-slate-500">{INVENTORY_AUDIT_COPY.noData}</div>
                    )}
                    {audit.tbl_inventory_audit_events.map((event) => {
                        const eventMeta =
                            INVENTORY_AUDIT_TRAIL_ACTION_META[event.event_type as keyof typeof INVENTORY_AUDIT_TRAIL_ACTION_META];
                        const itemStatusMeta = event.to_status ? getInventoryAuditItemStatusMeta(event.to_status) : null;

                        return (
                            <div key={event.event_id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${eventMeta?.cls || 'bg-slate-100 text-slate-700'}`}>
                                            {eventMeta?.label || event.event_label || event.event_type}
                                        </span>
                                        {itemStatusMeta && (
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${itemStatusMeta.badgeClass}`}>
                                                {itemStatusMeta.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-900">{event.event_label || 'กิจกรรมตรวจนับ'}</p>
                                    {event.note && <p className="mt-1 text-sm text-slate-500">{event.note}</p>}
                                </div>
                                <div className="text-sm text-slate-500">
                                    <p>{event.performed_by || 'System'}</p>
                                    <p className="mt-1">{fmtDate(event.performed_at)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
