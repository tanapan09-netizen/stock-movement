'use client';

interface RejectApprovalModalProps {
    isOpen: boolean;
    reason: string;
    onReasonChange: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function RejectApprovalModal({
    isOpen,
    reason,
    onReasonChange,
    onCancel,
    onConfirm
}: RejectApprovalModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm my-auto overflow-hidden p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">ไม่อนุมัติคำขอ</h2>
                <textarea
                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                    rows={3}
                    placeholder="โปรดระบุเหตุผลที่ไม่อนุมัติ"
                    value={reason}
                    onChange={(e) => onReasonChange(e.target.value)}
                />
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition"
                    >
                        ยืนยันไม่อนุมัติ
                    </button>
                </div>
            </div>
        </div>
    );
}

