'use client';

import { Calendar, CheckCircle2, Clock, DollarSign, FileText, Loader2, Square, SquareCheckBig, XCircle } from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';
import { ApprovalRequest } from '../types';

interface ApprovalTableProps {
    requests: ApprovalRequest[];
    canApprove: boolean;
    selectedIds: number[];
    processingIds: number[];
    onToggleSelect: (id: number) => void;
    onToggleSelectAllPage: () => void;
    onApprove: (id: number) => void;
    onOpenReject: (id: number) => void;
}

function getTypeLabel(type: string) {
    switch (type) {
        case 'ot': return 'ล่วงเวลา (OT)';
        case 'leave': return 'ลาหยุด';
        case 'expense': return 'เบิกค่าใช้จ่าย';
        case 'purchase': return 'คำขอซื้อ';
        case 'other': return 'อื่นๆ';
        default: return type;
    }
}

function StatusBadge({ req }: { req: ApprovalRequest }) {
    const status = req.status;
    return (
        <div className="min-w-[120px]">
            <WorkflowStepper
                currentStep={status === 'pending' ? 1 : 2}
                totalSteps={2}
                status={(status === 'rejected' ? 'rejected' : status) as WorkflowStatus}
                size="sm"
            />
        </div>
    );
}

export default function ApprovalTable({
    requests,
    canApprove,
    selectedIds,
    processingIds,
    onToggleSelect,
    onToggleSelectAllPage,
    onApprove,
    onOpenReject
}: ApprovalTableProps) {
    const allSelectableIds = requests.filter(r => r.status === 'pending').map(r => r.request_id);
    const selectedOnPage = allSelectableIds.filter(id => selectedIds.includes(id));
    const allSelected = allSelectableIds.length > 0 && selectedOnPage.length === allSelectableIds.length;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-medium">
                        <tr>
                            {canApprove && (
                                <th className="px-3 py-4">
                                    <button
                                        type="button"
                                        onClick={onToggleSelectAllPage}
                                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        title="เลือกทั้งหมดในหน้านี้"
                                    >
                                        {allSelected ? <SquareCheckBig size={16} /> : <Square size={16} />}
                                    </button>
                                </th>
                            )}
                            <th className="px-6 py-4">เลขที่/วันที่</th>
                            <th className="px-6 py-4">รายละเอียดคำขอ</th>
                            <th className="px-6 py-4">ข้อมูลงานอ้างอิง</th>
                            <th className="px-6 py-4">สถานะ</th>
                            {canApprove && <th className="px-6 py-4 text-right">จัดการ</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                        {requests.length > 0 ? requests.map((req) => {
                            const isPending = req.status === 'pending';
                            const isProcessing = processingIds.includes(req.request_id);
                            const isSelected = selectedIds.includes(req.request_id);

                            return (
                                <tr key={req.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                                    {canApprove && (
                                        <td className="px-3 py-4 align-top">
                                            {isPending ? (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => onToggleSelect(req.request_id)}
                                                    className="mt-1"
                                                />
                                            ) : null}
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-indigo-600 dark:text-indigo-400">{req.request_number}</div>
                                        <div className="text-xs text-gray-500 mt-1">ผู้ขอ: {req.tbl_users?.username}</div>
                                        <div className="text-xs text-gray-500">
                                            {req.created_at ? new Date(req.created_at).toLocaleDateString('th-TH') : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal min-w-[280px]">
                                        <div className="font-medium flex items-center gap-1 mb-1">
                                            {req.request_type === 'ot' && <Clock size={14} className="text-blue-500" />}
                                            {req.request_type === 'leave' && <Calendar size={14} className="text-orange-500" />}
                                            {req.request_type === 'expense' && <DollarSign size={14} className="text-green-500" />}
                                            {req.request_type === 'purchase' && <DollarSign size={14} className="text-emerald-500" />}
                                            {(req.request_type === 'other' || !['ot', 'leave', 'expense', 'purchase'].includes(req.request_type)) && <FileText size={14} className="text-slate-500" />}
                                            {getTypeLabel(req.request_type)}
                                        </div>
                                        <div className="text-gray-700 dark:text-gray-300">{req.reason}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.request_type === 'ot' && req.start_time && req.end_time && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                เวลา: {new Date(req.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(req.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                        {(req.request_type === 'expense' || req.request_type === 'purchase') && Boolean(req.amount) && (
                                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                ฿ {Number(req.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </div>
                                        )}
                                        {req.reference_job && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300">
                                                อ้างอิง: {req.reference_job}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal min-w-[230px]">
                                        <StatusBadge req={req} />
                                        {req.status === 'rejected' && req.rejection_reason && (
                                            <div className="text-xs text-red-500 mt-1 italic">เหตุผล: {req.rejection_reason}</div>
                                        )}
                                        {req.status === 'approved' && (
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                อนุมัติโดย: {req.tbl_approver?.username || '-'}
                                            </div>
                                        )}
                                        {req.approved_at && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                เวลาอนุมัติ: {new Date(req.approved_at).toLocaleString('th-TH')}
                                            </div>
                                        )}
                                    </td>
                                    {canApprove && (
                                        <td className="px-6 py-4 text-right">
                                            {isPending && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => onApprove(req.request_id)}
                                                        disabled={isProcessing}
                                                        className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md font-medium text-xs transition disabled:opacity-60"
                                                    >
                                                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => onOpenReject(req.request_id)}
                                                        disabled={isProcessing}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-medium text-xs transition disabled:opacity-60"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={canApprove ? 6 : 4} className="px-6 py-12 text-center text-gray-500">
                                    ไม่พบข้อมูลคำขอ
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
