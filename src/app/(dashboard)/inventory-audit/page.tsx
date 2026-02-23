'use client';

import { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Check, AlertTriangle, Save, Loader2, Printer, History } from 'lucide-react';
import { saveInventoryAudit, getInventoryAuditHistory, getProductsForAudit } from '@/actions/inventoryAuditActions';

interface Product {
    p_id: string;
    p_name: string;
    system_count: number;
    actual_count: number | null;
    variance: number;
    status: 'pending' | 'matched' | 'variance';
}

interface AuditRecord {
    audit_id: number;
    audit_number: string | null;
    audit_date: Date | null;
    status: string | null;
    total_items: number | null;
    total_discrepancy: number | null;
    completed_by: string | null;
    created_at: Date;
}

export default function InventoryAuditPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'variance'>('all');
    const [saving, setSaving] = useState(false);
    const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditor, setAuditor] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [history, setHistory] = useState<AuditRecord[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getProductsForAudit();
                const prods = (res.data || []).map((p) => ({
                    p_id: p.p_id,
                    p_name: p.p_name,
                    system_count: p.p_count ?? 0,
                    actual_count: null,
                    variance: 0,
                    status: 'pending' as const
                }));
                setProducts(prods);
            } catch {
                setErrorMsg('ไม่สามารถโหลดข้อมูลสินค้าได้');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            getInventoryAuditHistory(20).then(res => {
                if (res.success) setHistory(res.data as any);
            });
        }
    }, [activeTab]);

    const updateCount = (id: string, actualCount: string) => {
        const count = parseInt(actualCount);
        setProducts(prev => prev.map(p => {
            if (p.p_id !== id) return p;
            if (isNaN(count) || actualCount === '') {
                return { ...p, actual_count: null, variance: 0, status: 'pending' };
            }
            const variance = count - p.system_count;
            return { ...p, actual_count: count, variance, status: variance === 0 ? 'matched' : 'variance' };
        }));
    };

    const saveAudit = async () => {
        setSuccessMsg('');
        setErrorMsg('');
        if (!auditor.trim()) {
            setErrorMsg('กรุณาระบุชื่อผู้ตรวจนับ');
            return;
        }
        setSaving(true);
        try {
            const result = await saveInventoryAudit({
                audit_date: auditDate,
                auditor: auditor.trim(),
                items: products.map(p => ({
                    p_id: p.p_id,
                    system_qty: p.system_count,
                    counted_qty: p.actual_count
                }))
            });

            if (result.success) {
                setSuccessMsg(`✓ บันทึกสำเร็จ! เลขที่: ${result.auditNumber}`);
                // Reset counts
                setProducts(prev => prev.map(p => ({ ...p, actual_count: null, variance: 0, status: 'pending' })));
            } else {
                setErrorMsg(result.error || 'บันทึกไม่สำเร็จ');
            }
        } catch {
            setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    const printAuditReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const completedProducts = products.filter(p => p.actual_count !== null);
        const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        printWindow.document.write(`<!DOCTYPE html><html><head><title>รายงานตรวจนับสต็อก</title>
        <style>body{font-family:sans-serif;padding:20px}h1{text-align:center;color:#1e40af}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #d1d5db;padding:8px}th{background:#1e40af;color:#fff}.matched{color:#16a34a}.variance{color:#dc2626}@media print{button{display:none}}</style>
        </head><body><h1>📋 รายงานผลการตรวจนับสต็อก</h1>
        <p style="text-align:center">วันที่: ${formatDate(auditDate)} | ผู้ตรวจนับ: ${auditor || '-'}</p>
        <table><thead><tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อสินค้า</th><th>ในระบบ</th><th>นับจริง</th><th>ผลต่าง</th><th>สถานะ</th></tr></thead>
        <tbody>${completedProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.p_id}</td><td>${p.p_name}</td><td>${p.system_count}</td><td>${p.actual_count}</td>
        <td class="${p.variance === 0 ? 'matched' : 'variance'}">${p.variance > 0 ? '+' : ''}${p.variance}</td>
        <td class="${p.variance === 0 ? 'matched' : 'variance'}">${p.variance === 0 ? '✓ ตรงกัน' : '✗ ไม่ตรง'}</td></tr>`).join('')}
        </tbody></table><script>window.onload=function(){window.print()}</script></body></html>`);
        printWindow.document.close();
    };

    const filteredProducts = products.filter(p => {
        const matchSearch = p.p_id.toLowerCase().includes(search.toLowerCase()) || p.p_name.toLowerCase().includes(search.toLowerCase());
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
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
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
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow disabled:opacity-50 transition"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        บันทึกผลตรวจนับ
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl font-medium">
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl font-medium">
                    {errorMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-4 py-2.5 font-medium text-sm transition border-b-2 -mb-px ${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <ClipboardCheck className="w-4 h-4 inline mr-2" />
                    ตรวจนับสต็อก
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2.5 font-medium text-sm transition border-b-2 -mb-px ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <History className="w-4 h-4 inline mr-2" />
                    ประวัติการตรวจนับ
                </button>
            </div>

            {activeTab === 'audit' && (
                <>
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
                            <label className="block text-sm text-gray-600 mb-1">ผู้ตรวจนับ <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={auditor}
                                onChange={(e) => setAuditor(e.target.value)}
                                placeholder="ชื่อผู้ตรวจนับ"
                                className="w-full p-2 border rounded-lg"
                                required
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
                                        style={{ width: `${stats.total > 0 ? ((stats.total - stats.pending) / stats.total) * 100 : 0}%` }}
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
                                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                                                className="w-24 mx-auto block text-center p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                            />
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${product.variance > 0 ? 'text-green-600' : product.variance < 0 ? 'text-red-600' : ''}`}>
                                            {product.actual_count !== null ? (product.variance > 0 ? `+${product.variance}` : product.variance) : '-'}
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
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">ไม่พบรายการ</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="p-4 border-b">
                        <h2 className="font-bold text-gray-800">ประวัติการตรวจนับ (20 รายการล่าสุด)</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">เลขที่</th>
                                <th className="px-4 py-3 text-left">วันที่</th>
                                <th className="px-4 py-3 text-right">รายการ</th>
                                <th className="px-4 py-3 text-right">ผลต่าง</th>
                                <th className="px-4 py-3 text-left">ผู้ตรวจนับ</th>
                                <th className="px-4 py-3 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {history.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">ยังไม่มีประวัติการตรวจนับ</td></tr>
                            ) : history.map(h => (
                                <tr key={h.audit_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{h.audit_number ?? '-'}</td>
                                    <td className="px-4 py-3">{h.audit_date ? new Date(h.audit_date).toLocaleDateString('th-TH') : '-'}</td>
                                    <td className="px-4 py-3 text-right">{h.total_items ?? 0}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${(h.total_discrepancy ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {h.total_discrepancy ?? 0}
                                    </td>
                                    <td className="px-4 py-3">{h.completed_by ?? '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">สำเร็จ</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
