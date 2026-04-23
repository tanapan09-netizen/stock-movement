'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FloatingSearchInput } from '@/components/FloatingField';
import {
    Wrench, Plus, Search, X, History, User, DollarSign, Printer, Clock, CheckCircle, XCircle, BarChart3, PieChart, AlertTriangle, Trash2, CalendarCheck, ArrowRight
} from 'lucide-react';
import { MAINTENANCE_WORKFLOW_LABELS } from '@/lib/maintenance-workflow';
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
import { getUpcomingPmPlans } from '@/actions/pmActions';
import RoleHeader from '@/components/dashboard/RoleHeader';
import MaintenanceRequestCard from '@/components/maintenance/MaintenanceRequestCard';
import {
    MAINTENANCE_CATEGORY_OPTIONS,
    MAINTENANCE_PRIORITY_OPTIONS,
    MAINTENANCE_STATUS_OPTIONS,
} from '@/lib/maintenance-options';
import { parseMaintenanceImageUrls } from '@/lib/maintenance-images';

// ... (Interfaces remain roughly the same, explicitly defined here for safety)
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
    category?: string | null; // Made optional to avoid strict type mismatch if prisma not synced
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

interface PmPlanItem {
    pm_id: number;
    title: string;
    next_run_date: Date;
    active: boolean;
    tbl_rooms: { room_code: string; room_name: string; };
    frequency_type: string;
}

const DISPLAY_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: MAINTENANCE_WORKFLOW_LABELS[0], color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: MAINTENANCE_WORKFLOW_LABELS[1], color: 'bg-orange-100 text-orange-800', icon: ArrowRight },
    in_progress: { label: MAINTENANCE_WORKFLOW_LABELS[2], color: 'bg-blue-100 text-blue-800', icon: Wrench },
    confirmed: { label: MAINTENANCE_WORKFLOW_LABELS[3], color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
    completed: { label: MAINTENANCE_WORKFLOW_LABELS[4], color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'ต่ำ', color: 'bg-gray-100 text-gray-600' },
    normal: { label: 'ปกติ', color: 'bg-blue-100 text-blue-600' },
    high: { label: 'สูง', color: 'bg-orange-100 text-orange-600' },
    urgent: { label: 'เร่งด่วน', color: 'bg-red-100 text-red-600' }
};

const CATEGORIES = [
    { id: 'hardware', label: 'ฮาร์ดแวร์ (Hardware)' },
    { id: 'software', label: 'ซอฟต์แวร์ (Software)' },
    { id: 'network', label: 'เครือข่าย (Network)' },
    { id: 'facility', label: 'สิ่งอำนวยความสะดวก (Facility)' },
    { id: 'furniture', label: 'เฟอร์นิเจอร์ (Furniture)' },
    { id: 'electric', label: 'ระบบไฟฟ้า (Electric)' },
    { id: 'other', label: 'อื่นๆ (Other)' }
];

interface MaintenanceClientProps {
    initialRole?: 'reporter' | 'technician' | 'admin';
}

export default function MaintenanceClient({ initialRole = 'reporter' }: MaintenanceClientProps) {
    const { data: session } = useSession();
    const [activeRole, setActiveRole] = useState<'reporter' | 'technician' | 'admin'>(initialRole);

    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    // const [showPartRequestModal, setShowPartRequestModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [upcomingPmPlans, setUpcomingPmPlans] = useState<PmPlanItem[]>([]);

    // Filters & Search
    // Filters & Search (Simplified for now)
    const [searchText, setSearchText] = useState('');

    // Stats
    interface SummaryData {
        total: number;
        pending: number;
        approved: number;
        in_progress: number;
        completed: number;
        total_cost: number;
        pending_verification: number;
        categoryStats: Record<string, number>;
    }

    const [summary, setSummary] = useState<SummaryData>({
        total: 0,
        pending: 0,
        approved: 0,
        in_progress: 0,
        completed: 0,
        total_cost: 0,
        pending_verification: 0,
        categoryStats: {}
    });

    // Form state
    const [formData, setFormData] = useState({
        room_id: 0,
        title: '',
        description: '',
        category: 'electrical',
        image_url: '',
        priority: 'normal',
        reported_by: '',
        assigned_to: '',
        scheduled_date: '',
        estimated_cost: 0,
        location: '' // Custom location field
    });

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
        category: '',
        assigned_to: '',
        scheduled_date: '',
        actual_cost: 0,
        notes: ''
    });

    async function loadData() {
        setLoading(true);
        try {
            const [reqResult, roomResult, summaryResult, pmResult] = await Promise.all([
                getMaintenanceRequests({
                    status: undefined, // filterStatus
                    room_id: undefined // filterRoom
                }),
                getRooms(),
                getMaintenanceSummary(),
                getUpcomingPmPlans(5)
            ]);

            if (reqResult.success) setRequests(reqResult.data as MaintenanceRequestItem[]);
            if (roomResult.success) setRooms(roomResult.data as Room[]);
            if (summaryResult.success) setSummary(summaryResult.data as unknown as SummaryData);
            if (pmResult.success) setUpcomingPmPlans(pmResult.data as PmPlanItem[]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.room_id || !formData.title || !formData.reported_by) {
            Swal.fire({
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน',
                icon: 'warning',
                background: '#111827',
                color: '#f3f4f6',
                confirmButtonColor: '#3b82f6',
                customClass: { popup: 'premium-swal-popup' }
            });
            return;
        }

        const data = new FormData();
        data.append('room_id', formData.room_id.toString());
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('priority', formData.priority);
        data.append('reported_by', formData.reported_by);
        data.append('category', formData.category);

        if (formData.assigned_to) data.append('assigned_to', formData.assigned_to);
        if (formData.scheduled_date) data.append('scheduled_date', formData.scheduled_date);
        if (formData.estimated_cost) data.append('estimated_cost', formData.estimated_cost.toString());
        if (formData.location) data.append('location', formData.location);
        if (formData.image_url) data.append('image_url', formData.image_url); // Preserving existing behavior if image_url is text, though logic might need to handle files if file input exists

        const result = await createMaintenanceRequest(data);
        if (result.success) {
            setShowForm(false);
            setFormData({ room_id: 0, title: '', description: '', category: 'electrical', image_url: '', priority: 'normal', reported_by: '', assigned_to: '', scheduled_date: '', estimated_cost: 0, location: '' });
            loadData();
        } else {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: result.error || 'ไม่สามารถบันทึกข้อมูลได้',
                icon: 'error',
                background: '#111827',
                color: '#f3f4f6',
                confirmButtonColor: '#ef4444',
                customClass: { popup: 'premium-swal-popup' }
            });
        }
    }

    async function handleRoomSubmit(e: React.FormEvent) {
        e.preventDefault();
        // ... (Same logic)
        if (!roomFormData.room_code || !roomFormData.room_name) {
            Swal.fire({
                title: 'ข้อมูลห้องไม่ครบ',
                text: 'กรุณากรอกรหัสและชื่อห้อง',
                icon: 'warning',
                background: '#111827',
                color: '#f3f4f6',
                confirmButtonColor: '#3b82f6',
                customClass: { popup: 'premium-swal-popup' }
            });
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

    // handleStatusChange removed

    async function handleDelete(request_id: number) {
        const result = await Swal.fire({
            title: '<div style="font-size: 22px; font-weight: 800; margin-bottom: 8px;">ยืนยันการลบรายการ?</div>',
            html: '<div style="font-size: 15px; opacity: 0.8; line-height: 1.6;">ข้อมูลรายการแจ้งซ่อมนี้จะถูกลบออกจากระบบ<br/><span style="color: #ef4444; font-weight: 600;">และไม่สามารถกู้คืนได้ในภายหลัง</span></div>',
            icon: 'warning',
            iconColor: '#fbbf24',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ฉันต้องการลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'transparent',
            background: '#111827',
            color: '#f3f4f6',
            padding: '2.5rem',
            buttonsStyling: false,
            customClass: { confirmButton: 'premium-swal-confirm', cancelButton: 'premium-swal-cancel', popup: 'premium-swal-popup' }
        } as any);

        if (!result.isConfirmed) return;
        const res = await deleteMaintenanceRequest(request_id);
        if (res.success) loadData();
    }

    async function openDetailModal(request: MaintenanceRequestItem) {
        setSelectedRequest(request);
        setEditData({
            status: request.status,
            priority: request.priority,
            category: request.category || 'other',
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
                category: editData.category !== selectedRequest.category ? editData.category : undefined,
                assigned_to: editData.assigned_to,
                scheduled_date: editData.scheduled_date || undefined,
                actual_cost: editData.actual_cost || undefined,
                notes: editData.notes || undefined,
                edit_reason: (editData.notes || '').trim() || 'แก้ไขข้อมูลใบงานผ่านหน้า dashboard',
            },
            'Admin' // In real app, use session.user.name
        );

        if (result.success) {
            setShowDetailModal(false);
            loadData();
            Swal.fire({
                title: 'สำเร็จ',
                text: 'อัปเดตข้อมูลเรียบร้อยแล้ว',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#111827',
                color: '#f3f4f6',
                customClass: { popup: 'premium-swal-popup' }
            });
        } else {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: result.error || 'ไม่สามารถอัปเดตข้อมูลได้',
                icon: 'error',
                background: '#111827',
                color: '#f3f4f6',
                confirmButtonColor: '#ef4444',
                customClass: { popup: 'premium-swal-popup' }
            });
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

    // --- RENDER HELPERS ---

    const renderReporterDashboard = () => (
        <div className="space-y-6">
            {/* Simple Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-gray-500 text-sm">{DISPLAY_STATUS_CONFIG.pending.label}</div>
                        <div className="text-2xl font-bold text-gray-900">{summary.pending}</div>
                    </div>
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full"><Clock size={20} /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-gray-500 text-sm">{DISPLAY_STATUS_CONFIG.approved.label}</div>
                        <div className="text-2xl font-bold text-gray-900">{summary.approved}</div>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-full"><ArrowRight size={20} /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-gray-500 text-sm">{DISPLAY_STATUS_CONFIG.in_progress.label}</div>
                        <div className="text-2xl font-bold text-gray-900">{summary.in_progress}</div>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Wrench size={20} /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-gray-500 text-sm">{DISPLAY_STATUS_CONFIG.completed.label}</div>
                        <div className="text-2xl font-bold text-gray-900">{summary.completed}</div>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-full"><CheckCircle size={20} /></div>
                </div>
            </div>
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">รายการแจ้งซ่อมของฉัน</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus size={20} /> สร้างใบงานใหม่
                </button>
            </div>

            {/* List/Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">รายการ</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ห้อง</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">สถานะ</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">วันที่</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRequests.map(req => {
                            const status = DISPLAY_STATUS_CONFIG[req.status] || DISPLAY_STATUS_CONFIG.pending;
                            return (
                                <tr key={req.request_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetailModal(req)}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{req.title}</div>
                                        <div className="text-xs text-gray-500">{req.request_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{req.tbl_rooms.room_code}</td>
                                    <td className="px-6 py-4">
                                        <div className={`mx-auto w-fit px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                                            {status.label}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                                        {new Date(req.created_at).toLocaleDateString('th-TH')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTechnicianDashboard = () => (
        <div className="space-y-6">
            {/* Task Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <div className="text-yellow-800 font-medium flex items-center gap-2"><Clock size={18} /> {DISPLAY_STATUS_CONFIG.pending.label}</div>
                    <div className="text-2xl font-bold text-yellow-900 mt-2">{summary.pending}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div className="text-orange-800 font-medium flex items-center gap-2"><ArrowRight size={18} /> {DISPLAY_STATUS_CONFIG.approved.label}</div>
                    <div className="text-2xl font-bold text-orange-900 mt-2">{summary.approved}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="text-blue-800 font-medium flex items-center gap-2"><Wrench size={18} /> {DISPLAY_STATUS_CONFIG.in_progress.label}</div>
                    <div className="text-2xl font-bold text-blue-900 mt-2">{summary.in_progress}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <div className="text-green-800 font-medium flex items-center gap-2"><CheckCircle size={18} /> {DISPLAY_STATUS_CONFIG.completed.label}</div>
                    <div className="text-2xl font-bold text-green-900 mt-2">{summary.completed}</div>
                </div>
            </div>
            {/* Search & Filters */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <FloatingSearchInput
                        label="ค้นหางานซ่อม"
                        type="text"
                        title="ค้นหา"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="focus:ring-blue-500/20"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">ทั้งหมด</button>
                    <button className="px-4 py-2 bg-white border text-gray-600 rounded-lg text-sm hover:bg-gray-50">{DISPLAY_STATUS_CONFIG.pending.label}</button>
                    <button className="px-4 py-2 bg-white border text-gray-600 rounded-lg text-sm hover:bg-gray-50">งานของฉัน</button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRequests.map(req => (
                    <MaintenanceRequestCard
                        key={req.request_id}
                        request={req}
                        onClick={() => {
                            void openDetailModal(req);
                        }}
                    />
                ))}
            </div>
        </div>
    );

    const renderAdminDashboard = () => (
        <div className="space-y-8">
            {/* Admin Stats (Solid Cards) */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">แดชบอร์ดผู้ดูแลระบบ</h2>
                    <div className="flex gap-2">
                        <Link href="/maintenance/parts" className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm flex items-center gap-1">
                            <DollarSign size={16} /> จัดการสต็อก/อะไหล่
                        </Link>
                        <Link href="/maintenance/technicians" className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm flex items-center gap-1">
                            <User size={16} /> จัดการช่าง
                        </Link>
                        <button onClick={() => setShowRoomForm(true)} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm flex items-center gap-1">
                            <Plus size={16} /> เพิ่มห้อง
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-blue-500 text-white p-5 rounded-xl shadow-lg shadow-blue-200">
                        <div className="text-blue-100 text-sm font-medium mb-2">ใบงานทั้งหมด</div>
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold">{summary.total}</div>
                            <div className="mb-1 text-sm opacity-80">รายการ</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-400/30 flex items-center gap-2 text-sm text-blue-100">
                            <BarChart3 size={16} /> สถิติรวมทุกสถานะ
                        </div>
                    </div>
                    <div className="bg-amber-500 text-white p-5 rounded-xl shadow-lg shadow-amber-200">
                        <div className="text-amber-100 text-sm font-medium mb-2">{DISPLAY_STATUS_CONFIG.approved.label}</div>
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold">{summary.approved}</div>
                            <div className="mb-1 text-sm opacity-80">รายการ</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-amber-400/30 flex items-center gap-2 text-sm text-amber-100">
                            <ArrowRight size={16} /> {DISPLAY_STATUS_CONFIG.approved.label}
                        </div>
                    </div>
                    <div className="bg-green-500 text-white p-5 rounded-xl shadow-lg shadow-green-200">
                        <div className="text-green-100 text-sm font-medium mb-2">อัตราความสำเร็จ</div>
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold">
                                {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-green-400/30 flex items-center gap-2 text-sm text-green-100">
                            <CheckCircle size={16} /> งานที่ปิดแล้ว
                        </div>
                    </div>
                    <div className="bg-orange-500 text-white p-5 rounded-xl shadow-lg shadow-orange-200">
                        <div className="text-orange-100 text-sm font-medium mb-2">เวลาเฉลี่ย (ชม.)</div>
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold">24</div>
                            <div className="mb-1 text-sm opacity-80">ชั่วโมง</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-orange-400/30 flex items-center gap-2 text-sm text-orange-100">
                            <Clock size={16} /> ระยะเวลาซ่อมโดยเฉลี่ย
                        </div>
                    </div>
                    <div className="bg-purple-500 text-white p-5 rounded-xl shadow-lg shadow-purple-200">
                        <div className="text-purple-100 text-sm font-medium mb-2">{DISPLAY_STATUS_CONFIG.pending.label}</div>
                        <div className="flex items-end gap-2">
                            <div className="text-4xl font-bold">{summary.pending}</div>
                            <div className="mb-1 text-sm opacity-80">รายการ</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-purple-400/30 flex items-center gap-2 text-sm text-purple-100">
                            <AlertTriangle size={16} /> งานที่ค้างอยู่
                        </div>
                    </div>
                </div>
            </div>
 
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Breakdown (Progress Bars) */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <PieChart size={20} className="text-blue-500" />
                        ใบงานตามหมวดหมู่
                    </h3>
                    <div className="space-y-6">
                        {CATEGORIES.map(cat => {
                            const count = summary.categoryStats?.[cat.id] || 0;
                            const percent = summary.total > 0 ? (count / summary.total) * 100 : 0;
                            return (
                                <div key={cat.id}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">{cat.label}</span>
                                        <span className="font-medium text-gray-900">{count}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Priority Level */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-orange-500" />
                        ระดับความสำคัญ
                    </h3>
                    <div className="space-y-4">
                        {/* Mock data or derived from filteredRequests if needed */}
                        {['urgent', 'high', 'normal', 'low'].map(p => {
                            const config = PRIORITY_CONFIG[p];
                            const count = requests.filter(r => r.priority === p).length;
                            const percent = requests.length > 0 ? (count / requests.length) * 100 : 0;
                            return (
                                <div key={p} className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${config.color.split(' ')[0]}`}></div>
                                    <div className="flex-1 text-sm text-gray-600">{config.label}</div>
                                    <div className="text-sm font-medium">{count} ({Math.round(percent)}%)</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Upcoming PM Plans */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <CalendarCheck size={20} className="text-purple-600" />
                        แผนบำรุงรักษาเร็วๆ นี้ (Upcoming PM)
                    </h3>
                    <Link href="/maintenance/pm" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        ดูทั้งหมด <Plus size={14} />
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingPmPlans.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-gray-500">ไม่มีรายการถึงกำหนดเร็วๆ นี้</div>
                    ) : (
                        upcomingPmPlans.map(plan => (
                            <div key={plan.pm_id} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow bg-gray-50/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-gray-900 line-clamp-1" title={plan.title}>{plan.title}</div>
                                    <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${new Date(plan.next_run_date) <= new Date() ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {new Date(plan.next_run_date).toLocaleDateString('th-TH')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-end text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <span>{plan.tbl_rooms.room_code}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span className="capitalize">{plan.frequency_type}</span>
                                    </div>
                                    <Link href={`/maintenance/pm?edit=${plan.pm_id}`} className="text-blue-500 hover:underline">
                                        แก้ไข
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    // --- MAIN RENDER ---
    const selectedRequestImageUrls = parseMaintenanceImageUrls(selectedRequest?.image_url);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <RoleHeader activeRole={activeRole} onRoleChange={setActiveRole} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {activeRole === 'reporter' && renderReporterDashboard()}
                {activeRole === 'technician' && renderTechnicianDashboard()}
                {activeRole === 'admin' && renderAdminDashboard()}
            </main>

            {/* Modals */}
            {/* New Request Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header with Subtitle */}
                        <div className="mb-6 pb-4 border-b bg-blue-600 -m-6 mb-6 p-6 rounded-t-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">สร้างใบงานใหม่</h2>
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

                            {/* Asset Number with Search Icon */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">หมายเลขสินทรัพย์หรือซีเรียล (ถ้ามี)</label>
                                <div className="relative">
                                    <FloatingSearchInput
                                        type="text"
                                        value={formData.image_url || ''}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        label="เลือกจากระบบ"
                                        className="pr-10"
                                        placeholder="เลือกจากระบบ (ถ้ามี)"
                                        title="หมายเลขสินทรัพย์"
                                        dense
                                    />
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
                                        {MAINTENANCE_CATEGORY_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ระดับความสำคัญ <span className="text-red-500">*</span></label>
                                    <select
                                        title="เลือกระดับความสำคัญ"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        required
                                    >
                                        {MAINTENANCE_PRIORITY_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
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
                                        value={formData.assigned_to || ''}
                                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
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
                                        value={formData.scheduled_date || ''}
                                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
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
                                        list="room-options-unified"
                                        value={formData.location || ''}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="พิมพ์หรือเลือกจากรายการ"
                                        title="สถานที่"
                                    />
                                    <datalist id="room-options-unified">
                                        {rooms.map(room => (
                                            <option key={room.room_id} value={`${room.building && `${room.building} - `}${room.room_code} (${room.room_name})`} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">แท็ก</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="เพิ่มแท็ก..."
                                        title="แท็ก"
                                    />
                                    <button
                                        type="button"
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        เพิ่ม
                                    </button>
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
                                    สร้างใบงาน
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-8 text-left">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wrench className="text-blue-600" size={24} />
                                    แจ้งซ่อม #{selectedRequest.request_number}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">{selectedRequest.title}</p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/maintenance/job-sheet/${selectedRequest.request_id}`}
                                    target="_blank"
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="พิมพ์ใบงาน"
                                >
                                    <Printer size={20} />
                                </Link>
                                {(activeRole === 'admin' || (session?.user as any)?.is_approver) && (
                                    <button
                                        onClick={() => handleDelete(selectedRequest.request_id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="ลบรายการ"
                                        aria-label="ลบรายการ"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button onClick={() => setShowDetailModal(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column - Info */}
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                    <h3 className="font-semibold text-gray-800 border-b pb-2">ข้อมูลใบงาน</h3>
                                    <div>
                                        <div className="text-xs text-gray-500">สถานที่</div>
                                        <div className="font-medium">{selectedRequest.tbl_rooms?.room_code} - {selectedRequest.tbl_rooms?.room_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">รายละเอียด</div>
                                        <div className="text-sm text-gray-700">{selectedRequest.description || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">หมวดหมู่</div>
                                        <div className="text-sm">{CATEGORIES.find(c => c.id === selectedRequest.category)?.label || 'อื่นๆ'}</div>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">แดชบอร์ดผู้ดูแลระบบ</h2>
                                        <div className="flex gap-2">
                                            <select className="border rounded-md px-3 py-1 text-sm bg-white" title="Select Period">
                                                <option>เดือนนี้</option>
                                                <option>ปีนี้</option>
                                            </select>
                                            <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm">ตั้งค่า</button>
                                        </div>
                                        <div className="text-sm">{new Date(selectedRequest.created_at).toLocaleString('th-TH')}</div>
                                    </div>
                                </div>
                                {selectedRequest && selectedRequest.image_url && false && (
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">รูปภาพประกอบ</div>
                                        <img src={selectedRequest.image_url} alt="รูปภาพปัญหา" className="rounded-lg w-full h-48 object-cover shadow-sm" />
                                    </div>
                                )}
                                {selectedRequestImageUrls.length > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">รูปภาพประกอบ</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {selectedRequestImageUrls.map((imageUrl, index) => (
                                                <a key={`${selectedRequest?.request_id ?? 'request'}-${index}`} href={imageUrl} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={imageUrl}
                                                        alt={`รูปภาพปัญหา ${index + 1}`}
                                                        className="rounded-lg w-full h-48 object-cover shadow-sm border hover:opacity-90 transition"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column - Edit (Show only if Admin or Technician) */}
                            {activeRole !== 'reporter' && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-800 pb-2 border-b">อัปเดตใบงาน</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium mb-1 text-gray-600">สถานะงาน</label>
                                            <select
                                                title="สถานะงาน"
                                                value={editData.status}
                                                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                                className="w-full border rounded-lg px-3 py-2 bg-white"
                                            >
                                                {MAINTENANCE_STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">ความเร่งด่วน</label>
                                            <select
                                                title="ความเร่งด่วน"
                                                value={editData.priority}
                                                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                                className="w-full border rounded-lg px-3 py-2 bg-white"
                                            >
                                                {MAINTENANCE_PRIORITY_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-600">หมวดหมู่</label>
                                            <select
                                                title="หมวดหมู่"
                                                value={editData.category || 'other'}
                                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                                className="w-full border rounded-lg px-3 py-2 bg-white"
                                            >
                                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium mb-1 text-gray-600">ผู้รับผิดชอบ/ช่าง</label>
                                            <input
                                                type="text"
                                                title="ผู้รับผิดชอบ/ช่าง"
                                                value={editData.assigned_to}
                                                onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                                                className="w-full border rounded-lg px-3 py-2"
                                                placeholder="ระบุชื่อช่าง"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium mb-1 text-gray-600">หมายเหตุ / การดำเนินการ</label>
                                            <textarea
                                                value={editData.notes}
                                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                className="w-full border rounded-lg px-3 py-2"
                                                rows={2}
                                                placeholder="บันทึกการซ่อม..."
                                                title="หมายเหตุ"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleUpdateRequest}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                                    >
                                        บันทึกการแก้ไข
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* History */}
                        {historyItems.length > 0 && (
                            <div className="mt-8 pt-4 border-t">
                                <h3 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                                    <History size={18} /> ประวัติการเปลี่ยนแปลง
                                </h3>
                                <div className="relative pl-4 space-y-6 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200">
                                    {historyItems.map(h => (
                                        <div key={h.history_id} className="relative pl-6">
                                            <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white"></div>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-gray-800">{h.action}</span>
                                                    <span className="text-xs text-gray-400">{new Date(h.changed_at).toLocaleString('th-TH')}</span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    เปลี่ยนโดย <span className="font-medium text-gray-900">{h.changed_by}</span>
                                                    {h.old_value && h.new_value && (
                                                        <span className="block mt-1 text-xs bg-white p-1 rounded border border-gray-200 w-fit">
                                                            {h.old_value} &rarr; {h.new_value}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Room Form */}
            {showRoomForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">เพิ่มห้องใหม่</h2>
                        <form onSubmit={handleRoomSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">รหัสห้อง *</label>
                                <input
                                    type="text"
                                    value={roomFormData.room_code}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, room_code: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="เช่น A101, B202"
                                    title="รหัสห้อง"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อห้อง *</label>
                                <input
                                    type="text"
                                    value={roomFormData.room_name}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, room_name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="เช่น ห้องประชุมใหญ่"
                                    title="ชื่อห้อง"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">อาคาร</label>
                                <input
                                    type="text"
                                    value={roomFormData.building}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, building: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="เช่น อาคาร A"
                                    title="อาคาร"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชั้น</label>
                                <input
                                    type="text"
                                    value={roomFormData.floor}
                                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="เช่น 1, 2, ชั้นใต้ดิน"
                                    title="ชั้น"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRoomForm(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
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

            {/* Premium Swal Styles */}
            <style>{`
                .premium-swal-popup {
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    font-family: 'Sarabun', sans-serif !important;
                    border-radius: 24px !important;
                }
                .premium-swal-confirm {
                    padding: 12px 32px !important; border-radius: 12px !important; background: #ef4444 !important;
                    color: white !important; font-weight: 700 !important; font-size: 15px !important;
                    border: none !important; cursor: pointer !important; margin: 0 8px !important; transition: all 0.2s !important;
                }
                .premium-swal-confirm:hover { background: #dc2626 !important; transform: translateY(-2px) !important; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3) !important; }
                
                .premium-swal-confirm-blue {
                    padding: 12px 32px !important; border-radius: 12px !important; background: #2563eb !important;
                    color: white !important; font-weight: 700 !important; font-size: 15px !important;
                    border: none !important; cursor: pointer !important; margin: 0 8px !important; transition: all 0.2s !important;
                }
                .premium-swal-confirm-blue:hover { background: #1d4ed8 !important; transform: translateY(-2px) !important; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3) !important; }

                .premium-swal-cancel {
                    padding: 12px 32px !important; border-radius: 12px !important; background: transparent !important;
                    color: #94a3b8 !important; font-weight: 600 !important; font-size: 15px !important;
                    border: 1px solid #334155 !important; cursor: pointer !important; margin: 0 8px !important; transition: all 0.2s !important;
                }
                .premium-swal-cancel:hover { background: #1f2937 !important; color: white !important; }
            `}</style>
        </div>
    );
}

