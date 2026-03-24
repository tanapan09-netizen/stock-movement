'use client';

import React, { useMemo, useState } from 'react';
import {
    FileDown, FileText, Plus, Search, CheckCircle2, XCircle,
    Clock, ChevronLeft, ChevronRight, SlidersHorizontal,
    Banknote, CalendarDays, User, Briefcase, Tag, ExternalLink,
    X, Check, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { createApprovalRequest, updateApprovalStatus } from '@/actions/approvalActions';
import ApprovalDetailModal from './components/ApprovalDetailModal';
import CreateApprovalModal from './components/CreateApprovalModal';
import RejectApprovalModal from './components/RejectApprovalModal';
import { ActiveJob, ApprovalFormData, ApprovalRequest } from './types';

interface ApprovalClientProps {
    initialRequests: ApprovalRequest[];
    activeJobs: ActiveJob[];
    canApprove: boolean;
    currentUserId: number;
    variant?: 'manage' | 'report';
    allowCreate?: boolean;
    initialRequestType?: string;
    lockedRequestType?: string | null;
    defaultCreateRequestType?: string;
    title?: string;
    subtitle?: string;
}

const PAGE_SIZE = 12;

const REQUEST_TYPE_OPTIONS = [
    { value: 'all', label: 'ทุกประเภท', color: 'bg-slate-100 text-slate-600' },
    { value: 'ot', label: 'OT', color: 'bg-violet-100 text-violet-700' },
    { value: 'leave', label: 'ลา', color: 'bg-sky-100 text-sky-700' },
    { value: 'expense', label: 'Expense', color: 'bg-amber-100 text-amber-700' },
    { value: 'purchase', label: 'Purchase', color: 'bg-orange-100 text-orange-700' },
    { value: 'other', label: 'อื่นๆ', color: 'bg-slate-100 text-slate-600' },
];

const STATUS_CONFIG = {
    pending:  { label: 'รอพิจารณา', icon: Clock,         classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
    approved: { label: 'อนุมัติแล้ว', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
    rejected: { label: 'ไม่อนุมัติ',  icon: XCircle,      classes: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
};

const TYPE_BADGE: Record<string, string> = {
    ot:       'bg-violet-100 text-violet-700',
    leave:    'bg-sky-100 text-sky-700',
    expense:  'bg-amber-100 text-amber-700',
    purchase: 'bg-orange-100 text-orange-700',
    other:    'bg-slate-100 text-slate-600',
};

const TYPE_LABEL: Record<string, string> = {
    ot: 'OT', leave: 'ลา', expense: 'Expense', purchase: 'Purchase', other: 'อื่นๆ',
};

const defaultFormData = (requestType = 'ot'): ApprovalFormData => ({
    request_type: requestType,
    request_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    amount: '',
    reason: '',
    reference_job: ''
});

// ── Card ─────────────────────────────────────────────────────────────────────

function ApprovalCard({
    request, canApprove: globalCanApprove, selected, processing,
    onToggle, onApprove, onReject, onDetail
}: {
    request: ApprovalRequest;
    canApprove: boolean;
    selected: boolean;
    processing: boolean;
    onToggle: () => void;
    onApprove: () => void;
    onReject: () => void;
    onDetail: () => void;
}) {
    const status = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
    const StatusIcon = status.icon;
    const canApprove = request.can_approve ?? globalCanApprove;
    const typeBadge = TYPE_BADGE[request.request_type] ?? 'bg-slate-100 text-slate-600';
    const typeLabel = TYPE_LABEL[request.request_type] ?? request.request_type;

    const dateStr = request.created_at
        ? new Date(request.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
        : '—';

    const isPending = request.status === 'pending';

    return (
        <div
            className={[
                'group relative flex flex-col rounded-2xl border bg-white transition-all duration-200 overflow-hidden cursor-pointer',
                'hover:shadow-lg hover:-translate-y-0.5',
                selected ? 'ring-2 ring-indigo-500 border-indigo-200 shadow-md' : 'border-slate-200',
                processing ? 'opacity-60 pointer-events-none' : ''
            ].join(' ')}
            onClick={onDetail}
        >
            {/* Top accent bar by type */}
            <div className={`h-1 w-full ${
                request.request_type === 'ot' ? 'bg-violet-400' :
                request.request_type === 'leave' ? 'bg-sky-400' :
                request.request_type === 'expense' ? 'bg-amber-400' :
                request.request_type === 'purchase' ? 'bg-orange-400' : 'bg-slate-300'
            }`} />

            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeBadge}`}>
                            <Tag size={10} />
                            {typeLabel}
                        </span>
                        <span className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                            {request.request_number || '—'}
                        </span>
                    </div>

                    {/* Select checkbox removed as per requirement to disable approvals on this page */}
                </div>

                {/* Reason */}
                <p className="text-sm text-slate-700 font-medium leading-snug line-clamp-2 flex-1">
                    {request.reason || <span className="text-slate-400 italic">ไม่ระบุเหตุผล</span>}
                </p>

                {/* Meta row */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <User size={11} />
                        {request.tbl_users?.username || '—'}
                    </span>
                    <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {dateStr}
                    </span>
                    {request.amount != null && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Banknote size={11} />
                            ฿{Number(request.amount).toLocaleString()}
                        </span>
                    )}
                    {request.reference_job && (
                        <span className="flex items-center gap-1 text-indigo-500">
                            <Briefcase size={11} />
                            {request.reference_job}
                        </span>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.classes}`}>
                        <StatusIcon size={11} />
                        {status.label}
                    </span>

                    {/* Approval buttons removed to enforce approvals strictly via Manager Dashboard */}

                    {request.status !== 'pending' && request.tbl_approver && (
                        <span className="text-xs text-slate-400 truncate max-w-[100px]">
                            โดย {request.tbl_approver.username}
                        </span>
                    )}
                </div>
            </div>

            {processing && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

// ── Detail Modal with links ───────────────────────────────────────────────────
// NOTE: This replaces the imported ApprovalDetailModal to show links inline.
function DetailModal({ isOpen, request, onClose }: {
    isOpen: boolean;
    request: ApprovalRequest | null;
    onClose: () => void;
}) {
    if (!isOpen || !request) return null;

    const status = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
    const StatusIcon = status.icon;

    // Extract URLs from reason + reference_job, deduplicate
    const urlRegex = /(https?:\/\/[^\s,，\u0E00-\u0E7F]+)/g;
    const links: string[] = [];
    const seenUrls = new Set<string>();
    for (const src of [request.reason ?? '', request.reference_job ?? '']) {
        let m: RegExpExecArray | null;
        const rx = new RegExp(urlRegex.source, 'g');
        while ((m = rx.exec(src)) !== null) {
            const url = m[1].replace(/[).,;!?]+$/, ''); // strip trailing punctuation
            if (!seenUrls.has(url)) { seenUrls.add(url); links.push(url); }
        }
    }

    // Strip URLs from reason text for clean display
    const cleanReason = (request.reason ?? '')
        .replace(urlRegex, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const dateStr = request.created_at
        ? new Date(request.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
    const approvedDateStr = request.approved_at
        ? new Date(request.approved_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
        : null;

    // Try to get a human-readable label for a URL
    const getLinkLabel = (url: string) => {
        try {
            const u = new URL(url);
            // Use hostname + first path segment as label
            const parts = u.pathname.split('/').filter(Boolean);
            return `${u.hostname}${parts.length ? `/${parts[0]}…` : ''}`;
        } catch { return url.slice(0, 48) + (url.length > 48 ? '…' : ''); }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* ── Header ── */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start gap-3">
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        request.status === 'approved' ? 'bg-emerald-100' :
                        request.status === 'rejected' ? 'bg-rose-100' : 'bg-amber-100'
                    }`}>
                        <StatusIcon size={18} className={
                            request.status === 'approved' ? 'text-emerald-600' :
                            request.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                        } />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[request.request_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                {TYPE_LABEL[request.request_type] ?? request.request_type}
                            </span>
                            <span className="text-xs font-mono text-slate-400">{request.request_number}</span>
                        </div>
                        {/* Clean reason — no URLs */}
                        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {cleanReason || <span className="italic text-slate-400">ไม่ระบุเหตุผล</span>}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                    {/* Status row */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-xs text-slate-500 font-medium">สถานะ</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.classes}`}>
                            <StatusIcon size={11} />
                            {status.label}
                        </span>
                    </div>

                    {/* Meta grid */}
                    <dl className="grid grid-cols-2 gap-2.5 text-sm">
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs text-slate-400 mb-0.5">ผู้ขออนุมัติ</dt>
                            <dd className="font-medium text-slate-700">{request.tbl_users?.username || '—'}</dd>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <dt className="text-xs text-slate-400 mb-0.5">วันที่สร้าง</dt>
                            <dd className="font-medium text-slate-700">{dateStr}</dd>
                        </div>

                        {request.start_time && (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <dt className="text-xs text-slate-400 mb-0.5">เวลาเริ่ม</dt>
                                <dd className="font-medium text-slate-700">
                                    {new Date(request.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </dd>
                            </div>
                        )}
                        {request.end_time && (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <dt className="text-xs text-slate-400 mb-0.5">เวลาสิ้นสุด</dt>
                                <dd className="font-medium text-slate-700">
                                    {new Date(request.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </dd>
                            </div>
                        )}

                        {request.amount != null && (
                            <div className="col-span-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3">
                                <dt className="text-xs text-amber-500 mb-0.5">จำนวนเงิน</dt>
                                <dd className="font-bold text-amber-700 text-xl">฿{Number(request.amount).toLocaleString()}</dd>
                            </div>
                        )}

                        {request.reference_job && (
                            <div className="col-span-2 rounded-xl bg-slate-50 px-4 py-3">
                                <dt className="text-xs text-slate-400 mb-0.5">งานอ้างอิง</dt>
                                <dd className="font-medium text-slate-700">{request.reference_job}</dd>
                            </div>
                        )}

                        {request.tbl_approver && (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <dt className="text-xs text-slate-400 mb-0.5">อนุมัติโดย</dt>
                                <dd className="font-medium text-slate-700">{request.tbl_approver.username}</dd>
                            </div>
                        )}
                        {approvedDateStr && (
                            <div className="rounded-xl bg-slate-50 px-4 py-3">
                                <dt className="text-xs text-slate-400 mb-0.5">วันที่อนุมัติ</dt>
                                <dd className="font-medium text-slate-700">{approvedDateStr}</dd>
                            </div>
                        )}

                        {request.rejection_reason && (
                            <div className="col-span-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3">
                                <dt className="text-xs text-rose-500 mb-1 flex items-center gap-1">
                                    <AlertCircle size={11} />เหตุผลที่ไม่อนุมัติ
                                </dt>
                                <dd className="text-rose-700 text-sm">{request.rejection_reason}</dd>
                            </div>
                        )}
                    </dl>

                    {/* ── Link section (clean, at the bottom) ── */}
                    {links.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <ExternalLink size={12} className="text-slate-400" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    ลิงก์สินค้า
                                </span>
                                <span className="ml-auto text-xs text-slate-400">{links.length} รายการ</span>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {links.map((url, i) => (
                                    <li key={i}>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors group"
                                        >
                                            {/* Favicon */}
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:bg-indigo-100 transition-colors">
                                                <img
                                                    src={`https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`}
                                                    alt=""
                                                    className="w-4 h-4 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-indigo-600 group-hover:text-indigo-800 transition-colors truncate">
                                                    เปิดดูสินค้า
                                                </p>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">{getLinkLabel(url)}</p>
                                            </div>
                                            <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ApprovalClient({
    initialRequests,
    activeJobs,
    canApprove: canApproveProp,
    currentUserId,
    variant = 'manage',
    allowCreate = true,
    initialRequestType = 'all',
    lockedRequestType = null,
    defaultCreateRequestType = 'ot',
    title = 'ระบบขออนุมัติ',
    subtitle = 'จัดการคำขออนุมัติ และติดตามสถานะได้ในหน้าเดียว'
}: ApprovalClientProps) {
    const { showToast } = useToast();
    const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
    
    // Determine global canApprove, considering if any request is explicitly approvable
    const hasApprovableRequests = requests.some(r => r.can_approve);
    const canApprove = variant === 'manage' && (canApproveProp || hasApprovableRequests);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Force viewing only personal requests
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterRequestType, setFilterRequestType] = useState(lockedRequestType || initialRequestType);
    const [searchText, setSearchText] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [processingIds, setProcessingIds] = useState<number[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    const [detailRequestId, setDetailRequestId] = useState<number | null>(null);
    const detailRequest = useMemo(() => {
        if (!detailRequestId) return null;
        return requests.find((r) => r.request_id === detailRequestId) || null;
    }, [requests, detailRequestId]);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const [formData, setFormData] = useState<ApprovalFormData>(() =>
        defaultFormData(lockedRequestType || defaultCreateRequestType)
    );

    const jobOptions = useMemo(
        () => activeJobs.map((j) => ({
            value: j.request_number,
            label: `${j.request_number} - ห้อง ${j.tbl_rooms?.room_code || '-'}: ${j.title || '-'}`
        })),
        [activeJobs]
    );

    const filteredRequests = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return requests.filter((r) => {
            const ownerId = r.requested_by || r.tbl_users?.p_id || 0;
            if (ownerId !== currentUserId) return false;

            if (filterStatus !== 'all' && r.status !== filterStatus) return false;
            if (filterRequestType !== 'all' && r.request_type !== filterRequestType) return false;
            if (dateFrom || dateTo) {
                const sourceDate = r.created_at ? new Date(r.created_at) : null;
                if (sourceDate) {
                    if (dateFrom && sourceDate < new Date(`${dateFrom}T00:00:00`)) return false;
                    if (dateTo && sourceDate > new Date(`${dateTo}T23:59:59`)) return false;
                }
            }
            if (q) {
                const haystack = [r.request_number, r.tbl_users?.username, r.reason, r.reference_job].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [requests, currentUserId, canApprove, filterStatus, filterRequestType, dateFrom, dateTo, searchText]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const resetToFirstPage = () => setCurrentPage(1);

    const patchFormData = (patch: Partial<ApprovalFormData>) => setFormData((p) => ({ ...p, ...patch }));
    const setRowsProcessing = (ids: number[], on: boolean) =>
        setProcessingIds((p) => on ? Array.from(new Set([...p, ...ids])) : p.filter((id) => !ids.includes(id)));
    const applyUpdatedRequest = (updated: ApprovalRequest) =>
        setRequests((p) => p.map((r) => r.request_id === updated.request_id ? updated : r));

    const runStatusUpdate = async (ids: number[], status: 'approved' | 'rejected', reason?: string) => {
        if (!canApprove) return;
        const targetIds = ids.filter(Boolean);
        if (!targetIds.length) return;
        setRowsProcessing(targetIds, true);
        if (targetIds.length > 1) setIsBulkProcessing(true);
        let ok = 0;
        try {
            for (const id of targetIds) {
                const res = await updateApprovalStatus(id, status, reason);
                if (res.success && res.data) { ok++; applyUpdatedRequest(res.data as ApprovalRequest); }
            }
        } finally {
            setRowsProcessing(targetIds, false);
            if (targetIds.length > 1) setIsBulkProcessing(false);
            setSelectedIds((p) => p.filter((id) => !targetIds.includes(id)));
        }
        if (ok === targetIds.length) showToast('ดำเนินการสำเร็จ', 'success');
        else if (ok > 0) showToast(`สำเร็จ ${ok}/${targetIds.length} รายการ`, 'success');
        else showToast('เกิดข้อผิดพลาด', 'error');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.request_type === 'ot') {
            if (!formData.start_time || !formData.end_time) { showToast('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด', 'error'); return; }
            if (formData.end_time <= formData.start_time) { showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม', 'error'); return; }
        }
        if (['expense', 'purchase'].includes(formData.request_type)) {
            const amt = Number(formData.amount);
            if (!Number.isFinite(amt) || amt <= 0) { showToast('จำนวนเงินต้องมากกว่า 0', 'error'); return; }
        }
        if (!formData.reason.trim()) { showToast('กรุณาระบุเหตุผล', 'error'); return; }
        setIsSubmitting(true);
        try {
            let st: Date | null = null, et: Date | null = null;
            if (formData.start_time && formData.request_date) st = new Date(`${formData.request_date}T${formData.start_time}:00`);
            if (formData.end_time && formData.request_date) et = new Date(`${formData.request_date}T${formData.end_time}:00`);
            const res = await createApprovalRequest({ ...formData, reason: formData.reason.trim(), start_time: st, end_time: et });
            if (res.success && res.data) {
                showToast('ส่งคำขอสำเร็จ', 'success');
                setIsModalOpen(false);
                setRequests((p) => [{ ...res.data, tbl_users: { username: 'ฉันเอง', p_id: currentUserId } }, ...p]);
                setFormData(defaultFormData(lockedRequestType || defaultCreateRequestType));
                resetToFirstPage();
            } else showToast(res.error || 'เกิดข้อผิดพลาด', 'error');
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด', 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleApprove = async (id: number) => { 
        if (!confirm('ยืนยันที่จะอนุมัติคำขอนี้?')) return;
        await runStatusUpdate([id], 'approved');
    };
    const handleOpenReject = (id: number) => { setRejectId(id); setRejectionReason(''); setRejectModalOpen(true); };
    const handleConfirmReject = async () => {
        const reason = rejectionReason.trim();
        if (!rejectId) return;
        if (!reason) { alert('โปรดระบุเหตุผล'); return; }
        if (!confirm('ยืนยันที่จะไม่อนุมัติคำขอนี้?')) return;
        await runStatusUpdate([rejectId], 'rejected', reason);
        setRejectModalOpen(false); setRejectId(null); setRejectionReason('');
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    };

    const handleToggleSelectAllPage = () => { if (!canApprove) return;
        const ids = paginatedRequests.filter((r) => r.status === 'pending' && (r.can_approve ?? canApprove)).map((r) => r.request_id);
        if (!ids.length) return;
        const allSelected = ids.every((id) => selectedIds.includes(id));
        setSelectedIds((p) => allSelected ? p.filter((id) => !ids.includes(id)) : Array.from(new Set([...p, ...ids])));
    };

    const handleBulkApprove = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`ยืนยันอนุมัติ ${selectedIds.length} รายการ?`)) return;
        await runStatusUpdate(selectedIds, 'approved');
    };
    const handleBulkReject = async () => {
        if (!selectedIds.length) return;
        const reason = prompt('ระบุเหตุผลสำหรับการไม่อนุมัติหลายรายการ:')?.trim();
        if (!reason) return;
        if (!confirm(`ยืนยันไม่อนุมัติ ${selectedIds.length} รายการ?`)) return;
        await runStatusUpdate(selectedIds, 'rejected', reason);
    };

    const handleExportCsv = () => {
        const headers = ['เลขที่คำขอ', 'ผู้ขอ', 'ประเภท', 'สถานะ', 'เหตุผล', 'จำนวนเงิน', 'งานอ้างอิง', 'อนุมัติโดย', 'วันที่สร้าง', 'วันที่อนุมัติ'];
        const lines = filteredRequests.map((r) => [
            r.request_number || '', r.tbl_users?.username || '', r.request_type || '', r.status || '',
            (r.reason || '').replace(/\r?\n/g, ' '), r.amount ?? '', r.reference_job || '',
            r.tbl_approver?.username || '',
            r.created_at ? new Date(r.created_at).toISOString() : '',
            r.approved_at ? new Date(r.approved_at).toISOString() : ''
        ]);
        const csv = [headers, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `approvals-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const personalRequests = useMemo(() => {
        return requests.filter(r => {
            const ownerId = r.requested_by || r.tbl_users?.p_id || 0;
            return ownerId === currentUserId;
        });
    }, [requests, currentUserId]);

    const requestSummary = useMemo(() => ({
        total: personalRequests.length,
        pending: personalRequests.filter((r) => r.status === 'pending').length,
        approved: personalRequests.filter((r) => r.status === 'approved').length,
        rejected: personalRequests.filter((r) => r.status === 'rejected').length,
    }), [personalRequests]);

    const defaultRequestTypeFilter = lockedRequestType || initialRequestType;
    const isFilterDirty = Boolean(searchText.trim() || filterStatus !== 'all' || filterRequestType !== defaultRequestTypeFilter || dateFrom || dateTo);
    const handleClearFilters = () => { setSearchText(''); setFilterStatus('all'); setFilterRequestType(defaultRequestTypeFilter); setDateFrom(''); setDateTo(''); resetToFirstPage(); };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── Top Nav ─────────────────────────────────────────────── */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-bold text-slate-800 leading-tight truncate">{title}</h1>
                            <p className="text-xs text-slate-400 leading-tight hidden sm:block">{subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        >
                            <FileDown size={15} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        {allowCreate && (
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
                        >
                            <Plus size={15} />
                            <span>สร้างคำขอ</span>
                        </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                {/* ── Summary Cards ──────────────────────────────────── */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'ทั้งหมด', value: requestSummary.total, color: 'text-slate-700', bg: 'bg-white border-slate-200', dot: 'bg-slate-400' },
                        { label: 'รอพิจารณา', value: requestSummary.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-400' },
                        { label: 'อนุมัติแล้ว', value: requestSummary.approved, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400' },
                        { label: 'ไม่อนุมัติ', value: requestSummary.rejected, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', dot: 'bg-rose-400' },
                    ].map((item) => (
                        <div key={item.label} className={`rounded-2xl border ${item.bg} px-4 py-3 flex flex-col gap-1`}>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                                <span className="text-xs text-slate-500">{item.label}</span>
                            </div>
                            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Toolbar ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Top bar */}
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-slate-100">
                        {/* View tabs removed, only showing personal requests */}

                        {/* Search */}
                        <div className="flex-1 min-w-[180px] relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchText}
                                onChange={(e) => { setSearchText(e.target.value); resetToFirstPage(); }}
                                placeholder="ค้นหา…"
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
                            />
                        </div>

                        {/* Filters toggle */}
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((o) => !o)}
                            className={[
                                'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition',
                                filtersOpen || isFilterDirty
                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            ].join(' ')}
                        >
                            <SlidersHorizontal size={14} />
                            ตัวกรอง
                            {isFilterDirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                            )}
                        </button>

                        <span className="text-xs text-slate-400 ml-auto">{filteredRequests.length} รายการ</span>
                    </div>

                    {/* Expandable filters */}
                    {filtersOpen && (
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs text-slate-500 font-medium mb-1 block">สถานะ</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    value={filterStatus}
                                    onChange={(e) => { setFilterStatus(e.target.value); resetToFirstPage(); }}
                                >
                                    <option value="all">ทั้งหมด</option>
                                    <option value="pending">รอพิจารณา</option>
                                    <option value="approved">อนุมัติแล้ว</option>
                                    <option value="rejected">ไม่อนุมัติ</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 font-medium mb-1 block">ประเภท</label>
                                {lockedRequestType ? (
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-100 text-slate-500"
                                        value={REQUEST_TYPE_OPTIONS.find((o) => o.value === lockedRequestType)?.label || lockedRequestType}
                                        readOnly
                                    />
                                ) : (
                                    <select
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        value={filterRequestType}
                                        onChange={(e) => { setFilterRequestType(e.target.value); resetToFirstPage(); }}
                                    >
                                        {REQUEST_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 font-medium mb-1 block">วันที่เริ่ม</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => { setDateFrom(e.target.value); resetToFirstPage(); }}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 font-medium mb-1 block">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => { setDateTo(e.target.value); resetToFirstPage(); }}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                            </div>

                            {isFilterDirty && (
                                <div className="col-span-full flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition"
                                    >
                                        ล้างตัวกรองทั้งหมด
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bulk actions bar removed to enforce approvals strictly via Manager Dashboard */}
                </div>

                {/* ── Grid ────────────────────────────────────────────── */}
                {paginatedRequests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-slate-400">
                        <FileText size={32} className="opacity-30" />
                        <p className="text-sm font-medium">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
                        {isFilterDirty && (
                            <button onClick={handleClearFilters} className="text-xs text-indigo-500 hover:underline">ล้างตัวกรอง</button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedRequests.map((req) => (
                            <ApprovalCard
                                key={req.request_id}
                                request={req}
                                canApprove={canApprove}
                                selected={selectedIds.includes(req.request_id)}
                                processing={processingIds.includes(req.request_id)}
                                onToggle={() => handleToggleSelect(req.request_id)}
                                onApprove={() => handleApprove(req.request_id)}
                                onReject={() => handleOpenReject(req.request_id)}
                                onDetail={() => setDetailRequestId(req.request_id)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pagination ─────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        {filteredRequests.length
                            ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredRequests.length)} จาก ${filteredRequests.length}`
                            : '0 รายการ'}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="text-sm text-slate-600 font-medium min-w-[56px] text-center">
                            {safePage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </main>

            {/* ── Modals ────────────────────────────────────────────── */}
            <CreateApprovalModal
                isOpen={isModalOpen}
                isSubmitting={isSubmitting}
                formData={formData}
                jobOptions={jobOptions}
                lockedRequestType={lockedRequestType}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                onChange={patchFormData}
            />

            <RejectApprovalModal
                isOpen={rejectModalOpen}
                reason={rejectionReason}
                onReasonChange={setRejectionReason}
                onCancel={() => { setRejectModalOpen(false); setRejectionReason(''); setRejectId(null); }}
                onConfirm={handleConfirmReject}
            />

            {/* Custom detail modal with links */}
            <DetailModal
                isOpen={detailRequestId !== null}
                request={detailRequest}
                onClose={() => setDetailRequestId(null)}
            />
        </div>
    );
}
