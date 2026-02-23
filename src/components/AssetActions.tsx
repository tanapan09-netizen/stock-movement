'use client';

import { useState } from 'react';
import { deleteAsset } from '@/actions/assetActions';
import { Trash2, Edit2, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from './ToastProvider';

type Asset = {
    asset_id: number;
    asset_code: string;
    asset_name: string;
};

export default function AssetActions({
    asset,
    isAdmin,
    variant = 'icon'
}: {
    asset: Asset;
    isAdmin: boolean;
    variant?: 'icon' | 'button';
}) {
    const router = useRouter();
    const { showToast, showConfirm } = useToast();
    const [isPending, setIsPending] = useState(false);

    if (!isAdmin) return null;

    const handleDelete = async () => {
        const confirmed = await showConfirm({
            title: 'ยืนยันการลบทรัพย์สิน',
            message: `รหัส: ${asset.asset_code}\nชื่อ: ${asset.asset_name}\n\nทรัพย์สินที่ถูกลบจะไม่สามารถกู้คืนได้`,
            confirmText: 'ลบทรัพย์สิน',
            cancelText: 'ยกเลิก',
            type: 'danger'
        });

        if (!confirmed) return;

        setIsPending(true);

        try {
            await deleteAsset(asset.asset_id);
            showToast(`ลบทรัพย์สิน "${asset.asset_name}" สำเร็จ`, 'success');
            router.refresh();
            if (variant === 'button') {
                router.push('/assets'); // Redirect to list if deleting from detail page
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
            showToast(`ลบไม่สำเร็จ: ${errorMessage}`, 'error');
            setIsPending(false);
        }
    };

    if (variant === 'button') {
        return (
            <div className="flex gap-2">
                <Link
                    href={`/assets/${asset.asset_id}/edit`}
                    className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
                >
                    <Edit className="w-4 h-4 mr-2" /> แก้ไข
                </Link>
                <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition disabled:opacity-50"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> ลบ
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Link
                href={`/assets/${asset.asset_id}/edit`}
                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition"
                title="แก้ไข"
            >
                <Edit2 className="w-4 h-4" />
            </Link>
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
