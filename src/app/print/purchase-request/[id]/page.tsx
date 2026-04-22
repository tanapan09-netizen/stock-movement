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
    line: string;
    link?: string;
};

type RoleStamp = {
    stepOrder: number;
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
            items.push({ line: trimmed.replace(/^\d+\.\s*/, '') });
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

function formatRoleLabel(role: string) {
    const normalized = role.trim().toLowerCase();
    const roleMap: Record<string, string> = {
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

export default async function PurchaseRequestPrintPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const requestId = Number(params.id);
    if (!Number.isFinite(requestId)) notFound();

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

    const workflowSteps = effectiveWorkflowSource.map((step) => ({
        stepOrder: step.step_order,
        approverRole: step.approver_role || 'approver',
    }));

    const roleStamps: RoleStamp[] = workflowSteps.map((step) => {
        const matchedLog = [...request.step_logs]
            .reverse()
            .find((log) => log.step_order === step.stepOrder);

        return {
            stepOrder: step.stepOrder,
            approverRole: step.approverRole,
            actorName: matchedLog?.actor?.username || null,
            actedAt: matchedLog?.acted_at || null,
            action: matchedLog?.action || null,
        };
    });

    return (
        <div className="min-h-screen bg-white p-8 print:p-0 text-black">
            <div className="mx-auto max-w-[210mm] print:max-w-none">
                <div className="mb-6 flex justify-end gap-3 print:hidden">
                    {(request.status === 'pending' || request.status === 'returned') && (
                        <Link
                            href={`/purchase-request?edit=${request.request_id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-amber-700 hover:bg-amber-50"
                        >
                            <Pencil className="h-4 w-4" />
                            แก้ไขเอกสาร
                        </Link>
                    )}
                    <PrintButton />
                </div>

                <div className="mb-6 flex items-start justify-between border-b pb-4">
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

                <div className="mb-8 grid grid-cols-2 gap-4">
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
                    <div className={`mb-8 rounded-sm border p-4 ${request.status === 'returned' ? 'border-orange-300 bg-orange-50' : 'border-rose-300 bg-rose-50'}`}>
                        <h3 className="mb-2 text-xs font-bold uppercase text-gray-600">
                            {request.status === 'returned' ? 'Return Reason' : 'Rejection Reason'}
                        </h3>
                        <div className={`text-sm font-medium ${request.status === 'returned' ? 'text-orange-800' : 'text-rose-800'}`}>
                            {request.rejection_reason}
                        </div>
                    </div>
                )}

                <table className="mb-8 w-full text-sm">
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
                                    <td className="whitespace-pre-wrap py-3">{item.line}</td>
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
                                <td colSpan={3} className="whitespace-pre-wrap py-3">{parsed.raw || '-'}</td>
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

                <div className="mb-8 border bg-gray-50 p-4 print:bg-transparent">
                    <h4 className="mb-1 text-sm font-bold">Notes:</h4>
                    <p className="whitespace-pre-wrap text-sm">{parsed.note || '-'}</p>
                </div>

                <div className="mt-20 grid grid-cols-2 gap-12 page-break-inside-avoid">
                    <div className="text-center">
                        <div className="mx-auto mb-2 w-3/4 border-b border-black"></div>
                        <p className="font-bold">{request.tbl_users?.username || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Prepared By</p>
                        <p className="mt-1 text-xs">Date: ____/____/____</p>
                    </div>
                    <div className="text-center">
                        <div className="mx-auto mb-2 w-3/4 border-b border-black opacity-50"></div>
                        <p className="font-bold">{request.tbl_approver?.username || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Approved By</p>
                        <p className="mt-1 text-xs">Date: ____/____/____</p>
                    </div>
                </div>

                {request.status === 'approved' && roleStamps.length > 0 && (
                    <div className="mt-10 page-break-inside-avoid">
                        <h3 className="mb-3 text-sm font-bold uppercase text-gray-600">Approval Stamps</h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {roleStamps.map((stamp) => {
                                const isApproved = stamp.action === 'approved' && Boolean(stamp.actorName);

                                return (
                                    <div key={`${stamp.stepOrder}-${stamp.approverRole}`} className="relative rounded border border-gray-300 p-3">
                                        {isApproved && (
                                            <div className="absolute right-3 top-3 rotate-[-12deg] rounded-full border-2 border-red-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600">
                                                APPROVED
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500">Step {stamp.stepOrder}</p>
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
