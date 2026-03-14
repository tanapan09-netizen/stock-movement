'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';
import {
    Search,
    Plus,
    Filter,
    MoreVertical,
    Eye,
    Wrench,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Download,
    Calendar,
    MapPin,
    Smartphone,
    LayoutGrid,
    Table as TableIcon,
    History as HistoryIcon, User, DollarSign, Printer, Image as ImageIcon, ShoppingCart, Package, AlertTriangle, Bell, X, Hash,
    Activity, Loader2, ShieldCheck, ChevronDown, Check, ArrowRight, MessageSquare
} from 'lucide-react';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';
import MaintenanceRequestCard from '@/components/maintenance/MaintenanceRequestCard';
import { useSession } from 'next-auth/react';
import {
    getMaintenanceRequests,
    getGeneralRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    getRooms,
    createRoom,
    getMaintenanceSummary,
    getMaintenanceHistory,
    getMaintenanceParts,
    confirmPartsUsed,
    storeVerifyParts,
    reopenMaintenanceRequest,
    resendMaintenanceNotification,
    getProducts,
    submitRepairCompletion
} from '@/actions/maintenanceActions';
import SignaturePad from '@/components/SignaturePad';
import SearchableSelect from '@/components/SearchableSelect';
import { searchAssets } from '@/actions/assetActions';
import { createPartRequest } from '@/actions/partRequestActions';
import { getActiveTechnicians } from '@/actions/technicianActions';
import { getLineUsers } from '@/actions/lineUserActions';
import { format } from 'date-fns';

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
    completion_image_url?: string | null;
    technician_signature?: string | null;
    customer_signature?: string | null;
    created_at: Date;
    tbl_rooms: Room;
    tbl_maintenance_history?: HistoryItem[];
    category?: string | null;
    department?: string | null;
    contact_info?: string | null;
    tags?: string | null;
}

interface MaintenancePart {
    part_id: number;
    request_id: number;
    p_id: string;
    quantity: number;
    unit: string | null;
    status: string;
    withdrawn_at: Date;
    withdrawn_by: string;
    actual_used?: number;
    verified_quantity?: number;
    verification_notes?: string;
    product?: {
        p_name: string;
        p_unit?: string | null;
    };
}

interface Technician {
    tech_id: number;
    name: string;
    phone: string | null;
    specialty: string | null;
    status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg?: string }> = {
    pending: { label: 'รอรับเรื่อง', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    in_progress: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2 },
    confirmed: { label: 'ยืนยันงานเสร็จ', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
    completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    verified: { label: 'ตรวจสอบแล้ว', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: ShieldCheck },
};

const formatAcceptedTime = (req: MaintenanceRequestItem): Date | null => {
    if (!req.tbl_maintenance_history || req.tbl_maintenance_history.length === 0) {
        return null;
    }
    // Find the latest history item where status was changed to 'in_progress'
    const acceptedEvent = req.tbl_maintenance_history.find(h =>
        (h.action === 'เปลี่ยนสถานะ' || h.action === 'status_change') &&
        h.new_value === 'in_progress'
    );
    return acceptedEvent ? new Date(acceptedEvent.changed_at) : null;
};

const getElapsedTime = (startDate: Date, now: Date): string => {
    const diffMs = now.getTime() - startDate.getTime();
    if (diffMs < 0) return 'เพิ่งรับงาน';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} วัน ${diffHours % 24} ชม.`;
    if (diffHours > 0) return `${diffHours} ชม. ${diffMins % 60} นาที`;
    if (diffMins === 0) return `ไม่ถึง 1 นาที`;
    return `${diffMins} นาที`;
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: 'ต่ำ', color: 'text-gray-600', bg: 'bg-gray-100' },
    normal: { label: 'ปกติ', color: 'text-blue-600', bg: 'bg-blue-100' },
    high: { label: 'สูง', color: 'text-orange-600', bg: 'bg-orange-100' },
    urgent: { label: 'เร่งด่วน', color: 'text-red-600', bg: 'bg-red-100' }
};
interface MaintenanceClientProps {
    userPermissions?: Record<string, boolean>;
}

export default function MaintenanceClient({ userPermissions = {} }: MaintenanceClientProps) {
    const { data: session } = useSession();
    const isApprover = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'manager' || userPermissions.can_approve;
    const searchParams = useSearchParams();
    const reqQueryParam = searchParams.get('req');
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);
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
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [assetResults, setAssetResults] = useState<any[]>([]);
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState({
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        total_cost: 0,
        pending_verification: 0
    });

    // Status change modal states
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusChangeData, setStatusChangeData] = useState<{
        request: MaintenanceRequestItem | null;
        newStatus: string;
        technician: string;
        scheduledDate: string;
        completionNotes: string;
        completionPhoto: File | null;
        technicianSignature: string | null;
        customerSignature: string | null;
        partsUsed: { p_id: string; quantity: number; notes: string }[];
    }>({
        request: null,
        newStatus: '',
        technician: '',
        scheduledDate: '',
        completionNotes: '',
        completionPhoto: null,
        technicianSignature: null,
        customerSignature: null,
        partsUsed: []
    });
    const [partRequestsForSummary, setPartRequestsForSummary] = useState<any[]>([]);

    // Dynamic technicians list from database
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [lineTechnicians, setLineTechnicians] = useState<any[]>([]);

    // Parts Verification State
    const [products, setProducts] = useState<any[]>([]);
    const [parts, setParts] = useState<MaintenancePart[]>([]);
    const [verifyingPartId, setVerifyingPartId] = useState<number | null>(null);
    const [verifyQty, setVerifyQty] = useState<number>(0);
    const [confirmingPartId, setConfirmingPartId] = useState<number | null>(null);
    const [confirmQty, setConfirmQty] = useState<number>(0);
    const [isDefective, setIsDefective] = useState<boolean>(false);
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
        tagInput: '', // Temporary state for tag input
        target_role: 'technician' // Default explicitly to technician
    });
    const [pullFromGeneral, setPullFromGeneral] = useState(false);
    const [generalRequests, setGeneralRequests] = useState<MaintenanceRequestItem[]>([]);
    const [fetchingGeneral, setFetchingGeneral] = useState(false);
    const [selectedGeneralRequestId, setSelectedGeneralRequestId] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [roomSearch, setRoomSearch] = useState('');
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [reopenRequest, setReopenRequest] = useState<MaintenanceRequestItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const [currentTime, setCurrentTime] = useState(new Date());
    const [newPartsUsed, setNewPartsUsed] = useState<{ p_id: string; quantity: number }[]>([]);
    const [modalPartSearch, setModalPartSearch] = useState('');

    // Auto-update time every minute for real-time elapsed time display
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchGeneralRequests = async () => {
        setFetchingGeneral(true);
        try {
            const result = await getMaintenanceRequests({
                category: 'general',
                status: 'pending'
            });
            if (result) {
                setGeneralRequests(result as any);
            }
        } catch (error) {
            console.error('Failed to fetch general requests:', error);
        } finally {
            setFetchingGeneral(false);
        }
    };

    const handleGeneralRequestSelect = (requestId: number) => {
        const selected = generalRequests.find(r => r.request_id === requestId);
        if (selected) {
            setSelectedGeneralRequestId(requestId);
            setFormData(prev => ({
                ...prev,
                title: selected.title,
                description: selected.description || '',
                room_id: selected.room_id,
                reported_by: selected.reported_by,
                department: selected.department || '',
                contact_info: selected.contact_info || '',
                category: selected.category || 'general',
                priority: selected.priority,
                tags: selected.tags || ''
            }));
            // If room search is needed
            const room = rooms.find(r => r.room_id === selected.room_id);
            if (room) setRoomSearch(room.room_code);
        }
    };

    // Handle submenu positioning
    useEffect(() => {
        const handleSubmenuPosition = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const parent = target.closest('.room-type-item, .floor-item, [data-has-submenu]');
            if (!parent) return;

            const submenu = parent.querySelector<HTMLElement>('.submenu-floor, .submenu-room, .submenu-zone');
            if (submenu && submenu.style.display === 'block') {
                const rect = parent.getBoundingClientRect();
                submenu.style.left = (rect.right + 5) + 'px';
                submenu.style.top = rect.top + 'px';
            }
        };

        document.addEventListener('mouseenter', handleSubmenuPosition, true);
        return () => document.removeEventListener('mouseenter', handleSubmenuPosition, true);
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [reqResult, roomResult, summaryResult, techResult, lineUserResult, productResult] = await Promise.all([
                getMaintenanceRequests({
                    status: filterStatus !== 'all' ? filterStatus : undefined,
                    room_id: filterRoom || undefined,
                    startDate: filterStartDate || undefined,
                    endDate: filterEndDate || undefined
                }),
                getRooms(),
                getMaintenanceSummary(),
                getActiveTechnicians(),
                getLineUsers(),
                getProducts()
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
            if (lineUserResult.success) {
                const lineTechs = (lineUserResult.data as any[]).filter(u => u.role === 'technician' && u.display_name && u.is_active);
                setLineTechnicians(lineTechs);
            }
            if (productResult && productResult.success) {
                setProducts(productResult.data as any[]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus, filterRoom, filterStartDate, filterEndDate]);

    useEffect(() => {
        if (reqQueryParam && requests.length > 0 && !hasOpenedFromUrl) {
            const targetReq = requests.find(r => r.request_number === reqQueryParam);
            if (targetReq) {
                openDetailModal(targetReq);
                setHasOpenedFromUrl(true);
                // Clear the query param silently from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('req');
                window.history.replaceState({}, '', url.toString());
                setHasOpenedFromUrl(true);
            }
        }
    }, [reqQueryParam, hasOpenedFromUrl, loading, requests]);

    async function handleResendNotification(requestId: number) {
        const result = await Swal.fire({
            title: '<div style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">ส่งแจ้งเตือนซ้ำ?</div>',
            html: '<div style="font-size: 15px; opacity: 0.8;">คุณต้องการส่งการแจ้งเตือนไปยังผู้รับผิดชอบ<br/>สำหรับรายการนี้อีกครั้งใช่หรือไม่?</div>',
            icon: 'question',
            iconColor: '#3b82f6',
            showCancelButton: true,
            confirmButtonText: 'ตกลง, ส่งเลย',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: 'transparent',
            background: '#111827',
            color: '#f3f4f6',
            padding: '2rem',
            buttonsStyling: false,
            customClass: { confirmButton: 'premium-swal-confirm-blue', cancelButton: 'premium-swal-cancel', popup: 'premium-swal-popup' }
        } as any);

        if (!result.isConfirmed) return;

        try {
            const resultAction = await resendMaintenanceNotification(requestId);
            if (resultAction.success) {
                showToast('ส่งแจ้งเตือนซ้ำสำเร็จ', 'success');
                loadData();
            } else {
                showToast(resultAction.error || 'ส่งแจ้งเตือนซ้ำไม่สำเร็จ', 'error');
            }
        } catch (error) {
            console.error('Error resending notification:', error);
            showToast('เกิดข้อผิดพลาดในการส่งแจ้งเตือนซ้ำ', 'error');
        }
    }

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
        data.append('target_role', formData.target_role);

        if (selectedFile) {
            data.append('image_file', selectedFile);
        }

        try {
            const result = await createMaintenanceRequest(data);
            if (result.success) {
                // Update general request status if pulled
                if (pullFromGeneral && selectedGeneralRequestId) {
                    await updateMaintenanceRequest(
                        selectedGeneralRequestId,
                        {
                            status: 'completed',
                            notes: `ใบงานถูกสร้างใหม่เลขที่: ${(result.data as any)?.request_number}`
                        },
                        formData.reported_by
                    );
                }

                setShowForm(false);
                setFormData({
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
                    location: '',
                    department: '',
                    contact_info: '',
                    tags: '',
                    tagInput: '',
                    target_role: 'technician'
                });
                setPullFromGeneral(false);
                setSelectedGeneralRequestId(null);
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
            completionNotes: '',
            completionPhoto: null,
            technicianSignature: null,
            customerSignature: null,
            partsUsed: []
        });
        setPartRequestsForSummary([]); // Reset parts (would fetch from API if available)
        setShowStatusModal(true);
    }

    async function confirmStatusChange() {
        if (!statusChangeData.request) return;

        if (statusChangeData.newStatus === 'completed') {
            const formData = new FormData();
            formData.append('request_id', statusChangeData.request.request_id.toString());
            formData.append('completionNotes', statusChangeData.completionNotes);
            if (statusChangeData.technicianSignature) {
                formData.append('technician_signature', statusChangeData.technicianSignature);
            }
            if (statusChangeData.customerSignature) {
                formData.append('customer_signature', statusChangeData.customerSignature);
            }
            if (statusChangeData.completionPhoto) {
                formData.append('completion_image', statusChangeData.completionPhoto);
            }
            if (statusChangeData.partsUsed.length > 0) {
                formData.append('parts_used', JSON.stringify(statusChangeData.partsUsed));
            }

            const result = await submitRepairCompletion(formData);
            if (result.success) {
                setShowStatusModal(false);
                loadData();
                showToast('บันทึกการซ่อมเสร็จสิ้น', 'success');
            } else {
                showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
            }
            return;
        }

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
        if (res.success) {
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

        const partsResult = await getMaintenanceParts(request.request_id);
        if (partsResult.success) {
            setParts(partsResult.data as MaintenancePart[]);
        }

        setShowDetailModal(true);
    }

    async function handleVerifyPart(partId: number) {
        if (!session?.user?.name) return;

        try {
            const result = await storeVerifyParts({
                part_id: partId,
                verified_quantity: verifyQty,
                verified_by: session.user.name,
                notes: ''
            });

            if (result.success) {
                showToast(result.message || 'Verification successful', 'success');
                setVerifyingPartId(null);
                // Refresh parts
                if (selectedRequest) {
                    const partsResult = await getMaintenanceParts(selectedRequest.request_id);
                    if (partsResult.success) setParts(partsResult.data as MaintenancePart[]);
                }
            } else {
                showToast(result.error || 'Verification failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to verify part', 'error');
        }
    }

    async function handleConfirmUsage(partId: number) {
        if (!session?.user?.name) return;

        try {
            const result = await confirmPartsUsed({
                part_id: partId,
                actual_used: confirmQty,
                is_defective: isDefective,
                changed_by: session.user.name
            });

            if (result.success) {
                showToast(result.message || 'Confirmation successful', 'success');
                setConfirmingPartId(null);
                setIsDefective(false);
                // Refresh parts
                if (selectedRequest) {
                    const partsResult = await getMaintenanceParts(selectedRequest.request_id);
                    if (partsResult.success) setParts(partsResult.data as MaintenancePart[]);
                }
            } else {
                showToast(result.error || 'Confirmation failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to confirm usage', 'error');
        }
    }

    async function handleUpdateRequest() {
        if (!selectedRequest) return;

        // Validation for technician role and in_progress status
        const isTechnician = (session?.user as any)?.role === 'technician';
        if (isTechnician && editData.status === 'completed') {
            const hasParts = parts.length > 0;
            const allVerified = parts.every(p => p.status === 'verified');

            if (hasParts && !allVerified) {
                alert('ต้องตรวจนับอะไหล่ทุกชิ้นให้ครบถ้วนก่อนปิดงาน');
                return;
            }
        }

        const submitData = {
            status: editData.status !== selectedRequest.status ? editData.status : undefined,
            priority: editData.priority !== selectedRequest.priority ? editData.priority : undefined,
            assigned_to: editData.assigned_to,
            scheduled_date: editData.scheduled_date || undefined,
            actual_cost: editData.actual_cost || undefined,
            notes: editData.notes || undefined
        };

        const result = await updateMaintenanceRequest(
            selectedRequest.request_id,
            submitData,
            'Admin'
        );

        if (result.success) {
            setShowDetailModal(false);
            loadData();
            showToast('อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    const filteredRequests = requests.filter(req => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            req.title.toLowerCase().includes(search) ||
            req.request_number.toLowerCase().includes(search) ||
            req.tbl_rooms.room_name.toLowerCase().includes(search)
        );
    });

    const handleViewRequest = (request: MaintenanceRequestItem) => {
        openDetailModal(request);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ระบบแจ้งซ่อม</h1>
                    <p className="text-gray-600 dark:text-gray-400">จัดการรายการแจ้งซ่อมและติดตามสถานะ</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {userPermissions['maintenance:technicians'] && (
                        <a
                            href="/maintenance/technicians"
                            className="px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2 text-sm"
                        >
                            <User size={16} /> จัดการช่าง
                        </a>
                    )}
                    {userPermissions['maintenance:parts'] && (
                        <a
                            href="/maintenance/parts"
                            className="px-3 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 text-sm"
                        >
                            <DollarSign size={16} /> เบิก/คืนอะไหล่
                        </a>
                    )}
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${
                                viewMode === 'table'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                            title="Table View"
                        >
                            <TableIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${
                                viewMode === 'grid'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>

                    {userPermissions['admin_rooms'] && (
                        <button
                            onClick={() => setShowRoomForm(true)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                        >
                            <Plus size={18} /> เพิ่มห้อง
                        </button>
                    )}
                    {true && ( // Anyone can request maintenance
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Wrench size={18} /> แจ้งใหม่
                        </button>
                    )}
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
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-orange-600">{summary.pending_verification || 0}</div>
                    <div className="text-orange-600 text-sm">รอตรวจสอบ (WH-03)</div>
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
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">ตั้งแต่:</span>
                    <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="ตั้งแต่วันที่"
                        title="ตั้งแต่วันที่"
                    />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">ถึง:</span>
                    <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="ถึงวันที่"
                        title="ถึงวันที่"
                    />
                    {(filterStartDate || filterEndDate) && (
                        <button
                            onClick={() => {
                                setFilterStartDate('');
                                setFilterEndDate('');
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
                            title="ล้างวันที่"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        title="Search Requests"
                        placeholder="ค้นหาใบงาน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                        aria-label="ค้นหา"
                    />
                </div>
            </div>

            {/* Request List */}
            {viewMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Request Details</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Room/Zone</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Reporter</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Priority</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Technician</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRequests.length > 0 ? (
                                    filteredRequests.map((request) => (
                                        <tr key={request.request_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 line-clamp-1">{request.title}</span>
                                                    <span className="text-xs text-gray-500 font-mono mt-0.5">{request.request_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                                        <MapPin size={14} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                                                            {request.tbl_rooms?.room_code}
                                                        </span>
                                                        <div className="flex gap-1 my-0.5">
                                                            {[request.tbl_rooms?.zone, request.tbl_rooms?.building, request.tbl_rooms?.floor].filter(Boolean).map((text, i) => (
                                                                <span key={i} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded uppercase tracking-tighter">
                                                                    {text}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-500 line-clamp-1">
                                                            {request.tbl_rooms?.room_name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                        {request.reported_by?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <span className="text-sm text-gray-600">{request.reported_by}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[request.priority as keyof typeof PRIORITY_CONFIG].bg} ${PRIORITY_CONFIG[request.priority as keyof typeof PRIORITY_CONFIG].color}`}>
                                                    {PRIORITY_CONFIG[request.priority as keyof typeof PRIORITY_CONFIG].label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-1.5 ">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.bg || 'bg-gray-50'} ${STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-600'} w-fit`}>
                                                        {(() => {
                                                            const Config = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                                                            const Icon = Config.icon;
                                                            return (
                                                                <>
                                                                    <Icon size={12} />
                                                                    {Config.label}
                                                                </>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {request.assigned_to ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold border border-blue-100">
                                                            {request.assigned_to[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">{request.assigned_to}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">ยังไม่ได้มอบหมาย</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-600">{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                                                    <span className="text-xs text-gray-400 font-mono mt-0.5">{format(new Date(request.created_at), 'HH:mm')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewRequest(request)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                                        title="More Options"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Filter size={40} className="text-gray-200" />
                                                <p className="text-lg font-medium text-gray-400">No requests found matching your filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRequests.length > 0 ? (
                        filteredRequests.map((request) => (
                            <MaintenanceRequestCard
                                key={request.request_id}
                                request={request}
                                onClick={() => handleViewRequest(request)}
                                onResend={() => handleResendNotification(request.request_id)}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
                            <div className="flex flex-col items-center gap-2">
                                <Filter size={40} className="text-gray-200" />
                                <p className="text-lg font-medium text-gray-400">No requests found matching your filters</p>
                            </div>
                        </div>
                    )}
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
                            {/* General Request Pull */}
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={pullFromGeneral}
                                        onChange={(e) => {
                                            setPullFromGeneral(e.target.checked);
                                            if (e.target.checked) fetchGeneralRequests();
                                        }}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 transition-all cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-blue-800">ดึงข้อมูลจากการแจ้งเหตุด่วน/ทั่วไป</span>
                                        <span className="text-xs text-blue-600">กดที่นี่หากต้องการสร้างใบงานจากการแจ้งเคสด่วนออนไลน์</span>
                                    </div>
                                </label>

                                {pullFromGeneral && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <label className="block text-sm font-medium mb-1.5 text-blue-800">เลือกรายการที่แจ้งเข้ามา</label>
                                        <div className="relative">
                                            <select
                                                value={selectedGeneralRequestId || ''}
                                                onChange={(e) => handleGeneralRequestSelect(Number(e.target.value))}
                                                className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                disabled={fetchingGeneral}
                                                title="เลือกรายการแจ้งซ่อมทั่วไป"
                                            >
                                                <option value="">-- เลือกรายการ --</option>
                                                {generalRequests.map(req => (
                                                    <option key={req.request_id} value={req.request_id}>
                                                        {req.title} ({req.reported_by})
                                                    </option>
                                                ))}
                                            </select>
                                            {fetchingGeneral && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="animate-spin text-blue-500" size={18} />
                                                </div>
                                            )}
                                        </div>
                                        {generalRequests.length === 0 && !fetchingGeneral && (
                                            <p className="mt-2 text-xs text-orange-600 font-medium">ไม่พบรายการแจ้งใหม่ในขณะนี้</p>
                                        )}
                                    </div>
                                )}
                            </div>

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
                                        title="Select Priority"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
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

                            {/* Reporter Name and Department and Target Role */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <label className="block text-sm font-medium mb-2 text-gray-700">แผนก (ผู้แจ้ง)</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="ชื่อแผนก/หน่วยงาน"
                                        title="แผนก"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">แผนกงานที่ต้องการแจ้ง <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.target_role}
                                        onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        required
                                    >
                                        <option value="general">General (ทั่วไป)</option>
                                        <option value="technician">Technician (ช่างซ่อมบำรุง)</option>
                                        <option value="maid">Maid (แม่บ้าน)</option>
                                        <option value="driver">Driver (คนขับรถ)</option>
                                        <option value="purchasing">Purchasing (จัดซื้อ)</option>
                                        <option value="store">Store (คลังสินค้า)</option>
                                        <option value="accounting">Accounting (บัญชี)</option>
                                        <option value="manager">Manager (ผู้จัดการ)</option>
                                        <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                    </select>
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
                                    <label className="block text-sm font-medium mb-2 text-gray-700">สถานที่ <span className="text-red-500">*</span></label>
                                    {/* Hierarchical Room Selector - REDESIGNED */}
                                    {(() => {
                                        // ── Data preparation (unchanged logic) ──────────────────────────────
                                        const realRooms = rooms.filter(r => r.active && !r.room_code.startsWith('T-') && !r.room_code.startsWith('F-'));
                                        type TreeZone = { id: number; code: string; name: string };
                                        type TreeRoom = { id: number; code: string; name: string; zones: TreeZone[] };
                                        type TreeFloor = { code: string; name: string; rooms: TreeRoom[] };
                                        type TreeType = { code: string; name: string; floors: TreeFloor[] };
                                        const typeMap = new Map<string, TreeType>();

                                        const allActiveRooms = rooms.filter(r => r.active);
                                        const typeNameMap = new Map<string, string>();
                                        const floorNameMap = new Map<string, string>();
                                        for (const r of allActiveRooms) {
                                            if (r.room_name.startsWith('[TYPE] ')) typeNameMap.set(r.room_type || '', r.room_name.replace('[TYPE] ', ''));
                                            if (r.room_name.startsWith('[FLOOR] ')) floorNameMap.set(`${r.room_type}__${r.floor}`, r.room_name.replace('[FLOOR] ', ''));
                                        }
                                        for (const r of realRooms) {
                                            const tCode = r.room_type || 'GENERAL';
                                            const fCode = r.floor || 'FL-0';
                                            if (!typeMap.has(tCode)) typeMap.set(tCode, { code: tCode, name: typeNameMap.get(tCode) || tCode, floors: [] });
                                            const tNode = typeMap.get(tCode)!;
                                            let fNode = tNode.floors.find(f => f.code === fCode);
                                            if (!fNode) {
                                                let fName = floorNameMap.get(`${tCode}__${fCode}`) || fCode;
                                                if (fName.startsWith('ชั้น ชั้น')) fName = fName.replace('ชั้น ชั้น', 'ชั้น');
                                                fNode = { code: fCode, name: fName, rooms: [] };
                                                tNode.floors.push(fNode);
                                            }
                                            if (r.zone) {
                                                const parentCode = r.building || r.room_code;
                                                let parentRoom = fNode.rooms.find(rm => rm.code === parentCode);
                                                if (!parentRoom) { parentRoom = { id: r.room_id, code: parentCode, name: parentCode, zones: [] }; fNode.rooms.push(parentRoom); }
                                                parentRoom.zones.push({ id: r.room_id, code: r.room_code, name: r.room_name });
                                            } else {
                                                if (!fNode.rooms.find(rm => rm.code === r.room_code))
                                                    fNode.rooms.push({ id: r.room_id, code: r.room_code, name: r.room_name, zones: [] });
                                            }
                                        }
                                        const types = Array.from(typeMap.values());

                                        const selectedText = formData.room_id
                                            ? (() => {
                                                const r = rooms.find(rm => rm.room_id === formData.room_id);
                                                if (!r) return '';
                                                const bLabel = r.building || '';
                                                const fLabel = r.floor || '';
                                                const locInfo = [bLabel, fLabel].filter(Boolean).join(' ');
                                                const namePart = (!r.room_name || r.room_name === r.room_code) ? r.room_code : `${r.room_name} (${r.room_code})`;
                                                return locInfo ? `${locInfo} › ${namePart}` : namePart;
                                            })()
                                            : '';

                                        const selectRoom = (id: number, code: string, name: string) => {
                                            setFormData({ ...formData, room_id: id, location: `${code} - ${name}` });
                                            const el = document.getElementById('room-selector-panel');
                                            if (el) el.style.display = 'none';
                                            setRoomSearch('');
                                        };

                                        // ── SEARCH LOGIC: Build Comprehensive Flat List ─────────────────────
                                        const flatLocations: any[] = [];
                                        for (const t of types) {
                                            for (const f of t.floors) {
                                                for (const rm of f.rooms) {
                                                    const roomPath = `${t.name} › ${f.name}`;
                                                    flatLocations.push({ id: rm.id, code: rm.code, name: rm.name, type: 'room', path: roomPath });
                                                    for (const z of rm.zones) {
                                                        flatLocations.push({ id: z.id, code: z.code, name: z.name, type: 'zone', path: `${roomPath} › ${rm.name}` });
                                                    }
                                                }
                                            }
                                        }

                                        const searchResults = roomSearch.trim()
                                            ? flatLocations.filter(loc =>
                                                loc.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
                                                loc.name.toLowerCase().includes(roomSearch.toLowerCase())
                                            ).slice(0, 15)
                                            : [];

                                        // ── Shared style tokens ──────────────────────────────────────────────
                                        const PANEL: React.CSSProperties = {
                                            background: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 14,
                                            boxShadow: '0 8px 32px -4px rgba(15,23,42,0.18), 0 2px 8px -2px rgba(15,23,42,0.08)',
                                            minWidth: 280,
                                            overflow: 'hidden',
                                        };

                                        const ROW_BASE: React.CSSProperties = {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '9px 14px',
                                            borderBottom: '1px solid #f1f5f9',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            lineHeight: 1.4,
                                            gap: 8,
                                            transition: 'background 0.13s',
                                            whiteSpace: 'nowrap',
                                        };

                                        const Chevron = () => (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                                stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                style={{ flexShrink: 0 }}>
                                                <path d="M9 5l7 7-7 7" />
                                            </svg>
                                        );

                                        const Badge = ({ label, type = 'default' }: { label: string, type?: 'type' | 'floor' | 'room' | 'zone' | 'default' }) => {
                                            const colors = {
                                                type: { bg: '#eff6ff', fg: '#1e40af', border: '#dbeafe' },
                                                floor: { bg: '#f0fdf4', fg: '#166534', border: '#dcfce7' },
                                                room: { bg: '#fff7ed', fg: '#9a3412', border: '#ffedd5' },
                                                zone: { bg: '#faf5ff', fg: '#6b21a8', border: '#f3e8ff' },
                                                default: { bg: '#f1f5f9', fg: '#64748b', border: '#e2e8f0' }
                                            }[type];
                                            return (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
                                                    background: colors.bg, color: colors.fg,
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: 4, padding: '1px 5px', marginLeft: 4,
                                                    textTransform: 'uppercase', flexShrink: 0
                                                }}>{label}</span>
                                            );
                                        };

                                        const FLYOUT_BASE: React.CSSProperties = {
                                            display: 'none',
                                            position: 'fixed',
                                            ...PANEL,
                                            maxHeight: 400,
                                            overflowY: 'auto',
                                        };

                                        const positionFlyout = (
                                            triggerEl: HTMLElement,
                                            flyoutEl: HTMLElement,
                                            offsetX = 4
                                        ) => {
                                            const rect = triggerEl.getBoundingClientRect();
                                            const vpW = window.innerWidth;
                                            const vpH = window.innerHeight;
                                            const fw = flyoutEl.offsetWidth || 280;
                                            const fh = flyoutEl.offsetHeight || 200;

                                            let left = rect.right + offsetX;
                                            let top = rect.top;

                                            if (left + fw > vpW - 12) left = rect.left - fw - offsetX;
                                            if (top + fh > vpH - 12) top = Math.max(8, vpH - fh - 12);

                                            flyoutEl.style.left = `${left}px`;
                                            flyoutEl.style.top = `${top}px`;
                                        };

                                        const showFlyout = (triggerEl: HTMLElement, selector: string) => {
                                            const flyout = triggerEl.querySelector<HTMLElement>(selector);
                                            if (!flyout) return;
                                            flyout.style.display = 'block';
                                            requestAnimationFrame(() => positionFlyout(triggerEl, flyout));
                                        };

                                        const hideFlyout = (triggerEl: HTMLElement, selector: string) => {
                                            const flyout = triggerEl.querySelector<HTMLElement>(selector);
                                            if (flyout) flyout.style.display = 'none';
                                        };

                                        return (
                                            <>
                                                {/* ── Trigger Button ───────────────────────────────── */}
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const el = document.getElementById('room-selector-panel');
                                                            if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
                                                            setRoomSearch('');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 8,
                                                            padding: '11px 16px',
                                                            border: '1.5px solid ' + (selectedText ? '#6366f1' : '#e2e8f0'),
                                                            borderRadius: 12,
                                                            background: selectedText ? 'linear-gradient(to right, #f8fafc, #eff6ff)' : '#fff',
                                                            cursor: 'pointer',
                                                            fontSize: 14,
                                                            fontWeight: selectedText ? 600 : 400,
                                                            color: selectedText ? '#1e293b' : '#64748b',
                                                            outline: 'none',
                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            boxShadow: selectedText ? '0 4px 12px -2px rgba(99,102,241,0.12), 0 0 0 3px rgba(99,102,241,0.06)' : 'none',
                                                        }}
                                                        onFocus={e => {
                                                            e.currentTarget.style.borderColor = '#6366f1';
                                                            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.12)';
                                                        }}
                                                        onBlur={e => {
                                                            e.currentTarget.style.borderColor = selectedText ? '#6366f1' : '#e2e8f0';
                                                            e.currentTarget.style.boxShadow = selectedText ? '0 4px 12px -2px rgba(99,102,241,0.12), 0 0 0 3px rgba(99,102,241,0.06)' : 'none';
                                                        }}
                                                    >
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                                                stroke={selectedText ? '#6366f1' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                                                            </svg>
                                                            {selectedText || 'เลือกสถานที่...'}
                                                        </span>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                            <path d="M6 9l6 6 6-6" />
                                                        </svg>
                                                    </button>

                                                    {/* ── Main Dropdown Panel ──────────────────────── */}
                                                    <div
                                                        id="room-selector-panel"
                                                        style={{
                                                            display: 'none',
                                                            position: 'absolute',
                                                            top: 'calc(100% + 6px)',
                                                            left: 0,
                                                            right: 0,
                                                            ...PANEL,
                                                            zIndex: 99999,
                                                        }}
                                                    >
                                                        {/* Search */}
                                                        <div style={{ padding: 10, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                                    stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                                                </svg>
                                                                <input
                                                                    type="text"
                                                                    placeholder="ค้นหารหัส หรือชื่อห้อง..."
                                                                    value={roomSearch}
                                                                    onChange={e => setRoomSearch(e.target.value)}
                                                                    onKeyDown={e => e.stopPropagation()}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px 12px 8px 32px',
                                                                        borderRadius: 8,
                                                                        border: '1.5px solid #e2e8f0',
                                                                        fontSize: 13,
                                                                        outline: 'none',
                                                                        background: '#fff',
                                                                        color: '#1e293b',
                                                                        boxSizing: 'border-box',
                                                                        transition: 'border-color 0.15s',
                                                                    }}
                                                                    onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                                                                    onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div style={{ maxHeight: 380, overflowY: roomSearch.trim() ? 'auto' : 'visible' }}>
                                                            {roomSearch.trim() ? (
                                                                /* ── Search results ── */
                                                                searchResults.length === 0 ? (
                                                                    <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                                                        <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                                                                        ไม่พบรายการที่ค้นหา
                                                                    </div>
                                                                ) : (
                                                                    searchResults.map((loc: any) => (
                                                                        <div
                                                                            key={`${loc.type}-${loc.id}-${loc.code}`}
                                                                            onClick={() => selectRoom(loc.id, loc.code, loc.name)}
                                                                            style={{ ...ROW_BASE, flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 14px' }}
                                                                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                                                                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                                                                <span style={{
                                                                                    width: 22, height: 22, borderRadius: 6,
                                                                                    background: loc.type === 'zone' ? 'linear-gradient(135deg,#ede9fe,#ddd6fe)' : 'linear-gradient(135deg,#ffedd5,#fed7aa)',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    fontSize: 11, flexShrink: 0,
                                                                                }}>{loc.type === 'zone' ? '📍' : '🚪'}</span>
                                                                                <span>{loc.code === loc.name ? loc.code : `${loc.code} – ${loc.name}`}</span>
                                                                                <Badge label={loc.type === 'zone' ? 'ZONE' : 'RM'} type={loc.type as any} />
                                                                            </div>
                                                                            <div style={{ fontSize: 10, color: '#94a3b8', marginLeft: 30, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                                                                {loc.path.replace(/ชั้น ชั้น/g, 'ชั้น')}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                )
                                                            ) : (
                                                                /* ── Tree view ── */
                                                                <>
                                                                    {types.length === 0 && (
                                                                        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>ไม่พบข้อมูลห้อง</div>
                                                                    )}

                                                                    {/* Section label */}
                                                                    {types.length > 0 && (
                                                                        <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                                                                            ประเภทสถานที่
                                                                        </div>
                                                                    )}

                                                                    {types.map((t, tIdx) => (
                                                                        <div key={t.code} style={{ position: 'relative' }}>
                                                                            {/* TYPE row */}
                                                                            <div
                                                                                style={{ ...ROW_BASE, color: '#1e3a5f', fontWeight: 600, fontSize: 13.5, position: 'relative' }}
                                                                                onMouseEnter={e => {
                                                                                    e.currentTarget.style.background = '#eff6ff';
                                                                                    showFlyout(e.currentTarget, '.sub-floor');
                                                                                }}
                                                                                onMouseLeave={e => {
                                                                                    e.currentTarget.style.background = '';
                                                                                    hideFlyout(e.currentTarget, '.sub-floor');
                                                                                }}
                                                                            >
                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                                    <span style={{
                                                                                        width: 28, height: 28, borderRadius: 8,
                                                                                        background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        fontSize: 14, flexShrink: 0,
                                                                                    }}>🏢</span>
                                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                        {t.name}
                                                                                    </span>
                                                                                    <Badge label={t.code} type="type" />
                                                                                </span>
                                                                                <Chevron />

                                                                                {/* FLOOR flyout - Now inside trigger row */}
                                                                                <div
                                                                                    className="sub-floor"
                                                                                    style={{ ...FLYOUT_BASE, zIndex: 100100 + tIdx }}
                                                                                >
                                                                                    <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                                                                                        ชั้น
                                                                                    </div>
                                                                                    {t.floors.map((f, fIdx) => (
                                                                                        <div
                                                                                            key={f.code}
                                                                                            style={{ ...ROW_BASE, color: '#374151', fontWeight: 500, position: 'relative' }}
                                                                                            onMouseEnter={e => {
                                                                                                e.currentTarget.style.background = '#f0fdf4';
                                                                                                showFlyout(e.currentTarget, '.sub-room');
                                                                                            }}
                                                                                            onMouseLeave={e => {
                                                                                                e.currentTarget.style.background = '';
                                                                                                hideFlyout(e.currentTarget, '.sub-room');
                                                                                            }}
                                                                                        >
                                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                                                <span style={{
                                                                                                    width: 24, height: 24, borderRadius: 6,
                                                                                                    background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
                                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                    fontSize: 12, flexShrink: 0,
                                                                                                }}>📁</span>
                                                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                                                                                <Badge label={f.code} type="floor" />
                                                                                            </span>
                                                                                            <Chevron />

                                                                                            {/* ROOM flyout - Now inside floor row */}
                                                                                            <div
                                                                                                className="sub-room"
                                                                                                style={{ ...FLYOUT_BASE, zIndex: 100200 + tIdx * 20 + fIdx }}
                                                                                            >
                                                                                                <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                                                                                                    ห้อง
                                                                                                </div>
                                                                                                {f.rooms.map((rm, rmIdx) => (
                                                                                                    <div key={rm.code} style={{ position: 'relative' }}>
                                                                                                        {rm.zones.length > 0 ? (
                                                                                                            <div
                                                                                                                style={{ ...ROW_BASE, color: '#374151', position: 'relative' }}
                                                                                                                onMouseEnter={e => {
                                                                                                                    e.currentTarget.style.background = '#fff7ed';
                                                                                                                    showFlyout(e.currentTarget, '.sub-zone');
                                                                                                                }}
                                                                                                                onMouseLeave={e => {
                                                                                                                    e.currentTarget.style.background = '';
                                                                                                                    hideFlyout(e.currentTarget, '.sub-zone');
                                                                                                                }}
                                                                                                            >
                                                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                                                                    <span style={{
                                                                                                                        width: 22, height: 22, borderRadius: 6,
                                                                                                                        background: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
                                                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                                        fontSize: 11, flexShrink: 0,
                                                                                                                    }}>🚪</span>
                                                                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{rm.code === rm.name ? rm.code : `${rm.code} – ${rm.name}`}</span>
                                                                                                                    <Badge label="RM" type="room" />
                                                                                                                </span>
                                                                                                                <Chevron />

                                                                                                                {/* ZONE flyout - Now inside room row */}
                                                                                                                <div
                                                                                                                    className="sub-zone"
                                                                                                                    style={{ ...FLYOUT_BASE, zIndex: 100400 + tIdx * 100 + fIdx * 10 + rmIdx }}
                                                                                                                >
                                                                                                                    <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                                                                                                                        โซน
                                                                                                                    </div>
                                                                                                                    {rm.zones.map(z => (
                                                                                                                        <div
                                                                                                                            key={z.id}
                                                                                                                            onClick={() => selectRoom(z.id, z.code, z.name)}
                                                                                                                            style={{ ...ROW_BASE, color: '#6d28d9', fontWeight: 500 }}
                                                                                                                            onMouseEnter={e => (e.currentTarget.style.background = '#faf5ff')}
                                                                                                                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                                                                                                                        >
                                                                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                                                                                <span style={{
                                                                                                                                    width: 20, height: 20, borderRadius: 5,
                                                                                                                                    background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
                                                                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                                                    fontSize: 10, flexShrink: 0,
                                                                                                                                }}>📍</span>
                                                                                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.code === z.name ? z.code : `${z.code} – ${z.name}`}</span>
                                                                                                                                <Badge label="ZONE" type="zone" />
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <div
                                                                                                                onClick={() => selectRoom(rm.id, rm.code, rm.name)}
                                                                                                                style={{ ...ROW_BASE, color: '#374151' }}
                                                                                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff7ed')}
                                                                                                                onMouseLeave={e => (e.currentTarget.style.background = '')}
                                                                                                            >
                                                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                                                                    <span style={{
                                                                                                                        width: 22, height: 22, borderRadius: 6,
                                                                                                                        background: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
                                                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                                        fontSize: 11, flexShrink: 0,
                                                                                                                    }}>🚪</span>
                                                                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{rm.code === rm.name ? rm.code : `${rm.code} – ${rm.name}`}</span>
                                                                                                                    <Badge label="RM" type="room" />
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
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
                                <div className="relative block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                            {selectedFile ? (
                                                <CheckCircle2 className="text-green-500" />
                                            ) : (
                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {selectedFile ? (
                                                <span className="text-green-600 font-medium">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                            ) : (
                                                <>
                                                    <span className="text-blue-600 font-medium">คลิกเพื่อเลือกไฟล์</span> หรือลากไฟล์มาวางที่นี่
                                                </>
                                            )}
                                        </div>
                                        {!selectedFile && <p className="text-xs text-gray-500">รองรับไฟล์รูปภาพ, PDF หรือเอกสาร ไฟล์ละไม่เกิน 10MB</p>}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*,.pdf,.doc,.docx"
                                        title="เลือกไฟล์แนบ"
                                    />
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
                    </div >
                </div >
            )
            }
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
                </div >
            )
            }

            {/* Detail Modal */}
            {
                showDetailModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-3xl mx-auto shadow-2xl">

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

                            {/* Workflow Stepper at Top of Modal */}
                            <div className="px-6 py-8 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/10 mb-6 -mx-6 -mt-6 rounded-t-xl">
                                <WorkflowStepper 
                                    currentStep={
                                        selectedRequest.status === 'pending' ? 1 :
                                        selectedRequest.status === 'in_progress' ? 2 :
                                        selectedRequest.status === 'confirmed' ? 3 :
                                        (selectedRequest.status === 'completed' || selectedRequest.status === 'verified') ? 4 : 4
                                    }
                                    totalSteps={4}
                                    status={
                                        selectedRequest.status === 'confirmed' ? 'in_progress' : 
                                        selectedRequest.status === 'verified' ? 'completed' : 
                                        selectedRequest.status as any
                                    }
                                    labels={['รอรับเรื่อง', 'ดำเนินการ', 'ยืนยันผล', 'เสร็จสมบูรณ์']}
                                    size="md"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Column - Info */}
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-sm text-gray-500">ห้อง</div>
                                        <div className="font-medium">
                                            {[selectedRequest.tbl_rooms?.building, selectedRequest.tbl_rooms?.floor].filter(Boolean).join(' ')} {selectedRequest.tbl_rooms?.room_name} ({selectedRequest.tbl_rooms?.room_code})
                                        </div>
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
                                            onChange={(e) => {
                                                setEditData({ ...editData, status: e.target.value });
                                                if (e.target.value !== 'completed') {
                                                    setNewPartsUsed([]);
                                                }
                                            }}
                                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        >
                                            {(!isApprover && editData.status === 'pending') && <option value="pending">รอดำเนินการ</option>}
                                            {isApprover && <option value="pending">รอดำเนินการ</option>}
                                            <option value="in_progress">กำลังซ่อม</option>
                                            <option value="completed">เสร็จแล้ว</option>
                                            {isApprover && <option value="cancelled">ยกเลิก</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">ความเร่งด่วน</label>
                                        <select
                                            value={editData.priority}
                                            onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                            className={`w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 ${!isApprover ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            disabled={!isApprover}
                                        >
                                            <option value="low">ต่ำ</option>
                                            <option value="normal">ปกติ</option>
                                            <option value="high">สูง</option>
                                            <option value="urgent">เร่งด่วน</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">ผู้รับผิดชอบ/ช่าง</label>
                                        <select
                                            value={editData.assigned_to || ''}
                                            onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value })}
                                            className={`w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 ${selectedRequest.status === 'in_progress' && !isApprover ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            disabled={selectedRequest.status === 'in_progress' && !isApprover}
                                        >
                                            <option value="">-- ไม่ระบุ --</option>
                                            {Array.from(new Set([
                                                ...technicians.map(t => t.name),
                                                ...lineTechnicians.map(u => u.display_name)
                                            ])).filter(Boolean).sort().map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                            {editData.assigned_to && !Array.from(new Set([...technicians.map(t => t.name), ...lineTechnicians.map(u => u.display_name)])).includes(editData.assigned_to) && (
                                                <option value={editData.assigned_to}>{editData.assigned_to}</option>
                                            )}
                                        </select>
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

                                    {/* Parts Selection UI - Only shown when status is 'completed' and not already completed */}
                                    {editData.status === 'completed' && selectedRequest.status !== 'completed' && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3">
                                            <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2 text-sm">
                                                <ShoppingCart size={14} />
                                                เพิ่มอะไหล่ที่ใช้ (ถ้ามี)
                                            </h4>
                                            
                                            {newPartsUsed.map((part, index) => {
                                                const product = products.find(p => p.p_id === part.p_id);
                                                const avail = product ? product.p_count : 0;
                                                return (
                                                    <div key={index} className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                                                        <span className="flex-1 text-xs font-medium truncate">{product?.p_name || part.p_id}</span>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={avail}
                                                                value={part.quantity}
                                                                onChange={(e) => {
                                                                    const updated = [...newPartsUsed];
                                                                    let val = parseInt(e.target.value) || 1;
                                                                    if (val > avail) val = avail;
                                                                    updated[index].quantity = val;
                                                                    setNewPartsUsed(updated);
                                                                }}
                                                                className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-slate-700 dark:border-slate-600 text-center"
                                                            />
                                                            <span className="text-[10px] text-gray-500">/{avail}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = newPartsUsed.filter((_, i) => i !== index);
                                                                setNewPartsUsed(updated);
                                                            }}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="ค้นหาอะไหล่..."
                                                        value={modalPartSearch}
                                                        onChange={(e) => setModalPartSearch(e.target.value)}
                                                        className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600 bg-white"
                                                    />
                                                </div>
                                                
                                                {modalPartSearch && (
                                                    <div className="max-h-32 overflow-y-auto border rounded bg-white dark:bg-slate-800 shadow-sm">
                                                        {products
                                                            .filter(p => p.p_name.toLowerCase().includes(modalPartSearch.toLowerCase()) || p.p_id.toLowerCase().includes(modalPartSearch.toLowerCase()))
                                                            .filter(p => !newPartsUsed.some(u => u.p_id === p.p_id))
                                                            .slice(0, 10)
                                                            .map(p => (
                                                                <button
                                                                    key={p.p_id}
                                                                    onClick={() => {
                                                                        setNewPartsUsed([...newPartsUsed, { p_id: p.p_id, quantity: 1 }]);
                                                                        setModalPartSearch('');
                                                                    }}
                                                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 flex justify-between items-center"
                                                                    disabled={p.p_count <= 0}
                                                                >
                                                                    <span className={p.p_count <= 0 ? 'text-gray-400' : ''}>{p.p_name}</span>
                                                                    <span className={`text-[10px] ${p.p_count <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                                                        สต็อก: {p.p_count}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        {products.filter(p => p.p_name.toLowerCase().includes(modalPartSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-3 py-2 text-[10px] text-gray-500 text-center">ไม่พบอะไหล่</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Parts Usage Section */}
                            {parts.length > 0 && (
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="font-medium mb-3 flex items-center gap-2">
                                        <Package size={18} /> รายการอะไหล่ที่เบิก
                                    </h3>
                                    <div className="space-y-3">
                                        {parts.map(part => (
                                            <div key={part.part_id} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-medium">{part.product?.p_name || part.p_id}</div>
                                                        <div className="text-sm text-gray-500">
                                                            เบิก: {part.quantity} {part.unit || 'ชิ้น'} • โดย {part.withdrawn_by}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium 
                                                        ${part.status === 'withdrawn' ? 'bg-blue-100 text-blue-700' :
                                                                part.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                                                                    part.status === 'verified' ? 'bg-green-100 text-green-700' :
                                                                        part.status === 'verification_failed' ? 'bg-red-100 text-red-700' :
                                                                            part.status === 'defective' ? 'bg-red-100 text-red-700' :
                                                                                part.status === 'returned' ? 'bg-gray-100 text-gray-700' :
                                                                                    'bg-gray-100 text-gray-600'}`}>
                                                            {part.status === 'withdrawn' ? 'เบิกแล้ว (รอใช้งาน)' :
                                                                part.status === 'pending_verification' ? 'รอตรวจนับ' :
                                                                    part.status === 'verified' ? 'ตรวจนับแล้ว' :
                                                                        part.status === 'verification_failed' ? 'ตรวจนับไม่ตรง' :
                                                                            part.status === 'defective' ? 'ของเสีย' :
                                                                                part.status === 'returned' ? 'คืนสต็อก' : part.status}
                                                        </span>
                                                        {part.actual_used !== null && part.actual_used !== undefined && (
                                                            <span className="text-xs text-gray-500 mt-1">ใช้จริง: {part.actual_used}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Technician Action: Confirm Usage */}
                                                {part.status === 'withdrawn' && (session?.user as any)?.role !== 'store' && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                        {confirmingPartId === part.part_id ? (
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={part.quantity}
                                                                        value={confirmQty}
                                                                        onChange={(e) => setConfirmQty(Number(e.target.value))}
                                                                        className="w-20 px-2 py-1 border rounded text-sm"
                                                                        placeholder="จำนวน"
                                                                    />
                                                                    <span className="text-sm text-gray-600">ที่ใช้จริง</span>
                                                                    <label className="flex items-center gap-1 text-sm text-red-600 ml-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isDefective}
                                                                            onChange={(e) => setIsDefective(e.target.checked)}
                                                                            className="w-4 h-4"
                                                                        />
                                                                        เป็นของเสีย
                                                                    </label>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleConfirmUsage(part.part_id)}
                                                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                                    >
                                                                        ยืนยัน
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmingPartId(null);
                                                                            setIsDefective(false);
                                                                        }}
                                                                        className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                                                                    >
                                                                        ยกเลิก
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmingPartId(part.part_id);
                                                                    setConfirmQty(part.quantity); // Default to full amount
                                                                    setIsDefective(false);
                                                                }}
                                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                            >
                                                                <Wrench size={12} /> รายงานการใช้
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Store Action: Verify */}
                                                {part.status === 'pending_verification' && ((session?.user as any)?.role === 'store' || (session?.user as any)?.role === 'admin') && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 bg-yellow-50/50 dark:bg-yellow-900/10 -mx-3 px-3 pb-2 rounded-b-lg">
                                                        {verifyingPartId === part.part_id ? (
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={verifyQty}
                                                                        onChange={(e) => setVerifyQty(Number(e.target.value))}
                                                                        className="w-20 px-2 py-1 border rounded text-sm"
                                                                        placeholder="จำนวน"
                                                                    />
                                                                    <span className="text-sm text-gray-600">นับได้จริง</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleVerifyPart(part.part_id)}
                                                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                                    >
                                                                        ยืนยันถูกต้อง
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setVerifyingPartId(null)}
                                                                        className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                                                                    >
                                                                        ยกเลิก
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setVerifyingPartId(part.part_id);
                                                                    setVerifyQty(part.actual_used || 0); // Default to reported amount
                                                                }}
                                                                className="text-xs text-yellow-700 hover:text-yellow-900 flex items-center gap-1 font-medium"
                                                            >
                                                                <CheckCircle2 size={12} /> ตรวจนับสินค้า
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Completion Details */}
                            {selectedRequest.status === 'completed' && (
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="font-medium mb-3 flex items-center gap-2">
                                        <CheckCircle2 size={18} className="text-green-600" /> ข้อมูลการซ่อมเสร็จสิ้น
                                    </h3>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-blue-500" />
                                                สถานะขั้นตอนการทำงาน
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.color || 'bg-slate-100'}`}>
                                                {STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.label || selectedRequest.status}
                                            </span>
                                        </div>
                                        <div className="p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400 mb-3">
                                                <CheckCircle2 size={16} />
                                                ดำเนินการเสร็จสิ้น
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ช่างผู้ร้บผิดชอบ</p>
                                                    <p className="text-sm font-semibold">{selectedRequest.assigned_to || '-'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">วันที่ดำเนินการเสร็จ</p>
                                                    <p className="text-sm font-semibold">
                                                        {selectedRequest.completed_at ? new Date(selectedRequest.completed_at).toLocaleString('th-TH') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {selectedRequest.completion_image_url && (
                                            <div>
                                                <div className="text-sm text-gray-500 mb-2">รูปถ่ายหลังซ่อมเสร็จ</div>
                                                <a href={selectedRequest.completion_image_url} target="_blank" rel="noopener noreferrer">
                                                    <img src={selectedRequest.completion_image_url} alt="Completion" className="rounded-lg w-full max-h-48 object-cover border hover:opacity-90 transition" />
                                                </a>
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                            {selectedRequest.technician_signature && (
                                                <div>
                                                    <div className="text-sm text-gray-500 mb-2">ลายเซ็นช่างผู้ซ่อม</div>
                                                    <div className="bg-white border rounded-lg p-2 flex items-center justify-center min-h-[100px]">
                                                        <img src={selectedRequest.technician_signature} alt="Technician Signature" className="max-h-24 object-contain" />
                                                    </div>
                                                </div>
                                            )}
                                            {selectedRequest.customer_signature && (
                                                <div>
                                                    <div className="text-sm text-gray-500 mb-2">ลายเซ็นลูกค้ารับงาน</div>
                                                    <div className="bg-white border rounded-lg p-2 flex items-center justify-center min-h-[100px]">
                                                        <img src={selectedRequest.customer_signature} alt="Customer Signature" className="max-h-24 object-contain" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* History */}
                            {historyItems.length > 0 && (
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="font-medium mb-3 flex items-center gap-2">
                                        <HistoryIcon size={18} /> ประวัติการเปลี่ยนแปลง
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
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    ปิด
                                </button>

                                {(session?.user as any)?.role === 'manager' && ['completed', 'cancelled'].includes(selectedRequest.status) && (
                                    <button
                                        onClick={() => {
                                            setReopenRequest(selectedRequest);
                                            setShowReopenModal(true);
                                        }}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                                        title="Manager Override"
                                    >
                                        <AlertTriangle size={18} />
                                        เปิดงานใหม่ (Manager)
                                    </button>
                                )}

                                {!['completed', 'cancelled'].includes(selectedRequest.status) && (
                                    <button
                                        onClick={handleUpdateRequest}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        บันทึกการเปลี่ยนแปลง
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }



            {/* Status Change Confirmation Modal */}
            {
                showStatusModal && statusChangeData.request && (
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
                                            <CheckCircle2 className="text-white" size={24} />
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
                                        <p className="text-white/80 text-sm mb-2">
                                            ใบงาน: {statusChangeData.request.request_number}
                                        </p>
                                        <div className="w-[120px]">
                                            <WorkflowStepper
                                                currentStep={statusChangeData.newStatus === 'completed' ? 3 : statusChangeData.newStatus === 'in_progress' ? 2 : 1}
                                                totalSteps={3}
                                                status={statusChangeData.newStatus === 'pending' ? 'pending' : statusChangeData.newStatus as WorkflowStatus}
                                                size="sm"
                                            />
                                        </div>
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
                                        สถานที่: {[statusChangeData.request.tbl_rooms.building, statusChangeData.request.tbl_rooms.floor].filter(Boolean).join(' ')} {statusChangeData.request.tbl_rooms.room_name} ({statusChangeData.request.tbl_rooms.room_code})
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
                                                {Array.from(new Set([
                                                    ...technicians.map(t => t.name),
                                                    ...lineTechnicians.map(u => u.display_name)
                                                ])).filter(Boolean).sort().map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                                {statusChangeData.technician && !Array.from(new Set([...technicians.map(t => t.name), ...lineTechnicians.map(u => u.display_name)])).includes(statusChangeData.technician) && (
                                                    <option value={statusChangeData.technician}>{statusChangeData.technician}</option>
                                                )}
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
                                                <CheckCircle2 size={16} />
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

                                        {/* Parts Used Selection (Dynamic) */}
                                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3">
                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                <ShoppingCart size={16} />
                                                เพิ่มอะไหล่ที่ใช้ (ถ้ามี)
                                            </h4>
                                            {statusChangeData.partsUsed.map((part, index) => {
                                                const product = products.find(p => p.p_id === part.p_id);
                                                const avail = product ? product.p_count : 0;
                                                return (
                                                    <div key={index} className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-600">
                                                        <span className="flex-1 text-sm font-medium">{product?.p_name || part.p_id}</span>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={avail}
                                                                value={part.quantity}
                                                                onChange={(e) => {
                                                                    const newParts = [...statusChangeData.partsUsed];
                                                                    let val = parseInt(e.target.value) || 1;
                                                                    if (val > avail) val = avail;
                                                                    newParts[index].quantity = val;
                                                                    setStatusChangeData({ ...statusChangeData, partsUsed: newParts });
                                                                }}
                                                                className="w-16 px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 text-center"
                                                            />
                                                            <span className="text-sm text-gray-500">/{avail}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newParts = [...statusChangeData.partsUsed];
                                                                newParts.splice(index, 1);
                                                                setStatusChangeData({ ...statusChangeData, partsUsed: newParts });
                                                            }}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex gap-2 items-center">
                                                <select
                                                    className="flex-1 text-sm border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 bg-white"
                                                    onChange={(e) => {
                                                        const p_id = e.target.value;
                                                        if (!p_id) return;
                                                        if (statusChangeData.partsUsed.some(p => p.p_id === p_id)) return; // prevent duplicate
                                                        setStatusChangeData({
                                                            ...statusChangeData,
                                                            partsUsed: [...statusChangeData.partsUsed, { p_id, quantity: 1, notes: 'เพิ่มตอนซ่อมเสร็จ' }]
                                                        });
                                                        e.target.value = ""; // reset
                                                    }}
                                                >
                                                    <option value="">+ เลือกอะไหล่</option>
                                                    {products.filter(p => !statusChangeData.partsUsed.some(pu => pu.p_id === p.p_id) && (p.available_stock ?? p.p_count) > 0).map(p => (
                                                        <option key={p.p_id} value={p.p_id}>{p.p_name} (คงเหลือ {p.available_stock ?? p.p_count})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Completion Photo */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                รูปถ่ายหลังซ่อมเสร็จ
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setStatusChangeData({ ...statusChangeData, completionPhoto: file });
                                                }}
                                                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>

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

                                        {/* Signatures */}
                                        <div className="space-y-4 pt-2">
                                            <SignaturePad
                                                label="ลายเซ็นช่างผู้ซ่อม *"
                                                onSignatureChange={(sig) => setStatusChangeData({ ...statusChangeData, technicianSignature: sig })}
                                            />
                                            <SignaturePad
                                                label="ลายเซ็นลูกค้ารับงาน *"
                                                onSignatureChange={(sig) => setStatusChangeData({ ...statusChangeData, customerSignature: sig })}
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
                                            <CheckCircle2 size={18} />
                                            ยืนยันเสร็จสิ้น
                                        </>
                                    )}
                                    {statusChangeData.newStatus === 'pending' && 'ยืนยัน'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {showPartRequestModal && selectedRequest && (
                <PartRequestModal
                    maintenanceId={selectedRequest.request_id}
                    requestNumber={selectedRequest.request_number}
                    onClose={() => setShowPartRequestModal(false)}
                />
            )}

            {showReopenModal && reopenRequest && (
                <ReopenModal
                    request={reopenRequest}
                    onClose={() => setShowReopenModal(false)}
                    onConfirm={() => {
                        setShowReopenModal(false);
                        setShowDetailModal(false);
                        loadData();
                        showToast('เปิดงานซ่อมใหม่เรียบร้อยแล้ว', 'success');
                    }}
                />
            )}


        </div >
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

function ReopenModal({
    request,
    onClose,
    onConfirm
}: {
    request: MaintenanceRequestItem;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const [reason, setReason] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await reopenMaintenanceRequest(request.request_id, reason, password);

        setLoading(false);

        if (result.success) {
            onConfirm();
        } else {
            setError(result.error || 'Failed to reopen');
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl border dark:border-slate-700">
                <h2 className="text-xl font-bold mb-2 text-red-600 flex items-center gap-2">
                    <AlertTriangle size={24} />
                    Manager Override
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    เปิดงานซ่อม <b>#{request.request_number}</b> ใหม่อีกครั้ง
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">สาเหตุการเปิดใหม่</label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 resize-none focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="ระบุสาเหตุ..."
                            required
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Master Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="รหัสผ่านผู้ดูแล"
                            required
                        />
                    </div>

                    <div className="flex gap-2 pt-2 border-t dark:border-slate-700 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                            disabled={loading}
                        >
                            {loading ? 'กำลังดำเนินการ...' : 'ยืนยันเปิดใหม่'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
