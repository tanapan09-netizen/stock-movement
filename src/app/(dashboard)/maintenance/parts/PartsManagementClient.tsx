'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react';
import { Package, Plus, Undo2, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SearchableSelect from '@/components/SearchableSelect';
import { getPartRequests, updatePartRequestStatus } from '@/actions/partRequestActions';
import {
    getMaintenanceRequests,
    getProducts,
    getWithdrawnPartsForMaintenance,
    withdrawPartForMaintenance,
    returnPartToStock,
    completeMaintenanceWithParts,
    clearAllReservedParts
} from '@/actions/maintenanceActions';

interface Product {
    p_id: string;
    p_name: string;
    p_unit: string | null;
    p_count: number;
    available_stock?: number;
}

interface MaintenancePart {
    part_id: number;
    request_id: number;
    p_id: string;
    quantity: number;
    unit: string | null;
    status: string;
    withdrawn_at: Date;
    returned_qty: number;
    withdrawn_by: string;
    product?: {
        p_name: string;
        p_unit: string | null;
        p_count?: number;
    };
    request?: {
        request_number: string;
        title: string;
        tbl_rooms: { room_code: string; room_name: string };
    };
}

interface MaintenanceRequestItem {
    request_id: number;
    request_number: string;
    title: string;
    status: string;
    tbl_rooms: { room_code: string; room_name: string };
}

interface PartRequestItem {
    request_id: number;
    request_number?: string | null;
    item_name: string;
    quantity: number;
    priority: string;
    requested_by: string;
    description?: string | null;
    tbl_maintenance_requests?: {
        request_number: string;
        title: string;
        tbl_rooms: { room_code: string; room_name: string };
    } | null;
}

const STATUS_COLORS: Record<string, string> = {
    withdrawn: 'bg-yellow-100 text-yellow-700',
    used: 'bg-green-100 text-green-700',
    returned: 'bg-gray-100 text-gray-600'
};

const STATUS_LABELS: Record<string, string> = {
    withdrawn: 'เบิกแล้ว',
    used: 'ใช้แล้ว',
    returned: 'คืนแล้ว'
};

export default function PartsManagementClient() {
    const { data: session } = useSession();
    const [withdrawnParts, setWithdrawnParts] = useState<MaintenancePart[]>([]);
    const [pendingPartRequests, setPendingPartRequests] = useState<PartRequestItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);
    const [selectedPart, setSelectedPart] = useState<MaintenancePart | null>(null);
    const [returnQty, setReturnQty] = useState(0);
    const [searchText, setSearchText] = useState('');

    const [withdrawForm, setWithdrawForm] = useState({
        request_id: 0,
        p_id: '',
        quantity: 1,
        withdrawn_by: ''
    });
    const normalizedRole = (session?.user?.role || '').toLowerCase();
    const canRespondPartAvailability = ['store', 'leader_store', 'manager', 'admin', 'owner'].includes(normalizedRole);

    async function loadData() {
        setLoading(true);
        try {
            const [partsResult, productsResult, requestsResult, partRequestsResult] = await Promise.all([
                getWithdrawnPartsForMaintenance(),
                getProducts(),
                getMaintenanceRequests({ status: ['in_progress', 'confirmed'] }),
                getPartRequests({ status: 'pending' })
            ]);

            if (partsResult.success) setWithdrawnParts(partsResult.data as MaintenancePart[]);
            if (productsResult.success) setProducts(productsResult.data as Product[]);
            if (requestsResult.success) setRequests(requestsResult.data as MaintenanceRequestItem[]);
            if (partRequestsResult.success) setPendingPartRequests(partRequestsResult.data as PartRequestItem[]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    }

    useEffect(() => {
        // Existing page flow loads initial data on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, []);

    const selectedProduct = products.find(p => p.p_id === withdrawForm.p_id);
    const availableStock = selectedProduct?.available_stock ?? selectedProduct?.p_count ?? 0;

    async function handleWithdraw(e: React.FormEvent) {
        e.preventDefault();
        if (!withdrawForm.request_id || !withdrawForm.p_id || !withdrawForm.quantity) {
            alert('กรุณากรอกข้อมูลให้ครบ');
            return;
        }

        if (availableStock <= 0) {
            alert('สินค้าในคลัง WH-01 ไม่พอสำหรับการเบิก');
            return;
        }

        if (withdrawForm.quantity > availableStock) {
            alert(`เบิกได้สูงสุดจาก WH-01 ${availableStock} ${selectedProduct?.p_unit || 'ชิ้น'}`);
            return;
        }

        const dataToSubmit = {
            ...withdrawForm,
            withdrawn_by: session?.user?.name || 'System'
        };

        const result = await withdrawPartForMaintenance(dataToSubmit);
        if (result.success) {
            setShowWithdrawForm(false);
            setWithdrawForm({ request_id: 0, p_id: '', quantity: 1, withdrawn_by: '' });
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    async function handleReturn() {
        if (!selectedPart || !returnQty) return;

        const result = await returnPartToStock({
            part_id: selectedPart.part_id,
            returned_qty: returnQty,
            returned_by: 'Admin'
        });

        if (result.success) {
            setSelectedPart(null);
            setReturnQty(0);
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    async function handleCompleteWithParts(request_id: number) {
        if (!confirm('ยืนยันเสร็จสิ้นงานและตัดสต็อกอะไหล่ที่เบิกไป?')) return;

        const result = await completeMaintenanceWithParts(request_id, 'Admin');
        if (result.success) {
            loadData();
            alert('ตัดสต็อกเรียบร้อย!');
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    async function handleClearReserved() {
        if (!confirm('ต้องการเคลียร์อะไหล่ที่ค้างในระบบทั้งหมด (คืนค่าสต็อก) หรือไม่?')) return;

        setLoading(true);
        const result = await clearAllReservedParts('Admin');
        if (result.success) {
            loadData();
            alert(`เคลียร์ข้อมูลเรียบร้อย (${result.count || 0} รายการ)`);
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
        setLoading(false);
    }

    async function handlePartAvailability(requestId: number, nextStatus: 'approved' | 'rejected') {
        const actionLabel = nextStatus === 'approved' ? 'เบิกได้' : 'เบิกไม่ได้';
        if (!confirm(`ยืนยันการแจ้งว่า ${actionLabel} ?`)) return;

        const result = await updatePartRequestStatus(requestId, nextStatus);
        if (result.success) {
            loadData();
            return;
        }

        alert('เกิดข้อผิดพลาด: ' + result.error);
    }

    const filteredParts = withdrawnParts.filter(part => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        return (
            part.product?.p_name?.toLowerCase().includes(search) ||
            part.request?.request_number?.toLowerCase().includes(search) ||
            part.request?.title?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="text-orange-500" /> จัดการอะไหล่ซ่อม
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">เบิกและคืนอะไหล่สำหรับงานซ่อม (ตัดสต็อกอัตโนมัติ)</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/maintenance" className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                        กลับหน้าแจ้งซ่อม
                    </Link>
                    <button
                        onClick={() => {
                            setWithdrawForm(prev => ({ ...prev, withdrawn_by: session?.user?.name || '' }));
                            setShowWithdrawForm(true);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                    >
                        <Plus size={18} /> เบิกอะไหล่
                    </button>
                    <button
                        onClick={handleClearReserved}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        <Undo2 size={18} /> เคลียร์คืนรายวัน
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-blue-500 mt-0.5" size={20} />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        เมื่อเบิกอะไหล่ → <span className="font-medium">พักไว้ที่คลังรอซ่อม (จอง)</span> •
                        เมื่อช่างจบงาน → <span className="font-medium">ตัดจากสต็อกจริง</span> •
                        กด "เคลียร์คืนรายวัน" → <span className="font-medium">คืนอะไหล่ที่ค้างทั้งหมดเข้าสต็อก</span>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาอะไหล่, เลขที่แจ้งซ่อม..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                        aria-label="ค้นหา"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold flex items-center gap-2">
                            <CheckCircle size={18} /> คำขอเบิกอะไหล่รอคลังตอบกลับ
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">ให้คลังแจ้งได้ทันทีว่าเบิกได้หรือเบิกไม่ได้</p>
                    </div>
                    <span className="text-sm text-gray-500">{pendingPartRequests.length} รายการ</span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : pendingPartRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">ไม่มีคำขอเบิกอะไหล่ที่รอคลังตอบกลับ</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">รายการ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ใบงาน</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">จำนวน</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ผู้ขอ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ความเร่งด่วน</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">คลังตอบกลับ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {pendingPartRequests.map((request) => (
                                    <tr key={request.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{request.item_name}</div>
                                            <div className="text-xs text-gray-500">{request.request_number || `REQ-${request.request_id}`}</div>
                                            {request.description ? (
                                                <div className="text-xs text-gray-400 mt-1">{request.description}</div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {request.tbl_maintenance_requests ? (
                                                <>
                                                    <div className="font-mono text-blue-600">{request.tbl_maintenance_requests.request_number}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {request.tbl_maintenance_requests.tbl_rooms?.room_code} - {request.tbl_maintenance_requests.title}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium">{request.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{request.requested_by}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${request.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {request.priority === 'urgent' ? 'ด่วน' : 'ปกติ'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canRespondPartAvailability ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handlePartAvailability(request.request_id, 'approved')}
                                                        className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                                    >
                                                        เบิกได้
                                                    </button>
                                                    <button
                                                        onClick={() => handlePartAvailability(request.request_id, 'rejected')}
                                                        className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                                                    >
                                                        เบิกไม่ได้
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">เฉพาะคลัง</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Withdrawn Parts List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Package size={18} /> รายการอะไหล่ที่เบิกไปซ่อม
                    </h2>
                    <span className="text-sm text-gray-500">{filteredParts.length} รายการ</span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : filteredParts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">ไม่มีรายการอะไหล่ที่เบิกไป</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">สินค้า/อะไหล่</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">เลขที่แจ้งซ่อม</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ห้อง</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">จำนวน</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">สถานะ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ผู้เบิก</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {filteredParts.map(part => (
                                    <tr key={part.part_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{part.product?.p_name || part.p_id}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm">
                                            {part.request?.request_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {part.request?.tbl_rooms.room_code}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-medium">{part.quantity - part.returned_qty}</span>
                                            <span className="text-gray-500"> / {part.quantity}</span>
                                            <span className="text-xs text-gray-400 ml-1">{part.unit || 'ชิ้น'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[part.status]}`}>
                                                {STATUS_LABELS[part.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {part.withdrawn_by}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {part.status === 'withdrawn' && (
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => { setSelectedPart(part); setReturnQty(part.quantity - part.returned_qty); }}
                                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1"
                                                    >
                                                        <Undo2 size={12} /> คืน
                                                    </button>                                                    
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Withdraw Form Modal */}
            {
                showWithdrawForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Package className="text-orange-500" /> เบิกอะไหล่
                            </h2>
                            <form onSubmit={handleWithdraw} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">งานซ่อม *</label>
                                    <select
                                        value={withdrawForm.request_id}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, request_id: Number(e.target.value) })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        required
                                    >
                                        <option value={0}>เลือกงานซ่อม</option>
                                        {requests.map(req => (
                                            <option key={req.request_id} value={req.request_id}>
                                                {req.request_number} - {req.tbl_rooms.room_code}: {req.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">สินค้า/อะไหล่ *</label>
                                    <SearchableSelect
                                        options={products.map(p => {
                                            const stock = p.available_stock ?? p.p_count;
                                            const unit = p.p_unit || 'ชิ้น';

                                            return {
                                                value: p.p_id,
                                                label: stock > 0
                                                    ? `${p.p_name} (คงเหลือ WH-01: ${stock} ${unit})`
                                                    : `${p.p_name} (WH-01 หมด)`
                                            };
                                        })}
                                        value={withdrawForm.p_id}
                                        onChange={(val: string) => setWithdrawForm(prev => ({
                                            ...prev,
                                            p_id: val,
                                            quantity: 1
                                        }))}
                                        placeholder="เลือกสินค้า"
                                        required
                                    />
                                    {selectedProduct && availableStock < 5 && (
                                        <div className="text-xs text-orange-600 mt-1">⚠️ สินค้าใกล้หมด</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">จำนวน *</label>
                                    <input
                                        type="number"
                                        value={withdrawForm.quantity}
                                        onChange={(e) => {
                                            const nextQty = Number(e.target.value);
                                            const safeQty = Math.max(1, availableStock > 0 ? Math.min(nextQty, availableStock) : nextQty);
                                            setWithdrawForm({ ...withdrawForm, quantity: safeQty });
                                        }}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        min="1"
                                        max={availableStock}
                                        required
                                    />
                                    {selectedProduct && (
                                        <div className="text-xs text-gray-500 mt-1 text-right">
                                            เบิกได้สูงสุดจาก WH-01: {availableStock}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ผู้เบิก *</label>
                                    <input
                                        type="text"
                                        value={session?.user?.name || ''}
                                        readOnly
                                        className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 dark:border-slate-600 cursor-not-allowed"
                                        placeholder="ชื่อผู้เบิก"
                                    />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowWithdrawForm(false)}
                                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={availableStock <= 0}
                                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                    >
                                        เบิก
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Return Modal */}
            {
                selectedPart && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm mx-4">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Undo2 className="text-gray-500" /> คืนอะไหล่
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-gray-500">สินค้า</div>
                                    <div className="font-medium">{selectedPart.product?.p_name}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">เบิกไป</div>
                                    <div className="font-medium">{selectedPart.quantity} {selectedPart.unit || 'ชิ้น'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">จำนวนที่จะคืน</label>
                                    <input
                                        type="number"
                                        value={returnQty}
                                        onChange={(e) => setReturnQty(Number(e.target.value))}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        min="1"
                                        max={selectedPart.quantity - selectedPart.returned_qty}
                                    />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button
                                        onClick={() => setSelectedPart(null)}
                                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleReturn}
                                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                    >
                                        คืน
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
