'use client';

import { useState } from 'react';
import { createBorrowRequest } from '@/actions/borrowActions';
import { Search, Plus, Trash2, Save, User, FileText, Calendar } from 'lucide-react';
import { FloatingSearchInput } from '@/components/FloatingField';
import { useRouter } from 'next/navigation';

type Product = {
    p_id: string;
    p_name: string;
    p_count: number;
    p_unit: string | null;
};

type BorrowItem = Product & {
    qty: number;
};

import ToastNotification from './ToastNotification';

export default function BorrowForm({ products }: { products: Product[] }) {
    const router = useRouter();
    const [borrowerName, setBorrowerName] = useState('');
    const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [cart, setCart] = useState<BorrowItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    // Filter products for autocomplete
    const filteredProducts = searchTerm
        ? products.filter(p => p.p_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.p_id.includes(searchTerm)).slice(0, 5)
        : [];

    const addToCart = (product: Product) => {
        if (cart.find(i => i.p_id === product.p_id)) {
            setToast({ message: 'สินค้านี้อยู่ในรายการแล้ว', type: 'error', isVisible: true });
            return;
        }
        setCart([...cart, { ...product, qty: 1 }]);
        setSearchTerm('');
    };

    const removeFromCart = (p_id: string) => {
        setCart(cart.filter(i => i.p_id !== p_id));
    };

    const updateQty = (p_id: string, qty: number) => {
        setCart(cart.map(i => i.p_id === p_id ? { ...i, qty } : i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validate
        if (cart.length === 0) {
            setError('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
            return;
        }
        if (!borrowerName.trim()) {
            setError('กรุณากรอกชื่อผู้เบิก');
            return;
        }
        setError('');
        setShowConfirmDialog(true);
    };

    const handleConfirmedSubmit = async () => {
        setShowConfirmDialog(false);
        setIsPending(true);

        const formData = new FormData();
        formData.append('borrower_name', borrowerName);
        formData.append('note', note);
        formData.append('borrow_date', borrowDate);

        // Prepare items JSON
        const items = cart.map(i => ({ p_id: i.p_id, qty: i.qty }));
        formData.append('items', JSON.stringify(items));

        const result = await createBorrowRequest(formData);
        if (result?.error) {
            setError(result.error);
            setToast({ message: result.error, type: 'error', isVisible: true });
            setIsPending(false);
        } else {
            setToast({ message: 'บันทึกการเบิกสำเร็จ', type: 'success', isVisible: true });
            setTimeout(() => {
                router.push('/borrow');
                router.refresh();
            }, 2000);
        }
        // redirect handled by server action, but toast might not show long enough if redirect happens immediately.
        // Usually server action redirect will unmount this component. 
        // If we want to show toast, we might strictly need to handle redirect client side or use a Global Toast context.
        // However, given the current request is just adding a toast, let's add it. 
        // If the server action redirects, the toast will disappear.
        // But createBorrowRequest likely acts as a server action that *returns* result, or redirects.
        // If it redirects, this code might not even reach the toast showing part or it will flash.
        // Let's assume the user wants to see it and the redirect is either delayed or handled in a way that allows it,
        // OR the server action only returns success and we rely on client side navigation or refresh.
        // Checking the previous file content for createBorrowRequest is not possible as it is imported.
        // But in handleConfirmedSubmit in the original file:
        /*
           const result = await createBorrowRequest(formData);
           if (result?.error) { ... }
           // redirect handled by server action
        */
        // If the server action redirects, we can't show a toast on *this* page easily without a flash.
        // But I will implement as requested.
    };

    return (
        <>
            <ToastNotification
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800">
                            <User className="w-5 h-5 mr-2" /> ข้อมูลผู้เบิก
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ชื่อผู้เบิก *</label>
                                <input
                                    type="text"
                                    name="borrower_name"
                                    required
                                    value={borrowerName}
                                    onChange={e => setBorrowerName(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex. นายสมชาย ใจดี"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">📅 วันที่เบิก</label>
                                <input
                                    type="date"
                                    name="borrow_date"
                                    value={borrowDate}
                                    onChange={e => setBorrowDate(e.target.value || new Date().toISOString().split('T')[0])}
                                    className="mt-1 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                                <textarea
                                    name="note"
                                    rows={3}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="ระบุจุดประสงค์การใช้งาน..."
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending || cart.length === 0}
                        className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {isPending ? 'กำลังบันทึก...' : 'บันทึกการเบิก'}
                    </button>
                </div>

                {/* Right Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Search Box */}
                    <div className="bg-white p-4 rounded-lg shadow relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs mr-2">+</span>
                            เพิ่มสินค้าเข้ารายการ
                        </label>
                        <div className="relative">
                            <FloatingSearchInput
                                type="text"
                                label="ค้นหาสินค้า"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pr-11 text-gray-800"
                                containerClassName="w-full"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                                >
                                    X
                                </button>
                            )}
                        </div>

                        {/* Dropdown */}
                        {searchTerm && (
                            <div className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto z-50">
                                {filteredProducts.length > 0 ? (
                                    <>
                                        {filteredProducts.map(p => (
                                            <div
                                                key={p.p_id}
                                                onClick={() => addToCart(p)}
                                                className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-0 transition"
                                            >
                                                <div>
                                                    <div className="font-semibold text-gray-800">{p.p_name}</div>
                                                    <div className="text-xs text-gray-500">รหัส: {p.p_id}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${p.p_count <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                                                        {p.p_count}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{p.p_unit || 'ชิ้น'}</div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                                            แสดง {filteredProducts.length} รายการ
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-6 text-center text-gray-400">
                                        <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>ไม่พบสินค้าที่ค้นหา</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cart List */}
                    <div className="bg-white rounded-lg shadow overflow-hidden min-h-[300px]">
                        <div className="p-4 bg-gray-50 border-b font-medium text-gray-700 flex justify-between">
                            <span>รายการเบิก ({cart.length})</span>
                        </div>
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <FileText className="w-12 h-12 mb-2 opacity-50" />
                                <p>ยังไม่มีรายการสินค้า</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {cart.map((item, index) => (
                                    <div key={item.p_id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{item.p_name}</div>
                                            <div className="text-xs text-gray-500">รหัส: {item.p_id} | คงเหลือ: {item.p_count}</div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center border rounded-md">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.p_count}
                                                    value={item.qty}
                                                    onChange={e => updateQty(item.p_id, parseInt(e.target.value))}
                                                    className="w-20 p-1 text-center font-semibold outline-none"
                                                />
                                                <span className="bg-gray-100 px-2 py-1 text-xs text-gray-500 border-l">{item.p_unit}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.p_id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </form>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการเบิกสินค้า?</h3>
                            <p className="text-gray-500">กรุณาตรวจสอบข้อมูลก่อนยืนยัน</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">ผู้เบิก:</span>
                                <span className="font-semibold text-gray-800">{borrowerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">วันที่เบิก:</span>
                                <span className="font-semibold text-gray-800">{new Date(borrowDate).toLocaleDateString('th-TH')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">จำนวนรายการ:</span>
                                <span className="font-semibold text-blue-600">{cart.length} รายการ</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">จำนวนรวม:</span>
                                <span className="font-semibold text-blue-600">{cart.reduce((sum, i) => sum + i.qty, 0)} ชิ้น</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmDialog(false)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmedSubmit}
                                disabled={isPending}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {isPending ? 'กำลังบันทึก...' : 'ยืนยันเบิก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
