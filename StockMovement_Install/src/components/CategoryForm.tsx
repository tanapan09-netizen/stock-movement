'use client';

import { useState, useRef } from 'react';
import { createCategory, updateCategory } from '@/actions/categoryActions';
import { Save, X, Tag } from 'lucide-react';
import { useToast } from './ToastProvider';
import { useRouter } from 'next/navigation';

type Category = {
    cat_id: number;
    cat_name: string;
    cat_desc: string | null;
};

export default function CategoryForm({ category }: { category?: Category }) {
    const [isPending, setIsPending] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const { showConfirm, showToast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(formRef.current!);
        const name = formData.get('cat_name') as string;

        const confirmed = await showConfirm({
            title: category ? 'ยืนยันการแก้ไข' : 'ยืนยันการเพิ่มหมวดหมู่',
            message: category
                ? `ต้องการบันทึกการแก้ไขหมวดหมู่ "${name}" หรือไม่?`
                : `ต้องการเพิ่มหมวดหมู่ "${name}" หรือไม่?`,
            confirmText: 'บันทึก',
            cancelText: 'ยกเลิก',
            type: 'info'
        });

        if (!confirmed) return;

        setIsPending(true);

        let result;
        if (category) {
            formData.append('cat_id', category.cat_id.toString());
            result = await updateCategory(formData);
        } else {
            result = await createCategory(formData);
        }

        if (result?.error) {
            showToast(result.error, 'error');
            setIsPending(false);
        } else {
            showToast(category ? 'แก้ไขหมวดหมู่สำเร็จ' : 'เพิ่มหมวดหมู่สำเร็จ', 'success');
            router.push('/categories');
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Tag className="w-6 h-6" />
                    {category ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                </h2>
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหมวดหมู่ *</label>
                    <input
                        type="text"
                        name="cat_name"
                        required
                        defaultValue={category?.cat_name || ''}
                        placeholder="เช่น อุปกรณ์สำนักงาน"
                        className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                    <textarea
                        name="cat_desc"
                        rows={3}
                        defaultValue={category?.cat_desc || ''}
                        placeholder="อธิบายเพิ่มเติมเกี่ยวกับหมวดหมู่นี้"
                        className="w-full border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    ></textarea>
                </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button type="button" onClick={() => router.back()} className="px-4 py-2.5 border rounded-lg hover:bg-white transition text-gray-700 flex items-center">
                    <X className="w-4 h-4 mr-2" /> ยกเลิก
                </button>
                <button type="submit" disabled={isPending} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center disabled:opacity-50">
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
            </div>
        </form>
    );
}
