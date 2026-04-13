'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FloatingSearchInput } from '@/components/FloatingField';
import { CheckCircle2, CircleSlash, ClipboardList, ExternalLink, FileCheck2, FilePenLine, FileText, Filter, Loader2, Printer, Search, ShoppingCart, X } from 'lucide-react';

import { updateApprovalStatus, updatePurchaseRequest } from '@/actions/approvalActions';
import { isDepartmentRole } from '@/lib/roles';
import { PURCHASE_REQUEST_WORKFLOW_LABELS, getPurchaseRequestDisplayStep, getPurchaseRequestStageLabel, isPurchaseRequestPurchasingStep } from '@/lib/purchase-request-workflow';
import { getProcurementStatusBadgeClass, getProcurementStatusLabel, getProcurementStatusOrder, PURCHASE_REQUEST_STATUS_FILTER_OPTIONS } from '@/lib/procurement-status';
import { ApprovalRequest } from '../../approvals/types';

interface Props {
    initialRequests: ApprovalRequest[];
    currentRole: string | null;
}

type StatusFilter = 'all' | 'pending' | 'returned' | 'approved' | 'rejected';
type ViewMode = 'all' | 'my_queue';
type PurchaseOrderFilter = 'all' | 'has_po' | 'received_po';

function formatCurrency(value: unknown) {
    return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getSummaryLine(reason?: string | null) {
    return reason?.split('\n').find((line) => line.trim()) || '-';
}

function getQueueLabelByRole(role?: string | null) {
    if (isDepartmentRole(role, 'purchasing')) return 'คิวจัดซื้อ';
    if (isDepartmentRole(role, 'accounting')) return 'คิวบัญชี';
    if (isDepartmentRole(role, 'store')) return 'คิว Store';
    if (isDepartmentRole(role, 'technician')) return 'คิวช่าง';
    if (isDepartmentRole(role, 'operation')) return 'คิวปฏิบัติการ';
    if ((role || '').trim().toLowerCase() === 'manager') return 'คิวผู้จัดการ';
    return 'คิวของฉัน';
}

function getPrimaryNavigation(role?: string | null) {
    if (isDepartmentRole(role, 'purchasing')) {
        return { href: '/purchasing-dashboard', label: 'กลับไปหน้า Purchasing Dashboard' };
    }

    if (isDepartmentRole(role, 'accounting')) {
        return { href: '/accounting-dashboard', label: 'กลับไปหน้า Accounting Dashboard' };
    }

    if (isDepartmentRole(role, 'store')) {
        return { href: '/store-dashboard', label: 'กลับไปหน้า Store Dashboard' };
    }

    if ((role || '').trim().toLowerCase() === 'manager') {
        return { href: '/manager-dashboard', label: 'กลับไปหน้า Manager Dashboard' };
    }

    return null;
}

function hasIssuedPurchaseOrder(request: ApprovalRequest) {
    return Boolean(request.linked_purchase_orders?.length);
}

function getStructuredApproveActionLabel(request: ApprovalRequest) {
    switch (request.current_step) {
        case 1: return 'ส่งผู้จัดการ';
        case 2: return 'ส่งบัญชี';
        case 3: return 'ส่งจัดซื้อออก PO';
        case 4: return 'ส่ง Store รับเข้า';
        case 5: return 'รับเข้าคลัง';
        default: return 'อนุมัติ';
    }
}

function getStructuredReturnActionLabel(request: ApprovalRequest) {
    switch (request.current_step) {
        case 1: return 'ตีกลับผู้ขอ';
        case 2: return 'ส่งกลับจัดซื้อ';
        case 3: return 'ส่งกลับจัดซื้อ';
        case 4: return 'ส่งกลับบัญชี';
        case 5: return 'ส่งกลับจัดซื้อออก PO';
        default: return 'ตีกลับแก้ไข';
    }
}

function getStructuredStageDescription(request: ApprovalRequest) {
    if (request.status === 'approved') return 'Workflow เสร็จสมบูรณ์';
    if (request.status === 'returned') return 'ตีกลับให้ผู้ขอแก้ไขและส่งเข้า workflow ใหม่';
    if (request.status === 'rejected') return `สิ้นสุดที่ขั้น ${getPurchaseRequestStageLabel(request.status, request.current_step)}`;

    switch (request.current_step) {
        case 1: return 'รอจัดซื้อทบทวนรายการและความจำเป็น';
        case 2: return 'รอผู้จัดการอนุมัติงบและแนวทางจัดซื้อ';
        case 3: return 'รอบัญชีตรวจสอบงบ เอกสาร และเงื่อนไขจ่าย';
        case 4: return 'รอจัดซื้อออกใบสั่งซื้อและยืนยันผู้ขาย';
        case 5: return 'รอ Store รับเข้าและปิดงานรับของ';
        default: return '-';
    }
}

function getPurchaseOrderDraftHref(request: ApprovalRequest) {
    const params = new URLSearchParams({
        request_id: String(request.request_id),
        request_number: request.request_number,
    });

    if (request.reference_job) {
        params.set('reference_job', request.reference_job);
    }

    if (request.amount !== null && request.amount !== undefined) {
        params.set('amount', String(Number(request.amount)));
    }

    const summary = getSummaryLine(request.reason);
    if (summary && summary !== '-') {
        params.set('reason', summary);
    }

    return `/purchase-orders/new?${params.toString()}`;
}

function getPurchaseWorkflowStageHeading(request: ApprovalRequest) {
    if (request.current_step === 5 && hasReceivedPurchaseOrder(request)) {
        return 'Store รับเข้า (PO รับเข้าแล้ว)';
    }

    if (request.current_step === 4 && hasIssuedPurchaseOrder(request)) {
        return 'จัดซื้อออก PO (มี PO แล้ว)';
    }

    return getPurchaseRequestStageLabel(request.status, request.current_step);
}

function getPurchaseWorkflowStageDescription(request: ApprovalRequest) {
    if (request.current_step === 5 && hasReceivedPurchaseOrder(request) && request.status === 'pending') {
        return 'PO รับเข้าแล้ว รอ Store ยืนยันและปิดงานรับเข้าใน workflow';
    }

    if (request.current_step === 4 && hasIssuedPurchaseOrder(request) && request.status === 'pending') {
        return 'มี PO แล้ว รอจัดซื้อส่งต่อให้ Store รับเข้า';
    }

    return getStructuredStageDescription(request);
}

function getPrimaryPurchaseOrder(request: ApprovalRequest) {
    return request.linked_purchase_orders?.[0] ?? null;
}

function hasReceivedPurchaseOrder(request: ApprovalRequest) {
    return request.linked_purchase_orders?.some((purchaseOrder) => purchaseOrder.status === 'received') ?? false;
}

function getPurchaseOrderProgressLabel(request: ApprovalRequest) {
    if (hasReceivedPurchaseOrder(request)) return 'PO รับเข้าแล้ว';
    if (hasIssuedPurchaseOrder(request)) return 'ออก PO แล้ว';
    return null;
}

function getPurchaseOrderProgressClass(request: ApprovalRequest) {
    if (hasReceivedPurchaseOrder(request)) return getProcurementStatusBadgeClass('received');
    return getProcurementStatusBadgeClass('ordered');
}

function formatDisplayDateTime(value: string | Date | null | undefined) {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStepLogActionLabel(action?: string | null) {
    switch (action) {
        case 'approved':
            return 'อนุมัติ / ส่งต่อ';
        case 'returned':
            return 'ตีกลับแก้ไข';
        case 'rejected':
            return 'ไม่อนุมัติ';
        default:
            return action || '-';
    }
}

function getStepLogActionClass(action?: string | null) {
    switch (action) {
        case 'approved':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        case 'returned':
            return 'border-orange-200 bg-orange-50 text-orange-700';
        case 'rejected':
            return 'border-rose-200 bg-rose-50 text-rose-700';
        default:
            return 'border-slate-200 bg-slate-50 text-slate-600';
    }
}

export default function PurchaseRequestManagementClient({ initialRequests, currentRole }: Props) {
    const router = useRouter();
    const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [purchaseOrderFilter, setPurchaseOrderFilter] = useState<PurchaseOrderFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>(() => (
        isDepartmentRole(currentRole, 'purchasing') ? 'all' : 'my_queue'
    ));
    const [search, setSearch] = useState('');
    const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
    const [editingRequest, setEditingRequest] = useState<ApprovalRequest | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [editRequestDate, setEditRequestDate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editReferenceJob, setEditReferenceJob] = useState('');
    const [editReason, setEditReason] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isPending, startTransition] = useTransition();
    const canEditManagedRequests = isDepartmentRole(currentRole, 'purchasing');
    const queueLabel = getQueueLabelByRole(currentRole);
    const primaryNavigation = getPrimaryNavigation(currentRole);

    const summary = useMemo(() => {
        const pending = requests.filter((request) => request.status === 'pending').length;
        const actionable = requests.filter((request) => request.status === 'pending' && request.can_approve).length;
        const hasPurchaseOrder = requests.filter((request) => hasIssuedPurchaseOrder(request)).length;
        const receivedPurchaseOrder = requests.filter((request) => hasReceivedPurchaseOrder(request)).length;
        const returned = requests.filter((request) => request.status === 'returned').length;
        const approved = requests.filter((request) => request.status === 'approved').length;
        const rejected = requests.filter((request) => request.status === 'rejected').length;
        return { pending, actionable, hasPurchaseOrder, receivedPurchaseOrder, returned, approved, rejected };
    }, [requests]);

    const resetFilters = () => {
        setStatusFilter('all');
        setPurchaseOrderFilter('all');
        setSearch('');
        setViewMode(isDepartmentRole(currentRole, 'purchasing') ? 'all' : 'my_queue');
    };

    const applySummaryFilter = (filter: 'pending' | 'actionable' | 'approved' | 'returned' | 'rejected' | 'has_po' | 'received_po') => {
        if (isSummaryFilterActive(filter)) {
            resetFilters();
            return;
        }

        switch (filter) {
            case 'pending':
                setStatusFilter('pending');
                setPurchaseOrderFilter('all');
                return;
            case 'actionable':
                setStatusFilter('pending');
                setPurchaseOrderFilter('all');
                setViewMode('my_queue');
                return;
            case 'approved':
                setStatusFilter('approved');
                setPurchaseOrderFilter('all');
                return;
            case 'returned':
                setStatusFilter('returned');
                setPurchaseOrderFilter('all');
                return;
            case 'rejected':
                setStatusFilter('rejected');
                setPurchaseOrderFilter('all');
                return;
            case 'has_po':
                setStatusFilter('all');
                setPurchaseOrderFilter('has_po');
                return;
            case 'received_po':
                setStatusFilter('all');
                setPurchaseOrderFilter('received_po');
                return;
            default:
                return;
        }
    };

    const isSummaryFilterActive = (filter: 'pending' | 'actionable' | 'approved' | 'returned' | 'rejected' | 'has_po' | 'received_po') => {
        switch (filter) {
            case 'pending':
                return statusFilter === 'pending' && purchaseOrderFilter === 'all';
            case 'actionable':
                return viewMode === 'my_queue' && statusFilter === 'pending' && purchaseOrderFilter === 'all';
            case 'approved':
                return statusFilter === 'approved' && purchaseOrderFilter === 'all';
            case 'returned':
                return statusFilter === 'returned' && purchaseOrderFilter === 'all';
            case 'rejected':
                return statusFilter === 'rejected' && purchaseOrderFilter === 'all';
            case 'has_po':
                return purchaseOrderFilter === 'has_po' && statusFilter === 'all';
            case 'received_po':
                return purchaseOrderFilter === 'received_po' && statusFilter === 'all';
            default:
                return false;
        }
    };

    const hasActiveFilters = statusFilter !== 'all'
        || purchaseOrderFilter !== 'all'
        || search.trim().length > 0
        || viewMode !== (isDepartmentRole(currentRole, 'purchasing') ? 'all' : 'my_queue');

    const filteredRequests = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return [...requests]
            .filter((request) => {
                if (viewMode === 'my_queue' && !(request.status === 'pending' && request.can_approve)) return false;
                if (statusFilter !== 'all' && request.status !== statusFilter) return false;
                if (purchaseOrderFilter === 'has_po' && !hasIssuedPurchaseOrder(request)) return false;
                if (purchaseOrderFilter === 'received_po' && !hasReceivedPurchaseOrder(request)) return false;
                if (!keyword) return true;
                const haystack = [
                    request.request_number,
                    request.tbl_users?.username,
                    request.reference_job,
                    request.reason,
                    ...(request.linked_purchase_orders?.map((purchaseOrder) => purchaseOrder.po_number) || []),
                ].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(keyword);
            })
            .sort((a, b) => {
                const actionableCompare = Number(Boolean(b.can_approve && b.status === 'pending')) - Number(Boolean(a.can_approve && a.status === 'pending'));
                if (actionableCompare !== 0) return actionableCompare;
                const statusCompare = getProcurementStatusOrder(a.status) - getProcurementStatusOrder(b.status);
                if (statusCompare !== 0) return statusCompare;
                const workflowCompare = getPurchaseRequestDisplayStep(a.status, a.current_step) - getPurchaseRequestDisplayStep(b.status, b.current_step);
                if (workflowCompare !== 0) return workflowCompare;
                return new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime();
            });
    }, [purchaseOrderFilter, requests, search, statusFilter, viewMode]);

    const applyUpdatedRequest = (updated: ApprovalRequest) => {
        setRequests((prev) => prev.map((request) => (request.request_id === updated.request_id ? { ...request, ...updated } : request)));
    };

    const openEditDialog = (request: ApprovalRequest) => {
        const parsedDate = request.request_date ? new Date(request.request_date).toISOString().slice(0, 10) : (request.created_at ? new Date(request.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
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

    const closeDetailDialog = () => {
        setSelectedRequest(null);
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

    const handleApprove = (request: ApprovalRequest) => {
        if (request.current_step === 4 && !hasIssuedPurchaseOrder(request)) {
            toast.error('กรุณาสร้าง PO ก่อนส่งต่อให้ Store รับเข้า');
            return;
        }

        if (request.current_step === 5 && !hasReceivedPurchaseOrder(request)) {
            toast.error('กรุณารับสินค้าในเอกสาร PO ก่อนปิดงานรับเข้าคลัง');
            return;
        }

        setPendingRequestId(request.request_id);
        startTransition(async () => {
            const result = await updateApprovalStatus(request.request_id, 'approved');

            if (result.success && result.data) {
                applyUpdatedRequest({ ...(result.data as ApprovalRequest), can_approve: false });
                toast.success(request.current_step === 5 ? 'ยืนยันรับเข้าคลังแล้ว' : 'อัปเดต workflow คำขอซื้อแล้ว');
                router.refresh();
            } else {
                toast.error(result.error || 'ไม่สามารถอนุมัติคำขอซื้อได้');
            }

            setPendingRequestId(null);
        });
    };

    const handleReject = (request: ApprovalRequest) => {
        const promptValue = window.prompt('ระบุเหตุผลที่ไม่อนุมัติ', '');
        if (promptValue === null) return;

        setPendingRequestId(request.request_id);
        startTransition(async () => {
            const result = await updateApprovalStatus(request.request_id, 'rejected', promptValue.trim() || undefined);

            if (result.success && result.data) {
                applyUpdatedRequest({ ...(result.data as ApprovalRequest), can_approve: false });
                toast.success('อัปเดตคำขอซื้อเป็นไม่อนุมัติแล้ว');
                router.refresh();
            } else {
                toast.error(result.error || 'ไม่สามารถอัปเดตสถานะคำขอซื้อได้');
            }

            setPendingRequestId(null);
        });
    };

    const handleReturn = (request: ApprovalRequest) => {
        const promptValue = window.prompt('ระบุเหตุผลที่ตีกลับเพื่อให้แก้ไข', '');
        if (promptValue === null) return;

        setPendingRequestId(request.request_id);
        startTransition(async () => {
            const result = await updateApprovalStatus(request.request_id, 'returned', promptValue.trim() || undefined);

            if (result.success && result.data) {
                applyUpdatedRequest({ ...(result.data as ApprovalRequest), can_approve: false });
                toast.success(request.current_step === 1 ? 'ตีกลับให้ผู้ขอแก้ไขแล้ว' : 'ส่งกลับไปขั้นก่อนหน้าแล้ว');
                router.refresh();
            } else {
                toast.error(result.error || 'ไม่สามารถตีกลับคำขอซื้อได้');
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
                                ติดตามคำขอซื้อให้เดินตาม workflow ช่าง &gt; จัดซื้อ &gt; ผู้จัดการ &gt; บัญชี &gt; จัดซื้อออก PO &gt; Store
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                {PURCHASE_REQUEST_WORKFLOW_LABELS.map((label, index) => (
                                    <span key={`${label}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {primaryNavigation && (
                            <Link
                                href={primaryNavigation.href}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                            >
                                <FileCheck2 className="h-4 w-4" />
                                {primaryNavigation.label}
                            </Link>
                        )}
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
                <button type="button" onClick={() => applySummaryFilter('pending')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('pending') ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-200'}`}>
                    <div className="text-sm font-medium text-slate-500">รอดำเนินการ</div>
                    <div className="mt-2 text-3xl font-bold text-amber-600">{summary.pending}</div>
                </button>
                <button type="button" onClick={() => applySummaryFilter('actionable')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('actionable') ? 'border-cyan-400 ring-2 ring-cyan-200' : 'border-cyan-200'}`}>
                    <div className="text-sm font-medium text-slate-500">{queueLabel}</div>
                    <div className="mt-2 text-3xl font-bold text-cyan-700">{summary.actionable}</div>
                </button>
                <button type="button" onClick={() => applySummaryFilter('has_po')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('has_po') ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-200'}`}>
                    <div className="text-sm font-medium text-slate-500">มี PO แล้ว</div>
                    <div className="mt-2 text-3xl font-bold text-blue-600">{summary.hasPurchaseOrder}</div>
                </button>
                <button type="button" onClick={() => applySummaryFilter('received_po')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('received_po') ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-emerald-200'}`}>
                    <div className="text-sm font-medium text-slate-500">PO รับเข้าแล้ว</div>
                    <div className="mt-2 text-3xl font-bold text-emerald-700">{summary.receivedPurchaseOrder}</div>
                </button>
                <button type="button" onClick={() => applySummaryFilter('approved')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('approved') ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-emerald-200'}`}>
                    <div className="text-sm font-medium text-slate-500">อนุมัติแล้ว</div>
                    <div className="mt-2 text-3xl font-bold text-emerald-600">{summary.approved}</div>
                </button>
                <button type="button" onClick={() => applySummaryFilter('returned')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('returned') ? 'border-orange-400 ring-2 ring-orange-200' : 'border-orange-200'}`}>
                    <div className="text-sm font-medium text-slate-500">ตีกลับแก้ไข</div>
                    <div className="mt-2 text-3xl font-bold text-orange-600">{summary.returned}</div>
                </button>
                <button type="button" onClick={() => applySummaryFilter('rejected')} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSummaryFilterActive('rejected') ? 'border-rose-400 ring-2 ring-rose-200' : 'border-rose-200'}`}>
                    <div className="text-sm font-medium text-slate-500">ไม่อนุมัติ</div>
                    <div className="mt-2 text-3xl font-bold text-rose-600">{summary.rejected}</div>
                </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">รายการคำขอซื้อทั้งหมด</h2>
                            <p className="text-sm text-slate-500">
                                {viewMode === 'my_queue' ? `${queueLabel} ${filteredRequests.length} รายการ` : `${filteredRequests.length} รายการที่แสดงอยู่`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('my_queue')}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    viewMode === 'my_queue' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                คิวของฉัน
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('all')}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    viewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                ทุกคำขอซื้อ
                            </button>
                        </div>
                        <div className="min-w-[260px]">
                            <FloatingSearchInput
                                label="ค้นหาเลขที่คำขอ, ผู้ขอ, งานอ้างอิง"
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="text-slate-700 focus:border-emerald-400 focus:ring-emerald-400/20"
                                labelClassName="text-slate-500"
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
                        <div className="relative">
                            <FileCheck2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={purchaseOrderFilter}
                                onChange={(event) => setPurchaseOrderFilter(event.target.value as PurchaseOrderFilter)}
                                className="min-w-[180px] rounded-xl border border-slate-200 py-2.5 pl-10 pr-8 text-sm text-slate-700 outline-none transition focus:border-cyan-400"
                            >
                                <option value="all">ทุกสถานะ PO</option>
                                <option value="has_po">มี PO แล้ว</option>
                                <option value="received_po">PO รับเข้าแล้ว</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={resetFilters}
                            disabled={!hasActiveFilters}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                                hasActiveFilters
                                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    : 'cursor-not-allowed border-slate-100 text-slate-300'
                            }`}
                        >
                            ล้างตัวกรอง
                        </button>
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
                                <th className="px-5 py-3">Workflow</th>
                                <th className="px-5 py-3">วันที่สร้าง</th>
                                <th className="px-5 py-3 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500">
                                        ไม่พบคำขอซื้อที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request) => {
                                    const isMutating = isPending && pendingRequestId === request.request_id;
                                    const currentDisplayStep = getPurchaseRequestDisplayStep(request.status, request.current_step);
                                    const primaryPurchaseOrder = getPrimaryPurchaseOrder(request);
                                    const linkedPurchaseOrderCount = request.linked_purchase_orders?.length || 0;
                                    const canEditRequest = request.status === 'pending' && canEditManagedRequests && isPurchaseRequestPurchasingStep(request.current_step);
                                    const canIssuePurchaseOrder = canEditRequest && request.current_step === 4;
                                    const canEditPurchasingRequest = canEditRequest && request.current_step !== 4;
                                    const canApproveRequest = request.status === 'pending' && Boolean(request.can_approve);

                                    return (
                                        <tr key={request.request_id} className="align-top hover:bg-slate-50/70">
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-slate-900">{request.request_number}</div>
                                                    {linkedPurchaseOrderCount > 0 && (
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-cyan-700">
                                                            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-semibold">
                                                                มี PO แล้ว {linkedPurchaseOrderCount} ฉบับ
                                                            </span>
                                                            {getPurchaseOrderProgressLabel(request) && (
                                                                <span className={`rounded-full border px-2 py-0.5 font-semibold ${getPurchaseOrderProgressClass(request)}`}>
                                                                    {getPurchaseOrderProgressLabel(request)}
                                                                </span>
                                                            )}
                                                            {primaryPurchaseOrder && (
                                                                <Link href={`/purchase-orders/${primaryPurchaseOrder.po_id}`} className="inline-flex items-center gap-1 font-medium hover:text-cyan-800">
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                    {primaryPurchaseOrder.po_number}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="max-w-[420px] text-xs leading-6 text-slate-500">{getSummaryLine(request.reason)}</div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-700">{request.tbl_users?.username || '-'}</td>
                                            <td className="px-5 py-4 text-slate-600">{request.reference_job || '-'}</td>
                                            <td className="px-5 py-4 text-right font-semibold text-emerald-700">฿{formatCurrency(request.amount)}</td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-2">
                                                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getProcurementStatusBadgeClass(request.status)}`}>
                                                        {getProcurementStatusLabel(request.status)}
                                                    </span>
                                                    <div className="text-xs text-slate-500">{getPurchaseWorkflowStageDescription(request)}</div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-2">
                                                    <div className="text-sm font-semibold text-slate-800">{getPurchaseWorkflowStageHeading(request)}</div>
                                                    <div className="text-xs text-slate-500">ขั้นตอน {currentDisplayStep}/{PURCHASE_REQUEST_WORKFLOW_LABELS.length}</div>
                                                    <div className="flex max-w-[320px] flex-wrap gap-1">
                                                        {PURCHASE_REQUEST_WORKFLOW_LABELS.map((label, index) => {
                                                            const stepNumber = index + 1;
                                                            const isCompleted = request.status === 'approved' || stepNumber < currentDisplayStep;
                                                            const isCurrent = request.status !== 'approved' && stepNumber === currentDisplayStep;
                                                            const isIssuedPOStage = stepNumber === 5 && request.current_step === 4 && hasIssuedPurchaseOrder(request);

                                                            return (
                                                                <span
                                                                    key={`${request.request_id}-${label}-${stepNumber}`}
                                                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                                                        isIssuedPOStage
                                                                            ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                                                            : isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isCurrent ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-400'
                                                                    }`}
                                                                >
                                                                    {isIssuedPOStage ? `${label} (มี PO)` : label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500">
                                                {request.created_at ? new Date(request.created_at).toLocaleDateString('th-TH') : '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRequest(request)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        รายละเอียด
                                                    </button>
                                                    <Link
                                                        href={`/print/purchase-request/${request.request_id}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                        พิมพ์
                                                    </Link>

                                                    {canIssuePurchaseOrder && (
                                                        <Link
                                                            href={getPurchaseOrderDraftHref(request)}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100"
                                                        >
                                                            <FileCheck2 className="h-4 w-4" />
                                                            {linkedPurchaseOrderCount > 0 ? 'สร้าง PO เพิ่ม' : 'ออก PO'}
                                                        </Link>
                                                    )}

                                                    {primaryPurchaseOrder && (
                                                        <Link
                                                            href={`/purchase-orders/${primaryPurchaseOrder.po_id}`}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 px-3 py-2 text-xs font-medium text-sky-700 transition hover:bg-sky-50"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                            ดู PO
                                                        </Link>
                                                    )}

                                                    {canEditPurchasingRequest && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditDialog(request)}
                                                            disabled={isMutating}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <FilePenLine className="h-4 w-4" />
                                                            แก้ไข
                                                        </button>
                                                    )}

                                                    {canApproveRequest && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApprove(request)}
                                                                disabled={isMutating}
                                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                {getStructuredApproveActionLabel(request)}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReturn(request)}
                                                                disabled={isMutating}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-xs font-medium text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <CircleSlash className="h-4 w-4" />
                                                                {getStructuredReturnActionLabel(request)}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReject(request)}
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

            {selectedRequest && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDetailDialog();
                        }
                    }}
                >
                    <div className="my-8 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">รายละเอียดและประวัติคำขอซื้อ</h3>
                                        <p className="mt-1 text-sm text-slate-500">{selectedRequest.request_number}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetailDialog}
                                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">ผู้ขอ</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedRequest.tbl_users?.username || '-'}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">สถานะ</div>
                                    <div className="mt-2">
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getProcurementStatusBadgeClass(selectedRequest.status)}`}>
                                            {getProcurementStatusLabel(selectedRequest.status)}
                                        </span>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">ขั้นตอนปัจจุบัน</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">{getPurchaseWorkflowStageHeading(selectedRequest)}</div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        ขั้นตอน {getPurchaseRequestDisplayStep(selectedRequest.status, selectedRequest.current_step)}/{PURCHASE_REQUEST_WORKFLOW_LABELS.length}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">ยอดรวม</div>
                                    <div className="mt-2 text-sm font-semibold text-emerald-700">฿{formatCurrency(selectedRequest.amount)}</div>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">Workflow ปัจจุบัน</h4>
                                        <p className="mt-1 text-sm text-slate-500">{getPurchaseWorkflowStageDescription(selectedRequest)}</p>
                                    </div>
                                    <Link
                                        href={`/print/purchase-request/${selectedRequest.request_id}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <Printer className="h-4 w-4" />
                                        เปิดเอกสาร PR
                                    </Link>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {PURCHASE_REQUEST_WORKFLOW_LABELS.map((label, index) => {
                                        const stepNumber = index + 1;
                                        const currentDisplayStep = getPurchaseRequestDisplayStep(selectedRequest.status, selectedRequest.current_step);
                                        const isCompleted = selectedRequest.status === 'approved' || stepNumber < currentDisplayStep;
                                        const isCurrent = selectedRequest.status !== 'approved' && stepNumber === currentDisplayStep;
                                        const isIssuedPOStage = stepNumber === 5 && selectedRequest.current_step === 4 && hasIssuedPurchaseOrder(selectedRequest);

                                        return (
                                            <span
                                                key={`${selectedRequest.request_id}-detail-${label}-${stepNumber}`}
                                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                                    isIssuedPOStage
                                                        ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                                        : isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isCurrent ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-400'
                                                }`}
                                            >
                                                {isIssuedPOStage ? `${label} (มี PO)` : label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                        <h4 className="text-sm font-semibold text-slate-900">รายละเอียดคำขอซื้อ</h4>
                                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">เลขงานอ้างอิง</div>
                                                <div className="mt-1 text-sm text-slate-800">{selectedRequest.reference_job || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">วันที่สร้าง</div>
                                                <div className="mt-1 text-sm text-slate-800">{formatDisplayDateTime(selectedRequest.created_at)}</div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">เหตุผล / รายละเอียด</div>
                                            <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                                {selectedRequest.reason || '-'}
                                            </div>
                                        </div>
                                        {selectedRequest.rejection_reason && (
                                            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                                                <div className="font-semibold">
                                                    {selectedRequest.status === 'returned' ? 'เหตุผลที่ตีกลับ' : 'เหตุผลที่ไม่อนุมัติ'}
                                                </div>
                                                <div className="mt-1 whitespace-pre-wrap">{selectedRequest.rejection_reason}</div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedRequest.linked_purchase_orders && selectedRequest.linked_purchase_orders.length > 0 && (
                                        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5">
                                            <h4 className="text-sm font-semibold text-slate-900">Purchase Orders ที่เชื่อมกับ PR นี้</h4>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {selectedRequest.linked_purchase_orders.map((purchaseOrder) => (
                                                    <Link
                                                        key={purchaseOrder.po_id}
                                                        href={`/purchase-orders/${purchaseOrder.po_id}`}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                        {purchaseOrder.po_number}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h4 className="text-sm font-semibold text-slate-900">ประวัติการดำเนินการ</h4>
                                    <div className="mt-4 space-y-4">
                                        {selectedRequest.step_logs && selectedRequest.step_logs.length > 0 ? (
                                            selectedRequest.step_logs.map((log) => (
                                                <div key={log.id} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            ขั้น {log.step_order}: {PURCHASE_REQUEST_WORKFLOW_LABELS[Math.max(log.step_order - 1, 0)] || `Step ${log.step_order}`}
                                                        </div>
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStepLogActionClass(log.action)}`}>
                                                            {getStepLogActionLabel(log.action)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-xs text-slate-500">
                                                        โดย {log.actor?.username || '-'} • {formatDisplayDateTime(log.acted_at)}
                                                    </div>
                                                    {log.comment && (
                                                        <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-slate-700">
                                                            {log.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                                ยังไม่มีประวัติการอนุมัติในคำขอนี้
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                    <input type="date" value={editRequestDate} onChange={(event) => setEditRequestDate(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">จำนวนเงินรวม</label>
                                    <input type="number" min="0.01" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400" placeholder="0.00" />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">อ้างอิงงาน</label>
                                <input type="text" value={editReferenceJob} onChange={(event) => setEditReferenceJob(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400" placeholder="เลขที่งานอ้างอิง (ถ้ามี)" />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดคำขอซื้อ</label>
                                <textarea value={editReason} onChange={(event) => setEditReason(event.target.value)} rows={10} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <button type="button" onClick={closeEditDialog} disabled={isSavingEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                                ยกเลิก
                            </button>
                            <button type="button" onClick={handleSaveEdit} disabled={isSavingEdit} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
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
