'use client';

import { Calendar, CheckCircle2, Clock, DollarSign, FileText, Loader2, XCircle } from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';
import { ApprovalRequest } from '../types';
import { getApprovalRequestTypeLabel } from '@/lib/approval-options';

interface ApprovalGridProps {
    requests: ApprovalRequest[];
    canApprove: boolean;
    selectedIds: number[];
    processingIds: number[];
    onToggleSelect: (id: number) => void;
    onApprove: (id: number) => void;
    onOpenReject: (id: number) => void;
    onOpenDetail: (req: ApprovalRequest) => void;
}

function toSafeDate(value: string | Date | null | undefined) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatShortDate(value: string | Date | null | undefined) {
    const date = toSafeDate(value);
    if (!date) return '-';
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
    return (
        <WorkflowStepper
            currentStep={status === 'pending' ? 1 : 2}
            totalSteps={2}
            status={((status === 'rejected' || status === 'returned') ? status : status) as WorkflowStatus}
            size="sm"
        />
    );
}

function TypeIcon({ type }: { type: string }) {
    if (type === 'ot') return <Clock size={14} className="text-blue-500" />;
    if (type === 'leave') return <Calendar size={14} className="text-orange-500" />;
    if (type === 'expense') return <DollarSign size={14} className="text-green-500" />;
    if (type === 'purchase') return <DollarSign size={14} className="text-emerald-500" />;
    return <FileText size={14} className="text-slate-500" />;
}

export default function ApprovalGrid({
    requests,
    canApprove,
    selectedIds,
    processingIds,
    onToggleSelect,
    onApprove,
    onOpenReject,
    onOpenDetail
}: ApprovalGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {requests.length > 0 ? requests.map((req) => {
                const isPending = req.status === 'pending';
                const isProcessing = processingIds.includes(req.request_id);
                const isSelected = selectedIds.includes(req.request_id);
                const mainDate = req.request_date || req.created_at;

                const start = toSafeDate(req.start_time);
                const end = toSafeDate(req.end_time);
                const amountNumber = Number(req.amount);
                const hasAmount = (req.request_type === 'expense' || req.request_type === 'purchase') && Number.isFinite(amountNumber) && amountNumber > 0;

                return (
                    <div
                        key={req.request_id}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onOpenDetail(req)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-300 truncate">
                                        {req.request_number}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                        {formatShortDate(mainDate)}
                                    </div>
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    ผู้ขอ: <span className="text-gray-800 dark:text-slate-200 font-medium">{req.tbl_users?.username || '-'}</span>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <StatusBadge status={req.status} />
                            </div>
                        </div>

                        <div className="mt-3 space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-200">
                                <TypeIcon type={req.request_type} />
                                {getApprovalRequestTypeLabel(req.request_type, 'full')}
                            </div>

                            <div className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                                {req.reason || '-'}
                            </div>

                            {(isPending && canApprove) && (
                                <div className="flex items-center justify-between pt-1">
                                    <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(req.request_id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4"
                                        />
                                        เลือกรายการ
                                    </label>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onApprove(req.request_id); }}
                                            disabled={isProcessing}
                                            className="px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20 rounded-lg font-medium text-xs transition disabled:opacity-60 inline-flex items-center"
                                            title="อนุมัติ"
                                        >
                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onOpenReject(req.request_id); }}
                                            disabled={isProcessing}
                                            className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20 rounded-lg font-medium text-xs transition disabled:opacity-60 inline-flex items-center"
                                            title="ไม่อนุมัติ"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(req.request_type === 'ot' && start && end) && (
                                <div className="text-xs text-gray-600 dark:text-slate-300">
                                    เวลา: {start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}

                            {hasAmount && (
                                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                                    ฿ {amountNumber.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                            )}

                            {req.reference_job && (
                                <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-900 dark:text-gray-300">
                                        อ้างอิง: {req.reference_job}
                                    </span>
                                </div>
                            )}

                            {(req.status === 'rejected' || req.status === 'returned') && req.rejection_reason && (
                                <div className={`text-xs italic ${req.status === 'returned' ? 'text-orange-600 dark:text-orange-200' : 'text-rose-600 dark:text-rose-200'}`}>
                                    เหตุผล: {req.rejection_reason}
                                </div>
                            )}

                            {req.status === 'approved' && (
                                <div className="text-xs text-emerald-700 dark:text-emerald-200">
                                    อนุมัติโดย: {req.tbl_approver?.username || '-'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }) : (
                <div className="col-span-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-10 text-center text-gray-500 dark:text-slate-400">
                    ไม่พบข้อมูลคำขอ
                </div>
            )}
        </div>
    );
}
