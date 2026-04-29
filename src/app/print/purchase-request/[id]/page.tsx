import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lock, Pencil } from 'lucide-react';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getEffectiveApprovalWorkflowSteps } from '@/lib/purchase-request-workflow';
import { canViewPurchaseRequestDocument } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import PrintButton from './PrintButton';

type PurchaseLineItem = {
    description: string;
    itemType: 'stock' | 'non_stock';
    link?: string;
};

type RoleStamp = {
    stepOrder: number;
    stepLabel: string;
    approverRole: string;
    actorName: string | null;
    actedAt: Date | null;
    action: string | null;
};

function formatCurrency(value: number) {
    return value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatShortProductLink(link: string) {
    try {
        const parsed = new URL(link);
        const path = parsed.pathname.replace(/\/+$/, '') || '/';
        const compactPath = path === '/'
            ? ''
            : path.length > 24
                ? `${path.slice(0, 24)}...`
                : path;

        return `${parsed.hostname}${compactPath}`;
    } catch {
        return link.length > 36 ? `${link.slice(0, 36)}...` : link;
    }
}

function getValueByPrefixes(lines: string[], prefixes: string[], fallback: string = '-') {
    for (const prefix of prefixes) {
        const line = lines.find((entry) => entry.startsWith(prefix));
        if (line) return line.replace(prefix, '').trim() || fallback;
    }

    return fallback;
}

function getValueAfterColon(line: string | undefined, fallback: string = '-') {
    if (!line) return fallback;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) return fallback;
    return line.slice(separatorIndex + 1).trim() || fallback;
}

function parsePurchaseReason(reason: string | null | undefined) {
    const raw = reason || '';
    const lines = raw.split('\n');
    const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
    const headerLines = normalizedLines.filter((line) => line.includes(':')).slice(0, 3);

    const subject = getValueAfterColon(headerLines[0]);
    const priority = getValueAfterColon(headerLines[1]);
    const note = getValueAfterColon(headerLines[2]);
    const subtotal = getValueByPrefixes(normalizedLines, ['รวมเงิน:']);
    const vat = getValueByPrefixes(normalizedLines, ['ภาษี 7%:'], '');
    const netTotal = getValueByPrefixes(normalizedLines, ['ยอดรวมสุทธิ:']);

    const items: PurchaseLineItem[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (/^\d+\./.test(trimmed)) {
            const cleaned = trimmed.replace(/^\d+\.\s*/, '');
            const isNonStock = /^\[(?:NON[-_\s]?STOCK)\]\s*/i.test(cleaned);
            const description = cleaned
                .replace(/^\[(?:NON[-_\s]?STOCK)\]\s*/i, '')
                .replace(/^\[(?:STOCK)\]\s*/i, '')
                .trim();
            items.push({
                description,
                itemType: isNonStock ? 'non_stock' : 'stock',
            });
            continue;
        }

        if (items.length > 0 && trimmed.includes('http')) {
            const normalizedLink = trimmed.replace(/^[^:]+:/, '').trim();
            if (/^https?:\/\//i.test(normalizedLink)) {
                items[items.length - 1].link = normalizedLink;
            }
        }
    }

    return {
        raw,
        subject,
        priority,
        note,
        subtotal,
        vat: vat || null,
        netTotal,
        items,
    };
}

function stripStockTags(value: string) {
    return value.replace(/\[(?:NON[-_\s]?STOCK|STOCK)\]\s*/gi, '').trim();
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
        accounting: 'Accounting',
        leader_accounting: 'Leader Accounting',
        technician: 'Technician',
        leader_technician: 'Leader Technician',
        operation: 'Operation',
        leader_operation: 'Leader Operation',
        store: 'Store',
        leader_store: 'Leader Store',
        approver: 'Approver',
    };

    if (roleMap[normalized]) return roleMap[normalized];

    return normalized
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || '-';
}

function getPrintablePurchaseRequestStatusLabel(status?: string | null) {
    switch ((status || '').toLowerCase()) {
        case 'pending':
            return 'Pending';
        case 'returned':
            return 'Returned For Revision';
        case 'approved':
            return 'Completed';
        case 'rejected':
            return 'Rejected';
        default:
            return status || '-';
    }
}

export default async function PurchaseRequestPrintPage(props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ stamps?: string }>;
}) {
    const params = await props.params;
    const searchParams = props.searchParams ? await props.searchParams : {};
    const requestId = Number(params.id);
    if (!Number.isFinite(requestId)) notFound();
    const includeStamps = searchParams?.stamps !== '0';

    const session = await auth();
    if (!session?.user?.id) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-gray-500">
                <Lock className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium">Unauthorized</h3>
            </div>
        );
    }

    const currentUserId = Number(session.user.id) || 0;
    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

    const [request, settings] = await Promise.all([
        prisma.tbl_approval_requests.findUnique({
            where: { request_id: requestId },
            include: {
                tbl_users: {
                    select: {
                        username: true,
                        p_id: true,
                    },
                },
                tbl_approver: {
                    select: {
                        username: true,
                    },
                },
                workflow: {
                    include: {
                        steps: {
                            orderBy: { step_order: 'asc' },
                        },
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
            },
        }),
        prisma.tbl_system_settings.findMany(),
    ]);

    if (!request || request.request_type !== 'purchase') {
        notFound();
    }

    const ownerId = request.requested_by || request.tbl_users?.p_id || 0;
    const canView = canViewPurchaseRequestDocument(
        permissionContext.role,
        permissionContext.permissions,
        {
            currentUserId,
            ownerId,
            isApprover: permissionContext.isApprover,
        },
    );

    if (!canView) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-gray-500">
                <Lock className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium">Access Denied</h3>
            </div>
        );
    }

    const companyInfo = settings.reduce((acc, curr) => {
        acc[curr.setting_key] = curr.setting_value;
        return acc;
    }, {} as Record<string, string>);

    const parsed = parsePurchaseReason(request.reason);
    const displaySubtotal = parsed.subtotal !== '-' ? parsed.subtotal : `฿${formatCurrency(Number(request.amount || 0))}`;
    const displayNetTotal = parsed.netTotal !== '-' ? parsed.netTotal : `฿${formatCurrency(Number(request.amount || 0))}`;
    const effectiveWorkflowSource = getEffectiveApprovalWorkflowSteps(
        request.request_type,
        request.workflow?.steps || [],
    );
    const workflowRoleByStep = new Map<number, string>();
    for (const step of effectiveWorkflowSource) {
        workflowRoleByStep.set(step.step_order, step.approver_role || '');
    }
    const requestLatestLogByStep = new Map<number, (typeof request.step_logs)[number]>();
    for (const log of request.step_logs) {
        requestLatestLogByStep.set(Number(log.step_order), log);
    }
    const purchasingLog = requestLatestLogByStep.get(1);
    const managerLog = requestLatestLogByStep.get(2);
    const accountingLog = requestLatestLogByStep.get(3);
    const purchasingPoLog = requestLatestLogByStep.get(4);

    const roleStamps: RoleStamp[] = [
        {
            stepOrder: 1,
            stepLabel: 'ผู้ขอซื้อ',
            approverRole: 'requester',
            actorName: request.tbl_users?.username || null,
            actedAt: request.created_at || request.request_date || null,
            action: 'approved',
        },
        {
            stepOrder: 2,
            stepLabel: 'จัดซื้อ',
            approverRole: workflowRoleByStep.get(1) || 'purchasing',
            actorName: purchasingLog?.actor?.username || null,
            actedAt: purchasingLog?.acted_at || null,
            action: purchasingLog?.action || null,
        },
        {
            stepOrder: 3,
            stepLabel: 'ผู้จัดการ',
            approverRole: workflowRoleByStep.get(2) || 'manager',
            actorName: managerLog?.actor?.username || null,
            actedAt: managerLog?.acted_at || null,
            action: managerLog?.action || null,
        },
        {
            stepOrder: 4,
            stepLabel: 'บัญชี',
            approverRole: workflowRoleByStep.get(3) || 'accounting',
            actorName: accountingLog?.actor?.username || null,
            actedAt: accountingLog?.acted_at || null,
            action: accountingLog?.action || null,
        },
        {
            stepOrder: 5,
            stepLabel: 'จัดซื้อ',
            approverRole: workflowRoleByStep.get(4) || 'purchasing',
            actorName: purchasingPoLog?.actor?.username || null,
            actedAt: purchasingPoLog?.acted_at || null,
            action: purchasingPoLog?.action || null,
        },
    ];

    const requesterSignatureName = request.tbl_users?.username || '________________';
    const requesterSignatureDate = roleStamps[0]?.actedAt ? new Date(roleStamps[0].actedAt).toLocaleDateString('th-TH') : null;
    const managerApprovedByName = managerLog?.actor?.username
        || request.tbl_approver?.username
        || '________________';
    const managerApprovedDate = managerLog?.acted_at
        ? new Date(managerLog.acted_at).toLocaleDateString('th-TH')
        : null;

    return (
        <div className="min-h-screen bg-white p-8 print:p-0 text-black print-tight">
            <div className="mx-auto max-w-[210mm] print:max-w-none print-sheet">
                <div className="mb-6 flex flex-wrap justify-end gap-3 print:hidden">
                    {(request.status === 'pending' || request.status === 'returned') && (
                        <Link
                            href={`/purchase-request?edit=${request.request_id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-amber-700 hover:bg-amber-50"
                        >
                            <Pencil className="h-4 w-4" />
                            แก้ไขเอกสาร
                        </Link>
                    )}
                    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Link
                            href={`/print/purchase-request/${request.request_id}?stamps=1`}
                            className={`px-3 py-2 text-sm ${includeStamps ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                            พิมพ์พร้อม Stamps
                        </Link>
                        <Link
                            href={`/print/purchase-request/${request.request_id}?stamps=0`}
                            className={`border-l border-slate-200 px-3 py-2 text-sm ${!includeStamps ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                            พิมพ์ไม่เอา Stamps
                        </Link>
                    </div>
                    <PrintButton />
                </div>

                <div className="mb-6 flex items-start justify-between border-b pb-4 print:mb-4 print:pb-3 print-block">
                    <div>
                        <h1 className="mb-2 text-3xl font-bold uppercase tracking-wider">Purchase Request</h1>
                        <div className="text-sm">
                            <p className="font-bold">{companyInfo.company_name || 'Company Name Co., Ltd.'}</p>
                            <p>{companyInfo.company_address || '123 Business Rd, Bangkok 10110'}</p>
                            <p>Tax ID: {companyInfo.company_tax_id || '-'}</p>
                            <p>Tel: {companyInfo.company_phone || '-'} Email: {companyInfo.company_email || '-'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-2">
                            <span className="block text-sm text-gray-500">Document Number</span>
                            <span className="text-xl font-bold">{request.request_number}</span>
                        </div>
                        <div className="mb-2">
                            <span className="block text-sm text-gray-500">Date</span>
                            <span>{request.request_date ? new Date(request.request_date).toLocaleDateString('th-TH') : '-'}</span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500">Status</span>
                            <span className="font-semibold uppercase">{getPrintablePurchaseRequestStatusLabel(request.status)}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-4 print:mb-4 print:gap-3 print-block">
                    <div className="rounded-sm border p-4">
                        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Requester</h3>
                        <div className="text-lg font-bold">{request.tbl_users?.username || '-'}</div>
                    </div>
                    <div className="rounded-sm border p-4">
                        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Reference Job</h3>
                        <div className="text-lg font-bold">{request.reference_job || '-'}</div>
                    </div>
                    <div className="rounded-sm border p-4">
                        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Subject</h3>
                        <div className="text-lg font-bold">{parsed.subject}</div>
                    </div>
                    <div className="rounded-sm border p-4">
                        <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Priority</h3>
                        <div className="text-lg font-bold">{parsed.priority}</div>
                    </div>
                </div>

                {(request.status === 'returned' || request.status === 'rejected') && request.rejection_reason && (
                    <div className={`mb-8 rounded-sm border p-4 print:mb-4 print:p-3 print-block ${request.status === 'returned' ? 'border-orange-300 bg-orange-50' : 'border-rose-300 bg-rose-50'}`}>
                        <h3 className="mb-2 text-xs font-bold uppercase text-gray-600">
                            {request.status === 'returned' ? 'Return Reason' : 'Rejection Reason'}
                        </h3>
                        <div className={`text-sm font-medium ${request.status === 'returned' ? 'text-orange-800' : 'text-rose-800'}`}>
                            {request.rejection_reason}
                        </div>
                    </div>
                )}

                <table className="mb-8 w-full text-sm print:mb-4 print-block">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="w-12 py-2 text-left">#</th>
                            <th className="py-2 text-left">Description</th>
                            <th className="w-56 py-2 text-left">Product Link</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {parsed.items.length > 0 ? (
                            parsed.items.map((item, index) => (
                                <tr key={`${request.request_id}-${index}`}>
                                    <td className="py-3 text-gray-500">{index + 1}</td>
                                    <td className="whitespace-pre-wrap py-3">
                                        <div className="flex items-center gap-2">
                                            <span>{item.description}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.itemType === 'non_stock' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.itemType === 'non_stock' ? 'NON-STOCK' : 'STOCK'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="break-all py-3">
                                        {item.link ? (
                                            <a href={item.link} target="_blank" rel="noreferrer" title={item.link} className="text-blue-700 underline">
                                                {formatShortProductLink(item.link)}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="whitespace-pre-wrap py-3">{stripStockTags(parsed.raw) || '-'}</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td colSpan={2}></td>
                            <td className="py-2 text-right">
                                <div className="flex justify-between gap-4">
                                    <span>Subtotal</span>
                                    <span>{displaySubtotal}</span>
                                </div>
                            </td>
                        </tr>
                        {parsed.vat && (
                            <tr>
                                <td colSpan={2}></td>
                                <td className="py-2 text-right">
                                    <div className="flex justify-between gap-4">
                                        <span>VAT (7%)</span>
                                        <span>{parsed.vat}</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        <tr className="border-t border-gray-200">
                            <td colSpan={2}></td>
                            <td className="py-3 text-right font-bold">
                                <div className="flex justify-between gap-4 text-lg">
                                    <span>Total Amount</span>
                                    <span>{displayNetTotal}</span>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mb-8 border bg-gray-50 p-4 print:mb-4 print:p-3 print:bg-transparent print-block">
                    <h4 className="mb-1 text-sm font-bold">Notes:</h4>
                    <p className="whitespace-pre-wrap text-sm">{parsed.note || '-'}</p>
                </div>

                <div className="mt-20 grid grid-cols-2 gap-12 page-break-inside-avoid print:mt-8 print:gap-8 print-block">
                    <div className="text-center">
                        <div className="mx-auto mb-2 w-3/4 border-b border-black"></div>
                        <p className="font-bold">{requesterSignatureName}</p>
                        <p className="text-xs uppercase text-gray-500">Requested By</p>
                        <p className="mt-1 text-xs">Date: {requesterSignatureDate || '____/____/____'}</p>
                    </div>
                    <div className="text-center">
                        <div className="mx-auto mb-2 w-3/4 border-b border-black opacity-50"></div>
                        <p className="font-bold">{managerApprovedByName}</p>
                        <p className="text-xs uppercase text-gray-500">Approved By</p>
                        <p className="mt-1 text-xs">Date: {managerApprovedDate || '____/____/____'}</p>
                    </div>
                </div>

                {includeStamps && roleStamps.length > 0 && (
                    <div className="mt-10 page-break-inside-avoid print:mt-6 print-block">
                        <h3 className="mb-3 text-sm font-bold uppercase text-gray-600">Approval Stamps</h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-2">
                            {roleStamps.map((stamp) => {
                                const isApproved = stamp.action === 'approved' && Boolean(stamp.actorName);

                                return (
                                    <div key={`${stamp.stepOrder}-${stamp.approverRole}`} className="relative rounded border border-gray-300 p-3">
                                        {isApproved && (
                                            <div className="absolute right-3 top-3 rotate-[-12deg] rounded-full border-2 border-red-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600">
                                                APPROVED
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500">Step {stamp.stepOrder} · {stamp.stepLabel}</p>
                                        <p className="text-sm font-semibold">{formatRoleLabel(stamp.approverRole)}</p>
                                        <p className="mt-1 text-sm">{stamp.actorName || '-'}</p>
                                        <p className="text-xs text-gray-500">
                                            {stamp.actedAt ? new Date(stamp.actedAt).toLocaleString('th-TH') : '-'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generated by Stock Movement System on {new Date().toLocaleDateString('th-TH')}</p>
                </div>
            </div>
        </div>
    );
}
