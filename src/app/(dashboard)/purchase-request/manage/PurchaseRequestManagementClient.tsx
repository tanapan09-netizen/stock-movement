'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    CheckCircle2,
    CircleSlash,
    ClipboardList,
    ExternalLink,
    FilePenLine,
    FileCheck2,
    Filter,
    Loader2,
    Printer,
    Search,
    ShoppingCart,
} from 'lucide-react';

import { updateApprovalStatus } from '@/actions/approvalActions';
import { ApprovalRequest } from '../../approvals/types';
import { updatePurchaseRequest } from '@/actions/approvalActions';
import {
    getProcurementStatusBadgeClass,
    getProcurementStatusLabel,
    getProcurementStatusOrder,
    PURCHASE_REQUEST_STATUS_FILTER_OPTIONS,
} from '@/lib/procurement-status';

interface Props {
    initialRequests: ApprovalRequest[];
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function formatCurrency(value: unknown) {
    const amount = Number(value || 0);
    return amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getSummaryLine(reason?: string | null) {
    return reason?.split('\n').find((line) => line.trim()) || '-';
}

export default function PurchaseRequestManagementClient({ initialRequests }: Props) {
    const router = useRouter();
    const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [search, setSearch] = useState('');
    const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
    const [editingRequest, setEditingRequest] = useState<ApprovalRequest | null>(null);
    const [editRequestDate, setEditRequestDate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editReferenceJob, setEditReferenceJob] = useState('');
    const [editReason, setEditReason] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isPending, startTransition] = useTransition();

    const summary = useMemo(() => {
        const pending = requests.filter((request) => request.status === 'pending').length;
        const approved = requests.filter((request) => request.status === 'approved').length;
        const rejected = requests.filter((request) => request.status === 'rejected').length;
        const totalAmount = requests.reduce((sum, request) => sum + Number(request.amount || 0), 0);

        return { pending, approved, rejected, totalAmount };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return [...requests]
            .filter((request) => {
                if (statusFilter !== 'all' && request.status !== statusFilter) {
                    return false;
                }

                if (!keyword) {
                    return true;
                }

                const haystack = [
                    request.request_number,
                    request.tbl_users?.username,
                    request.reference_job,
                    request.reason,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(keyword);
            })
            .sort((a, b) => {
                const statusCompare = getProcurementStatusOrder(a.status) - getProcurementStatusOrder(b.status);
                if (statusCompare !== 0) {
                    return statusCompare;
                }

                return new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime();
            });
    }, [requests, search, statusFilter]);

    const applyUpdatedRequest = (updated: ApprovalRequest) => {
        setRequests((prev) => prev.map((request) => (
            request.request_id === updated.request_id ? { ...request, ...updated } : request
        )));
    };

    const openEditDialog = (request: ApprovalRequest) => {
        const parsedDate = request.request_date
            ? new Date(request.request_date).toISOString().slice(0, 10)
            : (request.created_at ? new Date(request.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

        setEditingRequest(request);
        setEditRequestDate(parsedDate);
        setEditAmount(String(Number(request.amount || 0)));
        setEditReferenceJob(request.reference_job || '');
        setEditReason(request.reason || '');
    };

    const closeEditDialog = () => {
        if (isSavingEdit) return;
        setEditingRequest(null);
        setEditRequestDate('');
        setEditAmount('');
        setEditReferenceJob('');
        setEditReason('');
    };

    const handleSaveEdit = async () => {
        if (!editingRequest) return;

        const amountNumber = Number(editAmount);
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            toast.error('จำนวนเงินต้องมากกว่า 0');
            return;
        }

        if (!editReason.trim()) {
            toast.error('กรุณากรอกรายละเอียดคำขอซื้อ');
            return;
        }

        setIsSavingEdit(true);
        try {
            const result = await updatePurchaseRequest({
                requestId: editingRequest.request_id,
                request_date: editRequestDate,
                amount: amountNumber,
                reason: editReason.trim(),
                reference_job: editReferenceJob.trim() || null,
            });

            if (result.success && result.data) {
                applyUpdatedRequest(result.data as ApprovalRequest);
                toast.success('แก้ไขคำขอซื้อเรียบร้อยแล้ว');
                closeEditDialog();
                router.refresh();
                return;
            }

            toast.error(result.error || 'ไม่สามารถแก้ไขคำขอซื้อได้');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleApprove = (requestId: number) => {
        setPendingRequestId(requestId);
        startTransition(async () => {
            const result = await updateApprovalStatus(requestId, 'approved');

            if (result.success && result.data) {
                applyUpdatedRequest(result.data as ApprovalRequest);
                toast.success('อนุมัติคำขอซื้อแล้ว');
                router.refresh();
            } else {
                toast.error(result.error || 'ไม่สามารถอนุมัติคำขอซื้อได้');
            }

            setPendingRequestId(null);
        });
    };

    const handleReject = (requestId: number) => {
        const promptValue = window.prompt('ระบุเหตุผลที่ไม่อนุมัติ', '');
        if (promptValue === null) {
            return;
        }

        setPendingRequestId(requestId);
        startTransition(async () => {
            const result = await updateApprovalStatus(requestId, 'rejected', promptValue.trim() || undefined);

            if (result.success && result.data) {
                applyUpdatedRequest(result.data as ApprovalRequest);
                toast.success('อัปเดตคำขอซื้อเป็นไม่อนุมัติแล้ว');
                router.refresh();
            } else {
                toast.error(result.error || 'ไม่สามารถอัปเดตสถานะคำขอซื้อได้');
            }

            setPendingRequestId(null);
        });
    };

    return (
        <div className="mx-auto max-w-[1500px] space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <ShoppingCart className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">จัดการระบบคำขอซื้อ</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                สำหรับฝ่ายจัดซื้อ ใช้ตรวจสอบคำขอซื้อทั้งหมด ติดตามสถานะ และอนุมัติหรือไม่อนุมัติจากหน้าเดียว
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/approvals/purchasing"
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                            <FileCheck2 className="h-4 w-4" />
                            หน้าอนุมัติจัดซื้อ
                        </Link>
                        <Link
                            href="/purchase-orders"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                            <ExternalLink className="h-4 w-4" />
                            ไปที่ใบสั่งซื้อ
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">รอดำเนินการ</div>
                    <div className="mt-2 text-3xl font-bold text-amber-600">{summary.pending}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">อนุมัติแล้ว</div>
                    <div className="mt-2 text-3xl font-bold text-emerald-600">{summary.approved}</div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">ไม่อนุมัติ</div>
                    <div className="mt-2 text-3xl font-bold text-rose-600">{summary.rejected}</div>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">มูลค่ารวมทั้งหมด</div>
                    <div className="mt-2 text-3xl font-bold text-sky-700">฿{formatCurrency(summary.totalAmount)}</div>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">รายการคำขอซื้อทั้งหมด</h2>
                            <p className="text-sm text-slate-500">{filteredRequests.length} รายการที่แสดงอยู่</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="relative min-w-[260px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="ค้นหาเลขที่คำขอ, ผู้ขอ, งานอ้างอิง"
                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                                className="min-w-[180px] rounded-xl border border-slate-200 py-2.5 pl-10 pr-8 text-sm text-slate-700 outline-none transition focus:border-emerald-400"
                            >
                                {PURCHASE_REQUEST_STATUS_FILTER_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3">คำขอซื้อ</th>
                                <th className="px-5 py-3">ผู้ขอ</th>
                                <th className="px-5 py-3">งานอ้างอิง</th>
                                <th className="px-5 py-3 text-right">ยอดรวม</th>
                                <th className="px-5 py-3">สถานะ</th>
                                <th className="px-5 py-3">วันที่สร้าง</th>
                                <th className="px-5 py-3 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                                        ไม่พบคำขอซื้อที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request) => {
                                    const isMutating = isPending && pendingRequestId === request.request_id;

                                    return (
                                        <tr key={request.request_id} className="align-top hover:bg-slate-50/70">
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-slate-900">{request.request_number}</div>
                                                    <div className="max-w-[420px] text-xs leading-6 text-slate-500">
                                                        {getSummaryLine(request.reason)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-700">{request.tbl_users?.username || '-'}</td>
                                            <td className="px-5 py-4 text-slate-600">{request.reference_job || '-'}</td>
                                            <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                                                ฿{formatCurrency(request.amount)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getProcurementStatusBadgeClass(request.status)}`}>
                                                    {getProcurementStatusLabel(request.status)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500">
                                                {request.created_at ? new Date(request.created_at).toLocaleDateString('th-TH') : '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Link
                                                        href={`/print/purchase-request/${request.request_id}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                        พิมพ์
                                                    </Link>

                                                    {request.status === 'pending' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditDialog(request)}
                                                                disabled={isMutating}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <FilePenLine className="h-4 w-4" />
                                                                แก้ไข
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApprove(request.request_id)}
                                                                disabled={isMutating}
                                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                อนุมัติ
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReject(request.request_id)}
                                                                disabled={isMutating}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <CircleSlash className="h-4 w-4" />
                                                                ไม่อนุมัติ
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">แก้ไขคำขอซื้อ</h3>
                            <p className="mt-1 text-sm text-slate-500">{editingRequest.request_number}</p>
                        </div>

                        <div className="space-y-4 px-5 py-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">วันที่ขอ</label>
                                    <input
                                        type="date"
                                        value={editRequestDate}
                                        onChange={(event) => setEditRequestDate(event.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงินรวม</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={editAmount}
                                        onChange={(event) => setEditAmount(event.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">อ้างอิงงาน</label>
                                <input
                                    type="text"
                                    value={editReferenceJob}
                                    onChange={(event) => setEditReferenceJob(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                                    placeholder="เลขที่งานอ้างอิง (ถ้ามี)"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดคำขอซื้อ</label>
                                <textarea
                                    value={editReason}
                                    onChange={(event) => setEditReason(event.target.value)}
                                    rows={10}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                onClick={closeEditDialog}
                                disabled={isSavingEdit}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                บันทึกการแก้ไข
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
