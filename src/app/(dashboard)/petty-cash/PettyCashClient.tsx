'use client';

import React, { useState, useEffect } from 'react';
import {
    getPettyCashRequests,
    createPettyCashRequest,
    dispensePettyCash,
    submitClearance,
    reconcilePettyCash,
    rejectPettyCash,
    deletePettyCashRequest
} from '@/actions/pettyCashActions';
import { getSession } from 'next-auth/react';
import {
    Plus, DollarSign, CheckCircle, Clock, Search, ExternalLink, Trash2, XCircle, FileText
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

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
    const [currentTab, setCurrentTab] = useState('active'); // active, history
    const { showToast } = useToast();

    // Modals
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showDispenseModal, setShowDispenseModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const session = await getSession();
        if (session?.user) {
            setUserRole((session.user as any).role?.toLowerCase() || '');
            setUserName(session.user.name || '');
        }

        const res = await getPettyCashRequests();
        if (res.success && res.data) {
            setRequests(res.data as any);
        } else {
            showToast(res.error || 'โหลดข้อมูลล้มเหลว', 'error');
        }
        setLoading(false);
    };

    const isAccountingOrAdmin = ['admin', 'manager', 'accounting'].includes(userRole);

    const filteredRequests = requests.filter(req => {
        if (currentTab === 'active') {
            return ['pending', 'dispensed', 'clearing'].includes(req.status);
        } else {
            return ['reconciled', 'rejected'].includes(req.status);
        }
    });

    // Handlers
    const handleRequestCash = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const fd = new FormData();
        fd.append('purpose', formData.purpose);
        fd.append('requested_amount', formData.requested_amount);

        const res = await createPettyCashRequest(fd);
        if (res.success) {
            showToast('ส่งคำขอเบิกเงินสำเร็จ', 'success');
            setShowRequestModal(false);
            setFormData({ ...formData, purpose: '', requested_amount: '' });
            loadData();
        } else {
            showToast(res.error || 'ส่งคำขอล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

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
        if (!selectedRequest || !confirm('คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำขอนี้?')) return;
        setIsSubmitting(true);
        const res = await rejectPettyCash(selectedRequest.id, formData.notes);
        if (res.success) {
            showToast('ปฏิเสธคำขอแล้ว', 'success');
            setShowDispenseModal(false);
            loadData();
        } else {
            showToast(res.error || 'การปฏิเสธคำขอล้มเหลว', 'error');
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('ลบคำขอนี้อย่างถาวรหรือไม่?')) return;
        const res = await deletePettyCashRequest(id);
        if (res.success) {
            showToast('ลบคำขอสำเร็จ', 'success');
            loadData();
        } else {
            showToast(res.error || 'การลบล้มเหลว', 'error');
        }
    };

    // UI Helpers
    const getStatusBadge = (status: string) => {
        const styles = {
            pending: { class: 'bg-yellow-100 text-yellow-800', label: 'รออนุมัติ' },
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
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5 mr-2" /> เบิกเงินสดย่อย
                </button>
            </div>

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
                                            {req.purpose}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ฿{Number(req.dispensed_amount || req.requested_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(req.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {/* Action Buttons Logic */}
                                            {req.status === 'pending' && isAccountingOrAdmin && (
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
                                            {isAccountingOrAdmin && ['pending', 'dispensed', 'clearing', 'reconciled'].includes(req.status) && (
                                                <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4 inline" /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">ขอเบิกเงินสดย่อย</h2>
                        <form onSubmit={handleRequestCash}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">จำนวนเงินที่ต้องการจัดสรร (บาท)</label>
                                    <input type="number" step="0.01" required value={formData.requested_amount} onChange={e => setFormData({ ...formData, requested_amount: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">จุดประสงค์ / รายการที่จะซื้อ</label>
                                    <textarea required rows={3} value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">ยกเลิก</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">บันทึกคำขอ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dispense Modal */}
            {showDispenseModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">ยืนยันการจ่ายเงิน</h2>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm"><strong>ผู้เบิก:</strong> {selectedRequest.requested_by}</p>
                            <p className="text-sm"><strong>จำนวเงินที่ขอ:</strong> ฿{Number(selectedRequest.requested_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <p className="text-sm"><strong>รายการ:</strong> {selectedRequest.purpose}</p>
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
        </div>
    );
}
