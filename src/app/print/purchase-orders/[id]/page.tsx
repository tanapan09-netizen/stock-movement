import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { canPrintPurchaseOrders, canViewPurchaseOrders } from '@/lib/rbac';
import { Lock } from 'lucide-react';
import PrintButton from './PrintButton';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

type PoStamp = {
    stepKey: string;
    stepLabel: string;
    role: string;
    actorName: string | null;
    actedAt: Date | null;
    approved: boolean;
};

function formatRoleLabel(role: string) {
    const normalized = role.trim().toLowerCase();
    const roleMap: Record<string, string> = {
        admin: 'Admin',
        manager: 'Manager',
        employee: 'Employee',
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

function formatStepLabel(stepKey: string) {
    const key = stepKey.trim().toLowerCase();
    const labels: Record<string, string> = {
        draft: 'Draft',
        pending: 'Pending',
        approved: 'Approved',
        ordered: 'Ordered',
        received: 'Received',
        cancelled: 'Cancelled',
    };
    return labels[key] || key.toUpperCase();
}

export default async function POPrintPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const poId = parseInt(params.id);
    if (isNaN(poId)) notFound();

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

    const actorNames = [po.created_by, po.approved_by, ...poApprovalLogs.map((log) => log.actor_name)]
        .filter((name): name is string => Boolean(name && name.trim()))
        .map((name) => name.trim());
    const uniqueActorNames = Array.from(new Set(actorNames));
    const actorUsers = uniqueActorNames.length > 0
        ? await prisma.tbl_users.findMany({
            where: {
                username: {
                    in: uniqueActorNames,
                },
            },
            select: {
                username: true,
                role: true,
            },
        })
        : [];
    const roleByUsername = new Map(actorUsers.map((user) => [user.username, user.role || '']));

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
    const status = String(po.status || 'draft').toLowerCase();
    const normalizedStatus = status === 'partial' ? 'ordered' : status;
    const stepFlow = ['draft', 'pending', 'approved', 'ordered', 'received'];
    const currentStepIndex = Math.max(0, stepFlow.indexOf(normalizedStatus));
    const latestLogByStep = new Map<string, (typeof poApprovalLogs)[number]>();
    for (const log of poApprovalLogs) {
        latestLogByStep.set(log.step_key.toLowerCase(), log);
    }

    const stamps: PoStamp[] = stepFlow.map((stepKey, index) => {
        const stepLog = latestLogByStep.get(stepKey);
        const fallbackActorName = stepKey === 'draft'
            ? (po.created_by || null)
            : (stepKey === 'received' || stepKey === 'approved' ? (po.approved_by || null) : null);
        const actorName = stepLog?.actor_name || fallbackActorName;
        const role =
            stepLog?.actor_role ||
            (actorName ? roleByUsername.get(actorName) : '') ||
            (stepKey === 'draft' ? 'purchasing' : stepKey === 'received' ? 'store' : 'approver');
        const actedAt = stepLog?.acted_at ||
            (stepKey === 'draft' ? (po.created_at || null) : stepKey === 'received' ? (po.received_date || null) : null);

        return {
            stepKey,
            stepLabel: formatStepLabel(stepKey),
            role,
            actorName,
            actedAt,
            approved: index <= currentStepIndex && Boolean(actorName),
        };
    });

    return (
        <div className="bg-white min-h-screen p-8 print:p-0 text-black">
            <div className="max-w-[210mm] mx-auto print:max-w-none">
                {/* Print Controls */}
                <div className="mb-6 print:hidden flex justify-end">
                    <PrintButton />
                </div>

                {/* Header */}
                <div className="border-b pb-4 mb-6 flex justify-between items-start">
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
                <div className="mb-8 p-4 border rounded-sm">
                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Vendor / Supplier</h3>
                    <div className="font-bold text-lg">{supplier?.name || 'Unknown Supplier'}</div>
                    <div className="text-sm mt-1">
                        <p>{supplier?.address}</p>
                        <p>Phone: {supplier?.phone} | Email: {supplier?.email}</p>
                        <p>Tax ID: {supplier?.tax_id}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-8">
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
                        {poWithItems.tbl_po_items.map((item, index) => (
                            <tr key={item.item_id}>
                                <td className="py-3 text-gray-500">{index + 1}</td>
                                <td className="py-3">
                                    <div className="font-bold">{productMap.get(item.p_id)}</div>
                                    <div className="text-xs text-gray-500">{item.p_id}</div>
                                </td>
                                <td className="py-3 text-right">{item.quantity}</td>
                                <td className="py-3 text-right">{Number(item.unit_price).toLocaleString()}</td>
                                <td className="py-3 text-right font-bold">{Number(item.line_total).toLocaleString()}</td>
                            </tr>
                        ))}
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
                    <div className="mb-8 border p-4 bg-gray-50 print:bg-transparent">
                        <h4 className="font-bold text-sm mb-1">Notes:</h4>
                        <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                    </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-20 page-break-inside-avoid">
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold">{po.created_by || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Prepared By</p>
                        <p className="text-xs mt-1">Date: ____/____/____</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2 opacity-50"></div>
                        <p className="font-bold">{po.approved_by || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Approved By</p>
                        <p className="text-xs mt-1">Date: ____/____/____</p>
                    </div>
                </div>

                <div className="mt-10 page-break-inside-avoid">
                    <h3 className="mb-3 text-sm font-bold uppercase text-gray-600">Approval Stamps</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generated by Stock Movement System on {new Date().toLocaleDateString('th-TH')}</p>
                </div>

            </div>
        </div>
    );
}
