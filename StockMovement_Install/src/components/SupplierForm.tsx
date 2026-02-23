'use client';

import { useState, useRef } from 'react';
import { createSupplier, updateSupplier } from '@/actions/supplierActions';
import { Save, X, Building2 } from 'lucide-react';
import { useToast } from './ToastProvider';
import { useRouter } from 'next/navigation';

type Supplier = {
    id: number;
    name: string;
    tax_id: string | null;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
};

export default function SupplierForm({ supplier }: { supplier?: Supplier }) {
    const [isPending, setIsPending] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const { showConfirm, showToast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(formRef.current!);
        const name = formData.get('name') as string;

        const confirmed = await showConfirm({
            title: supplier ? 'ยืนยันการแก้ไขข้อมูล' : 'ยืนยันการเพิ่มผู้ขาย',
            message: supplier
                ? `คุณต้องการบันทึกการแก้ไขข้อมูลผู้ขาย "${name}" หรือไม่?`
                : `คุณต้องการเพิ่มผู้ขาย "${name}" หรือไม่?`,
            confirmText: 'บันทึก',
            cancelText: 'ยกเลิก',
            type: 'info'
        });

        if (!confirmed) return;

        setIsPending(true);

        let result;
        if (supplier) {
            formData.append('id', supplier.id.toString());
            result = await updateSupplier(formData);
        } else {
            result = await createSupplier(formData);
        }

        if (result?.error) {
            showToast(result.error, 'error');
            setIsPending(false);
        } else {
            showToast(supplier ? 'แก้ไขผู้ขายสำเร็จ' : 'เพิ่มผู้ขายสำเร็จ', 'success');
            router.push('/suppliers');
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    {supplier ? 'แก้ไขข้อมูลผู้ขาย' : 'เพิ่มผู้ขายใหม่'}
                </h2>
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ขาย / บริษัท *</label>
                    <input
                        type="text"
                        name="name"
                        required
                        defaultValue={supplier?.name || ''}
                        placeholder="เช่น บริษัท ABC จำกัด"
                        className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                    <input
                        type="text"
                        name="tax_id"
                        defaultValue={supplier?.tax_id || ''}
                        placeholder="เช่น 0105556000000"
                        maxLength={13}
                        className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ติดต่อ</label>
                    <input
                        type="text"
                        name="contact_name"
                        defaultValue={supplier?.contact_name || ''}
                        placeholder="ชื่อ-นามสกุล ผู้ประสานงาน"
                        className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            name="phone"
                            defaultValue={supplier?.phone || ''}
                            placeholder="02-xxx-xxxx"
                            className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                        <input
                            type="email"
                            name="email"
                            defaultValue={supplier?.email || ''}
                            placeholder="contact@company.com"
                            className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                    <textarea
                        name="address"
                        rows={3}
                        defaultValue={supplier?.address || ''}
                        placeholder="ที่อยู่สำหรับติดต่อ / จัดส่ง"
                        className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    ></textarea>
                </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2.5 border rounded-lg hover:bg-white transition text-gray-700 flex items-center"
                >
                    <X className="w-4 h-4 mr-2" /> ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
            </div>
        </form>
    );
}
