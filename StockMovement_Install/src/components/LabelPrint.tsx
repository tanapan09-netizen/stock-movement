'use client';

import { useState, useRef } from 'react';
import { Printer, QrCode, X, Settings, Download } from 'lucide-react';

interface LabelData {
    code: string;
    name: string;
    category?: string;
    price?: number;
    location?: string;
}

interface LabelPrintProps {
    items: LabelData[];
    onClose: () => void;
}

type LabelSize = 'small' | 'medium' | 'large';

export default function LabelPrintModal({ items, onClose }: LabelPrintProps) {
    const [labelSize, setLabelSize] = useState<LabelSize>('medium');
    const [showPrice, setShowPrice] = useState(true);
    const [showCategory, setShowCategory] = useState(true);
    const [copies, setCopies] = useState(1);
    const printRef = useRef<HTMLDivElement>(null);

    const sizeStyles = {
        small: { width: '50mm', height: '25mm', fontSize: '8px', qrSize: 40 },
        medium: { width: '70mm', height: '35mm', fontSize: '10px', qrSize: 60 },
        large: { width: '100mm', height: '50mm', fontSize: '12px', qrSize: 80 }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const style = sizeStyles[labelSize];
        const labelsHtml = items.flatMap(item =>
            Array(copies).fill(null).map((_, idx) => `
                <div class="label" style="width: ${style.width}; height: ${style.height}; font-size: ${style.fontSize};">
                    <div class="qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=${style.qrSize}x${style.qrSize}&data=${encodeURIComponent(item.code)}" alt="QR" />
                    </div>
                    <div class="label-content">
                        <div class="code">${item.code}</div>
                        <div class="name">${item.name}</div>
                        ${showCategory && item.category ? `<div class="category">${item.category}</div>` : ''}
                        ${showPrice && item.price ? `<div class="price">฿${item.price.toLocaleString()}</div>` : ''}
                        ${item.location ? `<div class="location">📍 ${item.location}</div>` : ''}
                    </div>
                </div>
            `)
        ).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>พิมพ์ฉลากสินค้า</title>
                <style>
                    @page { margin: 5mm; }
                    body { 
                        font-family: 'Sarabun', Arial, sans-serif; 
                        margin: 0; 
                        padding: 10px;
                    }
                    .labels-container {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 5mm;
                    }
                    .label {
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        padding: 3mm;
                        display: flex;
                        gap: 3mm;
                        page-break-inside: avoid;
                        background: white;
                    }
                    .qr-code {
                        flex-shrink: 0;
                        display: flex;
                        align-items: center;
                    }
                    .qr-code img {
                        display: block;
                    }
                    .label-content {
                        flex: 1;
                        overflow: hidden;
                    }
                    .code {
                        font-weight: bold;
                        font-size: 1.2em;
                        margin-bottom: 2px;
                    }
                    .name {
                        font-weight: 500;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .category {
                        color: #666;
                        font-size: 0.9em;
                    }
                    .price {
                        color: #059669;
                        font-weight: bold;
                    }
                    .location {
                        color: #666;
                        font-size: 0.85em;
                    }
                    @media print {
                        body { print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="labels-container">
                    ${labelsHtml}
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <QrCode className="w-6 h-6 text-purple-500" />
                        พิมพ์ฉลากสินค้า
                    </h2>
                    <button onClick={onClose} title="ปิด" aria-label="ปิดหน้าต่าง" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Settings */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">ตั้งค่าฉลาก</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">ขนาด</label>
                            <select
                                value={labelSize}
                                onChange={(e) => setLabelSize(e.target.value as LabelSize)}
                                className="w-full p-2 border rounded-lg"
                                title="เลือกขนาดฉลาก"
                            >
                                <option value="small">เล็ก (50x25mm)</option>
                                <option value="medium">กลาง (70x35mm)</option>
                                <option value="large">ใหญ่ (100x50mm)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="copies-input" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">จำนวนสำเนา</label>
                            <input
                                id="copies-input"
                                type="number"
                                min="1"
                                max="10"
                                title="จำนวนสำเนา"
                                value={copies}
                                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showPrice}
                                onChange={(e) => setShowPrice(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">แสดงราคา</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showCategory}
                                onChange={(e) => setShowCategory(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm">แสดงหมวดหมู่</span>
                        </label>
                    </div>
                </div>

                {/* Preview */}
                <div className="p-4 max-h-80 overflow-y-auto" ref={printRef}>
                    <p className="text-sm text-gray-500 mb-3">ตัวอย่าง ({items.length} รายการ × {copies} สำเนา = {items.length * copies} ฉลาก)</p>
                    <div className="flex flex-wrap gap-3">
                        {items.slice(0, 6).map((item, idx) => (
                            <div key={idx} className="border rounded-lg p-3 flex gap-3 bg-white" style={{ width: '200px' }}>
                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                    <QrCode className="w-8 h-8 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm">{item.code}</div>
                                    <div className="text-xs truncate">{item.name}</div>
                                    {showCategory && <div className="text-xs text-gray-400">{item.category}</div>}
                                    {showPrice && <div className="text-xs text-green-600 font-medium">฿{item.price?.toLocaleString()}</div>}
                                </div>
                            </div>
                        ))}
                        {items.length > 6 && (
                            <div className="flex items-center justify-center text-gray-400 text-sm p-4">
                                +{items.length - 6} รายการเพิ่มเติม
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์ฉลาก
                    </button>
                </div>
            </div>
        </div>
    );
}

// Button to trigger label printing
export function LabelPrintButton({ items }: { items: LabelData[] }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                disabled={items.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition disabled:opacity-50"
                title="พิมพ์ฉลาก"
            >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">ฉลาก</span>
            </button>

            {showModal && (
                <LabelPrintModal items={items} onClose={() => setShowModal(false)} />
            )}
        </>
    );
}
