'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    getPettyCashRequests,
    createPettyCashRequest,
    approvePettyCash,
    dispensePettyCash,
    submitClearance,
    reconcilePettyCash,
    rejectPettyCash,
    deletePettyCashRequest,
    verifyOriginalReceipt
} from '@/actions/pettyCashActions';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import { Eye, Edit, Trash2, CheckCircle, XCircle, Search, ExternalLink, FileText, Upload, Printer, Plus, DollarSign, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import PettyCashFundDisplay from './components/PettyCashFundDisplay';

// --- Custom Confirm Modal Component ---
function ConfirmModal({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: 'red' | 'emerald' | 'blue';
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;
    const colors = {
        red: 'bg-red-600 hover:bg-red-700 focus:ring-red-300',
        emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
        blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300',
    };
    const iconColors = {
        red: 'bg-red-100 text-red-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
    };
    const color = confirmColor || 'blue';
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${iconColors[color]}`}>
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-500 mb-6">{message}</p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors text-sm focus:ring-4 ${colors[color]}`}
                        >
                            {confirmLabel || 'ตกลง'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Custom Prompt Modal Component ---
function PromptModal({ open, title, message, placeholder, confirmLabel, confirmColor, onConfirm, onCancel }: {
    open: boolean;
    title: string;
    message: string;
    placeholder?: string;
    confirmLabel?: string;
    confirmColor?: 'red' | 'emerald' | 'blue';
    onConfirm: (text: string) => void;
    onCancel: () => void;
}) {
    const [text, setText] = useState('');

    useEffect(() => {
        if (open) setText('');
    }, [open]);

    if (!open) return null;
    const colors = {
        red: 'bg-red-600 hover:bg-red-700 focus:ring-red-300',
        emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
        blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300',
    };
    const iconColors = {
        red: 'bg-red-100 text-red-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
    };
    const color = confirmColor || 'blue';
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${iconColors[color]}`}>
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{message}</p>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-6 resize-none text-left"
                        rows={3}
                        placeholder={placeholder || 'ระบุเหตุผล...'}
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={() => onConfirm(text)}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors text-sm focus:ring-4 ${colors[color]}`}
                        >
                            {confirmLabel || 'ตกลง'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

type PettyCash = {
    id: number;
    request_number: string;
    requested_by: string;
    purpose: string;
    requested_amount: number;
    dispensed_amount: number | null;
    actual_spent: number | null;
    change_returned: number | null;
    receipt_urls: string | null;
    notes: string | null;
    status: string;
    has_original_receipt: boolean;
    created_at: Date;
    updated_at: Date;
    dispensed_at: Date | null;
    cleared_at: Date | null;
    reconciled_at: Date | null;
};

export default function PettyCashClient() {
    const [requests, setRequests] = useState<PettyCash[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [isApprover, setIsApprover] = useState<boolean>(false);
    const [currentTab, setCurrentTab] = useState('active'); // active, history
    const { showToast } = useToast();

    const isAdminOrAccounting = ['admin', 'manager', 'accounting'].includes(userRole);

    // Modals
    const [showDispenseModal, setShowDispenseModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PettyCash | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        purpose: '',
        requested_amount: '',
        dispensed_amount: '',
        actual_spent: '',
        notes: ''
    });

    const [files, setFiles] = useState<FileList | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        confirmColor?: 'red' | 'emerald' | 'blue';
    }>({ open: false, title: '', message: '' });
    const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);

    const openConfirm = useCallback((title: string, message: string, confirmLabel?: string, confirmColor?: 'red' | 'emerald' | 'blue'): Promise<boolean> => {
        return new Promise(resolve => {
            confirmResolveRef.current = resolve;
            setConfirmModal({ open: true, title, message, confirmLabel, confirmColor });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        confirmResolveRef.current?.(true);
        setConfirmModal(prev => ({ ...prev, open: false }));
    }, []);

    const handleCancel = useCallback(() => {
        confirmResolveRef.current?.(false);
        setConfirmModal(prev => ({ ...prev, open: false }));
    }, []);

    // Custom prompt modal state
    const [promptModal, setPromptModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        placeholder?: string;
        confirmLabel?: string;
        confirmColor?: 'red' | 'emerald' | 'blue';
    }>({ open: false, title: '', message: '' });
    const promptResolveRef = useRef<((v: string | null) => void) | null>(null);

    const openPrompt = useCallback((title: string, message: string, placeholder?: string, confirmLabel?: string, confirmColor?: 'red' | 'emerald' | 'blue'): Promise<string | null> => {
        return new Promise(resolve => {
            promptResolveRef.current = resolve;
            setPromptModal({ open: true, title, message, placeholder, confirmLabel, confirmColor });
        });
    }, []);

    const handlePromptConfirm = useCallback((text: string) => {
        promptResolveRef.current?.(text);
        setPromptModal(prev => ({ ...prev, open: false }));
    }, []);

    const handlePromptCancel = useCallback(() => {
        promptResolveRef.current?.(null);
        setPromptModal(prev => ({ ...prev, open: false }));
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const session = await getSession();
        if (session?.user) {
            setUserRole((session.user as any).role?.toLowerCase() || '');
            setUserName(session.user.name || '');
            setIsApprover((session.user as any).is_approver === true);
        }

        const res = await getPettyCashRequests();
        if (res.success && res.data) {
            setRequests(res.data as any);
        } else {
            showToast(res.error || 'โหลดข้อมูลล้มเหลว', 'error');
        }
        setLoading(false);
    };

    const isAccountingOrAdmin = ['admin', 'accounting'].includes(userRole);

    const filteredRequests = requests.filter(req => {
        if (currentTab === 'active') {
            return ['pending', 'dispensed', 'clearing'].includes(req.status);
        } else {
            return ['reconciled', 'rejected'].includes(req.status);
        }
    });

    // Handlers
    const handleDispense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;
        setIsSubmitting(true);
        const res = await dispensePettyCash(selectedRequest.id, Number(formData.dispensed_amount), formData.notes);
        if (res.success) {
            showToast('จ่ายเงินสดย่อยสำเร็จ', 'success');
            setShowDispenseModal(false);
            loadData();
        } else {
            showToast(res.error || 'การจ่ายเงินล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleApprove = async (id: number) => {
        const ok = await openConfirm('ยืนยันการอนุมัติ', 'คุณต้องการอนุมัติคำขอเบิกเงินสดย่อยนี้ใช่หรือไม่?', 'อนุมัติ', 'emerald');
        if (!ok) return;
        setIsSubmitting(true);
        const res = await approvePettyCash(id);
        if (res.success) {
            showToast('อนุมัติคำขอสำเร็จ', 'success');
            loadData();
        } else {
            showToast(res.error || 'การอนุมัติล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleClearance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;
        setIsSubmitting(true);

        const fd = new FormData();
        fd.append('actual_spent', formData.actual_spent);
        fd.append('notes', formData.notes);
        if (files) {
            for (let i = 0; i < files.length; i++) {
                fd.append('receipts', files[i]);
            }
        }

        const res = await submitClearance(selectedRequest.id, fd);
        if (res.success) {
            showToast('ส่งเคลียร์เงินสำเร็จ', 'success');
            setShowClearModal(false);
            loadData();
        } else {
            showToast(res.error || 'ส่งเอกสารเคลียร์เงินล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleReconcile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;
        setIsSubmitting(true);

        const res = await reconcilePettyCash(selectedRequest.id, formData.notes);
        if (res.success) {
            showToast('ปิดยอด (Reconcile) สำเร็จ', 'success');
            setShowReconcileModal(false);
            loadData();
        } else {
            showToast(res.error || 'การปิดยอดสดย่อยล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        const text = await openPrompt('ปฏิเสธการจ่ายเงิน', 'คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำขอเบิกเงินนี้?', 'ระบุเหตุผล...', 'ปฏิเสธ', 'red');
        if (text === null) return;
        setIsSubmitting(true);
        const reason = text.trim() !== '' ? `ปฏิเสธโดยบัญชี: ${text}` : 'ปฏิเสธโดยบัญชี';
        const res = await rejectPettyCash(selectedRequest.id, reason);
        if (res.success) {
            showToast('ปฏิเสธคำขอแล้ว', 'success');
            setShowDispenseModal(false);
            loadData();
        } else {
            showToast(res.error || 'การปฏิเสธคำขอล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleDirectReject = async (id: number) => {
        const text = await openPrompt('ไม่อนุมัติคำขอ', 'คุณต้องการไม่อนุมัติ (ตีตก) คำขอเบิกเงินสดย่อยนี้ใช่หรือไม่? สามารถระบุเหตุผลได้', 'ระบุเหตุผลที่ไม่ใช่อนุมัติ...', 'ไม่อนุมัติ', 'red');
        if (text === null) return;
        setIsSubmitting(true);
        const reason = text.trim() !== '' ? `ไม่อนุมัติโดยผู้จัดการ: ${text}` : 'ไม่อนุมัติโดยผู้จัดการ';
        const res = await rejectPettyCash(id, reason);
        if (res.success) {
            showToast('ไม่อนุมัติคำขอแล้ว', 'success');
            loadData();
        } else {
            showToast(res.error || 'การดำเนินการล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        const ok = await openConfirm('ลบคำขอ', 'ลบคำขอนี้อย่างถาวรหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้', 'ลบถาวร', 'red');
        if (!ok) return;
        const res = await deletePettyCashRequest(id);
        if (res.success) {
            showToast('ลบคำขอสำเร็จ', 'success');
            loadData();
        } else {
            showToast(res.error || 'การลบล้มเหลว', 'error');
        }
    };

    const handleVerifyReceipt = async (id: number, currentStatus: boolean) => {
        try {
            const newStatus = !currentStatus;
            // Optimistic update
            setRequests(prev => prev.map(r => r.id === id ? { ...r, has_original_receipt: newStatus } : r));

            const res = await verifyOriginalReceipt(id, newStatus);
            if (!res.success) {
                // Revert on failure
                setRequests(prev => prev.map(r => r.id === id ? { ...r, has_original_receipt: currentStatus } : r));
                showToast(res.error || 'ไม่สามารถอัปเดตสถานะใบเสร็จได้', 'error');
            } else {
                showToast(newStatus ? 'รับเอกสารตัวจริงแล้ว' : 'ยกเลิกการรับเอกสารตัวจริง', 'success');
            }
        } catch (error) {
            console.error(error);
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    };

    // UI Helpers
    const renderPurposeDetails = (purpose: string) => {
        if (!purpose) return null;
        return purpose.split('\n').map((line, idx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={idx} className={`${line.trim() === '' ? 'h-2' : 'min-h-[1.5rem]'} ${line.startsWith('**รายการค่าใช้จ่าย:**') ? 'mt-2 mb-1 font-semibold text-gray-800' : 'text-gray-600'}`}>
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="text-gray-800">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </div>
            );
        });
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: { class: 'bg-yellow-100 text-yellow-800', label: 'รออนุมัติ' },
            approved: { class: 'bg-emerald-100 text-emerald-800', label: 'อนุมัติแล้ว' },
            dispensed: { class: 'bg-blue-100 text-blue-800', label: 'จ่ายเงินแล้ว' },
            clearing: { class: 'bg-indigo-100 text-indigo-800', label: 'รอตรวจเคลียร์' },
            reconciled: { class: 'bg-green-100 text-green-800', label: 'ปิดยอดแล้ว' },
            rejected: { class: 'bg-red-100 text-red-800', label: 'ถูกปฏิเสธ' }
        };
        const st = styles[status as keyof typeof styles] || { class: 'bg-gray-100 text-gray-800', label: status };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${st.class}`}>{st.label}</span>;
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">เงินสดย่อย (Petty Cash)</h1>
                    <p className="text-sm text-gray-500">จัดการการเบิกเงินสดสำรองจ่ายและเคลียร์เงิน</p>
                </div>
                <div className="flex gap-3">
                    {isAdminOrAccounting && (
                        <Link
                            href="/petty-cash/dashboard"
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                        >
                            <FileText className="w-5 h-5 mr-2" /> ภาพรวมเงินสดย่อย
                        </Link>
                    )}
                    <Link
                        href="/petty-cash/new"
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5 mr-2" /> เบิกเงินสดย่อย
                    </Link>
                </div>
            </div>

            {/* Fund Display */}
            <PettyCashFundDisplay isAdminOrAccounting={isAdminOrAccounting} />

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setCurrentTab('active')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'active'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        กำลังดำเนินการ
                    </button>
                    <button
                        onClick={() => setCurrentTab('history')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'history'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        ประวัติ
                    </button>
                </nav>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้เบิก</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เอกสารตัวจริง</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">กำลังโหลด...</td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">ไม่พบข้อมูลคำขอ</td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {req.request_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {req.requested_by}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {req.purpose?.replace(/\*\*/g, '')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ฿{Number(req.dispensed_amount || req.requested_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                            {/* Receipt Toggle logic */}
                                            {isAdminOrAccounting ? (
                                                <button
                                                    onClick={() => handleVerifyReceipt(req.id, req.has_original_receipt)}
                                                    className={`p-1.5 rounded-full transition-colors ${req.has_original_receipt ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                    title={req.has_original_receipt ? "ได้รับเอกสารแล้ว (คลิกเพื่อยกเลิก)" : "ยังไม่ได้รับเอกสาร (คลิกเพื่อยืนยันว่าได้รับแล้ว)"}
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <span className={`inline-flex p-1.5 rounded-full ${req.has_original_receipt ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`} title={req.has_original_receipt ? "บัญชีได้รับเอกสารแล้ว" : "บัญชียังไม่ได้รับเอกสาร"}>
                                                    <CheckCircle className="w-5 h-5" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {/* Action Buttons Logic */}
                                            <Link href={`/petty-cash/${req.id}/print`} className="text-gray-600 hover:text-blue-600 mr-3" title="🖨️ พิมพ์/เซ็นใบเบิก">
                                                <Printer className="w-4 h-4 inline" />
                                            </Link>
                                            <button onClick={() => { setSelectedRequest(req); setShowDetailsModal(true); }} className="text-gray-600 hover:text-gray-900 mr-3" title="ดูรายละเอียด">
                                                <ExternalLink className="w-4 h-4 inline" />
                                            </button>
                                            {req.status === 'pending' && (isApprover || userRole === 'admin' || userRole === 'manager') && (
                                                <>
                                                    <button onClick={() => handleApprove(req.id)} className="text-emerald-600 hover:text-emerald-900 mr-3">อนุมัติ</button>
                                                    <button onClick={() => handleDirectReject(req.id)} className="text-orange-600 hover:text-orange-900 mr-3">ไม่อนุมัติ</button>
                                                </>
                                            )}
                                            {['pending', 'approved'].includes(req.status) && isAccountingOrAdmin && (
                                                <button onClick={() => { setSelectedRequest(req); setFormData({ ...formData, dispensed_amount: String(req.requested_amount) }); setShowDispenseModal(true); }} className="text-blue-600 hover:text-blue-900 mr-3">จ่ายเงิน</button>
                                            )}
                                            {req.status === 'dispensed' && (userName === req.requested_by || isAccountingOrAdmin) && (
                                                <button onClick={() => { setSelectedRequest(req); setFormData({ ...formData, actual_spent: String(req.dispensed_amount) }); setShowClearModal(true); }} className="text-indigo-600 hover:text-indigo-900 mr-3">เคลียร์เงิน</button>
                                            )}
                                            {req.status === 'clearing' && isAccountingOrAdmin && (
                                                <button onClick={() => { setSelectedRequest(req); setShowReconcileModal(true); }} className="text-green-600 hover:text-green-900 mr-3">ปิดยอด (Reconcile)</button>
                                            )}
                                            {req.status === 'pending' && userName === req.requested_by && !isAccountingOrAdmin && (
                                                <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-900 mr-3">ยกเลิก</button>
                                            )}
                                            {userRole === 'admin' && (
                                                <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-900" title="ลบถาวร"><Trash2 className="w-4 h-4 inline" /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dispense Modal */}
            {showDispenseModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">ยืนยันการจ่ายเงิน</h2>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm"><strong>ผู้เบิก:</strong> {selectedRequest.requested_by}</p>
                            <p className="text-sm"><strong>จำนวเงินที่ขอ:</strong> ฿{Number(selectedRequest.requested_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <div className="text-sm mt-3">
                                <strong>รายละเอียดรายการ:</strong>
                                <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                                    {selectedRequest.purpose.split('\n').map((line, idx) => {
                                        // Simple bold parser for **text**
                                        const parts = line.split(/(\*\*.*?\*\*)/g);
                                        return (
                                            <div key={idx} className={`${line.trim() === '' ? 'h-2' : 'min-h-[1.5rem]'} ${line.startsWith('**รายการค่าใช้จ่าย:**') ? 'mt-2 mb-1 font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                {parts.map((part, i) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <strong key={i} className="text-gray-800">{part.slice(2, -2)}</strong>;
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleDispense}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">จ่ายเงินจริง (บาท)</label>
                                    <input type="number" step="0.01" required value={formData.dispensed_amount} onChange={e => setFormData({ ...formData, dispensed_amount: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">หมายเหตุ (ถ้ามี)</label>
                                    <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button type="button" onClick={handleReject} disabled={isSubmitting} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50">ปฏิเสธ</button>
                                <div className="space-x-3">
                                    <button type="button" onClick={() => setShowDispenseModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
                                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">ยืนยันการจ่าย</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Clear Advance Modal */}
            {showClearModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">เคลียร์เงิน / ส่งใบเสร็จ</h2>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex justify-between">
                            <div>
                                <p className="text-sm text-gray-500">เงินที่ได้รับไป</p>
                                <p className="text-lg font-bold">฿{Number(selectedRequest.dispensed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">เงินทอนที่ต้องคืน</p>
                                <p className="text-lg font-bold text-blue-600">
                                    ฿{Math.max(0, Number(selectedRequest.dispensed_amount) - Number(formData.actual_spent || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleClearance}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ยอดที่จ่ายจริงตามใบเสร็จ (บาท)</label>
                                    <input type="number" step="0.01" required value={formData.actual_spent} onChange={e => setFormData({ ...formData, actual_spent: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">แนบใบเสร็จ (รูปภาพ/PDF ไม่เกิน 5MB)</label>
                                    <input type="file" multiple accept="image/*,.pdf" onChange={e => setFiles(e.target.files)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                                    <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowClearModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">ยืนยันเคลียร์บิล</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reconcile Modal */}
            {showReconcileModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">กระทบยอดและตรวจรับ (Reconcile)</h2>
                        <div className="mb-4 space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between"><span>เงินที่จ่ายไป:</span> <strong>฿{Number(selectedRequest.dispensed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between"><span>ใบเสร็จที่ใช้จริง:</span> <strong>฿{Number(selectedRequest.actual_spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between text-blue-600 border-t pt-2"><span>เงินทอนที่คืนมา:</span> <strong>฿{Number(selectedRequest.change_returned).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                        </div>

                        {selectedRequest.receipt_urls && (
                            <div className="mb-4">
                                <p className="font-medium text-sm mb-2">ใบเสร็จแนบมาด้วย:</p>
                                <div className="space-y-1">
                                    {JSON.parse(selectedRequest.receipt_urls).map((url: string, i: number) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                                            <FileText className="w-4 h-4 mr-1" /> ดูใบเสร็จที่ {i + 1}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleReconcile}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">บันทึกของบัญชีผู้ตรวจ (ถ้ามี)</label>
                                    <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="เช่น ได้รับเงินทอนเรียบร้อย"></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowReconcileModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"><CheckCircle className="w-4 h-4 inline mr-1" /> ยืนยันปิดยอด</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h2 className="text-xl font-bold flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-600" /> รายละเอียดคำขอเบิกเงินสดย่อย</h2>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 mb-1">เลขที่คำขอ</p>
                                    <p className="font-semibold">{selectedRequest.request_number}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 mb-1">สถานะ</p>
                                    <div>{getStatusBadge(selectedRequest.status)}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 mb-1">ผู้เบิก</p>
                                    <p className="font-semibold">{selectedRequest.requested_by}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 mb-1">วันที่ขอ (สร้าง)</p>
                                    <p className="font-semibold">{new Date(selectedRequest.created_at).toLocaleString('th-TH')}</p>
                                </div>
                            </div>

                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">รายการเบิก</h3>
                                {renderPurposeDetails(selectedRequest.purpose)}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-blue-600 mb-1 font-medium">ยอดเงินที่ขอเบิก</p>
                                    <p className="text-xl font-bold text-blue-700">฿{Number(selectedRequest.requested_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                {selectedRequest.dispensed_amount && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                                        <p className="text-emerald-600 mb-1 font-medium">ยอดเงินที่จ่ายจริง</p>
                                        <p className="text-xl font-bold text-emerald-700">฿{Number(selectedRequest.dispensed_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                )}
                            </div>

                            {selectedRequest.notes && (
                                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-100 mt-4">
                                    <strong>หมายเหตุ:</strong> {selectedRequest.notes}
                                </div>
                            )}

                            {selectedRequest.receipt_urls && (
                                <div className="mt-4 border-t pt-4">
                                    <h3 className="font-semibold text-gray-800 mb-2">เอกสารแนบ (ใบเสร็จ/อื่นๆ)</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {JSON.parse(selectedRequest.receipt_urls).map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center p-2 border rounded-md hover:bg-gray-50 transition text-sm text-blue-600 group">
                                                <div className="p-2 bg-blue-100 rounded-md mr-3 group-hover:bg-blue-200 transition">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span className="truncate">ดูเอกสารแนบที่ {i + 1}</span>
                                                <ExternalLink className="w-3 h-3 ml-auto text-gray-400 group-hover:text-blue-500" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t pt-4 flex justify-end">
                            <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            <ConfirmModal
                open={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                confirmColor={confirmModal.confirmColor}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />

            {/* Custom Prompt Modal */}
            <PromptModal
                open={promptModal.open}
                title={promptModal.title}
                message={promptModal.message}
                placeholder={promptModal.placeholder}
                confirmLabel={promptModal.confirmLabel}
                confirmColor={promptModal.confirmColor}
                onConfirm={handlePromptConfirm}
                onCancel={handlePromptCancel}
            />
        </div>
    );
}
