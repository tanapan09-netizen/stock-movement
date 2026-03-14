'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useToast } from '@/components/ToastProvider';
import {
    Search, Plus, CheckCircle2, Clock, AlertCircle, XCircle,
    Wrench, Eye, Calendar, MapPin, ShieldCheck, Loader2,
    ChevronDown, X, Filter, ClipboardList
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
    getMaintenanceRequests,
    createMaintenanceRequest,
    getRooms
} from '@/actions/maintenanceActions';

interface Room {
    room_id: number;
    room_code: string;
    room_name: string;
    room_type: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
    active: boolean;
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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'รอรับเรื่อง', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    in_progress: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2 },
    confirmed: { label: 'ยืนยันงานเสร็จ', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
    completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    verified: { label: 'ตรวจสอบแล้ว', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: ShieldCheck },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    urgent: { label: 'เร่งด่วนมาก', color: 'bg-red-100 text-red-700' },
    high: { label: 'เร่งด่วน', color: 'bg-orange-100 text-orange-700' },
    normal: { label: 'ปกติ', color: 'bg-blue-100 text-blue-700' },
    low: { label: 'ไม่เร่งด่วน', color: 'bg-gray-100 text-gray-700' },
};

const CATEGORY_OPTIONS = [
    { value: 'general', label: 'ทั่วไป' },
    { value: 'electrical', label: 'ไฟฟ้า' },
    { value: 'plumbing', label: 'ประปา' },
    { value: 'air_conditioning', label: 'แอร์/ระบบปรับอากาศ' },
    { value: 'structural', label: 'โครงสร้าง/อาคาร' },
    { value: 'it', label: 'IT/คอมพิวเตอร์' },
    { value: 'furniture', label: 'เฟอร์นิเจอร์/ของตกแต่ง' },
    { value: 'other', label: 'อื่นๆ' },
];

interface Props {
    userPermissions: Record<string, boolean>;
}

export default function GeneralRequestClient({ userPermissions }: Props) {
    const { data: session } = useSession();
    const { showToast } = useToast();

    // Data
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestItem | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Room selector
    const [roomSearch, setRoomSearch] = useState('');
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Form
    const [formData, setFormData] = useState({
        room_id: 0,
        title: '',
        description: '',
        category: 'general',
        priority: 'normal',
        reported_by: '',
        contact_info: '',
        department: '',
        tags: '',
        tagInput: '',
        target_role: 'general', // Key: targets ธุรการ role
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [reqResult, roomResult] = await Promise.all([
                getMaintenanceRequests(),
                getRooms()
            ]);
            if (reqResult.success && reqResult.data) {
                setRequests(reqResult.data as unknown as MaintenanceRequestItem[]);
            }
            if (roomResult.success && roomResult.data) {
                setRooms(roomResult.data);
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        // Pre-fill reported_by from session
        if (session?.user) {
            const user = session.user as any;
            setFormData(f => ({ ...f, reported_by: user.name || user.email || '' }));
        }
    }, [loadData, session]);

    // Filtered rooms for search
    const filteredRooms = rooms.filter(r =>
        r.active &&
        (`${r.room_code} ${r.room_name}`.toLowerCase().includes(roomSearch.toLowerCase()))
    );

    const selectedRoom = rooms.find(r => r.room_id === formData.room_id);

    // Filtered requests
    const filteredRequests = requests.filter(req => {
        const matchSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.tbl_rooms?.room_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'all' || req.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleAddTag = () => {
        const tag = formData.tagInput.trim();
        if (!tag) return;
        const existing = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
        if (!existing.includes(tag)) {
            const newTags = [...existing, tag].join(',');
            setFormData({ ...formData, tags: newTags, tagInput: '' });
        } else {
            setFormData({ ...formData, tagInput: '' });
        }
    };

    const handleRemoveTag = (tag: string) => {
        const newTags = formData.tags.split(',').filter(t => t.trim() !== tag).join(',');
        setFormData({ ...formData, tags: newTags });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast('กรุณาระบุชื่อเรื่อง', 'warning');
            return;
        }
        if (!formData.reported_by.trim()) {
            showToast('กรุณาระบุชื่อผู้แจ้ง', 'warning');
            return;
        }
        if (!formData.room_id || formData.room_id === 0) {
            showToast('กรุณาเลือกสถานที่จากรายการ', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append('room_id', formData.room_id.toString());
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('category', formData.category);
            data.append('priority', formData.priority);
            data.append('reported_by', formData.reported_by);
            data.append('contact_info', formData.contact_info);
            data.append('department', formData.department);
            data.append('tags', formData.tags);
            data.append('target_role', 'general'); // Always 'general' for this page

            if (selectedFile) {
                data.append('image_file', selectedFile);
            }

            const result = await createMaintenanceRequest(data);
            if (result.success) {
                setShowForm(false);
                setFormData({
                    room_id: 0,
                    title: '',
                    description: '',
                    category: 'general',
                    priority: 'normal',
                    reported_by: (session?.user as any)?.name || '',
                    contact_info: '',
                    department: '',
                    tags: '',
                    tagInput: '',
                    target_role: 'general',
                });
                setSelectedFile(null);
                setRoomSearch('');
                loadData();
                showToast('บันทึกเรียบร้อย ระบบจะแจ้งเตือนฝ่ายธุรการ', 'success');
            } else {
                showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
            }
        } catch (err) {
            showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: Date | null | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <ClipboardList className="w-6 h-6 text-blue-600" />
                                รับแจ้งซ่อม (ธุรการ)
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">ส่งคำขอซ่อม — ระบบจะแจ้งเตือนฝ่ายธุรการโดยตรง</p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">แจ้งซ่อม</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'ทั้งหมด', value: requests.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'รอรับเรื่อง', value: requests.filter(r => r.status === 'pending').length, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                        { label: 'กำลังดำเนินการ', value: requests.filter(r => r.status === 'in_progress').length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'เสร็จสิ้น', value: requests.filter(r => r.status === 'completed' || r.status === 'verified').length, color: 'bg-green-50 border-green-200 text-green-700' },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.color} border rounded-xl p-3 text-center`}>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs font-medium mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="ค้นหา..."
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        aria-label="กรองตามสถานะ"
                    >
                        <option value="all">ทุกสถานะ</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Request List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">ยังไม่มีรายการแจ้งซ่อม</p>
                        <p className="text-sm mt-1">กดปุ่ม &quot;แจ้งซ่อม&quot; เพื่อสร้างรายการใหม่</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredRequests.map(req => {
                            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                            const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.normal;
                            const StatusIcon = statusCfg.icon;
                            return (
                                <div
                                    key={req.request_id}
                                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                                    onClick={() => { setSelectedRequest(req); setShowDetail(true); }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-xs font-mono text-gray-400">{req.request_number}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusCfg.label}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityCfg.color}`}>
                                                    {priorityCfg.label}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {req.tbl_rooms?.room_code} — {req.tbl_rooms?.room_name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(req.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                            onClick={e => { e.stopPropagation(); setSelectedRequest(req); setShowDetail(true); }}
                                            title="ดูรายละเอียด"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetail && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">รายละเอียดคำขอ</h2>
                            <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-gray-500">{selectedRequest.request_number}</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium border ${STATUS_CONFIG[selectedRequest.status]?.color}`}>
                                    {STATUS_CONFIG[selectedRequest.status]?.label}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${PRIORITY_CONFIG[selectedRequest.priority]?.color}`}>
                                    {PRIORITY_CONFIG[selectedRequest.priority]?.label}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{selectedRequest.title}</h3>
                            {selectedRequest.description && (
                                <p className="text-gray-600 text-sm leading-relaxed">{selectedRequest.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">สถานที่</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {selectedRequest.tbl_rooms?.room_code} — {selectedRequest.tbl_rooms?.room_name}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">ผู้แจ้ง</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedRequest.reported_by}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">วันที่แจ้ง</p>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                                </div>
                                {selectedRequest.assigned_to && (
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-1">ผู้รับผิดชอบ</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedRequest.assigned_to}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t">
                            <button
                                onClick={() => setShowDetail(false)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Request Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">แจ้งซ่อม (ส่งถึงธุรการ)</h2>
                                <p className="text-xs text-gray-500 mt-0.5">ระบบจะแจ้งเตือนไปยังฝ่ายธุรการโดยอัตโนมัติ</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Room Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                    สถานที่ <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedRoom ? `${selectedRoom.room_code} — ${selectedRoom.room_name}` : roomSearch}
                                        onChange={e => {
                                            setRoomSearch(e.target.value);
                                            setFormData({ ...formData, room_id: 0 });
                                            setShowRoomDropdown(true);
                                        }}
                                        onFocus={() => setShowRoomDropdown(true)}
                                        placeholder="ค้นหาสถานที่..."
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                                    />
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    {showRoomDropdown && filteredRooms.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-10 mt-1 max-h-48 overflow-y-auto">
                                            {filteredRooms.slice(0, 20).map(room => (
                                                <button
                                                    key={room.room_id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, room_id: room.room_id });
                                                        setRoomSearch('');
                                                        setShowRoomDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b last:border-0"
                                                >
                                                    <span className="font-medium text-blue-700">{room.room_code}</span>
                                                    <span className="text-gray-600 ml-2">{room.room_name}</span>
                                                    {room.floor && <span className="text-gray-400 ml-1 text-xs">ชั้น {room.floor}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                    หัวเรื่อง <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="ระบุปัญหาโดยย่อ..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">รายละเอียด</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="อธิบายปัญหาเพิ่มเติม..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>

                            {/* Category & Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">ประเภท</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        aria-label="เลือกประเภทงาน"
                                    >
                                        {CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">ความเร่งด่วน</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        aria-label="เลือกความเร่งด่วน"
                                    >
                                        <option value="low">ไม่เร่งด่วน</option>
                                        <option value="normal">ปกติ</option>
                                        <option value="high">เร่งด่วน</option>
                                        <option value="urgent">เร่งด่วนมาก</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reported by & Contact */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                        ชื่อผู้แจ้ง <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.reported_by}
                                        onChange={e => setFormData({ ...formData, reported_by: e.target.value })}
                                        placeholder="ชื่อ-นามสกุล"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">เบอร์ติดต่อ</label>
                                    <input
                                        type="text"
                                        value={formData.contact_info}
                                        onChange={e => setFormData({ ...formData, contact_info: e.target.value })}
                                        placeholder="เบอร์โทร / ไลน์"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">แผนก / ฝ่าย</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    placeholder="ระบุแผนก (ถ้ามี)"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">แท็ก</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={formData.tagInput}
                                        onChange={e => setFormData({ ...formData, tagInput: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="เพิ่มแท็ก..."
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button type="button" onClick={handleAddTag} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                                        เพิ่ม
                                    </button>
                                </div>
                                {formData.tags && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.split(',').filter(t => t.trim()).map((tag, i) => (
                                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1.5">
                                                {tag.trim()}
                                                <button type="button" onClick={() => handleRemoveTag(tag.trim())} className="hover:text-red-600">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">แนบรูปภาพ (ถ้ามี)</label>
                                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                    <div className="pointer-events-none">
                                        {selectedFile ? (
                                            <p className="text-green-600 font-medium text-sm">
                                                <CheckCircle2 className="w-5 h-5 inline mr-1.5" />
                                                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                <span className="text-blue-600 font-medium">คลิกเพื่อเลือกรูปภาพ</span> หรือลากมาวางที่นี่
                                            </p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*,.pdf"
                                        title="เลือกไฟล์แนบ"
                                    />
                                </div>
                            </div>

                            {/* Notification banner */}
                            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">ระบบจะแจ้งเตือนฝ่ายธุรการผ่าน LINE อัตโนมัติ</p>
                                    <p className="text-blue-600 mt-0.5">เมื่อบันทึกสำเร็จ ฝ่ายธุรการจะได้รับการแจ้งเตือนทันที</p>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                                    {submitting ? 'กำลังบันทึก...' : 'ส่งคำขอ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
