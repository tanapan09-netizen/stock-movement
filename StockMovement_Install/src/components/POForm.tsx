'use client';

import { useState } from 'react';
import { createPO } from '@/actions/poActions';
import { Search, Trash2, Save, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import CurrencyInput from './CurrencyInput';

type Product = { p_id: string; p_name: string; price_unit: number | null };
type Supplier = { id: number; name: string };
type POItem = { p_id: string; p_name: string; quantity: number; unit_price: number };

export default function POForm({ products, suppliers }: { products: Product[], suppliers: Supplier[] }) {
    const router = useRouter();
    const { showConfirm, showToast } = useToast();

    // Form state
    const [supplierId, setSupplierId] = useState('');
    const [poNumber, setPoNumber] = useState(`PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');
    const [taxRate, setTaxRate] = useState(7); // 7% VAT
    const [includeTax, setIncludeTax] = useState(true);

    // Cart & UI state
    const [cart, setCart] = useState<POItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    const filteredProducts = searchTerm
        ? products.filter(p => p.p_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.p_id.includes(searchTerm)).slice(0, 8)
        : [];

    const addToCart = (product: Product) => {
        if (cart.find(i => i.p_id === product.p_id)) {
            showToast('สินค้านี้มีในรายการแล้ว', 'warning');
            return;
        }
        setCart([...cart, {
            p_id: product.p_id,
            p_name: product.p_name,
            quantity: 1,
            unit_price: product.price_unit || 0
        }]);
        setSearchTerm('');
    };

    const updateItem = (p_id: string, field: 'quantity' | 'unit_price', value: number) => {
        setCart(cart.map(i => i.p_id === p_id ? { ...i, [field]: value } : i));
    };

    const removeItem = (p_id: string) => {
        setCart(cart.filter(i => i.p_id !== p_id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierId || cart.length === 0) {
            setError('กรุณาเลือก Supplier และเพิ่มสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        const confirmed = await showConfirm({
            title: 'ยืนยันการสร้างใบสั่งซื้อ',
            message: `เลขที่: ${poNumber}\nผู้ขาย: ${suppliers.find(s => s.id === parseInt(supplierId))?.name}\nจำนวนรายการ: ${cart.length}\nยอดรวม: ${grandTotal.toLocaleString()} บาท`,
            confirmText: 'ยืนยัน',
            cancelText: 'ยกเลิก',
            type: 'info'
        });

        if (!confirmed) return;

        setIsPending(true);

        const formData = new FormData();
        formData.append('po_number', poNumber);
        formData.append('supplier_id', supplierId);
        formData.append('order_date', orderDate);
        formData.append('expected_date', expectedDate);
        formData.append('status', status);
        formData.append('subtotal', subtotal.toString());
        formData.append('tax_amount', taxAmount.toString());
        formData.append('total_amount', grandTotal.toString());
        formData.append('notes', notes);
        formData.append('items', JSON.stringify(cart));

        const res = await createPO(formData);
        if (res?.error) {
            setError(res.error);
            showToast(res.error, 'error');
            setIsPending(false);
        } else {
            showToast('สร้างใบสั่งซื้อสำเร็จ', 'success');
            router.push('/purchase-orders');
        }
    };

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = includeTax ? (subtotal * taxRate / 100) : 0;
    const grandTotal = subtotal + taxAmount;

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - PO Info */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2">ข้อมูลใบสั่งซื้อ</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">เลขที่ใบสั่งซื้อ *</label>
                        <input
                            type="text"
                            name="po_number"
                            required
                            value={poNumber}
                            onChange={e => setPoNumber(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">ผู้ขาย (Supplier) *</label>
                        <select
                            name="supplier_id"
                            required
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- เลือกผู้ขาย --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่สั่งซื้อ *</label>
                            <input
                                type="date"
                                name="order_date"
                                required
                                value={orderDate}
                                onChange={e => setOrderDate(e.target.value)}
                                className="w-full border rounded-lg p-2.5 mt-1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่คาดว่าจะได้รับ</label>
                            <input
                                type="date"
                                name="expected_date"
                                value={expectedDate}
                                onChange={e => setExpectedDate(e.target.value)}
                                className="w-full border rounded-lg p-2.5 mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                        <select
                            name="status"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1"
                        >
                            <option value="draft">ร่าง (Draft)</option>
                            <option value="pending">รออนุมัติ (Pending)</option>
                            <option value="approved">อนุมัติแล้ว (Approved)</option>
                            <option value="ordered">สั่งซื้อแล้ว (Ordered)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                        <textarea
                            name="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1"
                            rows={3}
                            placeholder="ระบุหมายเหตุเพิ่มเติม..."
                        ></textarea>
                    </div>
                </div>

                {/* Tax Settings */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> ภาษี
                    </h3>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">รวมภาษีมูลค่าเพิ่ม (VAT)</span>
                        <input
                            type="checkbox"
                            checked={includeTax}
                            onChange={e => setIncludeTax(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded"
                        />
                    </label>
                    {includeTax && (
                        <div>
                            <label className="text-sm text-gray-500">อัตราภาษี (%)</label>
                            <input
                                type="number"
                                value={taxRate}
                                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                                className="w-full border rounded-lg p-2 mt-1"
                            />
                        </div>
                    )}
                </div>

                {/* Summary Box */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg shadow text-white">
                    <h3 className="font-bold mb-4">สรุปยอด</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>ยอดก่อนภาษี</span>
                            <span>{subtotal.toLocaleString()} บาท</span>
                        </div>
                        {includeTax && (
                            <div className="flex justify-between">
                                <span>VAT ({taxRate}%)</span>
                                <span>{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        )}
                        <div className="border-t border-white/30 pt-2 mt-2">
                            <div className="flex justify-between text-lg font-bold">
                                <span>ยอดรวมทั้งสิ้น</span>
                                <span>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending || cart.length === 0}
                    className="w-full bg-green-600 text-white font-bold py-3.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                    <Save className="w-5 h-5" />
                    {isPending ? 'กำลังบันทึก...' : 'ยืนยันสร้างใบสั่งซื้อ'}
                </button>
                {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>}
            </div>

            {/* Right Column - Products */}
            <div className="lg:col-span-2 space-y-6">
                {/* Search Products */}
                <div className="bg-white p-4 rounded-lg shadow relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหาและเพิ่มสินค้า</label>
                    <div className="flex items-center border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="พิมพ์ชื่อสินค้าหรือรหัส..."
                            className="flex-1 outline-none ml-2"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border shadow-xl z-20 max-h-60 overflow-y-auto mt-1 rounded-lg">
                            {filteredProducts.map(p => (
                                <div
                                    key={p.p_id}
                                    onClick={() => addToCart(p)}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-medium">{p.p_name}</div>
                                        <div className="text-xs text-gray-500">{p.p_id}</div>
                                    </div>
                                    <div className="text-blue-600 font-medium">
                                        {(p.price_unit || 0).toLocaleString()} บาท
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                        <h3 className="font-bold text-gray-800">รายการสินค้า ({cart.length} รายการ)</h3>
                    </div>

                    {cart.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>ยังไม่มีสินค้าในรายการ</p>
                            <p className="text-sm">ค้นหาและเพิ่มสินค้าด้านบน</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 text-xs font-medium text-gray-600">
                                <div className="col-span-5">สินค้า</div>
                                <div className="col-span-2 text-center">จำนวน</div>
                                <div className="col-span-2 text-center">ราคา/หน่วย</div>
                                <div className="col-span-2 text-right">รวม</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Items */}
                            {cart.map(item => (
                                <div key={item.p_id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-gray-50">
                                    <div className="col-span-5">
                                        <div className="font-medium text-gray-800">{item.p_name}</div>
                                        <div className="text-xs text-gray-500">{item.p_id}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => updateItem(item.p_id, 'quantity', parseInt(e.target.value) || 1)}
                                            className="w-full border rounded p-1.5 text-center"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={e => updateItem(item.p_id, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className="w-full border rounded p-1.5 text-right"
                                        />
                                    </div>
                                    <div className="col-span-2 text-right font-bold text-blue-600">
                                        {(item.quantity * item.unit_price).toLocaleString()}
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.p_id)}
                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}
