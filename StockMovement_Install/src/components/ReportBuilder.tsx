'use client';

import { useState } from 'react';
import { FileText, Plus, X, ArrowUp, ArrowDown, Play, Save, Download } from 'lucide-react';

interface ReportColumn {
    id: string;
    field: string;
    label: string;
    visible: boolean;
}

interface ReportFilter {
    id: string;
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
    value: string;
}

interface ReportConfig {
    name: string;
    entity: 'products' | 'movements' | 'po' | 'borrow';
    columns: ReportColumn[];
    filters: ReportFilter[];
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
    groupBy?: string;
}

const entityFields: Record<string, { field: string; label: string }[]> = {
    products: [
        { field: 'p_id', label: 'รหัสสินค้า' },
        { field: 'p_name', label: 'ชื่อสินค้า' },
        { field: 'p_count', label: 'จำนวน' },
        { field: 'price_unit', label: 'ราคา/หน่วย' },
        { field: 'main_category', label: 'หมวดหมู่' },
        { field: 'safety_stock', label: 'Safety Stock' },
        { field: 'unit', label: 'หน่วย' },
    ],
    movements: [
        { field: 'id', label: 'รหัสเคลื่อนไหว' },
        { field: 'product_name', label: 'สินค้า' },
        { field: 'type', label: 'ประเภท' },
        { field: 'quantity', label: 'จำนวน' },
        { field: 'created_at', label: 'วันที่' },
    ],
    po: [
        { field: 'id', label: 'เลข PO' },
        { field: 'supplier', label: 'ผู้ขาย' },
        { field: 'status', label: 'สถานะ' },
        { field: 'total', label: 'มูลค่ารวม' },
        { field: 'created_at', label: 'วันที่' },
    ],
    borrow: [
        { field: 'id', label: 'รหัสการยืม' },
        { field: 'borrower', label: 'ผู้ยืม' },
        { field: 'product', label: 'สินค้า' },
        { field: 'quantity', label: 'จำนวน' },
        { field: 'status', label: 'สถานะ' },
    ],
};

const operatorLabels: Record<string, string> = {
    eq: 'เท่ากับ',
    neq: 'ไม่เท่ากับ',
    gt: 'มากกว่า',
    lt: 'น้อยกว่า',
    contains: 'มีคำว่า',
};

export default function ReportBuilder() {
    const [config, setConfig] = useState<ReportConfig>({
        name: 'รายงานใหม่',
        entity: 'products',
        columns: [],
        filters: [],
        sortOrder: 'asc'
    });
    const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const availableFields = entityFields[config.entity] || [];

    const addColumn = (field: string, label: string) => {
        if (config.columns.find(c => c.field === field)) return;

        setConfig(prev => ({
            ...prev,
            columns: [...prev.columns, { id: Date.now().toString(), field, label, visible: true }]
        }));
    };

    const removeColumn = (id: string) => {
        setConfig(prev => ({
            ...prev,
            columns: prev.columns.filter(c => c.id !== id)
        }));
    };

    const addFilter = () => {
        setConfig(prev => ({
            ...prev,
            filters: [...prev.filters, {
                id: Date.now().toString(),
                field: availableFields[0]?.field || '',
                operator: 'eq',
                value: ''
            }]
        }));
    };

    const updateFilter = (id: string, updates: Partial<ReportFilter>) => {
        setConfig(prev => ({
            ...prev,
            filters: prev.filters.map(f => f.id === id ? { ...f, ...updates } : f)
        }));
    };

    const removeFilter = (id: string) => {
        setConfig(prev => ({
            ...prev,
            filters: prev.filters.filter(f => f.id !== id)
        }));
    };

    const runReport = async () => {
        setIsLoading(true);

        // Simulate API call
        await new Promise(r => setTimeout(r, 1000));

        // Mock data based on entity
        const mockData = config.entity === 'products'
            ? [
                { p_id: 'P001', p_name: 'สินค้า A', p_count: 100, price_unit: 150, main_category: 'อุปกรณ์' },
                { p_id: 'P002', p_name: 'สินค้า B', p_count: 50, price_unit: 200, main_category: 'เครื่องเขียน' },
                { p_id: 'P003', p_name: 'สินค้า C', p_count: 25, price_unit: 500, main_category: 'อิเล็กทรอนิกส์' },
            ]
            : [];

        setPreviewData(mockData);
        setIsLoading(false);
    };

    const exportReport = () => {
        // Generate CSV
        if (previewData.length === 0) return;

        const headers = config.columns.filter(c => c.visible).map(c => c.label);
        const rows = previewData.map(row =>
            config.columns.filter(c => c.visible).map(c => String(row[c.field] || ''))
        );

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.name}.csv`;
        a.click();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-purple-500" />
                    <input
                        type="text"
                        value={config.name}
                        onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                        className="text-lg font-bold bg-transparent border-none outline-none"
                        placeholder="ชื่อรายงาน"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={runReport}
                        disabled={config.columns.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        <Play className="w-4 h-4" />
                        รัน
                    </button>
                    <button
                        onClick={exportReport}
                        disabled={previewData.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
                {/* Left Panel - Configuration */}
                <div className="space-y-6">
                    {/* Entity Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">ข้อมูล</label>
                        <select
                            value={config.entity}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                entity: e.target.value as ReportConfig['entity'],
                                columns: [],
                                filters: []
                            }))}
                            className="w-full p-2 border rounded-lg"
                            title="เลือกประเภทข้อมูล"
                        >
                            <option value="products">สินค้า</option>
                            <option value="movements">เคลื่อนไหวสต็อก</option>
                            <option value="po">ใบสั่งซื้อ</option>
                            <option value="borrow">การยืม</option>
                        </select>
                    </div>

                    {/* Available Fields */}
                    <div>
                        <label className="block text-sm font-medium mb-2">ฟิลด์ที่ใช้ได้</label>
                        <div className="flex flex-wrap gap-2">
                            {availableFields.map((field) => (
                                <button
                                    key={field.field}
                                    onClick={() => addColumn(field.field, field.label)}
                                    disabled={config.columns.some(c => c.field === field.field)}
                                    className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-blue-100 disabled:opacity-50"
                                >
                                    {field.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Columns */}
                    <div>
                        <label className="block text-sm font-medium mb-2">คอลัมน์ที่เลือก</label>
                        <div className="space-y-2">
                            {config.columns.map((col, idx) => (
                                <div key={col.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <span className="flex-1 text-sm">{col.label}</span>
                                    <button onClick={() => removeColumn(col.id)} className="text-red-500" title="ลบ">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">ตัวกรอง</label>
                            <button onClick={addFilter} className="text-blue-500 text-sm flex items-center gap-1">
                                <Plus className="w-3 h-3" /> เพิ่ม
                            </button>
                        </div>
                        <div className="space-y-2">
                            {config.filters.map((filter) => (
                                <div key={filter.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <select
                                        value={filter.field}
                                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                                        className="flex-1 p-1 text-sm border rounded"
                                        title="เลือกฟิลด์"
                                    >
                                        {availableFields.map(f => (
                                            <option key={f.field} value={f.field}>{f.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filter.operator}
                                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as ReportFilter['operator'] })}
                                        className="p-1 text-sm border rounded"
                                        title="เลือกตัวดำเนินการ"
                                    >
                                        {Object.entries(operatorLabels).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={filter.value}
                                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                        className="w-20 p-1 text-sm border rounded"
                                        placeholder="ค่า"
                                    />
                                    <button onClick={() => removeFilter(filter.id)} className="text-red-500" title="ลบ">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="lg:col-span-2">
                    <h3 className="font-medium mb-4">ตัวอย่างรายงาน</h3>

                    {isLoading ? (
                        <div className="animate-pulse space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-10 bg-gray-100 rounded" />
                            ))}
                        </div>
                    ) : previewData.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>เลือกคอลัมน์และกด "รัน" เพื่อดูตัวอย่าง</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        {config.columns.filter(c => c.visible).map(col => (
                                            <th key={col.id} className="px-3 py-2 text-left font-medium">
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {previewData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            {config.columns.filter(c => c.visible).map(col => (
                                                <td key={col.id} className="px-3 py-2">
                                                    {String(row[col.field] ?? '-')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
