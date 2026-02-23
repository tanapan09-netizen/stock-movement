'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';
import {
    Wrench, Plus, Search, Filter, X, History, User, DollarSign, Printer, Clock, CheckCircle, XCircle, Image as ImageIcon, ShoppingCart
} from 'lucide-react';
import {
    getMaintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    getRooms,
    createRoom,
    getMaintenanceSummary,
    getMaintenanceHistory
} from '@/actions/maintenanceActions';
import { searchAssets } from '@/actions/assetActions';
import { createPartRequest } from '@/actions/partRequestActions';
import { getActiveTechnicians } from '@/actions/technicianActions';

interface Room {
    room_id: number;
    room_code: string;
    room_name: string;
    building: string | null;
    floor: string | null;
}

interface HistoryItem {
    history_id: number;
    action: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string;
    changed_at: Date;
}

interface MaintenanceRequestItem {
    request_id: number;
    request_number: string;
    room_id: number;
    title: string;
    description: string | null;
    image_url: string | null;
    priority: string;
    status: string;
    reported_by: string;
    assigned_to: string | null;
    scheduled_date: Date | null;
    estimated_cost: number | null;
    actual_cost: number | null;
    completed_at: Date | null;
    notes: string | null;
    created_at: Date;
    tbl_rooms: Room;
    tbl_maintenance_history?: HistoryItem[];
}

interface Technician {
    tech_id: number;
    name: string;
    phone: string | null;
    specialty: string | null;
    status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    in_progress: { label: 'กำลังซ่อม', color: 'bg-blue-100 text-blue-800', icon: Wrench },
    completed: { label: 'เสร็จแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'ต่ำ', color: 'bg-gray-100 text-gray-600' },
    normal: { label: 'ปกติ', color: 'bg-blue-100 text-blue-600' },
    high: { label: 'สูง', color: 'bg-orange-100 text-orange-600' },
    urgent: { label: 'เร่งด่วน', color: 'bg-red-100 text-red-600' }
};

export default function MaintenanceClient() {
    const { showToast } = useToast();
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPartRequestModal, setShowPartRequestModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRoom, setFilterRoom] = useState<number | null>(null);

    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [assetResults, setAssetResults] = useState<any[]>([]);
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
    const [searchText, setSearchText] = useState('');
    const [summary, setSummary] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, total_cost: 0 });

    // Status change modal states
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusChangeData, setStatusChangeData] = useState<{
        request: MaintenanceRequestItem | null;
        newStatus: string;
        technician: string;
        scheduledDate: string;
        completionNotes: string;
    }>({
        request: null,
        newStatus: '',
        technician: '',
        scheduledDate: '',
        completionNotes: ''
    });
    const [partRequestsForSummary, setPartRequestsForSummary] = useState<any[]>([]);

    // Dynamic technicians list from database
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        room_id: 0,
        title: '',
        description: '',
        category: 'general',
        image_url: '',
        priority: 'normal',
        reported_by: '',
        assigned_to: '', // Keep for compatibility but don't use for new request creation form
        scheduled_date: '', // Keep for compatibility
        estimated_cost: 0,
        location: '', // Custom location field
        department: '',
        contact_info: '',
        tags: '',
        tagInput: '' // Temporary state for tag input
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [roomFormData, setRoomFormData] = useState({
        room_code: '',
        room_name: '',
        building: '',
        floor: ''
    });

    // Edit form
    const [editData, setEditData] = useState({
        status: '',
        priority: '',
        assigned_to: '',
        scheduled_date: '',
        actual_cost: 0,
        notes: ''
    });

    async function loadData() {
        setLoading(true);
        try {
            const [reqResult, roomResult, summaryResult, techResult] = await Promise.all([
                getMaintenanceRequests({
                    status: filterStatus !== 'all' ? filterStatus : undefined,
                    room_id: filterRoom || undefined
                }),
                getRooms(),
                getMaintenanceSummary(),
                getActiveTechnicians()
            ]);

            if (reqResult.success) {
                setRequests(reqResult.data as MaintenanceRequestItem[]);
            } else {
                console.error('Failed to load requests:', reqResult.error);
                showToast('Failed to load requests: ' + reqResult.error, 'error');
            }
            if (roomResult.success) setRooms(roomResult.data as Room[]);
            if (summaryResult.success) setSummary(summaryResult.data as typeof summary);
            if (techResult.success) setTechnicians(techResult.data as Technician[]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus, filterRoom]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Validation
        if (!formData.title) {
            showToast('กรุณาระบุหัวข้อแจ้งซ่อม', 'warning');
            return;
        }
        if (!formData.reported_by) {
            showToast('กรุณาระบุผู้แจ้ง', 'warning');
            return;
        }
        // If room_id is 0 but user entered location text, we might want to allow it IF the backend allowed nullable room_id, 
        // but schema says Int (not nullable). So we must enforce room selection or default room.
        // For now, let's alert if invalid room.
        if (!formData.room_id || formData.room_id === 0) {
            showToast('กรุณาเลือกสถานที่จากรายการที่กำหนด', 'warning');
            return;
        }

        const data = new FormData();
        data.append('room_id', formData.room_id.toString());
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('category', formData.category);
        data.append('priority', formData.priority);
        data.append('reported_by', formData.reported_by);
        // data.append('assigned_to', formData.assigned_to); // Not used in creation
        // data.append('scheduled_date', formData.scheduled_date); // Not used in creation
        data.append('estimated_cost', formData.estimated_cost.toString());
        data.append('department', formData.department);
        data.append('contact_info', formData.contact_info);
        data.append('tags', formData.tags);

        if (selectedFile) {
            data.append('image_file', selectedFile);
        }

        try {
            const result = await createMaintenanceRequest(data);
            if (result.success) {
                setShowForm(false);
                setFormData({
                    room_id: 0,
                    title: '',
                    description: '',
                    category: 'general',
                    image_url: '',
                    priority: 'normal',
                    reported_by: '',
                    assigned_to: '',
                    scheduled_date: '',
                    estimated_cost: 0,
                    location: '',
                    department: '',
                    contact_info: '',
                    tags: '',
                    tagInput: ''
                });
                setSelectedFile(null);
                setSelectedAsset(null);
                setAssetSearchQuery('');
                setAssetResults([]);
                loadData();
                showToast('สร้างรายการแจ้งซ่อมสำเร็จ', 'success');
            } else {
                showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
        }
    }

    function handleAddTag() {
        if (!formData.tagInput.trim()) return;
        const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
        if (!currentTags.includes(formData.tagInput.trim())) {
            const newTags = [...currentTags, formData.tagInput.trim()].join(',');
            setFormData({ ...formData, tags: newTags, tagInput: '' });
        }
    }

    function handleRemoveTag(tagToRemove: string) {
        const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
        const newTags = currentTags.filter(t => t !== tagToRemove).join(',');
        setFormData({ ...formData, tags: newTags });
    }

    async function handleAssetSearch(query: string) {
        setAssetSearchQuery(query);
        if (query.length >= 2) {
            const result = await searchAssets(query);
            if (result.success) {
                setAssetResults(result.data);
                setShowAssetDropdown(true);
            }
        } else {
            setAssetResults([]);
            setShowAssetDropdown(false);
        }
    }

    function handleAssetSelect(asset: any) {
        setSelectedAsset(asset);
        setAssetSearchQuery(`${asset.asset_code} - ${asset.asset_name}`);
        setFormData({ ...formData, image_url: `${asset.asset_code} [SN: ${asset.serial_number || 'N/A'}]` });
        setShowAssetDropdown(false);
    }

    async function handleRoomSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!roomFormData.room_code || !roomFormData.room_name) {
            alert('กรุณากรอกรหัสและชื่อห้อง');
            return;
        }

        const result = await createRoom(roomFormData);
        if (result.success) {
            setShowRoomForm(false);
            setRoomFormData({ room_code: '', room_name: '', building: '', floor: '' });
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    // Open status change modal with context
    function openStatusChangeModal(request: MaintenanceRequestItem, newStatus: string) {
        setStatusChangeData({
            request,
            newStatus,
            technician: request.assigned_to || '',
            scheduledDate: request.scheduled_date
                ? new Date(request.scheduled_date).toISOString().split('T')[0]
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days
            completionNotes: ''
        });
        setPartRequestsForSummary([]); // Reset parts (would fetch from API if available)
        setShowStatusModal(true);
    }

    async function confirmStatusChange() {
        if (!statusChangeData.request) return;

        const updateData: {
            status: string;
            assigned_to?: string;
            scheduled_date?: string;
            notes?: string;
            completed_at?: Date;
        } = {
            status: statusChangeData.newStatus
        };

        // If changing to in_progress, require technician and schedule
        if (statusChangeData.newStatus === 'in_progress') {
            if (!statusChangeData.technician) {
                showToast('กรุณาเลือกช่างที่รับผิดชอบ', 'warning');
                return;
            }
            if (!statusChangeData.scheduledDate) {
                showToast('กรุณากำหนดวันที่คาดว่าจะเสร็จ', 'warning');
                return;
            }
            updateData.assigned_to = statusChangeData.technician;
            updateData.scheduled_date = statusChangeData.scheduledDate;
        }

        // If changing to completed, add completion notes and timestamp
        if (statusChangeData.newStatus === 'completed') {
            updateData.notes = statusChangeData.completionNotes || 'ซ่อมเสร็จเรียบร้อย';
            updateData.completed_at = new Date();
        }

        const result = await updateMaintenanceRequest(
            statusChangeData.request.request_id,
            updateData,
            statusChangeData.technician || 'System'
        );

        if (result.success) {
            setShowStatusModal(false);
            loadData();
            showToast(
                statusChangeData.newStatus === 'completed'
                    ? 'บันทึกการซ่อมเสร็จสิ้น'
                    : 'เปลี่ยนสถานะสำเร็จ',
                'success'
            );
        } else {
            showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
        }
    }

    // Simple cancel status change
    async function handleSimpleStatusChange(request_id: number, newStatus: string) {
        const result = await updateMaintenanceRequest(request_id, { status: newStatus }, 'System');
        if (result.success) {
            loadData();
            showToast('เปลี่ยนสถานะสำเร็จ', 'success');
        }
    }

    async function handleDelete(request_id: number) {
        if (!confirm('ต้องการลบรายการนี้หรือไม่?')) return;
        const result = await deleteMaintenanceRequest(request_id);
        if (result.success) {
            loadData();
        }
    }

    async function openDetailModal(request: MaintenanceRequestItem) {
        setSelectedRequest(request);
        setEditData({
            status: request.status,
            priority: request.priority,
            assigned_to: request.assigned_to || '',
            scheduled_date: request.scheduled_date ? new Date(request.scheduled_date).toISOString().split('T')[0] : '',
            actual_cost: request.actual_cost ? Number(request.actual_cost) : 0,
            notes: request.notes || ''
        });

        const historyResult = await getMaintenanceHistory(request.request_id);
        if (historyResult.success) {
            setHistoryItems(historyResult.data as HistoryItem[]);
        }
        setShowDetailModal(true);
    }

    async function handleUpdateRequest() {
        if (!selectedRequest) return;

        const result = await updateMaintenanceRequest(
            selectedRequest.request_id,
            {
                status: editData.status !== selectedRequest.status ? editData.status : undefined,
                priority: editData.priority !== selectedRequest.priority ? editData.priority : undefined,
                assigned_to: editData.assigned_to,
                scheduled_date: editData.scheduled_date || undefined,
                actual_cost: editData.actual_cost || undefined,
                notes: editData.notes || undefined
            },
            'Admin'
        );

        if (result.success) {
            setShowDetailModal(false);
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    const filteredRequests = requests.filter(req => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        return (
            req.title.toLowerCase().includes(search) ||
            req.request_number.toLowerCase().includes(search) ||
            req.tbl_rooms.room_name.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ระบบแจ้งซ่อม</h1>
                    <p className="text-gray-600 dark:text-gray-400">จัดการรายการแจ้งซ่อมและติดตามสถานะ</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="/maintenance/technicians"
                        className="px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2 text-sm"
                    >
                        <User size={16} /> จัดการช่าง
                    </a>
                    <a
                        href="/maintenance/parts"
                        className="px-3 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 text-sm"
                    >
                        <DollarSign size={16} /> เบิก/คืนอะไหล่
                    </a>
                    <button
                        onClick={() => setShowRoomForm(true)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Plus size={18} /> เพิ่มห้อง
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Wrench size={18} /> แจ้งซ่อมใหม่
                    </button>
                </div>
            </div>


            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">ทั้งหมด</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
                    <div className="text-yellow-600 text-sm">รอดำเนินการ</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">{summary.in_progress}</div>
                    <div className="text-blue-600 text-sm">กำลังซ่อม</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
                    <div className="text-green-600 text-sm">เสร็จแล้ว</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-600">฿{summary.total_cost.toLocaleString()}</div>
                    <div className="text-purple-600 text-sm">ค่าใช้จ่ายรวม</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-500" />
                    <select
                        title="Category Filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="กรองตามสถานะ"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="pending">รอดำเนินการ</option>
                        <option value="in_progress">กำลังซ่อม</option>
                        <option value="completed">เสร็จแล้ว</option>
                        <option value="cancelled">ยกเลิก</option>
                    </select>
                </div>
                <select
                    value={filterRoom || ''}
                    onChange={(e) => setFilterRoom(e.target.value ? Number(e.target.value) : null)}
                    className="border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                    aria-label="กรองตามห้อง"
                >
                    <option value="">ทุกห้อง</option>
                    {rooms.map(room => (
                        <option key={room.room_id} value={room.room_id}>
                            {room.room_code} - {room.room_name}
                        </option>
                    ))}
                </select>
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        title="Search Requests"
                        placeholder="ค้นหาใบงาน..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                        aria-label="ค้นหา"
                    />
                </div>
            </div>

            {/* Request List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">ไม่พบรายการแจ้งซ่อม</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">เลขที่</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ห้อง</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">รายละเอียด</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ผู้รับผิดชอบ</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">กำหนดซ่อม</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">สถานะ</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {filteredRequests.map(req => {
                                    const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                    const priority = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.normal;
                                    const StatusIcon = status.icon;

                                    return (
                                        <tr key={req.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => openDetailModal(req)}>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                                                {req.request_number}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {req.tbl_rooms.room_code}
                                                </div>
                                                <div className="text-xs text-gray-500">{req.tbl_rooms.room_name}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {req.image_url && <ImageIcon size={16} className="text-blue-500" />}
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                            {req.title}
                                                            <span className={`px-2 py-0.5 rounded text-xs ${priority.color}`}>{priority.label}</span>
                                                        </div>
                                                        {req.description && (
                                                            <div className="text-xs text-gray-500 truncate max-w-xs">{req.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {req.assigned_to || <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {req.scheduled_date ? new Date(req.scheduled_date).toLocaleDateString('th-TH') : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                                                    <StatusIcon size={14} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2 justify-end">
                                                    {/* Status action buttons based on current status */}
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => openStatusChangeModal(req, 'in_progress')}
                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
                                                                title="เริ่มซ่อม"
                                                            >
                                                                <Wrench size={14} />
                                                                เริ่มซ่อม
                                                            </button>
                                                            <button
                                                                onClick={() => handleSimpleStatusChange(req.request_id, 'cancelled')}
                                                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                                                                title="ยกเลิก"
                                                            >
                                                                ยกเลิก
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status === 'in_progress' && (
                                                        <>
                                                            <button
                                                                onClick={() => openStatusChangeModal(req, 'completed')}
                                                                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-1"
                                                                title="เสร็จแล้ว"
                                                            >
                                                                <CheckCircle size={14} />
                                                                เสร็จแล้ว
                                                            </button>
                                                            <button
                                                                onClick={() => handleSimpleStatusChange(req.request_id, 'pending')}
                                                                className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition"
                                                                title="พักงาน"
                                                            >
                                                                พักงาน
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status === 'completed' && (
                                                        <button
                                                            onClick={() => openStatusChangeModal(req, 'in_progress')}
                                                            className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-1"
                                                            title="ซ่อมใหม่"
                                                        >
                                                            <History size={14} />
                                                            ซ่อมใหม่
                                                        </button>
                                                    )}
                                                    {req.status === 'cancelled' && (
                                                        <button
                                                            onClick={() => handleSimpleStatusChange(req.request_id, 'pending')}
                                                            className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                                                            title="เปิดใหม่"
                                                        >
                                                            เปิดใหม่
                                                        </button>
                                                    )}
                                                    {/* Delete button */}
                                                    <button
                                                        onClick={() => handleDelete(req.request_id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="ลบ"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* New Request Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header with Subtitle */}
                        <div className="mb-6 pb-4 border-b bg-blue-600 -m-6 mb-6 p-6 rounded-t-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">แจ้งซ่อมใหม่</h2>
                                    <p className="text-blue-100 text-sm">กรอกรายละเอียดปัญหาหรือสิ่งที่ต้องการซ่อม</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="text-white hover:text-blue-200" title="ปิด">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Problem Title */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">หัวข้อปัญหา <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="เช่น คอมพิวเตอร์ที่ L-Lab-05 ไม่บูต, เครื่องปรับอากาศห้อง ไม่เย็น"
                                    title="ระบุหัวข้อปัญหา"
                                    required
                                />
                            </div>

                            {/* Asset Search with Autocomplete */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">หมายเลขสินทรัพย์หรือซีเรียล (ถ้ามี)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={assetSearchQuery}
                                        onChange={(e) => handleAssetSearch(e.target.value)}
                                        onFocus={() => assetResults.length > 0 && setShowAssetDropdown(true)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="พิมพ์เพื่อค้นหา รหัส, ชื่อ หรือ S/N..."
                                        title="หมายเลขสินทรัพย์"
                                    />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

                                    {/* Autocomplete Dropdown */}
                                    {showAssetDropdown && assetResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {assetResults.map((asset) => (
                                                <button
                                                    key={asset.asset_id}
                                                    type="button"
                                                    onClick={() => handleAssetSelect(asset)}
                                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                                                    title={`เลือก ${asset.asset_code}`}
                                                >
                                                    <div className="font-medium text-gray-900">{asset.asset_code}</div>
                                                    <div className="text-sm text-gray-600">{asset.asset_name}</div>
                                                    {asset.serial_number && (
                                                        <div className="text-xs text-gray-500">S/N: {asset.serial_number}</div>
                                                    )}
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {asset.category} • {asset.location || 'No location'}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Category and Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">หมวดหมู่ <span className="text-red-500">*</span></label>
                                    <select
                                        title="เลือกหมวดหมู่"
                                        value={formData.category || 'electrical'}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        required
                                    >
                                        <option value="electrical">ไฟฟ้า</option>
                                        <option value="plumbing">ประปา</option>
                                        <option value="internet">อินเตอร์เน็ต</option>
                                        <option value="furniture">เฟอร์นิเจอร์</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ระดับความสำคัญ <span className="text-red-500">*</span></label>
                                    <select
                                        title="Select Room"
                                        value={formData.room_id}
                                        onChange={(e) => setFormData({ ...formData, room_id: Number(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                                        required
                                    >
                                        <option value="low">ต่ำ</option>
                                        <option value="normal">ปานกลาง</option>
                                        <option value="high">สูง</option>
                                        <option value="urgent">เร่งด่วน</option>
                                    </select>
                                </div>
                            </div>

                            {/* Problem Description */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">รายละเอียดปัญหา <span className="text-red-500">*</span></label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    rows={4}
                                    placeholder="อธิบายปัญหาหรืออาการ เช่น อาการที่เกิดขึ้น, เวลาที่เกิดปัญหา"
                                    title="รายละเอียดปัญหา"
                                    required
                                />
                            </div>

                            {/* Reporter Name and Department */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ชื่อผู้แจ้ง <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.reported_by}
                                        onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="ชื่อ-นามสกุล"
                                        title="ชื่อผู้แจ้ง"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">แผนก</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="ชื่อแผนก/หน่วยงาน"
                                        title="แผนก"
                                    />
                                </div>
                            </div>

                            {/* Contact Method and Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ช่องทางติดต่อ <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.contact_info}
                                        onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="เบอร์โทร/อีเมล/ไลน์"
                                        title="ช่องทางติดต่อ"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">สถานที่</label>
                                    <input
                                        type="text"
                                        list="room-options"
                                        value={formData.location || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // Extract room_code from "Building - Code (Name)" or "Code (Name)"
                                            // This is tricky without a proper lookup, but for now we set location text
                                            // The user should select from the list for the ID to be set? 
                                            // Actually, the previous code didn't seem to set room_id from this input change unless handled elsewhere?
                                            // Wait, I missed where room_id is set. 
                                            // Ah, look at previous code: `onChange={(e) => setFormData({ ...formData, location: e.target.value })}`
                                            // And `defaultValue` was `formData.room_id`?? No.
                                            // The `handleStatusChange` etc are for existing requests.
                                            // In `createMaintenanceRequest`, `room_id` is required.
                                            // Where is `room_id` set in the form? 
                                            // In the screenshot there is "Location" input. 
                                            // The datalist has options. When user selects one, valid room_id should be set.
                                            // I need to add logic to find room_id from the selection string.

                                            setFormData({ ...formData, location: val });
                                            const selectedRoom = rooms.find(r =>
                                                `${r.building && `${r.building} - `}${r.room_code} (${r.room_name})` === val
                                            );
                                            if (selectedRoom) {
                                                setFormData({ ...formData, location: val, room_id: selectedRoom.room_id });
                                            }
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="พิมพ์หรือเลือกจากรายการ"
                                        title="สถานที่"
                                    />
                                    <datalist id="room-options">
                                        {rooms.map(room => (
                                            <option key={room.room_id} value={`${room.building && `${room.building} - `}${room.room_code} (${room.room_name})`} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">แท็ก</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={formData.tagInput}
                                        onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="เพิ่มแท็ก..."
                                        title="แท็ก"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        เพิ่ม
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags && formData.tags.split(',').map((tag, index) => (
                                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="text-gray-500 hover:text-red-500"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">แนบไฟล์ (ถ้ามี)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <span className="text-blue-600 font-medium">คลิกเพื่อเลือกไฟล์</span> หรือลากไฟล์มาวางที่นี่
                                        </div>
                                        <p className="text-xs text-gray-500">รองรับไฟล์รูปภาพ, PDF หรือเอกสาร ไฟล์ละไม่เกิน 10MB</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" title="แนบไฟล์" aria-label="แนบไฟล์" />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    ส่งคำขอซ่อม
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Room Modal */}
            {showRoomForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">เพิ่มห้องใหม่</h2>
                        <form onSubmit={handleRoomSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">รหัสห้อง *</label>
                                <input
                                    type="text"
                                    value={roomFormData.room_code}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, room_code: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น A101, B202"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ชื่อห้อง *</label>
                                <input
                                    type="text"
                                    value={roomFormData.room_name}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, room_name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น ห้องประชุมใหญ่"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">อาคาร</label>
                                <input
                                    type="text"
                                    value={roomFormData.building}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, building: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น อาคาร A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ชั้น</label>
                                <input
                                    type="text"
                                    value={roomFormData.floor}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น 1, 2, ชั้นใต้ดิน"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRoomForm(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                รายละเอียดการแจ้งซ่อม #{selectedRequest.request_number}
                            </h2>
                            <div className="flex gap-2">
                                <Link
                                    href={`/maintenance/job-sheet/${selectedRequest.request_id}`}
                                    target="_blank"
                                    className="text-gray-500 hover:text-blue-600 mr-2"
                                    title="พิมพ์ใบงาน"
                                >
                                    <Printer size={24} />
                                </Link>
                                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Left Column - Info */}
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-gray-500">ห้อง</div>
                                    <div className="font-medium">{selectedRequest.tbl_rooms?.room_code} - {selectedRequest.tbl_rooms?.room_name}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">หัวข้อ</div>
                                    <div className="font-medium">{selectedRequest.title}</div>
                                </div>
                                {selectedRequest.description && (
                                    <div>
                                        <div className="text-sm text-gray-500">รายละเอียด</div>
                                        <div>{selectedRequest.description}</div>
                                    </div>
                                )}
                                {selectedRequest.image_url && (
                                    <div>
                                        <div className="text-sm text-gray-500 mb-1">รูปภาพ</div>
                                        <img src={selectedRequest.image_url} alt="รูปภาพปัญหา" className="rounded-lg max-h-40 object-cover" />
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm text-gray-500">ผู้แจ้ง</div>
                                    <div>{selectedRequest.reported_by}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">วันที่แจ้ง</div>
                                    <div>{new Date(selectedRequest.created_at).toLocaleString('th-TH')}</div>
                                </div>
                            </div>

                            {/* Right Column - Edit */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">สถานะ</label>
                                    <select
                                        value={editData.status}
                                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value="pending">รอดำเนินการ</option>
                                        <option value="in_progress">กำลังซ่อม</option>
                                        <option value="completed">เสร็จแล้ว</option>
                                        <option value="cancelled">ยกเลิก</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ความเร่งด่วน</label>
                                    <select
                                        value={editData.priority}
                                        onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value="low">ต่ำ</option>
                                        <option value="normal">ปกติ</option>
                                        <option value="high">สูง</option>
                                        <option value="urgent">เร่งด่วน</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ผู้รับผิดชอบ/ช่าง</label>
                                    <input
                                        type="text"
                                        value={editData.assigned_to}
                                        onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        placeholder="ชื่อช่าง"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">วันที่นัดซ่อม</label>
                                    <input
                                        type="date"
                                        value={editData.scheduled_date}
                                        onChange={(e) => setEditData({ ...editData, scheduled_date: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ค่าใช้จ่ายจริง (บาท)</label>
                                    <input
                                        type="number"
                                        value={editData.actual_cost || ''}
                                        onChange={(e) => setEditData({ ...editData, actual_cost: Number(e.target.value) })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
                                    <textarea
                                        value={editData.notes}
                                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => setShowPartRequestModal(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <ShoppingCart size={14} /> ขอเบิก/ซื้ออะไหล่เพิ่ม (ที่ไม่มีในสต็อก)
                            </button>
                        </div>

                        {/* History */}
                        {historyItems.length > 0 && (
                            <div className="mt-6 pt-4 border-t">
                                <h3 className="font-medium mb-3 flex items-center gap-2">
                                    <History size={18} /> ประวัติการเปลี่ยนแปลง
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {historyItems.map(h => (
                                        <div key={h.history_id} className="text-sm flex justify-between bg-gray-50 dark:bg-slate-700/50 px-3 py-2 rounded">
                                            <div>
                                                <span className="font-medium">{h.action}</span>
                                                {h.old_value && h.new_value && (
                                                    <span className="text-gray-500"> ({h.old_value} → {h.new_value})</span>
                                                )}
                                            </div>
                                            <div className="text-gray-500">
                                                {h.changed_by} • {new Date(h.changed_at).toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-6">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                                ปิด
                            </button>
                            <button
                                onClick={handleUpdateRequest}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Confirmation Modal */}
            {showStatusModal && statusChangeData.request && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className={`p-5 ${statusChangeData.newStatus === 'in_progress'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                            : statusChangeData.newStatus === 'completed'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                : 'bg-gradient-to-r from-gray-500 to-gray-600'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    {statusChangeData.newStatus === 'in_progress' ? (
                                        <Wrench className="text-white" size={24} />
                                    ) : statusChangeData.newStatus === 'completed' ? (
                                        <CheckCircle className="text-white" size={24} />
                                    ) : (
                                        <Clock className="text-white" size={24} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {statusChangeData.newStatus === 'in_progress' && 'เริ่มดำเนินการซ่อม'}
                                        {statusChangeData.newStatus === 'completed' && 'ยืนยันการซ่อมเสร็จ'}
                                        {statusChangeData.newStatus === 'pending' && 'ยืนยันการเปลี่ยนสถานะ'}
                                    </h3>
                                    <p className="text-white/80 text-sm">
                                        ใบงาน: {statusChangeData.request.request_number}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {/* Request Summary */}
                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    {statusChangeData.request.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    สถานที่: {statusChangeData.request.tbl_rooms.room_name} ({statusChangeData.request.tbl_rooms.room_code})
                                </p>
                                {statusChangeData.request.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {statusChangeData.request.description}
                                    </p>
                                )}
                            </div>

                            {/* In Progress: Technician & Schedule Selection */}
                            {statusChangeData.newStatus === 'in_progress' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            ช่างที่รับผิดชอบ <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={statusChangeData.technician}
                                            onChange={(e) => setStatusChangeData({ ...statusChangeData, technician: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            title="เลือกช่าง"
                                        >
                                            <option value="">-- เลือกช่าง --</option>
                                            {technicians.map(tech => (
                                                <option key={tech.tech_id} value={tech.name}>{tech.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            วันที่คาดว่าจะเสร็จ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={statusChangeData.scheduledDate}
                                            onChange={(e) => setStatusChangeData({ ...statusChangeData, scheduledDate: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            title="เลือกวันที่"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Completed: Summary */}
                            {statusChangeData.newStatus === 'completed' && (
                                <div className="space-y-4">
                                    {/* Work Summary */}
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                        <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                            <CheckCircle size={16} />
                                            สรุปการซ่อม
                                        </h4>
                                        <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                                            <p>• ช่างผู้ดำเนินการ: {statusChangeData.request.assigned_to || '-'}</p>
                                            <p>• วันที่กำหนด: {statusChangeData.request.scheduled_date
                                                ? new Date(statusChangeData.request.scheduled_date).toLocaleDateString('th-TH')
                                                : '-'}
                                            </p>
                                            {statusChangeData.request.estimated_cost && statusChangeData.request.estimated_cost > 0 && (
                                                <p>• ค่าใช้จ่ายประมาณ: ฿{Number(statusChangeData.request.estimated_cost).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Parts Used (if any) */}
                                    {partRequestsForSummary.length > 0 && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                                <ShoppingCart size={16} />
                                                อะไหล่ที่เบิก
                                            </h4>
                                            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                                                {partRequestsForSummary.map((part, idx) => (
                                                    <li key={idx}>• {part.item_name} x{part.quantity}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Completion Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            หมายเหตุการซ่อม
                                        </label>
                                        <textarea
                                            value={statusChangeData.completionNotes}
                                            onChange={(e) => setStatusChangeData({ ...statusChangeData, completionNotes: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            rows={3}
                                            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการซ่อม..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmStatusChange}
                                className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 ${statusChangeData.newStatus === 'in_progress'
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : statusChangeData.newStatus === 'completed'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-gray-600 hover:bg-gray-700'
                                    }`}
                            >
                                {statusChangeData.newStatus === 'in_progress' && (
                                    <>
                                        <Wrench size={18} />
                                        เริ่มซ่อม
                                    </>
                                )}
                                {statusChangeData.newStatus === 'completed' && (
                                    <>
                                        <CheckCircle size={18} />
                                        ยืนยันเสร็จสิ้น
                                    </>
                                )}
                                {statusChangeData.newStatus === 'pending' && 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPartRequestModal && selectedRequest && (
                <PartRequestModal
                    maintenanceId={selectedRequest.request_id}
                    requestNumber={selectedRequest.request_number}
                    onClose={() => setShowPartRequestModal(false)}
                />
            )}
        </div>
    );
}

function PartRequestModal({
    maintenanceId,
    onClose,
    requestNumber
}: {
    maintenanceId: number;
    onClose: () => void;
    requestNumber: string;
}) {
    const [formData, setFormData] = useState({
        item_name: '',
        description: '',
        quantity: 1
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.item_name) return;

        const submitData = new FormData();
        submitData.append('maintenance_id', maintenanceId.toString());
        submitData.append('item_name', formData.item_name);
        submitData.append('description', formData.description);
        submitData.append('quantity', formData.quantity.toString());
        submitData.append('department', '');
        submitData.append('date_needed', '');
        submitData.append('priority', 'normal');
        submitData.append('estimated_price', '0');
        submitData.append('supplier', '');
        submitData.append('quotation_link', '');

        const result = await createPartRequest(submitData);

        if (result.success) {
            alert('บันทึกคำขอเรียบร้อยแล้ว');
            onClose();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl border dark:border-slate-700">
                <h2 className="text-xl font-bold mb-2">ขอซื้ออะไหล่เพิ่ม</h2>
                <p className="text-sm text-gray-500 mb-4">สำหรับใบงาน: {requestNumber}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">ชื่อสินค้า/อะไหล่ *</label>
                        <input
                            type="text"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                            placeholder="ระบุชื่ออะไหล่"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">รายละเอียด/สเปค</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                            rows={2}
                            placeholder="รุ่น, ยี่ห้อ, ขนาด..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">จำนวน *</label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                            min="1"
                            required
                        />
                    </div>
                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            ยืนยัน
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
