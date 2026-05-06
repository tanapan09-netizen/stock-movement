import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { canPrintPurchaseOrders, canViewPurchaseOrders } from '@/lib/rbac';
import { Lock } from 'lucide-react';
import PrintButton from './PrintButton';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { isNonStockPurchaseOrderItem, parsePurchaseOrderItemNote } from '@/lib/purchase-order-item';
import { parsePurchaseOrderRequestReference } from '@/lib/purchase-order-reference';

type PoStamp = {
    stepKey: string;
    stepLabel: string;
    role: string;
    actorName: string | null;
    actedAt: Date | null;
    approved: boolean;
};

function stripStockTags(value: string) {
    return value.replace(/\[(?:NON[-_\s]?STOCK|STOCK)\]\s*/gi, '').trim();
}

function renderNoteLineWithBadge(line: string, key: string) {
    const isProductLink = line.includes('ลิ้งก์สินค้า:');

    const renderText = (text: string) => {
        if (!text.includes('ลิ้งก์สินค้า:')) return stripStockTags(text);

        const parts = text.split('ลิ้งก์สินค้า:');
        const label = parts[0] + 'ลิ้งก์สินค้า: ';
        const url = parts[1].trim();
        let displayUrl = url;

        if (url.startsWith('http')) {
            if (url.includes('shopee.co.th/product/')) {
                const match = url.match(/(https:\/\/shopee\.co\.th\/product\/\d+\/\d+)/);
                if (match) displayUrl = match[1];
            } else if (displayUrl.length > 50) {
                displayUrl = displayUrl.substring(0, 47) + '...';
            }

            return (
                <>
                    {stripStockTags(label)}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline print:text-black break-all">
                        {displayUrl}
                    </a>
                </>
            );
        }
        return stripStockTags(text);
    };

    const numberedMatch = line.match(/^(\d+\.)\s*(.*)$/);
    if (!numberedMatch) {
        return (
            <p key={key} className="whitespace-pre-wrap">
                {renderText(line)}
            </p>
        );
    }

    const lineNumber = numberedMatch[1];
    const rawContent = numberedMatch[2].trim();
    const isNonStock = /^\[(?:NON[-_\s]?STOCK)\]\s*/i.test(rawContent);
    const isStock = !isNonStock && /^\[(?:STOCK)\]\s*/i.test(rawContent);

    if (!isNonStock && !isStock) {
        return (
            <p key={key} className="whitespace-pre-wrap">
                {lineNumber} {renderText(rawContent)}
            </p>
        );
    }

    const description = rawContent
        .replace(/^\[(?:NON[-_\s]?STOCK)\]\s*/i, '')
        .replace(/^\[(?:STOCK)\]\s*/i, '')
        .trim();

    return (
        <p key={key} className="flex flex-wrap items-center gap-2 whitespace-pre-wrap">
            <span>{lineNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isNonStock ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isNonStock ? 'NON-STOCK' : 'STOCK'}
            </span>
            <span>{renderText(description)}</span>
        </p>
    );
}

function formatRoleLabel(role: string) {
    const normalized = role.trim().toLowerCase();
    const roleMap: Record<string, string> = {
        requester: 'ผู้ขอซื้อ',
        admin: 'Admin',
        manager: 'Manager',
        employee: 'Employee',
        gardener: 'Gardener',
        leader_gardener: 'Leader Gardener',
        purchasing: 'Purchasing',
        leader_purchasing: 'Leader Purchasing',
        store: 'Store',
        leader_store: 'Leader Store',
        accounting: 'Accounting',
        leader_accounting: 'Leader Accounting',
        approver: 'Approver',
    };

    if (roleMap[normalized]) return roleMap[normalized];

    return normalized
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || '-';
}

export default async function POPrintPage(props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ stamps?: string }>;
}) {
    const params = await props.params;
    const searchParams = props.searchParams ? await props.searchParams : {};
    const poId = parseInt(params.id);
    if (isNaN(poId)) notFound();
    const includeStamps = searchParams?.stamps !== '0';

    const session = await auth();
    const { permissions: rolePermissions } = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    // Check Print Permission (reuses PO_PRINT or PO_VIEW if strict)
    if (!canPrintPurchaseOrders(rolePermissions) && !canViewPurchaseOrders(rolePermissions)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
            </div>
        );
    }

    const po = await prisma.tbl_purchase_orders.findUnique({
        where: { po_id: poId },
    });

    if (!po) notFound();

    const items = await prisma.tbl_po_items.findMany({
        where: { po_id: poId }
    });
    const requestReference = parsePurchaseOrderRequestReference(po.notes);

    // Merge items
    const poWithItems = { ...po, tbl_po_items: items };

    // Get Product Names
    const pIds = poWithItems.tbl_po_items.map(i => i.p_id);
    const products = await prisma.tbl_products.findMany({ where: { p_id: { in: pIds } }, select: { p_id: true, p_name: true } });
    const productMap = new Map(products.map(p => [p.p_id, p.p_name]));

    // Get Supplier
    const supplier = po.supplier_id ? await prisma.tbl_suppliers.findUnique({ where: { id: po.supplier_id } }) : null;

    let poApprovalLogs: Array<{
        step_key: string;
        action: string;
        actor_name: string | null;
        actor_role: string | null;
        acted_at: Date;
    }> = [];

    try {
        poApprovalLogs = await prisma.tbl_po_approval_logs.findMany({
            where: { po_id: poId },
            orderBy: { acted_at: 'asc' },
            select: {
                step_key: true,
                action: true,
                actor_name: true,
                actor_role: true,
                acted_at: true,
            },
        });
    } catch {
        // Fallback for environments where the new table has not been migrated yet
        poApprovalLogs = [];
    }
    const linkedRequest = requestReference.requestId
        ? await prisma.tbl_approval_requests.findUnique({
            where: { request_id: requestReference.requestId },
            include: {
                tbl_users: {
                    select: {
                        username: true,
                    },
                },
                tbl_approver: {
                    select: {
                        username: true,
                    },
                },
                step_logs: {
                    include: {
                        actor: {
                            select: {
                                username: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: {
                        acted_at: 'asc',
                    },
                },
                workflow: {
                    include: {
                        steps: {
                            orderBy: { step_order: 'asc' },
                        },
                    },
                },
            },
        })
        : null;
    const linkedRequestLogs = linkedRequest?.step_logs || [];
    const linkedRequestLatestLogByStep = new Map<number, (typeof linkedRequestLogs)[number]>();
    for (const log of linkedRequestLogs) {
        linkedRequestLatestLogByStep.set(Number(log.step_order), log);
    }
    const linkedRequestWorkflowByStep = new Map<number, { approver_role: string | null; approver_id: number | null }>();
    for (const step of linkedRequest?.workflow?.steps || []) {
        linkedRequestWorkflowByStep.set(Number(step.step_order), {
            approver_role: step.approver_role,
            approver_id: step.approver_id,
        });
    }
    const linkedRequestManagerLog = linkedRequestLatestLogByStep.get(2);
    const linkedRequestAccountingLog = linkedRequestLatestLogByStep.get(3);
    const linkedRequestPoIssuedLog = linkedRequestLatestLogByStep.get(4);
    const linkedRequestPurchasingLog = linkedRequestLatestLogByStep.get(1);
    const linkedRequestApprovedBy = linkedRequest?.tbl_approver?.username
        || linkedRequestAccountingLog?.actor?.username
        || linkedRequestManagerLog?.actor?.username
        || [...linkedRequestLogs]
            .reverse()
            .find((log) => log.action?.toLowerCase() === 'approved' && Boolean(log.actor?.username?.trim()))
            ?.actor?.username
        || null;

    // Fetch Company Settings
    const settings = await prisma.tbl_system_settings.findMany();
    const companyInfo = settings.reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
    }, {} as Record<string, string>);

    // Calculate real subtotal and tax in case DB fields are 0 for older records
    const calculatedSubtotal = poWithItems.tbl_po_items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
    const displaySubtotal = Number(po.subtotal) > 0 ? Number(po.subtotal) : calculatedSubtotal;
    const calculatedTax = Number(po.total_amount) - displaySubtotal;
    const displayTax = Number(po.tax_amount) > 0 ? Number(po.tax_amount) : (calculatedTax > 0 ? calculatedTax : 0);
    const approvedByFromLog = [...poApprovalLogs]
        .reverse()
        .find((log) => (
            ['ordered', 'approved', 'received'].includes(log.step_key.toLowerCase())
            && Boolean(log.actor_name?.trim())
        ))?.actor_name || null;
    const approvedByName = linkedRequestApprovedBy || po.approved_by || approvedByFromLog || null;
    const requesterSignatureName = linkedRequest?.tbl_users?.username || po.created_by || null;
    const managerApprovedByName = linkedRequestManagerLog?.actor?.username || approvedByName;
    const requesterName = linkedRequest?.tbl_users?.username || null;
    const requesterActedAt = linkedRequest?.created_at || linkedRequest?.request_date || null;
    const requesterSignatureDate = requesterActedAt ? new Date(requesterActedAt).toLocaleDateString('th-TH') : null;
    const managerApprovedDate = linkedRequestManagerLog?.acted_at
        ? new Date(linkedRequestManagerLog.acted_at).toLocaleDateString('th-TH')
        : null;

    const stamps: PoStamp[] = [
        {
            stepKey: 'requester',
            stepLabel: 'ผู้ขอซื้อ',
            role: 'requester',
            actorName: requesterName,
            actedAt: requesterActedAt,
            approved: Boolean(requesterName),
        },
        {
            stepKey: 'purchasing',
            stepLabel: 'จัดซื้อ',
            role: linkedRequestWorkflowByStep.get(1)?.approver_role || 'purchasing',
            actorName: linkedRequestPurchasingLog?.actor?.username || po.created_by || null,
            actedAt: linkedRequestPurchasingLog?.acted_at || po.created_at || null,
            approved: linkedRequestPurchasingLog?.action === 'approved',
        },
        {
            stepKey: 'manager',
            stepLabel: 'ผู้จัดการ',
            role: linkedRequestWorkflowByStep.get(2)?.approver_role || 'manager',
            actorName: linkedRequestManagerLog?.actor?.username || null,
            actedAt: linkedRequestManagerLog?.acted_at || null,
            approved: linkedRequestManagerLog?.action === 'approved',
        },
        {
            stepKey: 'accounting',
            stepLabel: 'บัญชี',
            role: linkedRequestWorkflowByStep.get(3)?.approver_role || 'accounting',
            actorName: linkedRequestAccountingLog?.actor?.username || null,
            actedAt: linkedRequestAccountingLog?.acted_at || null,
            approved: linkedRequestAccountingLog?.action === 'approved',
        },
        {
            stepKey: 'purchasing_po',
            stepLabel: 'จัดซื้อ',
            role: linkedRequestWorkflowByStep.get(4)?.approver_role || 'purchasing',
            actorName: linkedRequestPoIssuedLog?.actor?.username || po.created_by || null,
            actedAt: linkedRequestPoIssuedLog?.acted_at || null,
            approved: linkedRequestPoIssuedLog?.action === 'approved',
        },
    ];

    return (
        <div className="bg-white min-h-screen p-8 print:p-0 text-black print-tight">
            <div className="max-w-[210mm] mx-auto print:max-w-none print-sheet">
                {/* Print Controls */}
                <div className="mb-6 print:hidden flex flex-wrap justify-end gap-3">
                    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Link
                            href={`/print/purchase-orders/${po.po_id}?stamps=1`}
                            className={`px-3 py-2 text-sm ${includeStamps ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                            พิมพ์พร้อม Stamps
                        </Link>
                        <Link
                            href={`/print/purchase-orders/${po.po_id}?stamps=0`}
                            className={`border-l border-slate-200 px-3 py-2 text-sm ${!includeStamps ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                            พิมพ์ไม่เอา Stamps
                        </Link>
                    </div>
                    <PrintButton />
                </div>

                {/* Header */}
                <div className="border-b pb-4 mb-6 flex justify-between items-start print:mb-4 print:pb-3 print-block">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Purchase Order</h1>
                        <div className="text-sm">
                            <p className="font-bold">{companyInfo['company_name'] || 'Company Name Co., Ltd.'}</p>
                            <p>{companyInfo['company_address'] || '123 Business Rd, Bangkok 10110'}</p>
                            <p>Tax ID: {companyInfo['company_tax_id'] || '0123456789000'}</p>
                            <p>Tel: {companyInfo['company_phone'] || '-'} Email: {companyInfo['company_email'] || '-'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-2">
                            <span className="text-sm text-gray-500 block">PO Number</span>
                            <span className="text-xl font-bold">{po.po_number}</span>
                        </div>
                        <div className="mb-2">
                            <span className="text-sm text-gray-500 block">Date</span>
                            <span>{po.order_date ? new Date(po.order_date).toLocaleDateString('th-TH') : '-'}</span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 block">Status</span>
                            <span className="uppercase font-semibold">{po.status}</span>
                        </div>
                    </div>
                </div>

                {/* Supplier Info */}
                <div className="mb-8 p-4 border rounded-sm print:mb-4 print:p-3 print-block">
                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Vendor / Supplier</h3>
                    <div className="font-bold text-lg">{supplier?.name || 'Unknown Supplier'}</div>
                    <div className="text-sm mt-1">
                        <p>{supplier?.address}</p>
                        <p>Phone: {supplier?.phone} | Email: {supplier?.email}</p>
                        <p>Tax ID: {supplier?.tax_id}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-8 print:mb-4 print-block">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2 text-left w-12">#</th>
                            <th className="py-2 text-left">Description</th>
                            <th className="py-2 text-right w-24">Qty</th>
                            <th className="py-2 text-right w-32">Unit Price</th>
                            <th className="py-2 text-right w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {poWithItems.tbl_po_items.map((item, index) => {
                            const isNonStock = isNonStockPurchaseOrderItem(item.notes, item.p_id);

                            return (
                                <tr key={item.item_id}>
                                    <td className="py-3 text-gray-500">{index + 1}</td>
                                    <td className="py-3">
                                        <div className="font-bold">{parsePurchaseOrderItemNote(item.notes, item.p_id).displayName || productMap.get(item.p_id) || item.p_id}</div>
                                        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${isNonStock ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {isNonStock ? 'NON-STOCK' : 'STOCK'}
                                        </div>
                                        <div className="text-xs text-gray-500">{item.p_id}</div>
                                    </td>
                                    <td className="py-3 text-right">{item.quantity}</td>
                                    <td className="py-3 text-right">{Number(item.unit_price).toLocaleString()}</td>
                                    <td className="py-3 text-right font-bold">{Number(item.line_total).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td colSpan={3}></td>
                            <td className="py-2 text-right">Subtotal</td>
                            <td className="py-2 text-right">{displaySubtotal.toLocaleString()}</td>
                        </tr>
                        {displayTax > 0 && (
                            <tr>
                                <td colSpan={3}></td>
                                <td className="py-2 text-right">VAT (7%)</td>
                                <td className="py-2 text-right">{displayTax.toLocaleString()}</td>
                            </tr>
                        )}
                        <tr className="border-t border-gray-200">
                            <td colSpan={3}></td>
                            <td className="py-3 text-right font-bold">Total Amount</td>
                            <td className="py-3 text-right font-bold text-lg">{Number(po.total_amount).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {po.notes && (
                    <div className="mb-8 border p-4 bg-gray-50 print:mb-4 print:p-3 print:bg-transparent print-block">
                        <h4 className="font-bold text-sm mb-1">Notes:</h4>
                        <div className="space-y-1 text-sm">
                            {po.notes.split('\n').map((line, index) => (
                                renderNoteLineWithBadge(line, `po-note-${index}`)
                            ))}
                        </div>
                    </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-20 page-break-inside-avoid print:mt-8 print:gap-8 print-block">
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold">{requesterSignatureName || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Requested By</p>
                        <p className="text-xs mt-1">Date: {requesterSignatureDate || '____/____/____'}</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2 opacity-50"></div>
                        <p className="font-bold">{managerApprovedByName || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Approved By</p>
                        <p className="text-xs mt-1">Date: {managerApprovedDate || '____/____/____'}</p>
                    </div>
                </div>

                {includeStamps && (
                    <div className="mt-10 page-break-inside-avoid print:mt-6 print-block">
                    <h3 className="mb-3 text-sm font-bold uppercase text-gray-600">Approval Stamps</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-2">
                        {stamps.map((stamp, index) => (
                            <div key={`${stamp.role}-${index}`} className="relative rounded border border-gray-300 p-3">
                                {stamp.approved && (
                                    <div className="absolute right-3 top-3 rotate-[-12deg] rounded-full border-2 border-red-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600">
                                        APPROVED
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">Step {index + 1} · {stamp.stepLabel}</p>
                                <p className="text-sm font-semibold">{formatRoleLabel(stamp.role)}</p>
                                <p className="mt-1 text-sm">{stamp.actorName || '-'}</p>
                                <p className="text-xs text-gray-500">
                                    {stamp.actedAt ? new Date(stamp.actedAt).toLocaleString('th-TH') : '-'}
                                </p>
                            </div>
                        ))}
                    </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generated by Stock Movement System on {new Date().toLocaleDateString('th-TH')}</p>
                </div>

            </div>
        </div>
    );
}
