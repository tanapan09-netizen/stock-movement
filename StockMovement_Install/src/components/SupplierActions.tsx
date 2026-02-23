'use client';

import { useState } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { deleteSupplier } from '@/actions/supplierActions';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import Link from 'next/link';

type Supplier = {
    id: number;
    name: string;
};

export default function SupplierActions({ supplier, isAdmin = false }: { supplier: Supplier; isAdmin?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();
    const { showConfirm, showToast } = useToast();

    // Hide actions for non-admin users
    if (!isAdmin) return null;

    const handleDelete = async () => {
        setIsOpen(false);

        const confirmed = await showConfirm({
            title: 'ยืนยันการลบผู้ขาย',
            message: `คุณต้องการลบผู้ขาย "${supplier.name}" หรือไม่?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`,
            confirmText: 'ลบ',
            cancelText: 'ยกเลิก',
            type: 'danger'
        });

        if (!confirmed) return;

        setIsPending(true);
        const result = await deleteSupplier(supplier.id);

        if (result?.error) {
            showToast(result.error, 'error');
        } else {
            showToast(`ลบผู้ขาย "${supplier.name}" สำเร็จ`, 'success');
            router.refresh();
        }
        setIsPending(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
                <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                        <Link
                            href={`/suppliers/${supplier.id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        >
                            <Edit2 className="w-4 h-4" />
                            แก้ไข
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 w-full"
                        >
                            <Trash2 className="w-4 h-4" />
                            ลบ
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
