import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isDepartmentRole, isManagerRole } from '@/lib/roles';
import { Lock, Pencil } from 'lucide-react';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

type PurchaseLineItem = {
    line: string;
    link?: string;
};

function formatCurrency(value: number) {
    return value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getValueByPrefixes(lines: string[], prefixes: string[], fallback: string = '-') {
    for (const prefix of prefixes) {
        const line = lines.find((entry) => entry.startsWith(prefix));
        if (line) return line.replace(prefix, '').trim() || fallback;
    }

    return fallback;
}

function parsePurchaseReason(reason: string | null | undefined) {
    const raw = reason || '';
    const lines = raw.split('\n');

    const subject = getValueByPrefixes(lines, ['เรื่อง:', 'เน€เธฃเธทเนเธญเธ:']);
    const priority = getValueByPrefixes(lines, ['ระดับความสำคัญ:', 'เธฃเธฐเธ”เธฑเธเธเธงเธฒเธกเธชเธณเธเธฑเธ:']);
    const note = getValueByPrefixes(lines, ['หมายเหตุ:', 'เธซเธกเธฒเธขเน€เธซเธ•เธธ:']);
    const subtotal = getValueByPrefixes(lines, ['รวมเงิน:', 'เธฃเธงเธกเน€เธเธดเธ:']);
    const vat = getValueByPrefixes(lines, ['ภาษี 7%:', 'เธ เธฒเธฉเธต 7%:'], '');
    const netTotal = getValueByPrefixes(lines, ['ยอดรวมสุทธิ:', 'เธขเธญเธ”เธฃเธงเธกเธชเธธเธ—เธเธด:']);

    const items: PurchaseLineItem[] = [];
    let inItems = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === 'รายการสินค้า:' || trimmed === 'เธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒ:') {
            inItems = true;
            continue;
        }

        if (!inItems) continue;
        if (trimmed.startsWith('รวมเงิน:') || trimmed.startsWith('เธฃเธงเธกเน€เธเธดเธ:')) break;

        if (/^\d+\./.test(trimmed)) {
            items.push({ line: trimmed });
            continue;
        }

        if ((trimmed.startsWith('ลิงก์สินค้า:') || trimmed.startsWith('เธฅเธดเธเธเนเธชเธดเธเธเนเธฒ:')) && items.length > 0) {
            items[items.length - 1].link = trimmed
                .replace('ลิงก์สินค้า:', '')
                .replace('เธฅเธดเธเธเนเธชเธดเธเธเนเธฒ:', '')
                .trim();
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

export default async function PurchaseRequestPrintPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const requestId = Number(params.id);
    if (!Number.isFinite(requestId)) notFound();

    const session = await auth();
    if (!session?.user?.id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Unauthorized</h3>
            </div>
        );
    }

    const role = String(session.user.role || '').toLowerCase();
    const currentUserId = Number(session.user.id) || 0;
    const isApprover = Boolean(session.user.is_approver);

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
            },
        }),
        prisma.tbl_system_settings.findMany(),
    ]);

    if (!request || request.request_type !== 'purchase') {
        notFound();
    }

    const ownerId = request.requested_by || request.tbl_users?.p_id || 0;
    const canView = ownerId === currentUserId || isManagerRole(role) || isDepartmentRole(role, 'purchasing') || isApprover;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <Lock className="w-12 h-12 mb-4 text-gray-400" />
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

    return (
        <div className="bg-white min-h-screen p-8 print:p-0 text-black">
            <div className="max-w-[210mm] mx-auto print:max-w-none">
                <div className="mb-6 print:hidden flex justify-end gap-3">
                    {request.status === 'pending' && (
                        <Link
                            href={`/purchase-request?edit=${request.request_id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-amber-700 hover:bg-amber-50"
                        >
                            <Pencil className="w-4 h-4" />
                            แก้ไขเอกสาร
                        </Link>
                    )}
                    <PrintButton />
                </div>

                <div className="border-b pb-4 mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Purchase Request</h1>
                        <div className="text-sm">
                            <p className="font-bold">{companyInfo.company_name || 'Company Name Co., Ltd.'}</p>
                            <p>{companyInfo.company_address || '123 Business Rd, Bangkok 10110'}</p>
                            <p>Tax ID: {companyInfo.company_tax_id || '-'}</p>
                            <p>Tel: {companyInfo.company_phone || '-'} Email: {companyInfo.company_email || '-'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="mb-2">
                            <span className="text-sm text-gray-500 block">Document Number</span>
                            <span className="text-xl font-bold">{request.request_number}</span>
                        </div>
                        <div className="mb-2">
                            <span className="text-sm text-gray-500 block">Date</span>
                            <span>{request.request_date ? new Date(request.request_date).toLocaleDateString('th-TH') : '-'}</span>
                        </div>
                        <div>
                            <span className="text-sm text-gray-500 block">Status</span>
                            <span className="uppercase font-semibold">{request.status}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-sm">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Requester</h3>
                        <div className="font-bold text-lg">{request.tbl_users?.username || '-'}</div>
                    </div>
                    <div className="p-4 border rounded-sm">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Reference Job</h3>
                        <div className="font-bold text-lg">{request.reference_job || '-'}</div>
                    </div>
                    <div className="p-4 border rounded-sm">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Subject</h3>
                        <div className="font-bold text-lg">{parsed.subject}</div>
                    </div>
                    <div className="p-4 border rounded-sm">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Priority</h3>
                        <div className="font-bold text-lg">{parsed.priority}</div>
                    </div>
                </div>

                <table className="w-full text-sm mb-8">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2 text-left w-12">#</th>
                            <th className="py-2 text-left">Description</th>
                            <th className="py-2 text-left w-56">Product Link</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {parsed.items.length > 0 ? (
                            parsed.items.map((item, index) => (
                                <tr key={`${request.request_id}-${index}`}>
                                    <td className="py-3 text-gray-500">{index + 1}</td>
                                    <td className="py-3 whitespace-pre-wrap">{item.line}</td>
                                    <td className="py-3 break-all">
                                        {item.link ? (
                                            <a href={item.link} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                                                {item.link}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="py-3 whitespace-pre-wrap">{parsed.raw || '-'}</td>
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

                <div className="mb-8 border p-4 bg-gray-50 print:bg-transparent">
                    <h4 className="font-bold text-sm mb-1">Notes:</h4>
                    <p className="text-sm whitespace-pre-wrap">{parsed.note || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-20 page-break-inside-avoid">
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2"></div>
                        <p className="font-bold">{request.tbl_users?.username || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Prepared By</p>
                        <p className="text-xs mt-1">Date: ____/____/____</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-3/4 mx-auto mb-2 opacity-50"></div>
                        <p className="font-bold">{request.tbl_approver?.username || '________________'}</p>
                        <p className="text-xs uppercase text-gray-500">Approved By</p>
                        <p className="text-xs mt-1">Date: ____/____/____</p>
                    </div>
                </div>

                <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                    <p>Generated by Stock Movement System on {new Date().toLocaleDateString('th-TH')}</p>
                </div>
            </div>
        </div>
    );
}
