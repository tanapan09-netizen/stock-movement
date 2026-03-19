'use client';

import { Plus, XCircle } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { ApprovalFormData } from '../types';
import { FormEvent } from 'react';

interface JobOption {
    value: string;
    label: string;
}

interface CreateApprovalModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    formData: ApprovalFormData;
    jobOptions: JobOption[];
    onClose: () => void;
    onSubmit: (e: FormEvent) => void;
    onChange: (patch: Partial<ApprovalFormData>) => void;
}

export default function CreateApprovalModal({
    isOpen,
    isSubmitting,
    formData,
    jobOptions,
    onClose,
    onSubmit,
    onChange
}: CreateApprovalModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg my-auto overflow-visible animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Plus size={20} className="text-indigo-600" />
                        สร้างคำขออนุมัติ
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <XCircle size={24} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">ประเภทคำขอ *</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                value={formData.request_type}
                                onChange={e => onChange({ request_type: e.target.value })}
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
                                onChange={e => onChange({ request_date: e.target.value })}
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
                                    onChange={e => onChange({ start_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">เวลาสิ้นสุด *</label>
                                <input
                                    type="time"
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    value={formData.end_time}
                                    onChange={e => onChange({ end_time: e.target.value })}
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
                                onChange={e => onChange({ amount: e.target.value })}
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
                            onChange={e => onChange({ reason: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                            <span>อ้างอิงงานซ่อม (ถ้ามี)</span>
                            <span className="text-xs text-gray-500 font-normal">ตัวเลือก</span>
                        </label>
                        <SearchableSelect
                            options={jobOptions}
                            value={formData.reference_job}
                            onChange={(val) => onChange({ reference_job: val })}
                            placeholder="เว้นว่างได้ หรือ ค้นหารหัสงาน"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
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
    );
}
