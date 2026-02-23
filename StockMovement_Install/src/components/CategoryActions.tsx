'use client';

import { useState } from 'react';
import { Edit2, Trash2, MoreVertical } from 'lucide-react';
import { deleteCategory } from '@/actions/categoryActions';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import Link from 'next/link';

type Category = {
    cat_id: number;
    cat_name: string;
};

export default function CategoryActions({ category, productCount, isAdmin = false }: { category: Category; productCount: number; isAdmin?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();
    const { showConfirm, showToast } = useToast();

    // Hide actions for non-admin users
    if (!isAdmin) return null;

    const handleDelete = async () => {
        setIsOpen(false);

        if (productCount > 0) {
            showToast(`ไม่สามารถลบได้ มีสินค้า ${productCount} รายการในหมวดหมู่นี้`, 'error');
            return;
        }

        const confirmed = await showConfirm({
            title: 'ยืนยันการลบหมวดหมู่',
            message: `คุณต้องการลบหมวดหมู่ "${category.cat_name}" หรือไม่?`,
            confirmText: 'ลบ',
            cancelText: 'ยกเลิก',
            type: 'danger'
        });

        if (!confirmed) return;

        setIsPending(true);
        const result = await deleteCategory(category.cat_id);

        if (result?.error) {
            showToast(result.error, 'error');
        } else {
            showToast(`ลบหมวดหมู่ "${category.cat_name}" สำเร็จ`, 'success');
            router.refresh();
        }
        setIsPending(false);
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
                <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-10 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                        <Link
                            href={`/categories/${category.cat_id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                            <Edit2 className="w-4 h-4" /> แก้ไข
                        </Link>
                        <button
                            onClick={handleDelete}
                            disabled={productCount > 0}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" /> ลบ
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
