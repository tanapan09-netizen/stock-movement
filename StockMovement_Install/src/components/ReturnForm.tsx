'use client';

import { useState } from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import ToastNotification from './ToastNotification';

interface BorrowItem {
    id: number;
    p_id: string;
    qty: number;
    unit: string | null;
    returned_qty?: number;
}

interface ReturnFormProps {
    requestId: number;
    items: BorrowItem[];
    productMap: Record<string, string>;
}

export default function ReturnForm({ requestId, items, productMap }: ReturnFormProps) {
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [returnQty, setReturnQty] = useState<Record<number, number>>(() => {
        const initial: Record<number, number> = {};
        items.forEach(item => {
            const remaining = item.qty - (item.returned_qty || 0);
            initial[item.id] = remaining;
        });
        return initial;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const handleQuantityChange = (itemId: number, value: number, maxQty: number) => {
        const qty = Math.max(0, Math.min(value, maxQty));
        setReturnQty(prev => ({ ...prev, [itemId]: qty }));
    };

    const totalReturning = Object.values(returnQty).reduce((sum, qty) => sum + qty, 0);

    const handleSubmit = async () => {
        if (totalReturning === 0) {
            showToast('กรุณาระบุจำนวนสินค้าที่ต้องการคืน', 'error');
            return;
        }
        setShowConfirm(true);
    };

    const confirmReturn = async () => {
        setShowConfirm(false);
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/borrow/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    returnDate,
                    items: Object.entries(returnQty)
                        .filter(([_, qty]) => qty > 0)
                        .map(([itemId, qty]) => ({ itemId: parseInt(itemId), qty }))
                })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('คืนสินค้าสำเร็จ', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(data.error || 'เกิดข้อผิดพลาดในการคืนสินค้า', 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <ToastNotification
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-bold text-gray-700 mb-4">การจัดการคืน</h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        วันที่คืน
                    </label>
                    <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value || new Date().toISOString().split('T')[0])}
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        จำนวนที่คืน (แต่ละรายการ)
                    </label>
                    <div className="space-y-3">
                        {items.map(item => {
                            const remaining = item.qty - (item.returned_qty || 0);
                            if (remaining <= 0) return null;

                            return (
                                <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{productMap[item.p_id] || item.p_id}</div>
                                        <div className="text-xs text-gray-500">คงเหลือ: {remaining} {item.unit}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max={remaining}
                                            value={returnQty[item.id] || 0}
                                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0, remaining)}
                                            className="w-20 text-center rounded-lg border border-gray-300 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-500">{item.unit}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || totalReturning === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition disabled:opacity-50"
                >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    {isSubmitting ? 'กำลังดำเนินการ...' : `แจ้งคืนสินค้า (${totalReturning} ชิ้น)`}
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                    ระบุจำนวนที่ต้องการคืนสำหรับแต่ละรายการ
                </p>
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการคืนสินค้า</h3>
                            <p className="text-gray-500">กรุณาตรวจสอบข้อมูลก่อนยืนยัน</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">วันที่คืน:</span>
                                <span className="font-semibold text-gray-800">
                                    {new Date(returnDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">จำนวนรวมที่คืน:</span>
                                <span className="font-semibold text-blue-600">{totalReturning} ชิ้น</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-3 mb-6 max-h-40 overflow-y-auto">
                            {items.filter(item => (returnQty[item.id] || 0) > 0).map(item => (
                                <div key={item.id} className="flex justify-between py-1 text-sm">
                                    <span className="text-gray-700">{productMap[item.p_id]}</span>
                                    <span className="font-semibold text-blue-700">{returnQty[item.id]} {item.unit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={confirmReturn}
                                disabled={isSubmitting}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                ยืนยันคืน
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
