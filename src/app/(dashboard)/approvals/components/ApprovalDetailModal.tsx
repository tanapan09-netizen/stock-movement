'use client';

import Link from 'next/link';
import { ExternalLink, FileText, Printer, XCircle } from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';
import { ApprovalRequest } from '../types';

interface ApprovalDetailModalProps {
    isOpen: boolean;
    request: ApprovalRequest | null;
    onClose: () => void;
}

function toSafeDate(value: string | Date | null | undefined) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatDateTime(value: string | Date | null | undefined) {
    const date = toSafeDate(value);
    if (!date) return '-';
    return date.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(value: string | Date | null | undefined) {
    const date = toSafeDate(value);
    if (!date) return '-';
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatTime(value: string | Date | null | undefined) {
    const date = toSafeDate(value);
    if (!date) return '-';
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function getTypeLabel(type: string) {
    switch (type) {
        case 'ot': return 'ทำงานล่วงเวลา (OT)';
        case 'leave': return 'ลาหยุด';
        case 'expense': return 'เบิกค่าใช้จ่าย';
        case 'purchase': return 'คำขอซื้อ';
        case 'other': return 'อื่นๆ';
        default: return type;
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case 'approved': return 'อนุมัติแล้ว';
        case 'rejected': return 'ไม่อนุมัติ';
        default: return 'รอพิจารณา';
    }
}

export default function ApprovalDetailModal({ isOpen, request, onClose }: ApprovalDetailModalProps) {
    if (!isOpen) return null;
    if (!request) return null;

    const amountNumber = Number(request.amount);
    const showAmount = (request.request_type === 'expense' || request.request_type === 'purchase') && Number.isFinite(amountNumber) && amountNumber > 0;
    const requestDate = request.request_date || request.created_at;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <FileText size={20} className="text-indigo-600" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                                {request.request_number}
                            </h2>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {getTypeLabel(request.request_type)}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                วันที่: {formatShortDate(requestDate)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                ผู้ขอ: <span className="font-medium text-gray-800 dark:text-gray-200">{request.tbl_users?.username || '-'}</span>
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            สถานะ: <span className="font-semibold text-gray-900 dark:text-white">{getStatusLabel(request.status)}</span>
                        </div>
                        <WorkflowStepper
                            currentStep={request.status === 'pending' ? 1 : 2}
                            totalSteps={2}
                            status={(request.status === 'rejected' ? 'rejected' : request.status) as WorkflowStatus}
                            size="sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">สร้างเมื่อ</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(request.created_at)}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">อนุมัติเมื่อ</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(request.approved_at)}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400">เหตุผล/รายละเอียด</div>
                        <div className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                            {request.reason || '-'}
                        </div>
                        {request.status === 'rejected' && request.rejection_reason && (
                            <div className="mt-3 text-sm text-rose-700 dark:text-rose-200">
                                เหตุผลที่ไม่อนุมัติ: <span className="font-medium">{request.rejection_reason}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">อ้างอิงงาน</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{request.reference_job || '-'}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">จำนวนเงิน</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                {showAmount ? `฿ ${amountNumber.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                            </div>
                        </div>
                    </div>

                    {request.request_type === 'ot' && (
                        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">เวลา (OT)</div>
                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                {formatTime(request.start_time)} - {formatTime(request.end_time)}
                            </div>
                        </div>
                    )}

                    {request.request_type === 'purchase' && (
                        <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    รายการสินค้า
                                </div>
                                <Link
                                    href={`/print/purchase-request/${request.request_id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition justify-center"
                                    title="เปิดดูรายละเอียดสินค้า"
                                >
                                    <ExternalLink size={16} />
                                    เปิดดูรายละเอียดสินค้า
                                </Link>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <Printer size={14} className="opacity-70" />
                                ลิงก์นี้จะแสดงหน้าใบขอซื้อพร้อมรายการสินค้า
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
