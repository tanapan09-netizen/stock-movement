'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, ShoppingCart, CheckCircle, XCircle, Clock, Upload, Link as LinkIcon, X } from 'lucide-react';
import { getPartRequests, createPartRequest, updatePartRequestStatus, deletePartRequest, approvePartRequest } from '@/actions/partRequestActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';

interface PartRequest {
    request_id: number;
    maintenance_id: number | null;
    item_name: string;
    description: string | null;
    quantity: number;
    status: string;
    requested_by: string;
    department: string | null;
    date_needed: Date | null;
    priority: string;
    estimated_price: number | null;
    supplier: string | null;
    quotation_file: string | null;
    quotation_link: string | null;
    approval_notes: string | null;
    created_at: Date;
    // Phase 1 Fields
    request_type?: string;
    category?: string;
    request_number?: string;
    current_stage?: number;
    tbl_maintenance_requests?: {
        request_number: string;
        title: string;
        tbl_rooms: { room_code: string; room_name: string; };
    } | null;
}

interface MaintenanceRequest {
    request_id: number;
    request_number: string;
    title: string;
    status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    ordered: { label: 'สั่งซื้อแล้ว', color: 'bg-indigo-100 text-indigo-800', icon: ShoppingCart },
    received: { label: 'ได้รับของแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function PartRequestClient() {
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        maintenance_id: 0,
        item_name: '',
        description: '',
        quantity: 1,
        department: '',
        date_needed: '',
        priority: 'normal',
        estimated_price: 0,
        supplier: '',
        quotation_link: '',
        request_type: 'standard',
        category: 'MNT'
    });

    async function loadData() {
        setLoading(true);
        const [reqResult, maintResult] = await Promise.all([
            getPartRequests({ status: filterStatus }),
            getMaintenanceRequests({ status: ['pending', 'in_progress'] })

        ]);
        if (reqResult.success) {
            setRequests(reqResult.data as unknown as PartRequest[]);
        }
        if (maintResult.success) {
            setMaintenanceRequests(maintResult.data as MaintenanceRequest[]);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.item_name) return;

        const submitData = new FormData();
        submitData.append('maintenance_id', formData.maintenance_id.toString());
        submitData.append('item_name', formData.item_name);
        submitData.append('description', formData.description);
        submitData.append('quantity', formData.quantity.toString());
        submitData.append('department', formData.department);
        submitData.append('date_needed', formData.date_needed);
        submitData.append('priority', formData.priority);
        submitData.append('estimated_price', formData.estimated_price.toString());
        submitData.append('supplier', formData.supplier);
        submitData.append('supplier', formData.supplier);
        submitData.append('quotation_link', formData.quotation_link);
        submitData.append('request_type', formData.request_type);
        if (formData.category) submitData.append('category', formData.category);

        if (uploadedFile) {
            submitData.append('quotation_file', uploadedFile);
        }

        const result = await createPartRequest(submitData);
        if (result.success) {
            setShowForm(false);
            setFormData({ maintenance_id: 0, item_name: '', description: '', quantity: 1, department: '', date_needed: '', priority: 'normal', estimated_price: 0, supplier: '', quotation_link: '', request_type: 'standard', category: 'MNT' });
            setUploadedFile(null);
            loadData();
        } else {
            alert('Error: ' + result.error);
        }
    }

    async function handleStatusChange(id: number, status: string) {
        const result = await updatePartRequestStatus(id, status);
        if (result.success) loadData();
    }

    async function handleDelete(id: number) {
        if (!confirm('ยืนยันการลบ?')) return;
        const result = await deletePartRequest(id);
        if (result.success) loadData();
    }

    async function handleApprove(id: number) {
        if (!confirm('ยืนยันการอนุมัติ?')) return;
        const result = await approvePartRequest(id, 'approve');
        if (result.success) loadData();
        else alert('Error: ' + result.error);
    }

    const getStageLabel = (stage?: number) => {
        switch (stage) {
            case 0: return { label: 'รอหัวหน้างาน', color: 'bg-yellow-100 text-yellow-800' };
            case 1: return { label: 'รอบัญชี', color: 'bg-orange-100 text-orange-800' };
            case 2: return { label: 'รอผู้จัดการ', color: 'bg-purple-100 text-purple-800' };
            case 3: return { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-800' };
            default: return { label: 'รออนุมัติ', color: 'bg-gray-100' };
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายการขอซื้ออะไหล่</h1>
                    <p className="text-gray-600 dark:text-gray-400">รายการอะไหล่ที่ไม่มีในสต็อกและต้องการสั่งซื้อ</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={18} /> ขอซื้ออะไหล่
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <select
                        title="Filter by status"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="pending">รออนุมัติ</option>
                        <option value="approved">อนุมัติแล้ว</option>
                        <option value="ordered">สั่งซื้อแล้ว</option>
                        <option value="received">ได้รับของแล้ว</option>
                        <option value="rejected">ไม่อนุมัติ</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left">สินค้า</th>
                                <th className="px-4 py-3 text-left">No.</th>
                                <th className="px-4 py-3 text-left">จำนวน</th>
                                <th className="px-4 py-3 text-left">ขั้นตอน</th>
                                <th className="px-4 py-3 text-left">อ้างอิงใบงาน</th>
                                <th className="px-4 py-3 text-left">สถานะ</th>
                                <th className="px-4 py-3 text-left">ผู้ขอ</th>
                                <th className="px-4 py-3 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {requests.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">ไม่มีรายการ</td></tr>
                            ) : (
                                requests.map(req => {
                                    const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={req.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium flex items-center gap-2">
                                                    {req.item_name}
                                                    {(req.quotation_file || req.quotation_link) && (
                                                        <a
                                                            href={req.quotation_file || req.quotation_link || '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 p-1 rounded-full"
                                                            title="ดูใบเสนอราคา"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <LinkIcon size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">{req.description}</div>
                                                <div className="text-[10px] text-gray-400">{req.request_type === 'petty_cash' ? 'เงินสดย่อย' : 'สั่งซื้อทั่วไป'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-blue-600">{req.request_number || '-'}</td>
                                            <td className="px-4 py-3">{req.quantity}</td>
                                            <td className="px-4 py-3 min-w-[120px]">
                                                <WorkflowStepper
                                                    currentStep={
                                                        req.status === 'pending' ? 1 :
                                                        req.status === 'approved' ? 2 :
                                                        req.status === 'ordered' ? 3 :
                                                        req.status === 'received' ? 4 : 1
                                                    }
                                                    totalSteps={4}
                                                    status={req.status as WorkflowStatus}
                                                    size="sm"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {req.tbl_maintenance_requests ? (
                                                    <span className="font-mono text-blue-600">
                                                        {req.tbl_maintenance_requests.request_number}
                                                        <span className="text-gray-500 font-sans ml-1">
                                                            ({req.tbl_maintenance_requests.tbl_rooms?.room_code})
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                                                    <StatusIcon size={14} /> {status.label}
                                                </span>

                                            </td>
                                            <td className="px-4 py-3 text-sm">{req.requested_by}</td>
                                            <td className="px-4 py-3 text-right flex gap-2 justify-end">
                                                {/* Approve Button */}
                                                {req.status === 'pending' && (req.current_stage === undefined || req.current_stage < 3) && (
                                                    <button
                                                        onClick={() => handleApprove(req.request_id)}
                                                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                                        title="Approve Next Stage"
                                                    >
                                                        อนุมัติ
                                                    </button>
                                                )}
                                                <select
                                                    title="Change Status"
                                                    value={req.status}
                                                    onChange={(e) => handleStatusChange(req.request_id, e.target.value)}
                                                    className="text-sm border rounded px-2 py-1 mr-2 dark:bg-slate-700 dark:border-slate-600"
                                                >
                                                    <option value="pending">รอ</option>
                                                    <option value="approved">อนุมัติ</option>
                                                    <option value="ordered">ซื้อแล้ว</option>
                                                    <option value="received">ได้รับ</option>
                                                    <option value="rejected">ปัดตก</option>
                                                </select>
                                                <button onClick={() => handleDelete(req.request_id)} className="text-red-600 text-sm">ลบ</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {
                showForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
                                <h2 className="text-xl font-bold text-white">ขอซื้ออะไหล่ใหม่</h2>
                                <p className="text-blue-100 text-sm">กรอกข้อมูลการขอซื้ออะไหล่และใบเสนอราคา</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* M aintenance Reference */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">อ้างอิงใบแจ้งซ่อม</label>
                                    <select
                                        title="เลือกใบแจ้งซ่อม"
                                        value={formData.maintenance_id}
                                        onChange={(e) => setFormData({ ...formData, maintenance_id: Number(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value={0}>-- ไม่ระบุ --</option>
                                        {maintenanceRequests.map(req => (
                                            <option key={req.request_id} value={req.request_id}>
                                                {req.request_number} - {req.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Request Type & Category */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ประเภทคำขอ</label>
                                        <select
                                            title="ประเภทคำขอ"
                                            value={formData.request_type}
                                            onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        >
                                            <option value="standard">สั่งซื้อทั่วไป (PR)</option>
                                            <option value="urgent">เร่งด่วน</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">หมวดหมู่ (สำหรับรหัส)</label>
                                        <select
                                            title="หมวดหมู่"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        >
                                            <option value="MNT">ซ่อมบำรุง (MNT)</option>
                                            <option value="OFF">สำนักงาน (OFF)</option>
                                            <option value="IT">ไอที (IT)</option>
                                            <option value="GARDEN">สวน (GARDEN)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Item Info - 2 columns */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ชื่อสินค้า/อะไหล่ <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            title="ชื่อสินค้า"
                                            value={formData.item_name}
                                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                            placeholder="เช่น หลอดไฟ LED, ปลั๊กไฟ"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">จำนวน <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            title="จำนวน"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">รายละเอียดเพิ่มเติม</label>
                                    <textarea
                                        title="รายละเอียด"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        placeholder="รายละเอียดเพิ่มเติม, รุ่น, ขนาด, สี ฯลฯ"
                                        rows={3}
                                    />
                                </div>

                                {/* Department, Date, Priority - 3 columns */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">แผนก</label>
                                        <input
                                            type="text"
                                            title="แผนก"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                            placeholder="เช่น แม่บ้าน"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">วันที่ต้องการ</label>
                                        <input
                                            type="date"
                                            title="วันที่ต้องการ"
                                            value={formData.date_needed}
                                            onChange={(e) => setFormData({ ...formData, date_needed: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ความเร่งด่วน</label>
                                        <select
                                            title="ความเร่งด่วน"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        >
                                            <option value="normal">ปกติ</option>
                                            <option value="urgent">เร่งด่วน</option>
                                            <option value="critical">วิกฤต</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Price & Supplier */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ราคาประมาณการ (บาท)</label>
                                        <input
                                            type="number"
                                            title="ราคาประมาณการ"
                                            value={formData.estimated_price}
                                            onChange={(e) => setFormData({ ...formData, estimated_price: Number(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ผู้จัดจำหน่าย/ร้านค้า</label>
                                        <input
                                            type="text"
                                            title="ผู้จัดจำหน่าย"
                                            value={formData.supplier}
                                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                            placeholder="ชื่อร้าน หรือ ชื่อผู้จัดจำหน่าย"
                                        />
                                    </div>
                                </div>

                                {/* Quotation Section */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">ใบเสนอราคา</h3>

                                    {/* File Upload */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2">อัปโหลดไฟล์</label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                                            <input
                                                type="file"
                                                title="อัปโหลดไฟล์"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 10 * 1024 * 1024) {
                                                            alert('ไฟล์ใหญ่เกินไป (สูงสุด 10MB)');
                                                            return;
                                                        }
                                                        setUploadedFile(file);
                                                    }
                                                }}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="hidden"
                                                id="file-upload"
                                            />
                                            <label htmlFor="file-upload" className="cursor-pointer">
                                                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                                                {uploadedFile ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-sm text-green-600">{uploadedFile.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setUploadedFile(null);
                                                            }}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-sm text-gray-600">คลิกเพื่ออัปโหลดไฟล์</p>
                                                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (สูงสุด 10MB)</p>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Link */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">หรือแนบลิงก์ URL</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="url"
                                                title="URL ใบเสนอราคา"
                                                value={formData.quotation_link}
                                                onChange={(e) => setFormData({ ...formData, quotation_link: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                                placeholder="https://example.com/quotation.pdf"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            setUploadedFile(null);
                                        }}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        บันทึกและส่งคำขอ
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
