'use client';

import { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Check, AlertTriangle, Save, Loader2, Printer } from 'lucide-react';

interface Product {
    p_id: string;
    p_name: string;
    system_count: number;
    actual_count: number | null;
    variance: number;
    status: 'pending' | 'matched' | 'variance';
}

export default function InventoryAuditPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'variance'>('all');
    const [saving, setSaving] = useState(false);
    const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditor, setAuditor] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products?active=true');
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.map((p: { p_id: string; p_name: string; p_count: number }) => ({
                        p_id: p.p_id,
                        p_name: p.p_name,
                        system_count: p.p_count,
                        actual_count: null,
                        variance: 0,
                        status: 'pending'
                    })));
                }
            } catch {
                // Mock data for demo
                setProducts([
                    { p_id: 'P001', p_name: 'สินค้าตัวอย่าง 1', system_count: 100, actual_count: null, variance: 0, status: 'pending' },
                    { p_id: 'P002', p_name: 'สินค้าตัวอย่าง 2', system_count: 50, actual_count: null, variance: 0, status: 'pending' },
                    { p_id: 'P003', p_name: 'สินค้าตัวอย่าง 3', system_count: 75, actual_count: null, variance: 0, status: 'pending' },
                ]);
            }
            setLoading(false);
        };

        fetchProducts();
    }, []);

    const updateCount = (id: string, actualCount: string) => {
        const count = parseInt(actualCount) || 0;
        setProducts(prev => prev.map(p => {
            if (p.p_id !== id) return p;

            const variance = count - p.system_count;
            return {
                ...p,
                actual_count: count,
                variance,
                status: variance === 0 ? 'matched' : 'variance'
            };
        }));
    };

    const saveAudit = async () => {
        setSaving(true);
        // TODO: Save to database
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('บันทึกผลการตรวจนับสำเร็จ!');
        setSaving(false);
    };

    const printAuditReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const completedProducts = products.filter(p => p.actual_count !== null);
        const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>รายงานผลการตรวจนับสต็อก</title>
                <style>
                    body { font-family: 'Sarabun', sans-serif; padding: 20px; }
                    h1 { text-align: center; color: #1e40af; margin-bottom: 10px; }
                    .info { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; background: #f3f4f6; border-radius: 8px; }
                    .info div { text-align: center; }
                    .info .label { font-size: 12px; color: #6b7280; }
                    .info .value { font-size: 18px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
                    th { background: #1e40af; color: white; }
                    tr:nth-child(even) { background: #f9fafb; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .matched { color: #16a34a; }
                    .variance { color: #dc2626; }
                    .summary { margin-top: 30px; padding: 15px; background: #f0f9ff; border-radius: 8px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>📋 รายงานผลการตรวจนับสต็อก</h1>
                <p style="text-align: center; color: #6b7280;">Stock Movement System - Inventory Audit Report</p>
                
                <div class="info">
                    <div><span class="label">วันที่ตรวจนับ</span><br><span class="value">${formatDate(auditDate)}</span></div>
                    <div><span class="label">ผู้ตรวจนับ</span><br><span class="value">${auditor || '-'}</span></div>
                    <div><span class="label">รายการทั้งหมด</span><br><span class="value">${products.length}</span></div>
                    <div><span class="label">ตรวจแล้ว</span><br><span class="value">${completedProducts.length}</span></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>รหัสสินค้า</th>
                            <th>ชื่อสินค้า</th>
                            <th class="text-right">ในระบบ</th>
                            <th class="text-right">นับจริง</th>
                            <th class="text-right">ผลต่าง</th>
                            <th class="text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${completedProducts.map((p, i) => `
                            <tr>
                                <td class="text-center">${i + 1}</td>
                                <td>${p.p_id}</td>
                                <td>${p.p_name}</td>
                                <td class="text-right">${p.system_count}</td>
                                <td class="text-right">${p.actual_count}</td>
                                <td class="text-right ${p.variance === 0 ? 'matched' : 'variance'}">
                                    ${p.variance > 0 ? '+' : ''}${p.variance}
                                </td>
                                <td class="text-center ${p.variance === 0 ? 'matched' : 'variance'}">
                                    ${p.variance === 0 ? '✓ ตรงกัน' : '✗ ไม่ตรง'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <strong>สรุปผลการตรวจนับ:</strong><br>
                    • ตรงกับระบบ: ${products.filter(p => p.status === 'matched').length} รายการ<br>
                    • มีผลต่าง: ${products.filter(p => p.status === 'variance').length} รายการ<br>
                    • ผลต่างสุทธิ: ${products.reduce((sum, p) => sum + p.variance, 0)} หน่วย
                </div>

                <p style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                    พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}
                </p>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredProducts = products.filter(p => {
        const matchSearch = p.p_id.toLowerCase().includes(search.toLowerCase()) ||
            p.p_name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || p.status === filter;
        return matchSearch && matchFilter;
    });

    const stats = {
        total: products.length,
        pending: products.filter(p => p.status === 'pending').length,
        matched: products.filter(p => p.status === 'matched').length,
        variance: products.filter(p => p.status === 'variance').length,
        totalVariance: products.reduce((sum, p) => sum + Math.abs(p.variance), 0)
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <ClipboardCheck className="w-8 h-8 text-blue-600" />
                        ตรวจนับสต็อก (Inventory Audit)
                    </h1>
                    <p className="text-gray-500">บันทึกผลการตรวจนับสินค้าจริง</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={printAuditReport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                    >
                        <Printer className="w-5 h-5" />
                        พิมพ์ PDF
                    </button>
                    <button
                        onClick={saveAudit}
                        disabled={saving || stats.pending === stats.total}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        บันทึกผลตรวจนับ
                    </button>
                </div>
            </div>

            {/* Audit Info */}
            <div className="bg-white rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">วันที่ตรวจนับ</label>
                    <input
                        type="date"
                        value={auditDate}
                        onChange={(e) => setAuditDate(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">ผู้ตรวจนับ</label>
                    <input
                        type="text"
                        value={auditor}
                        onChange={(e) => setAuditor(e.target.value)}
                        placeholder="ชื่อผู้ตรวจนับ"
                        className="w-full p-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">สถานะ</label>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm">
                            <span className="font-bold text-blue-600">{stats.total - stats.pending}</span>/{stats.total} รายการ
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${((stats.total - stats.pending) / stats.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                    <p className="text-sm text-gray-500">รอตรวจนับ</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                    <p className="text-sm text-gray-500">ตรงกับระบบ</p>
                    <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                    <p className="text-sm text-gray-500">มีผลต่าง</p>
                    <p className="text-2xl font-bold text-red-600">{stats.variance}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                    <p className="text-sm text-gray-500">ผลต่างรวม</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.totalVariance}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหารหัสหรือชื่อสินค้า..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'pending', 'variance'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filter === f
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {f === 'all' ? 'ทั้งหมด' : f === 'pending' ? 'รอตรวจ' : 'มีผลต่าง'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รหัสสินค้า</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ชื่อสินค้า</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">ในระบบ</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">นับจริง</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">ผลต่าง</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredProducts.map(product => (
                            <tr key={product.p_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{product.p_id}</td>
                                <td className="px-4 py-3">{product.p_name}</td>
                                <td className="px-4 py-3 text-right font-medium">{product.system_count}</td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        min="0"
                                        value={product.actual_count ?? ''}
                                        onChange={(e) => updateCount(product.p_id, e.target.value)}
                                        placeholder="ใส่จำนวน"
                                        className="w-24 mx-auto block text-center p-2 border rounded-lg"
                                    />
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${product.variance > 0 ? 'text-green-600' :
                                    product.variance < 0 ? 'text-red-600' : ''
                                    }`}>
                                    {product.actual_count !== null ? (
                                        product.variance > 0 ? `+${product.variance}` : product.variance
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {product.status === 'pending' && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">รอตรวจ</span>
                                    )}
                                    {product.status === 'matched' && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1 justify-center">
                                            <Check className="w-3 h-3" /> ตรงกัน
                                        </span>
                                    )}
                                    {product.status === 'variance' && (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1 justify-center">
                                            <AlertTriangle className="w-3 h-3" /> ไม่ตรง
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
