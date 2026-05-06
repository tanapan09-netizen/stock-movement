'use client';

import { useState, useEffect } from 'react';
import { Warehouse, ArrowRightLeft, ChevronDown, MapPin, Package } from 'lucide-react';

interface WarehouseItem {
    id: number;
    name: string;
    location: string;
    productCount: number;
}

// Global warehouse selector for header
export function WarehouseSelector() {
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Fetch warehouses
        const fetchWarehouses = async () => {
            try {
                const res = await fetch('/api/warehouses');
                if (res.ok) {
                    const data = await res.json();
                    setWarehouses(data);
                    if (data.length > 0) setSelected(data[0].id);
                }
            } catch {
                // Mock data
                setWarehouses([
                    { id: 1, name: 'คลังหลัก', location: 'อาคาร A', productCount: 150 },
                    { id: 2, name: 'คลังสำรอง', location: 'อาคาร B', productCount: 75 },
                    { id: 3, name: 'คลังส่งออก', location: 'อาคาร C', productCount: 30 }
                ]);
                setSelected(1);
            }
        };

        fetchWarehouses();
    }, []);

    const currentWarehouse = warehouses.find(w => w.id === selected);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
                <Warehouse className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">{currentWarehouse?.name || 'เลือกคลัง'}</span>
                <ChevronDown className={`w-4 h-4 transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-50">
                        <div className="p-2">
                            {warehouses.map(wh => (
                                <button
                                    key={wh.id}
                                    onClick={() => {
                                        setSelected(wh.id);
                                        setIsOpen(false);
                                        // Store in localStorage or context
                                        localStorage.setItem('selectedWarehouse', String(wh.id));
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${selected === wh.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected === wh.id ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-600'
                                        }`}>
                                        <Warehouse className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-medium">{wh.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {wh.location}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{wh.productCount}</p>
                                        <p className="text-xs text-gray-400">สินค้า</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Stock transfer between warehouses
interface TransferFormProps {
    onTransfer: (data: { fromWarehouse: number; toWarehouse: number; productId: string; quantity: number }) => Promise<void>;
}

export function StockTransferForm({ onTransfer }: TransferFormProps) {
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([
        { id: 1, name: 'คลังหลัก', location: 'อาคาร A', productCount: 150 },
        { id: 2, name: 'คลังสำรอง', location: 'อาคาร B', productCount: 75 },
        { id: 3, name: 'คลังส่งออก', location: 'อาคาร C', productCount: 30 }
    ]);
    const [products, setProducts] = useState<{ p_id: string; p_name: string; p_count: number }[]>([
        { p_id: 'P001', p_name: 'สินค้า A', p_count: 100 },
        { p_id: 'P002', p_name: 'สินค้า B', p_count: 50 }
    ]);
    const [fromWarehouse, setFromWarehouse] = useState<number>(0);
    const [toWarehouse, setToWarehouse] = useState<number>(0);
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromWarehouse || !toWarehouse || !productId || quantity <= 0) return;
        if (fromWarehouse === toWarehouse) {
            alert('ต้นทางและปลายทางต้องไม่เหมือนกัน');
            return;
        }

        setIsSubmitting(true);
        try {
            await onTransfer({ fromWarehouse, toWarehouse, productId, quantity });
            alert('โอนสินค้าสำเร็จ!');
            setProductId('');
            setQuantity(1);
        } catch {
            alert('เกิดข้อผิดพลาด');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-purple-500" />
                โอนย้ายสินค้าระหว่างคลัง
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* From Warehouse */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            จากคลัง (ต้นทาง)
                        </label>
                        <select
                            value={fromWarehouse}
                            onChange={(e) => setFromWarehouse(Number(e.target.value))}
                            className="w-full p-3 border rounded-lg"
                            required
                            title="เลือกคลังต้นทาง"
                        >
                            <option value="">-- เลือกคลัง --</option>
                            {warehouses.map(wh => (
                                <option key={wh.id} value={wh.id}>{wh.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* To Warehouse */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ไปยังคลัง (ปลายทาง)
                        </label>
                        <select
                            value={toWarehouse}
                            onChange={(e) => setToWarehouse(Number(e.target.value))}
                            className="w-full p-3 border rounded-lg"
                            required
                            title="เลือกคลังปลายทาง"
                        >
                            <option value="">-- เลือกคลัง --</option>
                            {warehouses.filter(w => w.id !== fromWarehouse).map(wh => (
                                <option key={wh.id} value={wh.id}>{wh.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            สินค้า
                        </label>
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="w-full p-3 border rounded-lg"
                            required
                            title="เลือกสินค้า"
                        >
                            <option value="">-- เลือกสินค้า --</option>
                            {products.map(p => (
                                <option key={p.p_id} value={p.p_id}>
                                    {p.p_id} - {p.p_name} (คงเหลือ: {p.p_count})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            จำนวน
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full p-3 border rounded-lg"
                            required
                        />
                    </div>
                </div>

                {/* Visual Transfer */}
                {fromWarehouse && toWarehouse && (
                    <div className="flex items-center justify-center gap-4 py-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                            <Warehouse className="w-5 h-5 text-blue-500" />
                            <span>{warehouses.find(w => w.id === fromWarehouse)?.name}</span>
                        </div>
                        <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                            <Warehouse className="w-5 h-5 text-green-500" />
                            <span>{warehouses.find(w => w.id === toWarehouse)?.name}</span>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold disabled:opacity-50"
                >
                    <ArrowRightLeft className="w-5 h-5" />
                    โอนย้ายสินค้า
                </button>
            </form>
        </div>
    );
}
