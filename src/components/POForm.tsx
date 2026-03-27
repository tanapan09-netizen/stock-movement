'use client';

import { useState, useEffect } from 'react';
import { createPO, updatePO } from '@/actions/poActions';
import { Search, Trash2, Save, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { parsePurchaseOrderItemNote, type PurchaseOrderItemKind } from '@/lib/purchase-order-item';

type Product = { p_id: string; p_name: string; price_unit: number | null };
type Supplier = { id: number; name: string };
type POItem = { p_id: string; p_name: string; quantity: number; unit_price: number; item_type: PurchaseOrderItemKind };

type POData = {
    po_id: number;
    po_number: string;
    supplier_id: number | null;
    order_date: Date | null;
    expected_date: Date | null;
    status: string;
    notes: string | null;
    total_amount: number; // Decimal in Prisma but number in JS usually
    tbl_po_items: any[];
}

type PurchaseRequestContext = {
    requestId?: number | null;
    requestNumber: string;
    referenceJob?: string | null;
    amount?: number | null;
    reason?: string | null;
};

function roundToTwoDecimals(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number) {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export default function POForm({
    products,
    suppliers,
    initialData,
    initialRequestContext,
}: {
    products: Product[];
    suppliers: Supplier[];
    initialData?: POData;
    initialRequestContext?: PurchaseRequestContext;
}) {
    const router = useRouter();
    const { showConfirm, showToast } = useToast();
    const isEditMode = !!initialData;
    const isWorkflowPurchaseOrder = Boolean(initialRequestContext) && !isEditMode;
    const requestContextNote = initialRequestContext
        ? [
            `เธญเนเธฒเธเธญเธดเธเธเธณเธเธญเธเธทเนเธญ: ${initialRequestContext.requestNumber}`,
            initialRequestContext.requestId ? `PR Request ID: ${initialRequestContext.requestId}` : null,
            initialRequestContext.referenceJob ? `เธเธฒเธเธญเนเธฒเธเธญเธดเธ: ${initialRequestContext.referenceJob}` : null,
            initialRequestContext.amount ? `เธขเธญเธ”เธเธฃเธฐเธกเธฒเธ“เธเธฒเธฃเธเธฒเธ PR: ${formatMoney(initialRequestContext.amount)} เธเธฒเธ—` : null,
            initialRequestContext.reason ? `เธชเธฃเธธเธเธฃเธฒเธขเธเธฒเธฃ: ${initialRequestContext.reason}` : null,
        ].filter(Boolean).join('\n')
        : '';

    // Form state
    const [supplierId, setSupplierId] = useState(initialData?.supplier_id?.toString() || '');
    const [poNumber, setPoNumber] = useState(initialData?.po_number || `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    const [orderDate, setOrderDate] = useState(initialData?.order_date ? new Date(initialData.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState(initialData?.expected_date ? new Date(initialData.expected_date).toISOString().split('T')[0] : '');
    const [status, setStatus] = useState(initialData?.status || (isWorkflowPurchaseOrder ? 'ordered' : 'draft'));
    const [notes, setNotes] = useState(initialData?.notes || requestContextNote);
    const [taxRate, setTaxRate] = useState(7); // 7% VAT
    const [includeTax, setIncludeTax] = useState(true);
    const [manualItemName, setManualItemName] = useState('');
    const [manualItemCode, setManualItemCode] = useState('');

    // Cart & UI state
    // Initialize cart from initialData if available
    const [cart, setCart] = useState<POItem[]>(() => {
        if (initialData?.tbl_po_items) {
            return initialData.tbl_po_items.map(item => {
                const product = products.find(p => p.p_id === item.p_id);
                const itemMeta = parsePurchaseOrderItemNote(item.notes, item.p_id);
                return {
                    p_id: item.p_id,
                    p_name: itemMeta.displayName || product?.p_name || item.p_id,
                    quantity: item.quantity,
                    unit_price: roundToTwoDecimals(Number(item.unit_price)),
                    item_type: itemMeta.kind,
                };
            });
        }
        return [];
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isWorkflowPurchaseOrder) {
            setStatus('ordered');
        }
    }, [isWorkflowPurchaseOrder]);

    const filteredProducts = searchTerm
        ? products.filter(p => p.p_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.p_id.includes(searchTerm)).slice(0, 8)
        : [];

    const addToCart = (product: Product) => {
        if (cart.find(i => i.p_id === product.p_id)) {
            showToast('เธชเธดเธเธเนเธฒเธเธตเนเธกเธตเนเธเธฃเธฒเธขเธเธฒเธฃเนเธฅเนเธง', 'warning');
            return;
        }
        setCart([...cart, {
            p_id: product.p_id,
            p_name: product.p_name,
            quantity: 1,
            unit_price: roundToTwoDecimals(product.price_unit || 0),
            item_type: 'stock',
        }]);
        setSearchTerm('');
    };

    const addManualItem = () => {
        const trimmedName = manualItemName.trim();
        if (!trimmedName) {
            showToast('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธทเนเธญเธชเธดเธเธเนเธฒเธเธญเธ stock', 'warning');
            return;
        }

        const normalizedCode = manualItemCode.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
        const generatedId = normalizedCode
            ? `NON-STOCK-${normalizedCode}`
            : `NON-STOCK-${Date.now()}`;

        if (cart.find((item) => item.p_id === generatedId)) {
            showToast('เธฃเธซเธฑเธชเธชเธดเธเธเนเธฒเธเธญเธ stock เธเธตเนเธ–เธนเธเนเธเนเนเธฅเนเธง', 'warning');
            return;
        }

        setCart([
            ...cart,
            {
                p_id: generatedId,
                p_name: trimmedName,
                quantity: 1,
                unit_price: 0,
                item_type: 'non_stock',
            },
        ]);
        setManualItemName('');
        setManualItemCode('');
    };

    const updateItem = (p_id: string, field: 'quantity' | 'unit_price' | 'p_name', value: number | string) => {
        setCart(cart.map((item) => {
            if (item.p_id !== p_id) return item;

            if (field === 'unit_price') {
                return { ...item, unit_price: roundToTwoDecimals(Number(value) || 0) };
            }

            if (field === 'quantity') {
                return { ...item, quantity: Math.max(1, Math.trunc(Number(value) || 1)) };
            }

            return { ...item, p_name: String(value) };
        }));
    };

    const removeItem = (p_id: string) => {
        setCart(cart.filter(i => i.p_id !== p_id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierId || cart.length === 0) {
            setError('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธ Supplier เนเธฅเธฐเน€เธเธดเนเธกเธชเธดเธเธเนเธฒเธญเธขเนเธฒเธเธเนเธญเธข 1 เธฃเธฒเธขเธเธฒเธฃ');
            return;
        }

        if (cart.some((item) => item.item_type === 'non_stock' && !item.p_name.trim())) {
            setError('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธทเนเธญเธชเธดเธเธเนเธฒเธเธญเธ stock เนเธซเนเธเธฃเธเธ—เธธเธเธเธฃเธฃเธ—เธฑเธ”');
            return;
        }

        const confirmed = await showConfirm({
            title: isEditMode ? 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเนเธเนเนเธเนเธเธชเธฑเนเธเธเธทเนเธญ' : 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเธชเธฃเนเธฒเธเนเธเธชเธฑเนเธเธเธทเนเธญ',
            message: `เน€เธฅเธเธ—เธตเน: ${poNumber}\nเธเธนเนเธเธฒเธข: ${suppliers.find(s => s.id === parseInt(supplierId))?.name}\nเธเธณเธเธงเธเธฃเธฒเธขเธเธฒเธฃ: ${cart.length}\nเธขเธญเธ”เธฃเธงเธก: ${formatMoney(grandTotal)} เธเธฒเธ—`,
            confirmText: 'เธขเธทเธเธขเธฑเธ',
            cancelText: 'เธขเธเน€เธฅเธดเธ',
            type: 'info'
        });

        if (!confirmed) return;

        setIsPending(true);

        const formData = new FormData();
        if (isEditMode) {
            formData.append('po_id', initialData.po_id.toString());
        }
        formData.append('po_number', poNumber);
        formData.append('supplier_id', supplierId);
        formData.append('order_date', orderDate);
        formData.append('expected_date', expectedDate);
        formData.append('status', status);
        formData.append('subtotal', subtotal.toFixed(2));
        formData.append('tax_amount', taxAmount.toFixed(2));
        formData.append('total_amount', grandTotal.toFixed(2));
        formData.append('notes', notes);
        formData.append('items', JSON.stringify(cart));

        let res;
        if (isEditMode) {
            res = await updatePO(formData);
        } else {
            res = await createPO(formData);
        }

        if (res?.error) {
            setError(res.error);
            showToast(res.error, 'error');
            setIsPending(false);
        } else {
            showToast(isEditMode ? 'เนเธเนเนเธเนเธเธชเธฑเนเธเธเธทเนเธญเธชเธณเน€เธฃเนเธ' : 'เธชเธฃเนเธฒเธเนเธเธชเธฑเนเธเธเธทเนเธญเธชเธณเน€เธฃเนเธ', 'success');
            const nextPOId = !isEditMode && 'poId' in res ? res.poId : null;
            const nextRoute = isWorkflowPurchaseOrder
                ? '/purchase-request/manage'
                : nextPOId ? `/purchase-orders/${nextPOId}` : '/purchase-orders';
            router.push(nextRoute);
            router.refresh(); // Refresh to show updated data
        }
    };

    // Calculate totals
    const subtotal = roundToTwoDecimals(cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0));
    const taxAmount = includeTax ? roundToTwoDecimals(subtotal * taxRate / 100) : 0;
    const grandTotal = roundToTwoDecimals(subtotal + taxAmount);

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - PO Info */}
            <div className="lg:col-span-1 space-y-6">
                {initialRequestContext && !isEditMode && (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
                        <div className="font-semibold">เธเธณเธฅเธฑเธเธญเธญเธ PO เธเธฒเธเธเธณเธเธญเธเธทเนเธญ</div>
                        <div className="mt-1 text-xs text-cyan-700">
                            {initialRequestContext.requestNumber}
                            {initialRequestContext.referenceJob ? ` โ€ข เธเธฒเธ ${initialRequestContext.referenceJob}` : ''}
                        </div>
                        {initialRequestContext.amount ? (
                            <div className="mt-2 text-xs text-cyan-800">
                                เธขเธญเธ”เธเธฃเธฐเธกเธฒเธ“เธเธฒเธเธเธณเธเธญเธเธทเนเธญ: {formatMoney(initialRequestContext.amount)} เธเธฒเธ—
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2">เธเนเธญเธกเธนเธฅเนเธเธชเธฑเนเธเธเธทเนเธญ {isEditMode ? '(เนเธเนเนเธ)' : '(เธชเธฃเนเธฒเธเนเธซเธกเน)'}</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">เน€เธฅเธเธ—เธตเนเนเธเธชเธฑเนเธเธเธทเนเธญ *</label>
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
                        <label className="block text-sm font-medium text-gray-700">เธเธนเนเธเธฒเธข (Supplier) *</label>
                        <select
                            name="supplier_id"
                            required
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- เน€เธฅเธทเธญเธเธเธนเนเธเธฒเธข --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {isWorkflowPurchaseOrder && (
                            <p className="mt-2 text-xs text-cyan-700">
                                PO เธ—เธตเนเธชเธฃเนเธฒเธเธเธฒเธ workflow เธเธฐเธ–เธนเธเธ•เธฑเนเธเธชเธ–เธฒเธเธฐเน€เธเนเธ Ordered เธญเธฑเธ•เนเธเธกเธฑเธ•เธด เน€เธเธทเนเธญเธฃเธญเธเธฑเธ”เธเธทเนเธญเธชเนเธเธ•เนเธญเนเธซเน Store เธฃเธฑเธเน€เธเนเธฒ
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">เธงเธฑเธเธ—เธตเนเธชเธฑเนเธเธเธทเนเธญ *</label>
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
                            <label className="block text-sm font-medium text-gray-700">เธงเธฑเธเธ—เธตเนเธเธฒเธ”เธงเนเธฒเธเธฐเนเธ”เนเธฃเธฑเธ</label>
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
                        <label className="block text-sm font-medium text-gray-700">เธชเธ–เธฒเธเธฐ</label>
                        <select
                            name="status"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1"
                            disabled={isWorkflowPurchaseOrder || initialData?.status === 'received'} // Disable status change if received via this form
                        >
                            <option value="draft">เธฃเนเธฒเธ (Draft)</option>
                            <option value="pending">เธฃเธญเธญเธเธธเธกเธฑเธ•เธด (Pending)</option>
                            <option value="approved">เธญเธเธธเธกเธฑเธ•เธดเนเธฅเนเธง (Approved)</option>
                            <option value="ordered">เธชเธฑเนเธเธเธทเนเธญเนเธฅเนเธง (Ordered)</option>
                            {/* Received status is usually set by system actions, but kept for viewing */}
                            {status === 'received' && <option value="received">เนเธ”เนเธฃเธฑเธเธชเธดเธเธเนเธฒเนเธฅเนเธง (Received)</option>}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">เธซเธกเธฒเธขเน€เธซเธ•เธธ</label>
                        <textarea
                            name="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full border rounded-lg p-2.5 mt-1"
                            rows={3}
                            placeholder="เธฃเธฐเธเธธเธซเธกเธฒเธขเน€เธซเธ•เธธเน€เธเธดเนเธกเน€เธ•เธดเธก..."
                        ></textarea>
                    </div>
                </div>

                {/* Tax Settings */}
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> เธ เธฒเธฉเธต
                    </h3>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-700">เธฃเธงเธกเธ เธฒเธฉเธตเธกเธนเธฅเธเนเธฒเน€เธเธดเนเธก (VAT)</span>
                        <input
                            type="checkbox"
                            checked={includeTax}
                            onChange={e => setIncludeTax(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded"
                        />
                    </label>
                    {includeTax && (
                        <div>
                            <label className="text-sm text-gray-500">เธญเธฑเธ•เธฃเธฒเธ เธฒเธฉเธต (%)</label>
                            <input
                                type="number"
                                value={taxRate}
                                step="0.01"
                                onChange={e => setTaxRate(roundToTwoDecimals(parseFloat(e.target.value) || 0))}
                                className="w-full border rounded-lg p-2 mt-1"
                            />
                        </div>
                    )}
                </div>

                {/* Summary Box */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg shadow text-white">
                    <h3 className="font-bold mb-4">เธชเธฃเธธเธเธขเธญเธ”</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>เธขเธญเธ”เธเนเธญเธเธ เธฒเธฉเธต</span>
                            <span>{formatMoney(subtotal)} เธเธฒเธ—</span>
                        </div>
                        {includeTax && (
                            <div className="flex justify-between">
                                <span>VAT ({taxRate}%)</span>
                                <span>{formatMoney(taxAmount)} เธเธฒเธ—</span>
                            </div>
                        )}
                        <div className="border-t border-white/30 pt-2 mt-2">
                            <div className="flex justify-between text-lg font-bold">
                                <span>เธขเธญเธ”เธฃเธงเธกเธ—เธฑเนเธเธชเธดเนเธ</span>
                                <span>{formatMoney(grandTotal)} เธเธฒเธ—</span>
                            </div>
                        </div>
                    </div>
                </div>

                {isWorkflowPurchaseOrder && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        เน€เธกเธทเนเธญเธชเธฃเนเธฒเธ PO เธชเธณเน€เธฃเนเธ เธฃเธฐเธเธเธเธฐเธเธฒเธเธฅเธฑเธเนเธเธซเธเนเธฒ <span className="font-semibold">purchase workflow</span> เน€เธเธทเนเธญเนเธซเนเธเธฑเธ”เธเธทเนเธญเธชเนเธเธ•เนเธญ Store เธฃเธฑเธเน€เธเนเธฒ
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending || cart.length === 0}
                    className="w-full bg-green-600 text-white font-bold py-3.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                    <Save className="w-5 h-5" />
                    {isPending ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : (isEditMode ? 'เธเธฑเธเธ—เธถเธเธเธฒเธฃเนเธเนเนเธ' : 'เธขเธทเธเธขเธฑเธเธชเธฃเนเธฒเธเนเธเธชเธฑเนเธเธเธทเนเธญ')}
                </button>
                {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>}
            </div>

            {/* Right Column - Products */}
            <div className="lg:col-span-2 space-y-6">
                {/* Search Products */}
                <div className="bg-white p-4 rounded-lg shadow relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">เธเนเธเธซเธฒเนเธฅเธฐเน€เธเธดเนเธกเธชเธดเธเธเนเธฒ</label>
                    <div className="flex items-center border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="เธเธดเธกเธเนเธเธทเนเธญเธชเธดเธเธเนเธฒเธซเธฃเธทเธญเธฃเธซเธฑเธช..."
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
                                        {formatMoney(roundToTwoDecimals(p.price_unit || 0))} เธเธฒเธ—
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-gray-800">เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเธเธญเธ stock</h3>
                            <p className="mt-1 text-sm text-gray-500">เนเธเนเธชเธณเธซเธฃเธฑเธเธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเธขเธฑเธเนเธกเนเธกเธตเนเธ product master เนเธฅเธฐเนเธกเนเธ•เนเธญเธเธฃเธฑเธเน€เธเนเธฒเธชเธ•เนเธญเธ</p>
                        </div>
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                            Non-stock
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto]">
                        <input
                            type="text"
                            value={manualItemName}
                            onChange={(e) => setManualItemName(e.target.value)}
                            placeholder="เธเธทเนเธญเธชเธดเธเธเนเธฒเธเธญเธ stock"
                            className="w-full rounded-lg border p-2.5"
                        />
                        <input
                            type="text"
                            value={manualItemCode}
                            onChange={(e) => setManualItemCode(e.target.value)}
                            placeholder="เธฃเธซเธฑเธชเธญเนเธฒเธเธญเธดเธ (เธ–เนเธฒเธกเธต)"
                            className="w-full rounded-lg border p-2.5"
                        />
                        <button
                            type="button"
                            onClick={addManualItem}
                            className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
                        >
                            เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธฃ
                        </button>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                        <h3 className="font-bold text-gray-800">เธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒ ({cart.length} เธฃเธฒเธขเธเธฒเธฃ)</h3>
                    </div>

                    {cart.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>เธขเธฑเธเนเธกเนเธกเธตเธชเธดเธเธเนเธฒเนเธเธฃเธฒเธขเธเธฒเธฃ</p>
                            <p className="text-sm">เธเนเธเธซเธฒเนเธฅเธฐเน€เธเธดเนเธกเธชเธดเธเธเนเธฒเธ”เนเธฒเธเธเธ</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 text-xs font-medium text-gray-600">
                                <div className="col-span-5">เธชเธดเธเธเนเธฒ</div>
                                <div className="col-span-2 text-center">เธเธณเธเธงเธ</div>
                                <div className="col-span-2 text-center">เธฃเธฒเธเธฒ/เธซเธเนเธงเธข</div>
                                <div className="col-span-2 text-right">เธฃเธงเธก</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Items */}
                            {cart.map(item => (
                                <div key={item.p_id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-gray-50">
                                    <div className="col-span-5">
                                        {item.item_type === 'non_stock' ? (
                                            <input
                                                type="text"
                                                value={item.p_name}
                                                onChange={e => updateItem(item.p_id, 'p_name', e.target.value)}
                                                className="w-full rounded border p-1.5 text-sm font-medium text-gray-800"
                                                placeholder="เธเธทเนเธญเธชเธดเธเธเนเธฒเธเธญเธ stock"
                                            />
                                        ) : (
                                            <div className="font-medium text-gray-800">{item.p_name}</div>
                                        )}
                                        {item.item_type === 'non_stock' && (
                                            <div className="mt-1 inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                                Non-stock item
                                            </div>
                                        )}
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
                                        {formatMoney(roundToTwoDecimals(item.quantity * item.unit_price))}
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


