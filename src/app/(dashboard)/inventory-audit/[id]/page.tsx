import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Play, CheckCircle, XCircle } from 'lucide-react';
import { startAudit, completeAudit, cancelAudit } from '@/actions/auditActions';
import { AuditItemRow } from '@/components/AuditItemRow';
import {
    INVENTORY_AUDIT_COPY,
    INVENTORY_AUDIT_DETAIL_TABLE_HEADERS,
    getInventoryAuditSessionStatusMeta,
} from '@/lib/inventory-audit';

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auditId = parseInt(id);

    const audit = await prisma.tbl_inventory_audits.findUnique({
        where: { audit_id: auditId },
        include: {
            tbl_audit_items: {
                orderBy: { p_id: 'asc' },
            },
        },
    });

    if (!audit) notFound();

    const pIds = audit.tbl_audit_items.map(item => item.p_id);
    const products = await prisma.tbl_products.findMany({
        where: { p_id: { in: pIds } },
        select: { p_id: true, p_name: true, p_unit: true },
    });

    const productMap = new Map(products.map(product => [product.p_id, product]));
    const statusMeta = getInventoryAuditSessionStatusMeta(audit.status);

    const detailHeaderClassNames = [
        'w-16 px-4 py-3',
        'px-4 py-3',
        'w-32 px-4 py-3 text-right',
        'w-40 px-4 py-3 text-right',
        'w-32 px-4 py-3 text-right',
        'w-20 px-4 py-3',
    ] as const;

    return (
        <div className="mx-auto max-w-7xl pb-20">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <Link
                        href="/inventory-audit"
                        className="mb-2 flex items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> {INVENTORY_AUDIT_COPY.backToList}
                    </Link>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                        Audit #{audit.audit_number}
                        <span className={`rounded-full border px-2 py-1 text-sm ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                        </span>
                    </h1>
                    <p className="text-sm text-gray-500">
                        {INVENTORY_AUDIT_COPY.auditDate}: {new Date(audit.audit_date!).toLocaleDateString('th-TH')} | {INVENTORY_AUDIT_COPY.warehouse}: #{audit.warehouse_id}
                    </p>
                </div>

                <div className="flex gap-2">
                    {audit.status === 'draft' && (
                        <form action={startAudit.bind(null, auditId)}>
                            <button
                                type="submit"
                                className="flex items-center rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow hover:bg-blue-700"
                            >
                                <Play className="mr-2 h-5 w-5" /> {INVENTORY_AUDIT_COPY.startAudit}
                            </button>
                        </form>
                    )}

                    {audit.status === 'in_progress' && (
                        <>
                            <form action={completeAudit.bind(null, auditId)}>
                                <button
                                    type="submit"
                                    className="flex items-center rounded-lg bg-green-600 px-4 py-2 font-bold text-white shadow hover:bg-green-700"
                                    onClick={(event) => {
                                        if (!confirm(INVENTORY_AUDIT_COPY.confirmCompleteAudit)) event.preventDefault();
                                    }}
                                >
                                    <CheckCircle className="mr-2 h-5 w-5" /> {INVENTORY_AUDIT_COPY.completeAudit}
                                </button>
                            </form>
                            <form action={cancelAudit.bind(null, auditId)}>
                                <button
                                    type="submit"
                                    className="flex items-center rounded-lg bg-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-300"
                                    onClick={(event) => {
                                        if (!confirm(INVENTORY_AUDIT_COPY.confirmCancelAudit)) event.preventDefault();
                                    }}
                                >
                                    <XCircle className="mr-2 h-5 w-5" /> {INVENTORY_AUDIT_COPY.cancelAudit}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {audit.status === 'draft' ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center shadow">
                    <p className="mb-4 text-xl text-gray-500">{INVENTORY_AUDIT_COPY.draftStateTitle}</p>
                    <p className="text-gray-400">{INVENTORY_AUDIT_COPY.draftStateBody}</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg bg-white shadow">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-xs font-semibold uppercase text-gray-600">
                            <tr>
                                {INVENTORY_AUDIT_DETAIL_TABLE_HEADERS.map((header, index) => (
                                    <th key={header} className={detailHeaderClassNames[index]}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {audit.tbl_audit_items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                        {INVENTORY_AUDIT_COPY.noProductsInWarehouse}
                                    </td>
                                </tr>
                            ) : (
                                audit.tbl_audit_items.map((item, index) => {
                                    const product = productMap.get(item.p_id) || {
                                        p_name: INVENTORY_AUDIT_COPY.unknownProductName,
                                        p_unit: '-',
                                    };

                                    return (
                                        <AuditItemRow
                                            key={item.item_id}
                                            item={item}
                                            index={index}
                                            productName={product.p_name ?? INVENTORY_AUDIT_COPY.unknownProductName}
                                            unit={product.p_unit ?? '-'}
                                            readOnly={audit.status !== 'in_progress'}
                                        />
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
