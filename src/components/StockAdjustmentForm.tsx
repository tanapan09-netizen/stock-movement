'use client';

import { useState } from 'react';
import { adjustStock } from '@/actions/movementActions';
import { ArrowRight, CheckCircle, AlertCircle, Package, X } from 'lucide-react';
import { FloatingSearchInput } from '@/components/FloatingField';
import { useRouter } from 'next/navigation';

type Product = {
    p_id: string;
    p_name: string;
    p_count: number;
    p_image: string | null;
    p_unit: string | null;
};

interface Props {
    products: Product[];
    initialProductId?: string | null;
}

export default function StockAdjustmentForm({ products, initialProductId }: Props) {
    const router = useRouter();

    // Find initial product from prop
    const findInitialProduct = () => {
        if (initialProductId && products.length > 0) {
            return products.find(p => p.p_id === initialProductId) || null;
        }
        return null;
    };
    const initialProduct = findInitialProduct();

    const [searchTerm, setSearchTerm] = useState(
        initialProduct ? `${initialProduct.p_name} (${initialProduct.p_id})` : ''
    );
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
    const [type, setType] = useState<'in' | 'out'>('in');
    const [quantity, setQuantity] = useState(1);
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');
    const [remarks, setRemarks] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const filteredProducts = products.filter(p =>
        p.p_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.p_id.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        // Show confirmation dialog instead of submitting directly
        setShowConfirmDialog(true);
    };

    const handleConfirmedSubmit = async () => {
        setShowConfirmDialog(false);
        setStatus(null);
        if (!selectedProduct) return;

        setIsPending(true);
        const formData = new FormData();
        formData.append('p_id', selectedProduct.p_id);
        formData.append('type', type);
        formData.append('quantity', quantity.toString());
        // Combine location with remarks
        const fullRemarks = location ? `[นำไปใช้ที่: ${location}] ${remarks}` : remarks;
        formData.append('remarks', fullRemarks);
        formData.append('transaction_date', transactionDate);

        const result = await adjustStock(formData);

        if (result?.error) {
            setStatus({ type: 'error', message: result.error });
        } else {
            setStatus({ type: 'success', message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
            setQuantity(1);
            setLocation('');
            setRemarks('');
            setSelectedProduct(null);
            setSearchTerm('');
            router.refresh();
        }
        setIsPending(false);
    };

    const clearSelection = () => {
        setSelectedProduct(null);
        setSearchTerm('');
        setShowDropdown(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl mx-auto border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    ทำรายการ ปรับสต็อก / รับเข้า-เบิกออก
                </h2>
                <p className="text-blue-100 text-sm mt-1">เลือกสินค้าและกรอกจำนวนที่ต้องการ</p>
            </div>

            <div className="p-8 space-y-8">
                {status && (
                    <div className={`p-4 rounded-xl flex items-center ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {status.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
                        {status.message}
                    </div>
                )}

                {/* Step 1: Select Product */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs mr-2">1</span>
                        เลือกสินค้า
                    </label>
                    <div className="relative">
                        <FloatingSearchInput
                            type="text"
                            label="ค้นหาสินค้า"
                            className="pr-12 text-gray-900"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setSelectedProduct(null);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {searchTerm && (
                            <button
                                onClick={clearSelection}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        )}

                        {/* Beautiful Dropdown */}
                        {showDropdown && searchTerm && !selectedProduct && (
                            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                                <div className="max-h-96 overflow-y-auto">
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map((p, index) => (
                                            <div
                                                key={p.p_id}
                                                className={`p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors ${index !== filteredProducts.length - 1 ? 'border-b border-gray-50' : ''}`}
                                                onClick={() => {
                                                    setSelectedProduct(p);
                                                    setSearchTerm(`${p.p_name} (${p.p_id})`);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <div className="h-14 w-14 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                                                    {p.p_image ? (
                                                        <img src={`/uploads/${p.p_image}`} alt={p.p_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Package className="w-6 h-6 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900 truncate">{p.p_name}</div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">รหัส: {p.p_id}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className={`text-xl font-bold ${p.p_count <= 10 ? 'text-red-600' : 'text-blue-600'}`}>
                                                        {p.p_count}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{p.p_unit || 'ชิ้น'}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center">
                                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">ไม่พบสินค้าที่ค้นหา</p>
                                            <p className="text-sm text-gray-400 mt-1">ลองค้นหาด้วยคำอื่น</p>
                                        </div>
                                    )}
                                </div>
                                {filteredProducts.length > 0 && (
                                    <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
                                        แสดง {filteredProducts.length} จาก {products.length} รายการ
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {selectedProduct && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4">
                        {/* Selected Product Card */}
                        <div className="flex items-center p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                            <div className="h-16 w-16 flex-shrink-0 bg-white rounded-xl overflow-hidden shadow-sm mr-4 flex items-center justify-center">
                                {selectedProduct.p_image ? (
                                    <img src={`/uploads/${selectedProduct.p_image}`} alt={selectedProduct.p_name} className="h-full w-full object-cover" />
                                ) : (
                                    <Package className="w-8 h-8 text-blue-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs text-blue-600 font-semibold mb-0.5">สินค้าที่เลือก</div>
                                <h3 className="text-lg font-bold text-gray-900">{selectedProduct.p_name}</h3>
                                <p className="text-sm text-gray-600">รหัส: {selectedProduct.p_id}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-blue-700">{selectedProduct.p_count}</div>
                                <div className="text-xs text-blue-500 uppercase tracking-wide">คงเหลือ</div>
                            </div>
                        </div>

                        {/* Type & Quantity */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs mr-2">2</span>
                                    ประเภทรายการ
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setType('in')}
                                        className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm transition-all ${type === 'in' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-[1.02]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        ➕ รับเข้า
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('out')}
                                        className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm transition-all ${type === 'out' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-[1.02]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        ➖ เบิกออก
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs mr-2">3</span>
                                    จำนวน
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full rounded-xl border-2 border-gray-200 py-3.5 px-4 text-xl font-bold text-center focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Transaction Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs mr-2">📅</span>
                                วันที่ทำรายการ
                            </label>
                            <input
                                type="date"
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value || new Date().toISOString().split('T')[0])}
                                className="w-full rounded-xl border-2 border-gray-200 py-3.5 px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            />
                        </div>
                        {/* Location - for OUT only */}
                        {type === 'out' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs mr-2">📍</span>
                                    สถานที่นำไปใช้
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="เช่น ห้อง 101, อาคาร A, สนาม..."
                                    className="w-full rounded-xl border-2 border-gray-200 py-3.5 px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                        )}

                        {/* Remarks */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">หมายเหตุ (Optional)</label>
                            <input
                                type="text"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="เช่น เพื่อซ่อมแซม, รับจากผู้ขาย..."
                                className="w-full rounded-xl border-2 border-gray-200 py-3.5 px-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-all flex items-center justify-center gap-2 ${isPending ? 'bg-gray-400 cursor-not-allowed' :
                                type === 'in' ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/30' :
                                    'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/30'
                                }`}
                        >
                            {isPending ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    ยืนยันรายการ {type === 'in' ? 'รับเข้า' : 'เบิกออก'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Confirmation Dialog */}
                {showConfirmDialog && selectedProduct && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className={`p-6 ${type === 'in' ? 'bg-green-500' : 'bg-red-500'}`}>
                                <h3 className="text-xl font-bold text-white text-center">
                                    ยืนยันการ{type === 'in' ? 'รับเข้า' : 'เบิกออก'}
                                </h3>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="text-center">
                                    <p className="text-gray-600 mb-4">คุณต้องการทำรายการนี้หรือไม่?</p>
                                </div>

                                {/* Summary */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">สินค้า:</span>
                                        <span className="font-semibold text-gray-900">{selectedProduct.p_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">รหัส:</span>
                                        <span className="font-medium text-gray-700">{selectedProduct.p_id}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">ประเภท:</span>
                                        <span className={`font-bold ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                            {type === 'in' ? '➕ รับเข้า' : '➖ เบิกออก'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">จำนวน:</span>
                                        <span className="text-2xl font-bold text-blue-600">{quantity} {selectedProduct.p_unit || 'ชิ้น'}</span>
                                    </div>
                                    <div className="pt-3 border-t flex justify-between items-center">
                                        <span className="text-gray-500">คงเหลือหลังทำรายการ:</span>
                                        <span className={`text-xl font-bold ${type === 'in'
                                            ? 'text-green-600'
                                            : (selectedProduct.p_count - quantity) < 0
                                                ? 'text-red-600'
                                                : 'text-orange-600'
                                            }`}>
                                            {type === 'in'
                                                ? selectedProduct.p_count + quantity
                                                : selectedProduct.p_count - quantity
                                            } {selectedProduct.p_unit || 'ชิ้น'}
                                        </span>
                                    </div>
                                    {remarks && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">หมายเหตุ:</span>
                                            <span className="text-gray-700">{remarks}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Warning for out */}
                                {type === 'out' && selectedProduct.p_count - quantity < 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-sm">จำนวนเบิกมากกว่าสินค้าคงเหลือ!</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t bg-gray-50 flex gap-3">
                                <button
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleConfirmedSubmit}
                                    disabled={isPending || (type === 'out' && selectedProduct.p_count - quantity < 0)}
                                    className={`flex-1 py-3 px-4 font-semibold rounded-xl transition text-white disabled:opacity-50 disabled:cursor-not-allowed ${type === 'in'
                                        ? 'bg-green-500 hover:bg-green-600'
                                        : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                >
                                    {isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
