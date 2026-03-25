import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock, Printer, Warehouse } from 'lucide-react';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    INVENTORY_AUDIT_COPY,
    getInventoryAuditItemStatusMeta,
    getInventoryAuditSessionStatusMeta,
} from '@/lib/inventory-audit';
import { canAccessInventoryAudit } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import PrintButton from './PrintButton';

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
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value || 0);

const fmtNumber = (value: number) => new Intl.NumberFormat('th-TH').format(value || 0);

export default async function InventoryAuditPrintPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const auditId = Number(params.id);
    if (!Number.isFinite(auditId)) notFound();

    const session = await auth();
    if (!session?.user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-gray-500">
                <Lock className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium">Unauthorized</h3>
            </div>
        );
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canAccessInventoryAudit(permissionContext.role, permissionContext.permissions)) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-gray-500">
                <Lock className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
            </div>
        );
    }

    const [audit, settings] = await Promise.all([
        prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            include: {
                tbl_audit_items: {
                    orderBy: { p_id: 'asc' },
                },
                tbl_warehouses: {
                    select: {
                        warehouse_code: true,
                        warehouse_name: true,
                    },
                },
            },
        }),
        prisma.tbl_system_settings.findMany(),
    ]);

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

    const companyInfo = settings.reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
    }, {} as Record<string, string>);

    const productMap = new Map(products.map((product) => [product.p_id, product]));
    const liveQtyMap = new Map(liveStockRows.map((row) => [row.p_id, Number(row.quantity || 0)]));
    const statusMeta = getInventoryAuditSessionStatusMeta(audit.status);
    const warehouseLabel = audit.tbl_warehouses?.warehouse_code
        ? `${audit.tbl_warehouses.warehouse_code} - ${audit.tbl_warehouses.warehouse_name}`
        : audit.tbl_warehouses?.warehouse_name || 'ไม่ระบุคลัง';

    const summary = {
        totalItems: Number(audit.total_items || audit.tbl_audit_items.length),
        counted: audit.tbl_audit_items.filter((item) => item.final_count_qty !== null || item.counted_qty !== null).length,
        recounts: Number(audit.recounted_items || 0),
        reasonPending: Number(audit.reason_pending_items || 0),
        varianceAbs: Number(audit.total_variance_abs || audit.total_discrepancy || 0),
        varianceQty: Number(audit.total_variance_qty || 0),
        varianceValue: Number(audit.total_variance_value || 0),
    };

    const signOffRows = [
        { label: 'ผู้สร้างเอกสาร', actor: audit.created_by, at: audit.created_at },
        { label: 'ผู้เริ่มตรวจนับ', actor: audit.started_by, at: audit.started_at },
        { label: 'ผู้ตรวจทาน', actor: audit.reviewed_by, at: audit.reviewed_at },
        { label: 'ผู้อนุมัติ', actor: audit.approved_by, at: audit.approved_at },
        { label: 'ผู้โพสต์ปรับยอด', actor: audit.posted_by, at: audit.posted_at },
    ];

    return (
        <div className="min-h-screen bg-white p-8 print:p-0 text-black">
            <div className="mx-auto max-w-[210mm] print:max-w-none">
                <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
                    <Link
                        href={`/inventory-audit/${audit.audit_id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับหน้ารายละเอียด
                    </Link>
                    <PrintButton />
                </div>

                <div className="mb-6 flex items-start justify-between border-b border-black pb-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-wide">{INVENTORY_AUDIT_COPY.reportTitle}</h1>
                        <div className="mt-2 text-sm">
                            <p className="font-bold">{companyInfo.company_name || 'Stock Movement'}</p>
                            <p>{companyInfo.company_address || '-'}</p>
                            <p>Tel: {companyInfo.company_phone || '-'} Email: {companyInfo.company_email || '-'}</p>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <div>
                            <span className="block text-gray-500">{INVENTORY_AUDIT_COPY.reportNumber}</span>
                            <span className="text-lg font-bold">{audit.audit_number || `AUDIT-${audit.audit_id}`}</span>
                        </div>
                        <div className="mt-2">
                            <span className="block text-gray-500">สถานะ</span>
                            <span className="font-semibold">{statusMeta.label}</span>
                        </div>
                        <div className="mt-2">
                            <span className="block text-gray-500">{INVENTORY_AUDIT_COPY.printedAt}</span>
                            <span>{fmtDate(new Date())}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 border border-black p-4 text-sm md:grid-cols-4">
                    <div>
                        <div className="text-gray-500">{INVENTORY_AUDIT_COPY.auditDate}</div>
                        <div className="font-semibold">{fmtDate(audit.audit_date || audit.created_at)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">คลัง</div>
                        <div className="inline-flex items-center gap-1 font-semibold">
                            <Warehouse className="h-4 w-4" />
                            {warehouseLabel}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500">หมายเหตุ</div>
                        <div className="font-semibold">{audit.notes || '—'}</div>
                    </div>
                    <div>
                        <div className="text-gray-500">จำนวนรายการ</div>
                        <div className="font-semibold">{fmtNumber(summary.totalItems)}</div>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">นับแล้ว</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(summary.counted)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">ต้องนับซ้ำ</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(summary.recounts)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">รอสาเหตุ</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(summary.reasonPending)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">ผลต่างสุทธิ</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(summary.varianceQty)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">ผลต่างรวม</div>
                        <div className="mt-1 text-lg font-bold">{fmtNumber(summary.varianceAbs)}</div>
                    </div>
                    <div className="border border-black p-3">
                        <div className="text-xs text-gray-500">มูลค่าผลต่าง</div>
                        <div className="mt-1 text-lg font-bold">{fmtMoney(summary.varianceValue)}</div>
                    </div>
                </div>

                <table className="mb-8 w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-y border-black bg-gray-100">
                            <th className="px-2 py-2 text-left">#</th>
                            <th className="px-2 py-2 text-left">รหัสสินค้า</th>
                            <th className="px-2 py-2 text-left">สินค้า</th>
                            <th className="px-2 py-2 text-right">Snapshot</th>
                            <th className="px-2 py-2 text-right">นับได้</th>
                            <th className="px-2 py-2 text-right">ผลต่าง</th>
                            <th className="px-2 py-2 text-right">Live</th>
                            <th className="px-2 py-2 text-right">ปรับยอด</th>
                            <th className="px-2 py-2 text-left">สาเหตุ</th>
                            <th className="px-2 py-2 text-left">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {audit.tbl_audit_items.map((item, index) => {
                            const product = productMap.get(item.p_id);
                            const itemStatus = getInventoryAuditItemStatusMeta(item.item_status);
                            const finalCount = item.final_count_qty ?? item.counted_qty;
                            const liveQty = liveQtyMap.get(item.p_id) ?? 0;
                            return (
                                <tr key={item.item_id} className="border-b border-gray-200 align-top">
                                    <td className="px-2 py-2">{index + 1}</td>
                                    <td className="px-2 py-2 font-medium">{item.p_id}</td>
                                    <td className="px-2 py-2">
                                        <div>{product?.p_name || item.p_id}</div>
                                        <div className="text-xs text-gray-500">{product?.p_unit || '-'}</div>
                                    </td>
                                    <td className="px-2 py-2 text-right">{fmtNumber(Number(item.snapshot_qty || 0))}</td>
                                    <td className="px-2 py-2 text-right">{finalCount === null ? '—' : fmtNumber(Number(finalCount))}</td>
                                    <td className="px-2 py-2 text-right">{fmtNumber(Number(item.variance_qty || 0))}</td>
                                    <td className="px-2 py-2 text-right">{fmtNumber(liveQty)}</td>
                                    <td className="px-2 py-2 text-right">{fmtNumber(Number(item.approved_adjustment_qty || 0))}</td>
                                    <td className="px-2 py-2">
                                        <div>{item.reason_code || '—'}</div>
                                        {item.reason_note && <div className="text-xs text-gray-500">{item.reason_note}</div>}
                                    </td>
                                    <td className="px-2 py-2">{itemStatus.label}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="border border-black p-4">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Sign-off</h2>
                        <div className="space-y-3 text-sm">
                            {signOffRows.map((row) => (
                                <div key={row.label} className="grid grid-cols-[140px_1fr] gap-3 border-b border-dashed border-gray-300 pb-2">
                                    <div className="text-gray-500">{row.label}</div>
                                    <div>
                                        <div className="font-medium">{row.actor || '—'}</div>
                                        <div className="text-xs text-gray-500">{fmtDate(row.at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-black p-4">
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Summary</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">เซสชัน</span>
                                <span className="font-medium">{audit.audit_number || audit.audit_id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">สถานะล่าสุด</span>
                                <span className="font-medium">{statusMeta.label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">ผลต่างรวม</span>
                                <span className="font-medium">{fmtNumber(summary.varianceAbs)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">มูลค่าผลต่าง</span>
                                <span className="font-medium">{fmtMoney(summary.varianceValue)}</span>
                            </div>
                            <div className="mt-4 border-t border-dashed border-gray-300 pt-3 text-xs text-gray-500">
                                รายงานนี้อ้างอิง snapshot ตอนเริ่มตรวจนับ, จำนวนที่นับได้ล่าสุด, ยอด live ปัจจุบัน และยอดปรับที่อนุมัติให้โพสต์
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <div className="inline-flex items-center gap-2">
                        <Printer className="h-3.5 w-3.5" />
                        พิมพ์เมื่อ {fmtDate(new Date())} โดย {(session.user.name || 'System')}
                    </div>
                </div>
            </div>
        </div>
    );
}
