'use client';

import React, { useMemo, useState } from 'react';
import { FileDown, FileText, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { createApprovalRequest, updateApprovalStatus } from '@/actions/approvalActions';
import ApprovalTable from './components/ApprovalTable';
import CreateApprovalModal from './components/CreateApprovalModal';
import RejectApprovalModal from './components/RejectApprovalModal';
import { ActiveJob, ApprovalFormData, ApprovalRequest } from './types';

interface ApprovalClientProps {
    initialRequests: ApprovalRequest[];
    activeJobs: ActiveJob[];
    canApprove: boolean;
    currentUserId: number;
}

const PAGE_SIZE = 10;

const defaultFormData = (): ApprovalFormData => ({
    request_type: 'ot',
    request_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    amount: '',
    reason: '',
    reference_job: ''
});

export default function ApprovalClient({ initialRequests, activeJobs, canApprove, currentUserId }: ApprovalClientProps) {
    const { showToast } = useToast();
    const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [viewMode, setViewMode] = useState<'all' | 'mine' | 'pending_review'>('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [processingIds, setProcessingIds] = useState<number[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const [formData, setFormData] = useState<ApprovalFormData>(defaultFormData());

    const jobOptions = useMemo(
        () => activeJobs.map(j => ({
            value: j.request_number,
            label: `${j.request_number} - ห้อง ${j.tbl_rooms?.room_code || '-'}: ${j.title || '-'}`
        })),
        [activeJobs]
    );

    const filteredRequests = useMemo(() => {
        const q = searchText.trim().toLowerCase();

        return requests.filter((r) => {
            if (viewMode === 'mine') {
                const ownerId = r.requested_by || r.tbl_users?.p_id || 0;
                if (ownerId !== currentUserId) return false;
            }

            if (viewMode === 'pending_review' && !(canApprove && r.status === 'pending')) {
                return false;
            }

            if (filterStatus !== 'all' && r.status !== filterStatus) return false;

            if (dateFrom || dateTo) {
                const sourceDate = r.created_at ? new Date(r.created_at) : null;
                if (sourceDate) {
                    if (dateFrom && sourceDate < new Date(`${dateFrom}T00:00:00`)) return false;
                    if (dateTo && sourceDate > new Date(`${dateTo}T23:59:59`)) return false;
                }
            }

            if (q) {
                const haystack = [
                    r.request_number,
                    r.tbl_users?.username,
                    r.reason,
                    r.reference_job
                ].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            return true;
        });
    }, [requests, viewMode, currentUserId, canApprove, filterStatus, dateFrom, dateTo, searchText]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const resetToFirstPage = () => setCurrentPage(1);

    const patchFormData = (patch: Partial<ApprovalFormData>) => {
        setFormData(prev => ({ ...prev, ...patch }));
    };

    const setRowsProcessing = (ids: number[], processing: boolean) => {
        setProcessingIds(prev => {
            if (processing) return Array.from(new Set([...prev, ...ids]));
            return prev.filter(id => !ids.includes(id));
        });
    };

    const applyUpdatedRequest = (updated: ApprovalRequest) => {
        setRequests(prev => prev.map(r => (r.request_id === updated.request_id ? updated : r)));
    };

    const runStatusUpdate = async (ids: number[], status: 'approved' | 'rejected', reason?: string) => {
        const targetIds = ids.filter(Boolean);
        if (!targetIds.length) return;

        setRowsProcessing(targetIds, true);
        if (targetIds.length > 1) setIsBulkProcessing(true);

        let successCount = 0;
        try {
            for (const id of targetIds) {
                const res = await updateApprovalStatus(id, status, reason);
                if (res.success && res.data) {
                    successCount += 1;
                    applyUpdatedRequest(res.data as ApprovalRequest);
                }
            }
        } finally {
            setRowsProcessing(targetIds, false);
            if (targetIds.length > 1) setIsBulkProcessing(false);
            setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
        }

        if (successCount === targetIds.length) {
            showToast('ดำเนินการสำเร็จ', 'success');
        } else if (successCount > 0) {
            showToast(`สำเร็จ ${successCount}/${targetIds.length} รายการ`, 'success');
        } else {
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.request_type === 'ot') {
            if (!formData.start_time || !formData.end_time) {
                showToast('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด', 'error');
                return;
            }
            if (formData.end_time <= formData.start_time) {
                showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม', 'error');
                return;
            }
        }

        if (formData.request_type === 'expense') {
            const amount = Number(formData.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                showToast('จำนวนเงินต้องมากกว่า 0', 'error');
                return;
            }
        }

        if (!formData.reason.trim()) {
            showToast('กรุณาระบุเหตุผล', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            let st: Date | null = null;
            let et: Date | null = null;
            if (formData.start_time && formData.request_date) {
                st = new Date(`${formData.request_date}T${formData.start_time}:00`);
            }
            if (formData.end_time && formData.request_date) {
                et = new Date(`${formData.request_date}T${formData.end_time}:00`);
            }

            const res = await createApprovalRequest({
                ...formData,
                reason: formData.reason.trim(),
                start_time: st,
                end_time: et
            });

            if (res.success && res.data) {
                showToast('ส่งคำขอสำเร็จ', 'success');
                setIsModalOpen(false);
                setRequests(prev => [{ ...res.data, tbl_users: { username: 'ฉันเอง', p_id: currentUserId } }, ...prev]);
                setFormData(defaultFormData());
                resetToFirstPage();
            } else {
                showToast(res.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('ยืนยันที่จะอนุมัติคำขอนี้?')) return;
        await runStatusUpdate([id], 'approved');
    };

    const handleOpenReject = (id: number) => {
        setRejectId(id);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const handleConfirmReject = async () => {
        const reason = rejectionReason.trim();
        if (!rejectId) return;
        if (!reason) {
            alert('โปรดระบุเหตุผล');
            return;
        }
        if (!confirm('ยืนยันที่จะไม่อนุมัติคำขอนี้?')) return;
        await runStatusUpdate([rejectId], 'rejected', reason);
        setRejectModalOpen(false);
        setRejectId(null);
        setRejectionReason('');
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleToggleSelectAllPage = () => {
        const pagePendingIds = paginatedRequests.filter(r => r.status === 'pending').map(r => r.request_id);
        if (!pagePendingIds.length) return;

        const allSelected = pagePendingIds.every(id => selectedIds.includes(id));
        setSelectedIds(prev => {
            if (allSelected) {
                return prev.filter(id => !pagePendingIds.includes(id));
            }
            return Array.from(new Set([...prev, ...pagePendingIds]));
        });
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
        const headers = [
            'เลขที่คำขอ',
            'ผู้ขอ',
            'ประเภท',
            'สถานะ',
            'เหตุผล',
            'จำนวนเงิน',
            'งานอ้างอิง',
            'อนุมัติโดย',
            'วันที่สร้าง',
            'วันที่อนุมัติ'
        ];

        const lines = filteredRequests.map((r) => [
            r.request_number || '',
            r.tbl_users?.username || '',
            r.request_type || '',
            r.status || '',
            (r.reason || '').replace(/\r?\n/g, ' '),
            r.amount ?? '',
            r.reference_job || '',
            r.tbl_approver?.username || '',
            r.created_at ? new Date(r.created_at).toISOString() : '',
            r.approved_at ? new Date(r.approved_at).toISOString() : ''
        ]);

        const csv = [headers, ...lines]
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `approvals-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <FileText className="text-indigo-500" />
                        ระบบขออนุมัติทั่วไป (OT/ลา/เบิก)
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">จัดการคำขออนุมัติ และติดตามสถานะได้ในหน้าเดียว</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2 rounded-lg font-medium transition shadow-sm"
                    >
                        <FileDown size={18} />
                        Export CSV
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
                    >
                        <Plus size={20} />
                        สร้างคำขอใหม่
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => { setViewMode('all'); resetToFirstPage(); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}
                >
                    ทั้งหมด
                </button>
                <button
                    onClick={() => { setViewMode('mine'); resetToFirstPage(); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'mine' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}
                >
                    ของฉัน
                </button>
                {canApprove && (
                    <button
                        onClick={() => { setViewMode('pending_review'); resetToFirstPage(); }}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'pending_review' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}
                    >
                        รอฉันอนุมัติ
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={searchText}
                        onChange={(e) => { setSearchText(e.target.value); resetToFirstPage(); }}
                        placeholder="ค้นหาเลขที่คำขอ / ผู้ขอ / เหตุผล / งานอ้างอิง"
                        className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                    />
                </div>
                <select
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); resetToFirstPage(); }}
                >
                    <option value="all">สถานะทั้งหมด</option>
                    <option value="pending">รอพิจารณา</option>
                    <option value="approved">อนุมัติแล้ว</option>
                    <option value="rejected">ไม่อนุมัติ</option>
                </select>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); resetToFirstPage(); }}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); resetToFirstPage(); }}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                />
            </div>

            {canApprove && (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleBulkApprove}
                        disabled={!selectedIds.length || isBulkProcessing}
                        className="px-3 py-1.5 rounded-md text-sm bg-emerald-600 text-white disabled:opacity-50"
                    >
                        อนุมัติที่เลือก ({selectedIds.length})
                    </button>
                    <button
                        onClick={handleBulkReject}
                        disabled={!selectedIds.length || isBulkProcessing}
                        className="px-3 py-1.5 rounded-md text-sm bg-rose-600 text-white disabled:opacity-50"
                    >
                        ไม่อนุมัติที่เลือก
                    </button>
                </div>
            )}

            <ApprovalTable
                requests={paginatedRequests}
                canApprove={canApprove}
                selectedIds={selectedIds}
                processingIds={processingIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAllPage={handleToggleSelectAllPage}
                onApprove={handleApprove}
                onOpenReject={handleOpenReject}
            />

            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    แสดง {filteredRequests.length ? ((safePage - 1) * PAGE_SIZE + 1) : 0}-{Math.min(safePage * PAGE_SIZE, filteredRequests.length)} จาก {filteredRequests.length} รายการ
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="px-3 py-1.5 rounded border disabled:opacity-50 dark:border-slate-700"
                    >
                        ก่อนหน้า
                    </button>
                    <span className="text-sm">{safePage}/{totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="px-3 py-1.5 rounded border disabled:opacity-50 dark:border-slate-700"
                    >
                        ถัดไป
                    </button>
                </div>
            </div>

            <CreateApprovalModal
                isOpen={isModalOpen}
                isSubmitting={isSubmitting}
                formData={formData}
                jobOptions={jobOptions}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                onChange={patchFormData}
            />

            <RejectApprovalModal
                isOpen={rejectModalOpen}
                reason={rejectionReason}
                onReasonChange={setRejectionReason}
                onCancel={() => {
                    setRejectModalOpen(false);
                    setRejectionReason('');
                    setRejectId(null);
                }}
                onConfirm={handleConfirmReject}
            />
        </div>
    );
}
