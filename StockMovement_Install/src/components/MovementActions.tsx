'use client';

import { useState } from 'react';
import { deleteMovement, updateMovement } from '@/actions/movementActions';
import { Trash2, Edit2, X, Save, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

type Movement = {
    movement_id: number;
    p_id: string;
    movement_type: string;
    quantity: number;
    remarks: string | null;
    username: string | null;
    movement_time: Date;
};

type Product = {
    p_id: string;
    p_name: string;
    p_image: string | null;
};

export default function MovementActions({
    movement,
    product,
    isAdmin
}: {
    movement: Movement;
    product?: Product;
    isAdmin: boolean;
}) {
    const router = useRouter();
    const { showToast, showConfirm } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editQuantity, setEditQuantity] = useState(movement.quantity);
    const [editRemarks, setEditRemarks] = useState(movement.remarks || '');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    if (!isAdmin) return null;

    const handleDelete = async () => {
        const isIn = movement.movement_type === 'รับเข้า' || movement.movement_type === 'in' || movement.movement_type === 'add';

        const confirmed = await showConfirm({
            title: 'ยืนยันการลบรายการเคลื่อนไหว',
            message: `สินค้า: ${product?.p_name || movement.p_id}\nประเภท: ${isIn ? 'รับเข้า' : 'เบิกออก'}\nจำนวน: ${movement.quantity}\n\n⚠️ สต็อกจะถูกปรับกลับอัตโนมัติ`,
            confirmText: 'ลบรายการ',
            cancelText: 'ยกเลิก',
            type: 'danger'
        });

        if (!confirmed) return;

        setIsPending(true);

        const formData = new FormData();
        formData.append('movement_id', movement.movement_id.toString());

        const result = await deleteMovement(formData);

        if (result?.error) {
            showToast(`ลบไม่สำเร็จ: ${result.error}`, 'error');
            setIsPending(false);
        } else {
            showToast(`ลบรายการเคลื่อนไหวสำเร็จ (สต็อกถูกปรับกลับแล้ว)`, 'success');
            router.refresh();
        }
    };

    const handleUpdate = async () => {
        setIsPending(true);
        setError('');

        const formData = new FormData();
        formData.append('movement_id', movement.movement_id.toString());
        formData.append('quantity', editQuantity.toString());
        formData.append('remarks', editRemarks);

        const result = await updateMovement(formData);

        if (result?.error) {
            showToast(`แก้ไขไม่สำเร็จ: ${result.error}`, 'error');
            setIsPending(false);
        } else {
            showToast('แก้ไขรายการเคลื่อนไหวสำเร็จ', 'success');
            setIsEditing(false);
            router.refresh();
        }
    };

    if (isEditing) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">แก้ไขรายการ</h3>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า</label>
                            <div className="bg-gray-100 px-3 py-2 rounded-lg text-gray-700">
                                {product?.p_name || movement.p_id}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน</label>
                            <input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                            <input
                                type="text"
                                value={editRemarks}
                                onChange={(e) => setEditRemarks(e.target.value)}
                                placeholder="กรอกหมายเหตุ..."
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isPending}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition"
                            >
                                <Save className="w-4 h-4" />
                                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => setIsEditing(true)}
                disabled={isPending}
                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition disabled:opacity-50"
                title="แก้ไข"
            >
                <Edit2 className="w-4 h-4" />
            </button>
            <button
                onClick={handleDelete}
                disabled={isPending}
                className="p-1.5 hover:bg-red-100 text-red-600 rounded transition disabled:opacity-50"
                title="ลบ"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
