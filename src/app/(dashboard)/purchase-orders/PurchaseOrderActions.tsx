'use client';

import { Edit, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deletePO } from '@/actions/poActions';
import { useToast } from '@/components/ToastProvider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type POListActionsProps = {
    poId: number;
    status: string;
    canView: boolean;
    canEdit: boolean; // Edit permission implies Delete permission usually, or we can separate
};

export default function PurchaseOrderActions({ poId, status, canView, canEdit }: POListActionsProps) {
    const { showConfirm, showToast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        const confirmed = await showConfirm({
            title: 'ยืนยันการลบ',
            message: 'คุณต้องการลบใบสั่งซื้อนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
            type: 'danger'
        });

        if (confirmed) {
            setIsDeleting(true);
            const res = await deletePO(poId);
            if (res.error) {
                showToast(res.error, 'error');
            } else {
                showToast('ลบใบสั่งซื้อสำเร็จ', 'success');
                router.refresh();
            }
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex items-center justify-end space-x-2">
            {canView && (
                <Link
                    href={`/purchase-orders/${poId}`}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    title="ดูรายละเอียด"
                >
                    <Eye className="w-4 h-4" />
                </Link>
            )}

            {canEdit && status !== 'received' && (
                <>
                    <Link
                        href={`/purchase-orders/${poId}/edit`}
                        className="p-1 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition"
                        title="แก้ไข"
                    >
                        <Edit className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        title="ลบ"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
}
