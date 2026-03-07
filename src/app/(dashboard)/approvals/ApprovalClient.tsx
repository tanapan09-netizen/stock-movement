'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Plus, CheckCircle, XCircle, Clock, FileText, Calendar, DollarSign, Search } from 'lucide-react';
import { createApprovalRequest, updateApprovalStatus } from '@/actions/approvalActions';
import SearchableSelect from '@/components/SearchableSelect';

interface ApprovalClientProps {
    initialRequests: any[];
    activeJobs: any[];
    canApprove: boolean;
    currentUserId: number;
}

export default function ApprovalClient({ initialRequests, activeJobs, canApprove, currentUserId }: ApprovalClientProps) {
    const { showToast } = useToast();
    const [requests, setRequests] = useState(initialRequests);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // Reject Modal state
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const [formData, setFormData] = useState({
        request_type: 'ot',
        request_date: new Date().toISOString().slice(0, 10),
        start_time: '',
        end_time: '',
        amount: '',
        reason: '',
        reference_job: ''
    });

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Setup times
            let st = null;
            let et = null;
            if (formData.start_time && formData.request_date) {
                st = new Date(`${formData.request_date}T${formData.start_time}:00`);
            }
            if (formData.end_time && formData.request_date) {
                et = new Date(`${formData.request_date}T${formData.end_time}:00`);
            }

            const res = await createApprovalRequest({
                ...formData,
                start_time: st,
                end_time: et
            });

            if (res.success) {
                showToast('ส่งคำขอสำเร็จ', 'success');
                setIsModalOpen(false);
                // Simple optimstic push
                setRequests([{ ...res.data, tbl_users: { username: 'ฉันเอง' } }, ...requests]);
                // reset form
                setFormData({
                    request_type: 'ot',
                    request_date: new Date().toISOString().slice(0, 10),
                    start_time: '',
                    end_time: '',
                    amount: '',
                    reason: '',
                    reference_job: ''
                });
            } else {
                showToast(res.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAction = async (id: number, status: 'approved' | 'rejected', reason?: string) => {
        if (!confirm(`ยืนยันที่จะ ${status === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอนี้?`)) return;

        try {
            const res = await updateApprovalStatus(id, status, reason);
            if (res.success) {
                showToast('ดำเนินการสำเร็จ', 'success');
                setRequests(requests.map(r => r.request_id === id ? { ...r, status, rejection_reason: reason, approved_at: new Date() } : r));
                setRejectModalOpen(false);
                setRejectionReason('');
            } else {
                showToast(res.error || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const StatusBadge = ({ req }: { req: any }) => {
        const { status, current_step, total_steps } = req;
        const stepText = total_steps > 1 ? ` (ขั้นที่ ${current_step}/${total_steps})` : '';

        switch (status) {
            case 'approved':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><CheckCircle size={12} /> อนุมัติแล้ว</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><XCircle size={12} /> ไม่อนุมัติ</span>;
            default:
                return (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1 w-max">
                        <Clock size={12} /> รอพิจารณา{stepText}
                    </span>
                );
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'ot': return 'ล่วงเวลา (OT)';
            case 'leave': return 'ลาหยุด';
            case 'expense': return 'เบิกค่าใช้จ่าย';
            case 'other': return 'อื่นๆ';
            default: return type;
        }
    };

    const filteredRequests = requests.filter(r => {
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        return true;
    });

    const jobOptions = activeJobs.map(j => ({
        value: j.request_number,
        label: `${j.request_number} - ห้อง ${j.tbl_rooms?.room_code}: ${j.title}`
    }));

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <FileText className="text-indigo-500" />
                        ระบบขออนุมัติทั่วไป (OT/ลา/เบิก)
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">จัดการคำขออนุมัติต่างๆ และส่งแจ้งเตือนผ่าน LINE</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
                >
                    <Plus size={20} />
                    สร้างคำขอใหม่
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <select
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="all">สถานะทั้งหมด</option>
                    <option value="pending">รอพิจารณา</option>
                    <option value="approved">อนุมัติแล้ว</option>
                    <option value="rejected">ไม่อนุมัติ</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">เลขที่/วันที่</th>
                                <th className="px-6 py-4">รายละเอียดคำขอ</th>
                                <th className="px-6 py-4">ข้อมูลอ้างอิง</th>
                                <th className="px-6 py-4">สถานะ</th>
                                {canApprove && <th className="px-6 py-4 text-right">จัดการ</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                                <tr key={req.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-indigo-600 dark:text-indigo-400">{req.request_number}</div>
                                        <div className="text-xs text-gray-500 mt-1">ผู้ขอ: {req.tbl_users?.username}</div>
                                        <div className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString('th-TH')}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal min-w-[250px]">
                                        <div className="font-medium flex items-center gap-1 mb-1">
                                            {req.request_type === 'ot' && <Clock size={14} className="text-blue-500" />}
                                            {req.request_type === 'leave' && <Calendar size={14} className="text-orange-500" />}
                                            {req.request_type === 'expense' && <DollarSign size={14} className="text-green-500" />}
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
                                        {req.request_type === 'expense' && req.amount && (
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
                                    <td className="px-6 py-4">
                                        <StatusBadge req={req} />
                                        {req.status === 'rejected' && req.rejection_reason && (
                                            <div className="text-xs text-red-500 mt-1 whitespace-normal max-w-[200px] italic">
                                                เหตุผล: {req.rejection_reason}
                                            </div>
                                        )}
                                    </td>
                                    {canApprove && (
                                        <td className="px-6 py-4 text-right">
                                            {req.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(req.request_id, 'approved')}
                                                        className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md font-medium text-xs transition"
                                                    >
                                                        อนุมัติ
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRejectId(req.request_id);
                                                            setRejectModalOpen(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-medium text-xs transition"
                                                    >
                                                        ไม่อนุมัติ
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canApprove ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                                        ไม่พบข้อมูลคำขอ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus size={20} className="text-indigo-600" />
                                สร้างคำขออนุมัติ
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">ประเภทคำขอ *</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        value={formData.request_type}
                                        onChange={e => setFormData({ ...formData, request_type: e.target.value })}
                                        required
                                    >
                                        <option value="ot">ทำงานล่วงเวลา (OT)</option>
                                        <option value="leave">ลาหยุด</option>
                                        <option value="expense">เบิกค่าใช้จ่ายอื่นๆ</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">วันที่ *</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        value={formData.request_date}
                                        onChange={e => setFormData({ ...formData, request_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {formData.request_type === 'ot' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">เวลาเริ่ม *</label>
                                        <input
                                            type="time"
                                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                            value={formData.start_time}
                                            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">เวลาสิ้นสุด *</label>
                                        <input
                                            type="time"
                                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                            value={formData.end_time}
                                            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.request_type === 'expense' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">จำนวนเงิน (บาท) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">เหตุผล/รายละเอียด *</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    rows={3}
                                    placeholder="อธิบายเหตุผลในการขออนุมัติ"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                                    <span>อ้างอิงงานซ่อม (ถ้ามี)</span>
                                    <span className="text-xs text-gray-500 font-normal">ตัวเลือก</span>
                                </label>
                                <SearchableSelect
                                    options={jobOptions}
                                    value={formData.reference_job}
                                    onChange={(val) => setFormData({ ...formData, reference_job: val })}
                                    placeholder="เว้นว่างได้ หรือ ค้นหารหัสงาน"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:bg-indigo-400"
                                >
                                    {isSubmitting ? 'กำลังบันทึก...' : 'ส่งคำขอ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm my-auto overflow-hidden p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">ไม่อนุมัติคำขอ</h2>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                            rows={3}
                            placeholder="โปรดระบุเหตุผลที่ไม่อนุมัติ"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setRejectModalOpen(false);
                                    setRejectionReason('');
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >ยกเลิก</button>
                            <button
                                onClick={() => {
                                    if (!rejectionReason) return alert('โปรดระบุเหตุผล');
                                    handleAction(rejectId!, 'rejected', rejectionReason);
                                }}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition"
                            >ยืนยันไม่อนุมัติ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
