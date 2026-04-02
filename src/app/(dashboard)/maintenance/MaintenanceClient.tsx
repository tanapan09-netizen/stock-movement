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
    XCircle,
    Download,
    MapPin,
    LayoutGrid,
    Table as TableIcon,
    History as HistoryIcon, User, DollarSign, Printer, ShoppingCart, Package, AlertTriangle, X,
    Activity, Loader2, ShieldCheck, ArrowRight, RotateCcw
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import WorkflowStepper, { WorkflowStatus } from '@/components/common/WorkflowStepper';
import MaintenanceRequestCard from '@/components/maintenance/MaintenanceRequestCard';
import VehicleLicensePlateSelector from '@/components/VehicleLicensePlateSelector';
import { useSession } from 'next-auth/react';
import {
    getMaintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    getRooms,
    createRoom,
    getMaintenanceSummary,
    getMaintenanceHistory,
    getMaintenanceParts,
    confirmPartsUsed,
    confirmMaintenancePartDefective,
    storeVerifyParts,
    withdrawPartsForMaintenanceBatch,
    resendMaintenanceNotification,
    getProducts,
    submitRepairCompletion,
    returnMaintenanceForRework,
} from '@/actions/maintenanceActions';
import { getAllVehicles } from '@/actions/vehicleActions';
import SignaturePad from '@/components/SignaturePad';
import { searchAssets } from '@/actions/assetActions';
import { createPartRequest } from '@/actions/partRequestActions';
import { getActiveTechnicians } from '@/actions/technicianActions';
import { getLineUsers } from '@/actions/lineUserActions';
import { format } from 'date-fns';
import {
    canApproveMaintenanceCompletion,
    canConfirmMaintenancePartUsage,
    canManageMaintenanceEdit,
    canReassignMaintenanceRequest,
    canVerifyMaintenanceParts,
    isMaintenanceTechnician,
} from '@/lib/rbac';
import { isManagerRole, normalizeRole } from '@/lib/roles';
import {
    MAINTENANCE_CATEGORY_OPTIONS,
    MAINTENANCE_PRIORITY_OPTIONS,
    MAINTENANCE_TARGET_ROLE_OPTIONS,
} from '@/lib/maintenance-options';
import {
    getAllowedMaintenanceTransitions,
    getMaintenanceWorkflowStep,
    isMaintenanceWorkflowClosed,
    isMaintenanceWorkflowLocked,
    MAINTENANCE_WORKFLOW_LABELS,
    normalizeMaintenanceWorkflowStatus,
} from '@/lib/maintenance-workflow';
import type { MaintenanceWorkflowStatus } from '@/lib/maintenance-workflow';
import { getCopiedImageMetadata, parseMaintenanceImageUrls } from '@/lib/maintenance-images';

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

interface Vehicle {
    vehicle_id: number;
    license_plate: string;
    province: string | null;
    vehicle_type: string | null;
    owner_name: string | null;
    owner_room: string | null;
    active: boolean;
}

type MaintenanceRoomOption = {
    roomId: number;
    roomCode: string;
    roomName: string;
    roomLabel: string;
};

type MaintenanceZoneOption = {
    roomId: number;
    roomCode: string;
    zoneCode: string;
    zoneName: string;
    zoneLabel: string;
};

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
    notes?: string | null;
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

interface LineTechnician {
    display_name: string;
    role?: string | null;
    is_active?: boolean | null;
}

interface ProductOption {
    p_id: string;
    p_name: string;
    p_count: number;
    p_unit?: string | null;
    available_stock?: number | null;
}

interface AssetSearchItem {
    asset_id: number;
    asset_code: string;
    asset_name: string;
    serial_number?: string | null;
    category?: string | null;
    location?: string | null;
}

interface PartRequestSummaryItem {
    item_name: string;
    quantity: number;
}

type SessionUserLike = {
    role?: string | null;
    is_approver?: boolean | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon; bg?: string }> = {
    pending: { label: 'รอเรื่อง', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    approved: { label: 'แจ้งเรื่องต่อ', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: ArrowRight },
    in_progress: { label: 'ดำเนินการ', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2 },
    confirmed: { label: 'รอหัวหน้าช่างตรวจรับ', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
    completed: { label: 'ปิดงานแล้ว', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    verified: { label: 'ตรวจสอบแล้ว', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: ShieldCheck },
};

const getHistoryActionLabel = (action: string): string => {
    switch (action) {
        case 'HEAD_TECH_APPROVED':
            return 'หัวหน้าช่างตรวจรับงาน';
        case 'HEAD_TECH_REQUESTED_REWORK':
            return 'หัวหน้าช่างส่งกลับแก้ไข';
        case 'SUBMITTED_FOR_HEAD_TECH_APPROVAL':
            return 'ช่างส่งงานให้หัวหน้าช่างตรวจรับ';
        case 'status_change':
            return 'เปลี่ยนสถานะ';
        case 'priority_change':
            return 'เปลี่ยนความเร่งด่วน';
        case 'category_change':
            return 'เปลี่ยนหมวดงาน';
        case 'assignment_change':
            return 'มอบหมายงาน';
        case 'schedule_change':
            return 'เปลี่ยนวันนัดหมาย';
        case 'actual_cost_change':
            return 'บันทึกค่าใช้จ่ายจริง';
        case 'MANUAL_ACTUAL_COST_OVERRIDE':
            return 'เหตุผลการแก้ค่าใช้จ่ายจริง';
        case 'PART_RETURNED':
            return 'คืนอะไหล่เข้าสต็อก';
        case 'PART_RESERVATION_CLEARED':
            return 'เคลียร์อะไหล่ค้างคืน';
        case 'parts_verification':
            return 'ตรวจนับอะไหล่';
        case 'reopen_request':
            return 'เปิดใบงานใหม่';
        case 'reopen_reason':
            return 'เหตุผลการเปิดงานใหม่';
        default:
            return action;
    }
};

const hasPartsStockPostedHistory = (historyItems?: HistoryItem[] | null): boolean =>
    Array.isArray(historyItems) && historyItems.some((item) => item.action === 'PARTS_STOCK_POSTED');

const hasCompletedStockPosting = (partsList?: MaintenancePart[] | null, historyItems?: HistoryItem[] | null): boolean =>
    (Array.isArray(partsList) && partsList.some((part) => part.status === 'completed'))
    || hasPartsStockPostedHistory(historyItems);

const hasReopenHistory = (historyItems?: HistoryItem[] | null): boolean =>
    Array.isArray(historyItems) && historyItems.some((item) => item.action === 'reopen_request');

const getLatestHistoryValueByAction = (historyItems: HistoryItem[] | null | undefined, action: string): string | null => {
    if (!Array.isArray(historyItems) || historyItems.length === 0) return null;
    return historyItems.find((item) => item.action === action)?.new_value || null;
};

const getLatestHistoryTimeByAction = (historyItems: HistoryItem[] | null | undefined, action: string): Date | null => {
    if (!Array.isArray(historyItems) || historyItems.length === 0) return null;
    const value = historyItems.find((item) => item.action === action)?.changed_at;
    return value ? new Date(value) : null;
};

const getLatestExecutionTechnician = (
    historyItems: HistoryItem[] | null | undefined,
    fallbackAssignedTo?: string | null,
): string => {
    const fallback = (fallbackAssignedTo || '').trim();
    if (!Array.isArray(historyItems) || historyItems.length === 0) return fallback;

    // Prefer the actor who actually performed work/completed submission.
    const executionActor =
        historyItems.find((item) => item.action === 'SUBMITTED_FOR_HEAD_TECH_APPROVAL')?.changed_by?.trim()
        || historyItems.find((item) => item.action === 'PART_USED')?.changed_by?.trim();
    if (executionActor) return executionActor;

    const latestAssigned = historyItems
        .find((item) => item.action === 'assignment_change')
        ?.new_value
        ?.trim();
    return latestAssigned || fallback;
};

const escapeCsvCell = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: 'ต่ำ', color: 'text-gray-600', bg: 'bg-gray-100' },
    normal: { label: 'ปกติ', color: 'text-blue-600', bg: 'bg-blue-100' },
    high: { label: 'สูง', color: 'text-orange-600', bg: 'bg-orange-100' },
    urgent: { label: 'เร่งด่วน', color: 'text-red-600', bg: 'bg-red-100' }
};
interface MaintenanceClientProps {
    userPermissions?: Record<string, boolean>;
    canEditPage?: boolean;
}

const resolveDepartmentFromRole = (role: string) => role.trim().toLowerCase();
const ALLOWED_NEW_MAINTENANCE_ROLES = new Set([
    'employee',
]);
const normalizePersonName = (value?: string | null) => (value || '').trim().toLowerCase();
const FALLBACK_TECHNICIAN_TARGET_ROLE_OPTION = {
    value: 'technician',
    label: 'Technician (ช่างซ่อมบำรุง)',
} as const;

const VALID_MAINTENANCE_STATUS_FILTERS = new Set([
    'all',
    'pending',
    'approved',
    'in_progress',
    'confirmed',
    'completed',
    'cancelled',
    'verified',
]);

function normalizeMaintenanceStatusFilter(value: string | null): string {
    const normalized = (value || '').trim().toLowerCase();
    return VALID_MAINTENANCE_STATUS_FILTERS.has(normalized) ? normalized : 'all';
}

function isPartMarkedDefective(part: Pick<MaintenancePart, 'status' | 'notes'>): boolean {
    return part.status === 'defective' || (part.notes || '').includes('MARKED AS DEFECTIVE');
}

const resolveParentRoomCode = (room: Room): string => {
    if (!room.zone) return room.room_code;
    const parentCode = room.building?.trim();
    if (parentCode && parentCode !== room.room_code) return parentCode;
    return room.room_code;
};

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function resolveMaintenanceImageProxyUrl(imageUrl: string): string {
    const trimmed = imageUrl.trim();
    if (!trimmed) return '';
    if (ABSOLUTE_URL_PATTERN.test(trimmed)) return trimmed;

    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (!normalized.startsWith('/uploads/')) return normalized;
    return `/api/maintenance/image-proxy?path=${encodeURIComponent(normalized)}`;
}

export default function MaintenanceClient({ userPermissions = {}, canEditPage = false }: MaintenanceClientProps) {
    const { data: session } = useSession();
    const sessionUser = session?.user as SessionUserLike | undefined;
    const loggedInRole = normalizeRole((sessionUser?.role || '').toString());
    const canEditActualCost = isManagerRole(loggedInRole);
    const derivedDepartment = resolveDepartmentFromRole(loggedInRole);
    const sessionIsApprover = Boolean(sessionUser?.is_approver || userPermissions.can_approve);
    const canAssignMaintenance = canReassignMaintenanceRequest(loggedInRole, userPermissions, sessionIsApprover);
    const canVerifyParts = canVerifyMaintenanceParts(loggedInRole, userPermissions);
    const canApproveCompletion = canApproveMaintenanceCompletion(loggedInRole, userPermissions, sessionIsApprover);
    const canManageMaintenanceStatus = canManageMaintenanceEdit(loggedInRole, userPermissions, sessionIsApprover);
    const searchParams = useSearchParams();
    const reqQueryParam = searchParams.get('req');
    const statusQueryParam = searchParams.get('status');
    const roomIdQueryParam = searchParams.get('room_id');
    const openFormQueryParam = searchParams.get('open_form');
    const roomLocationQueryParam = searchParams.get('location');
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);
    const { showToast, showConfirm } = useToast();
    const ensureCanEditPage = () => {
        if (canEditPage) return true;
        showToast('คุณมีสิทธิ์อ่านอย่างเดียวในหน้านี้', 'warning');
        return false;
    };
    const canCreateNewRequestByRole = ALLOWED_NEW_MAINTENANCE_ROLES.has(loggedInRole);
    const canCreateNewMaintenanceRequest = canEditPage && canCreateNewRequestByRole;
    const allowGeneralRequestPull = canCreateNewMaintenanceRequest;
    const maintenanceTargetRoleOptions = MAINTENANCE_TARGET_ROLE_OPTIONS.some((option) => option.value === 'technician')
        ? MAINTENANCE_TARGET_ROLE_OPTIONS
        : [FALLBACK_TECHNICIAN_TARGET_ROLE_OPTION, ...MAINTENANCE_TARGET_ROLE_OPTIONS];
    const ensureCanCreateMaintenanceRequest = () => {
        if (!ensureCanEditPage()) return false;
        if (canCreateNewRequestByRole) return true;
        showToast('คุณไม่มีสิทธิ์กดปุ่มแจ้งใหม่', 'warning');
        return false;
    };
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPartRequestModal, setShowPartRequestModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestItem | null>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [filterStatus, setFilterStatus] = useState(() => normalizeMaintenanceStatusFilter(statusQueryParam));
    const [filterRoom, setFilterRoom] = useState<number | null>(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCancelled, setShowCancelled] = useState(false);
    const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
    const [urgentOnly, setUrgentOnly] = useState(false);
    const [reopenedOnly, setReopenedOnly] = useState(false);
    const [locationMode, setLocationMode] = useState<'location' | 'vehicle'>('location');

    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [assetResults, setAssetResults] = useState<AssetSearchItem[]>([]);
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState({
        total: 0,
        pending: 0,
        approved: 0,
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
    const [partRequestsForSummary] = useState<PartRequestSummaryItem[]>([]);

    // Dynamic technicians list from database
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [lineTechnicians, setLineTechnicians] = useState<LineTechnician[]>([]);

    // Parts Verification State
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [parts, setParts] = useState<MaintenancePart[]>([]);
    const [verifyingPartId, setVerifyingPartId] = useState<number | null>(null);
    const [verifyQty, setVerifyQty] = useState<number>(0);
    const [confirmingPartId, setConfirmingPartId] = useState<number | null>(null);
    const [confirmQty, setConfirmQty] = useState<number>(0);
    const [isDefective, setIsDefective] = useState<boolean>(false);
    // Form state
    const [formData, setFormData] = useState({
        room_id: 0,
        vehicle_id: 0,
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
    const selectedPulledRequest = selectedGeneralRequestId
        ? generalRequests.find((request) => request.request_id === selectedGeneralRequestId) ?? null
        : null;
    const selectedPulledRequestImageUrls = parseMaintenanceImageUrls(selectedPulledRequest?.image_url);
    const [showReworkModal, setShowReworkModal] = useState(false);
    const [reworkRequest, setReworkRequest] = useState<MaintenanceRequestItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasAppliedRoomQueryRef = useRef(false);

    const [roomFormData, setRoomFormData] = useState({
        room_code: '',
        room_name: '',
        building: '',
        floor: ''
    });

    const activeLocationRooms = rooms
        .filter((room) => room.active)
        .filter((room) => !room.room_code.startsWith('T-') && !room.room_code.startsWith('F-'));
    const roomOptionMap = new Map<string, MaintenanceRoomOption>();
    const zoneOptionMap = new Map<string, MaintenanceZoneOption[]>();

    for (const room of activeLocationRooms) {
        if (room.zone) {
            const parentRoomCode = resolveParentRoomCode(room);
            if (!zoneOptionMap.has(parentRoomCode)) {
                zoneOptionMap.set(parentRoomCode, []);
            }
            zoneOptionMap.get(parentRoomCode)!.push({
                roomId: room.room_id,
                roomCode: parentRoomCode,
                zoneCode: room.room_code,
                zoneName: room.room_name,
                zoneLabel: `${room.room_code} - ${room.room_name}`,
            });
            continue;
        }

        if (roomOptionMap.has(room.room_code)) continue;
        roomOptionMap.set(room.room_code, {
            roomId: room.room_id,
            roomCode: room.room_code,
            roomName: room.room_name,
            roomLabel: `${room.room_code} - ${room.room_name}`,
        });
    }

    const locationRoomOptions = Array.from(roomOptionMap.values()).sort((left, right) =>
        left.roomCode.localeCompare(right.roomCode),
    );
    const locationZoneOptionsByRoom = new Map<string, MaintenanceZoneOption[]>();
    for (const [roomCode, zones] of zoneOptionMap.entries()) {
        locationZoneOptionsByRoom.set(
            roomCode,
            [...zones].sort((left, right) => left.zoneCode.localeCompare(right.zoneCode)),
        );
    }

    const selectedLocationRoomRecord = formData.room_id
        ? rooms.find((room) => room.room_id === formData.room_id) || null
        : null;
    const selectedLocationRoomCode = selectedLocationRoomRecord
        ? resolveParentRoomCode(selectedLocationRoomRecord)
        : '';
    const selectedLocationRoomOption = selectedLocationRoomCode
        ? locationRoomOptions.find((room) => room.roomCode === selectedLocationRoomCode) || null
        : null;
    const availableLocationZones = selectedLocationRoomCode
        ? locationZoneOptionsByRoom.get(selectedLocationRoomCode) || []
        : [];
    const selectedLocationZoneId = selectedLocationRoomRecord?.zone
        && availableLocationZones.some((zone) => zone.roomId === selectedLocationRoomRecord.room_id)
        ? selectedLocationRoomRecord.room_id
        : 0;

    // Edit form
    const [editData, setEditData] = useState({
        status: '',
        priority: '',
        assigned_to: '',
        scheduled_date: '',
        actual_cost: 0,
        actual_cost_reason: '',
        reopen_reason: '',
        notes: ''
    });

    const [newPartsUsed, setNewPartsUsed] = useState<{ p_id: string; quantity: number }[]>([]);
    const [modalPartSearch, setModalPartSearch] = useState('');
    const [isWithdrawingParts, setIsWithdrawingParts] = useState(false);
    const filteredModalProducts = modalPartSearch.trim()
        ? products
            .filter((product) =>
                product.p_name.toLowerCase().includes(modalPartSearch.toLowerCase())
                || product.p_id.toLowerCase().includes(modalPartSearch.toLowerCase()))
            .filter((product) => !newPartsUsed.some((selectedPart) => selectedPart.p_id === product.p_id))
            .slice(0, 10)
        : [];

    const fetchGeneralRequests = async () => {
        setFetchingGeneral(true);
        try {
            const result = await getMaintenanceRequests({
                category: 'general',
                status: 'pending'
            });
            if (result && result.success) {
                setGeneralRequests(Array.isArray(result.data) ? result.data as MaintenanceRequestItem[] : []);
            } else {
                setGeneralRequests([]);
            }
        } catch (error) {
            console.error('Failed to fetch general requests:', error);
            setGeneralRequests([]);
        } finally {
            setFetchingGeneral(false);
        }
    };

    const handleGeneralRequestSelect = (requestId: number) => {
        const selected = generalRequests.find(r => r.request_id === requestId);
        if (selected) {
            const selectedRoom = rooms.find(r => r.room_id === selected.room_id);
            const customerRoomLayer = selectedRoom
                ? [selectedRoom.building, selectedRoom.floor, selectedRoom.zone, selectedRoom.room_code].filter(Boolean).join(' / ')
                : '';
            const tags = (selected.tags || '').toLowerCase();
            const isCustomerRequest = tags.includes('ลูกค้า') || tags.includes('customer');

            setSelectedGeneralRequestId(requestId);
            setLocationMode('location');
            setFormData(prev => ({
                ...prev,
                title: selected.title,
                description: selected.description || '',
                room_id: selected.room_id,
                reported_by: selected.reported_by,
                department: isCustomerRequest && customerRoomLayer ? customerRoomLayer : (selected.department || ''),
                contact_info: selected.contact_info || '',
                category: selected.category || 'general',
                priority: selected.priority,
                tags: selected.tags || ''
            }));
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
            const [reqResult, roomResult, summaryResult, techResult, lineUserResult, productResult, vehicleResult] = await Promise.all([
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
                getProducts(),
                getAllVehicles()
            ]);

            if (reqResult.success) {
                setRequests(Array.isArray(reqResult.data) ? reqResult.data as MaintenanceRequestItem[] : []);
            } else {
                console.error('Failed to load requests:', reqResult.error);
                showToast('Failed to load requests: ' + reqResult.error, 'error');
                setRequests([]);
            }
            
            if (roomResult.success) setRooms(Array.isArray(roomResult.data) ? roomResult.data as Room[] : []);
            else setRooms([]);

            if (summaryResult.success) setSummary(summaryResult.data as typeof summary);
            
            if (techResult.success) setTechnicians(Array.isArray(techResult.data) ? techResult.data as Technician[] : []);
            else setTechnicians([]);
            
            if (lineUserResult.success) {
                const lineTechs = Array.isArray(lineUserResult.data)
                    ? (lineUserResult.data as LineTechnician[]).filter((u) => isMaintenanceTechnician(u.role || '') && u.display_name && u.is_active)
                    : [];
                setLineTechnicians(lineTechs);
            } else setLineTechnicians([]);
            
            if (productResult && productResult.success) {
                setProducts(Array.isArray(productResult.data) ? productResult.data as ProductOption[] : []);
            } else setProducts([]);

            if (vehicleResult) {
                setVehicles(Array.isArray(vehicleResult) ? vehicleResult as Vehicle[] : []);
            } else setVehicles([]);
             
        } catch (error) {
            console.error('Error loading data:', error);
            setRequests([]);
            setRooms([]);
            setTechnicians([]);
            setLineTechnicians([]);
            setProducts([]);
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus, filterRoom, filterStartDate, filterEndDate]);

    useEffect(() => {
        const reporterName = session?.user?.name?.trim();
        if (!reporterName) return;

        setFormData(prev => (
            prev.reported_by === reporterName
                ? prev
                : { ...prev, reported_by: reporterName }
        ));
    }, [session?.user?.name]);

    useEffect(() => {
        if (!derivedDepartment) return;

        setFormData(prev => (
            prev.department === derivedDepartment
                ? prev
                : { ...prev, department: derivedDepartment }
        ));
    }, [derivedDepartment]);

    useEffect(() => {
        if (hasAppliedRoomQueryRef.current) return;
        if (!roomIdQueryParam) return;

        const parsedRoomId = Number.parseInt(roomIdQueryParam, 10);
        if (!Number.isFinite(parsedRoomId) || parsedRoomId <= 0) {
            hasAppliedRoomQueryRef.current = true;
            return;
        }

        const selectedRoom = rooms.find((room) => room.room_id === parsedRoomId);
        const inferredLocation = selectedRoom
            ? [selectedRoom.building, selectedRoom.floor, selectedRoom.zone, selectedRoom.room_code]
                .filter(Boolean)
                .join(' / ')
            : '';

        setFilterRoom(parsedRoomId);
        setFormData((prev) => ({
            ...prev,
            room_id: parsedRoomId,
            location: prev.location || roomLocationQueryParam || inferredLocation,
        }));

        const shouldOpenForm = openFormQueryParam === '1' || openFormQueryParam?.toLowerCase() === 'true';
        if (shouldOpenForm && canCreateNewMaintenanceRequest) {
            setShowForm(true);
        }

        hasAppliedRoomQueryRef.current = true;
    }, [roomIdQueryParam, openFormQueryParam, roomLocationQueryParam, rooms, canCreateNewMaintenanceRequest]);

    useEffect(() => {
        if (reqQueryParam && requests.length > 0 && !hasOpenedFromUrl) {
            const targetReq = requests.find(r =>
                r.request_number === reqQueryParam || r.request_id === Number(reqQueryParam)
            );
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

    useEffect(() => {
        const nextStatus = normalizeMaintenanceStatusFilter(statusQueryParam);
        setFilterStatus((prev) => (prev === nextStatus ? prev : nextStatus));
    }, [statusQueryParam]);

    async function handleResendNotification(requestId: number) {
        const result = await Swal.fire({
            title: '<div style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">ส่งแจ้งเตือนซ้ำ?</div>',
            html: '<div style="font-size: 15px; opacity: 0.8;">คุณต้องการส่งการแจ้งเตือนไปยังผู้รับผิดชอบ<br/>สำหรับรายการนี้อีกครั้งใช่หรือไม่?</div>',
            icon: 'question',
            iconColor: '#f63b3b',
            showCancelButton: true,
            confirmButtonText: 'ส่งเลย',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#ff0004',
            cancelButtonColor: 'transparent',
            background: '#111827',
            color: '#f3f4f6',
            padding: '2rem',
            buttonsStyling: false,
            customClass: { confirmButton: 'premium-swal-confirm-blue', cancelButton: 'premium-swal-cancel', popup: 'premium-swal-popup' }
        });

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
        if (!ensureCanCreateMaintenanceRequest()) return;

        // Validation
        if (!formData.title) {
            showToast('กรุณาระบุหัวข้อแจ้งซ่อม', 'warning');
            return;
        }
        if (!formData.reported_by) {
            showToast('กรุณาระบุผู้แจ้ง', 'warning');
            return;
        }

        const selectedVehicle = locationMode === 'vehicle'
            ? (formData.vehicle_id ? vehicles.find(v => v.vehicle_id === formData.vehicle_id) : null)
            : null;

        const derivedRoomIdFromVehicle = (() => {
            if (!selectedVehicle) return 0;
            const ownerRoom = selectedVehicle.owner_room?.trim();
            if (!ownerRoom) return 0;
            const match = rooms.find(r => r.room_code.trim().toLowerCase() === ownerRoom.toLowerCase());
            return match?.room_id ?? 0;
        })();

        if (locationMode === 'location') {
            if (!formData.room_id || formData.room_id === 0) {
                showToast('กรุณาเลือกสถานที่จากรายการที่กำหนด', 'warning');
                return;
            }
        } else {
            if (!formData.vehicle_id || formData.vehicle_id === 0) {
                showToast('กรุณาเลือกทะเบียนรถจากรายการที่กำหนด', 'warning');
                return;
            }
            if (!derivedRoomIdFromVehicle) {
                showToast('ทะเบียนรถนี้ยังไม่ได้ผูกกับเลขห้อง (owner_room) กรุณาแก้ไขที่หน้า /admin/rooms หรือเลือกสถานที่แทน', 'warning');
                return;
            }
        }

        const roomIdToSend = locationMode === 'vehicle' ? derivedRoomIdFromVehicle : formData.room_id;
        const data = new FormData();
        data.append('room_id', roomIdToSend.toString());
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

        const vehiclePlate = selectedVehicle?.license_plate?.trim() || '';
        const vehicleTag = vehiclePlate ? `รถ:${vehiclePlate}` : '';
        const tagsToSend = (() => {
            const current = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            if (vehicleTag && !current.some(t => t.toLowerCase() === vehicleTag.toLowerCase())) current.push(vehicleTag);
            return current.join(',');
        })();
        data.append('tags', tagsToSend);
        if (vehiclePlate) {
            data.append('vehicle_id', formData.vehicle_id.toString());
            data.append('vehicle_plate', vehiclePlate);
        }
        data.append('target_role', formData.target_role);
        if (allowGeneralRequestPull && pullFromGeneral && selectedGeneralRequestId) {
            data.append('source_request_id', String(selectedGeneralRequestId));
            data.append('source_image_count', String(selectedPulledRequestImageUrls.length));
            if (selectedPulledRequestImageUrls.length > 0) {
                selectedPulledRequestImageUrls.forEach((imageUrl) => data.append('source_image_urls', imageUrl));
            }
        }

        if (selectedFile) {
            data.append('image_file', selectedFile);
        }

        const selectedRoomForSubmit = rooms.find((room) => room.room_id === roomIdToSend);
        const isUpdateFromGeneralRequest = allowGeneralRequestPull && pullFromGeneral && selectedGeneralRequestId;
        const selectedTargetRoleLabel =
            maintenanceTargetRoleOptions.find((option) => option.value === formData.target_role)?.label
            || formData.target_role
            || '-';
        const confirmed = await showConfirm({
            title: isUpdateFromGeneralRequest ? 'ยืนยันอัปเดตใบงานจากการรับเรื่อง' : 'ยืนยันส่งคำขอซ่อม',
            message: [
                isUpdateFromGeneralRequest
                    ? `อ้างอิงใบงาน: #${selectedPulledRequest?.request_number || selectedGeneralRequestId}`
                    : 'ระบบจะสร้างใบงานใหม่จากข้อมูลนี้',
                `หัวข้อ: ${formData.title}`,
                `ผู้แจ้ง: ${formData.reported_by}`,
                `สถานที่: ${selectedRoomForSubmit?.room_code || '-'} - ${selectedRoomForSubmit?.room_name || '-'}`,
                `แผนกงานที่ต้องการแจ้งไปหา: ${selectedTargetRoleLabel}`,
                '',
                'ยืนยันดำเนินการต่อหรือไม่?',
            ].join('\n'),
            confirmText: isUpdateFromGeneralRequest ? 'ยืนยันอัปเดต' : 'ยืนยันส่งคำขอ',
            cancelText: 'ยกเลิก',
            type: 'info',
        });
        if (!confirmed) return;

        try {
            const result = await createMaintenanceRequest(data);
            if (result.success) {
                setShowForm(false);
                setLocationMode('location');
                setFormData({
                    room_id: 0,
                    vehicle_id: 0,
                    title: '',
                    description: '',
                    category: 'electrical',
                    image_url: '',
                    priority: 'normal',
                    reported_by: (session?.user?.name || '') as string,
                    assigned_to: '',
                    scheduled_date: '',
                    estimated_cost: 0,
                    location: '',
                    department: derivedDepartment,
                    contact_info: '',
                    tags: '',
                    tagInput: '',
                    target_role: 'technician'
                });
                setPullFromGeneral(false);
                setSelectedGeneralRequestId(null);
                setSelectedFile(null);
                setAssetSearchQuery('');
                setAssetResults([]);
                loadData();
                showToast(
                    allowGeneralRequestPull && pullFromGeneral && selectedGeneralRequestId
                        ? 'อัปเดตสถานะใบงานจากการรับเรื่องเรียบร้อยแล้ว'
                        : 'สร้างรายการแจ้งซ่อมสำเร็จ',
                    'success',
                );
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

    function handleAssetSelect(asset: AssetSearchItem) {
        setAssetSearchQuery(`${asset.asset_code} - ${asset.asset_name}`);
        setFormData({ ...formData, image_url: `${asset.asset_code} [SN: ${asset.serial_number || 'N/A'}]` });
        setShowAssetDropdown(false);
    }

    async function handleRoomSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ensureCanEditPage()) return;
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
    async function confirmStatusChange() {
        if (!statusChangeData.request) return;
        if (!ensureCanEditPage()) return;

        const requiresTechnicianRepairLog =
            isMaintenanceTechnician(loggedInRole)
            && ['confirmed', 'completed'].includes(statusChangeData.newStatus);
        const completionNotesTrimmed = statusChangeData.completionNotes.trim();
        if (requiresTechnicianRepairLog && completionNotesTrimmed.length === 0) {
            showToast('กรุณากรอกบันทึกการแก้ไขของช่างก่อนส่งงานตรวจรับ', 'warning');
            return;
        }

        if (statusChangeData.newStatus === 'confirmed') {
            const formData = new FormData();
            formData.append('request_id', statusChangeData.request.request_id.toString());
            formData.append('completionNotes', completionNotesTrimmed);
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
                showToast('ส่งงานให้หัวหน้าช่างตรวจรับแล้ว', 'success');
            } else {
                showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
            }
            return;
        }

        if (statusChangeData.newStatus === 'completed') {
            const formData = new FormData();
            formData.append('request_id', statusChangeData.request.request_id.toString());
            formData.append('completionNotes', completionNotesTrimmed);
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

        // If changing to confirmed, submit technician completion details before head-tech approval.
        if (statusChangeData.newStatus === 'confirmed') {
            updateData.notes = statusChangeData.completionNotes || 'ซ่อมเสร็จเรียบร้อย';
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
                statusChangeData.newStatus === 'confirmed'
                    ? 'ส่งงานให้หัวหน้าช่างตรวจรับแล้ว'
                    : 'เปลี่ยนสถานะสำเร็จ',
                'success'
            );
        } else {
            showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
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
            actual_cost_reason: '',
            reopen_reason: '',
            notes: request.notes || ''
        });

        const historyResult = await getMaintenanceHistory(request.request_id);
        const nextHistoryItems = historyResult.success && Array.isArray(historyResult.data)
            ? historyResult.data as HistoryItem[]
            : [];
        setHistoryItems(nextHistoryItems);

        const executedTechnician = getLatestExecutionTechnician(nextHistoryItems, request.assigned_to);
        if (executedTechnician) {
            setEditData((prev) => ({ ...prev, assigned_to: executedTechnician }));
        } else {
            const technicianName = session?.user?.name?.trim() || '';
            if (isMaintenanceTechnician(loggedInRole) && technicianName && !request.assigned_to) {
                setEditData((prev) => ({ ...prev, assigned_to: technicianName }));
            }
        }

        const partsResult = await getMaintenanceParts(request.request_id);
        if (partsResult.success) {
            setParts(Array.isArray(partsResult.data) ? partsResult.data as MaintenancePart[] : []);
        } else setParts([]);

        setShowDetailModal(true);
    }

    async function handleVerifyPart(partId: number) {
        if (!session?.user?.name) return;
        if (!ensureCanEditPage()) return;
        if (isMaintenanceWorkflowLocked(selectedRequest?.status)) {
            showToast('ใบงานนี้ถูกล็อกแล้ว ไม่สามารถตรวจนับเพิ่มได้', 'warning');
            return;
        }

        try {
            const targetPart = parts.find((part) => part.part_id === partId);
            if (!targetPart) {
                showToast('ไม่พบรายการอะไหล่ที่ต้องการยืนยัน', 'error');
                return;
            }

            const result = isPartMarkedDefective(targetPart)
                ? await confirmMaintenancePartDefective({
                    part_id: partId,
                    confirmed_by: session.user.name,
                })
                : await storeVerifyParts({
                    part_id: partId,
                    verified_quantity: verifyQty,
                    verified_by: session.user.name,
                    notes: ''
                });

            if (result.success) {
                showToast(
                    result.message || (isPartMarkedDefective(targetPart) ? 'Defective confirmed' : 'Verification successful'),
                    'success',
                );
                setVerifyingPartId(null);
                // Refresh parts
                if (selectedRequest) {
                    const partsResult = await getMaintenanceParts(selectedRequest.request_id);
                    if (partsResult.success) {
                        setParts(Array.isArray(partsResult.data) ? partsResult.data as MaintenancePart[] : []);
                    } else setParts([]);
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
        if (!ensureCanEditPage()) return;
        if (isMaintenanceWorkflowLocked(selectedRequest?.status)) {
            showToast('ใบงานนี้ถูกล็อกแล้ว ไม่สามารถรายงานการใช้เพิ่มได้', 'warning');
            return;
        }

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

                const updatedActualCost = Number((result.data as { actual_cost?: number | null } | undefined)?.actual_cost ?? NaN);
                if (!Number.isNaN(updatedActualCost)) {
                    setEditData(prev => ({ ...prev, actual_cost: updatedActualCost }));
                    setSelectedRequest((prev) => prev ? { ...prev, actual_cost: updatedActualCost } : prev);
                }

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

    async function handleWithdrawSelectedParts() {
        if (!selectedRequest || !session?.user?.name) return;
        if (!ensureCanEditPage()) return;
        if (isMaintenanceWorkflowLocked(selectedRequest.status)) {
            showToast('ใบงานนี้ถูกล็อกแล้ว ไม่สามารถเบิกอะไหล่เพิ่มได้', 'warning');
            return;
        }

        if (newPartsUsed.length === 0) {
            showToast('กรุณาเลือกอะไหล่อย่างน้อย 1 รายการ', 'warning');
            return;
        }

        const invalidPart = newPartsUsed.find((item) => {
            const product = products.find((productItem) => productItem.p_id === item.p_id);
            const availableStock = Number(product?.p_count ?? 0);
            return !product || item.quantity < 1 || item.quantity > availableStock;
        });

        if (invalidPart) {
            showToast('มีจำนวนอะไหล่บางรายการเกินสต็อกคงเหลือ กรุณาตรวจสอบอีกครั้ง', 'warning');
            return;
        }

        const totalQuantity = newPartsUsed.reduce((sum, item) => sum + item.quantity, 0);
        const confirmResult = await Swal.fire({
            title: 'ยืนยันเบิกอะไหล่',
            text: `ยืนยันเบิก ${newPartsUsed.length} รายการ รวม ${totalQuantity} ชิ้น สำหรับใบงาน ${selectedRequest.request_number || ''} ใช่หรือไม่`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันเบิกอะไหล่',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#94a3b8',
        });

        if (!confirmResult.isConfirmed) return;

        setIsWithdrawingParts(true);

        try {
            const result = await withdrawPartsForMaintenanceBatch({
                request_id: selectedRequest.request_id,
                items: newPartsUsed.map((item) => ({
                    p_id: item.p_id,
                    quantity: item.quantity,
                    notes: 'เบิกจากหน้า /maintenance'
                })),
                withdrawn_by: session.user.name
            });

            if (!result.success) {
                showToast(result.error || 'ไม่สามารถเบิกอะไหล่ได้', 'error');
                return;
            }

            const [partsResult, productResult] = await Promise.all([
                getMaintenanceParts(selectedRequest.request_id),
                getProducts()
            ]);

            if (partsResult.success) {
                setParts(Array.isArray(partsResult.data) ? partsResult.data as MaintenancePart[] : []);
            } else {
                setParts([]);
            }

            if (productResult.success) {
                setProducts(Array.isArray(productResult.data) ? productResult.data as ProductOption[] : []);
            } else {
                setProducts([]);
            }

            setNewPartsUsed([]);
            setModalPartSearch('');
            showToast(`เบิกอะไหล่เรียบร้อย ${newPartsUsed.length} รายการ`, 'success');
        } catch (error) {
            console.error(error);
            showToast('ไม่สามารถยืนยันการเบิกอะไหล่ได้', 'error');
        } finally {
            setIsWithdrawingParts(false);
        }
    }

    async function handleUpdateRequest() {
        if (!selectedRequest) return;
        if (loggedInRole === 'employee') {
            showToast('employee ดูรายละเอียดได้อย่างเดียว ไม่สามารถแก้ไขใบงาน', 'warning');
            return;
        }
        const isStatusChanged = editData.status !== selectedRequest.status;
        if (!canEditPage && !(canEditDetailStatus && isStatusChanged)) {
            showToast('อ่านได้อย่างเดียวจ้า', 'warning');
            return;
        }
        const canManagerEditClosedRequest =
            isManagerRole(loggedInRole) && isMaintenanceWorkflowClosed(selectedRequest.status);
        if (isMaintenanceWorkflowLocked(selectedRequest.status) && !canManagerEditClosedRequest) {
            showToast('ใบงานนี้ถูกล็อกไว้และไม่สามารถแก้ไขผ่านฟอร์มนี้ได้', 'warning');
            return;
        }

        // Validation for technician completion handoff
        const isTechnician = isMaintenanceTechnician(loggedInRole);
        if (isTechnician && editData.status === 'confirmed') {
            const blockingPartStatuses = new Set(['withdrawn', 'used', 'pending_verification', 'verification_failed']);
            const hasUncheckedParts = parts.some((part) => {
                const hasPendingDefectiveConfirmation =
                    isPartMarkedDefective(part)
                    && !['defective', 'verified', 'completed', 'returned'].includes(part.status);

                return blockingPartStatuses.has(part.status) || hasPendingDefectiveConfirmation;
            });

            if (hasUncheckedParts) {
                alert('ยังมีอะไหล่ค้าง (รอใช้จริง/รอตรวจนับ/ตรวจนับไม่ตรง/ของเสียรอยืนยัน) กรุณาดำเนินการให้ครบก่อนส่งงาน');
                return;
            }
        }

        const currentAssignedTo = selectedRequest.assigned_to || '';
        const currentScheduledDate = selectedRequest.scheduled_date
            ? new Date(selectedRequest.scheduled_date).toISOString().split('T')[0]
            : '';
        const currentActualCost = Number(selectedRequest.actual_cost || 0);
        const currentNotes = selectedRequest.notes || '';
        const nextAssignedTo = editData.assigned_to || '';
        const nextScheduledDate = editData.scheduled_date || '';
        const nextActualCost = Number(editData.actual_cost || 0);
        const nextActualCostReason = editData.actual_cost_reason.trim();
        const nextReopenReason = editData.reopen_reason.trim();
        const nextNotes = editData.notes || '';
        const isActualCostChanged = canEditActualCost && nextActualCost !== currentActualCost;
        const isReopenFromClosedByManager = canManagerEditClosedRequest && editData.status !== selectedRequest.status;
        const isAutoAssignmentStatusChange =
            editData.status !== selectedRequest.status
            && nextAssignedTo !== currentAssignedTo
            && selectedRequest.status === 'pending'
            && nextAssignedTo !== ''
            && editData.status === 'approved';

        const submitData = {
            status: !isAutoAssignmentStatusChange && editData.status !== selectedRequest.status ? editData.status : undefined,
            priority: editData.priority !== selectedRequest.priority ? editData.priority : undefined,
            assigned_to: nextAssignedTo !== currentAssignedTo ? nextAssignedTo : undefined,
            scheduled_date: nextScheduledDate !== currentScheduledDate ? nextScheduledDate : undefined,
            actual_cost: isActualCostChanged ? nextActualCost : undefined,
            actual_cost_reason: isActualCostChanged ? nextActualCostReason : undefined,
            reopen_reason: isReopenFromClosedByManager ? nextReopenReason : undefined,
            notes: nextNotes !== currentNotes ? nextNotes : undefined
        };

        if (
            submitData.status &&
            !allowedDetailStatusTransitions.includes(submitData.status as MaintenanceWorkflowStatus)
        ) {
            showToast('สถานะใบงานต้องเดินหน้าตามขั้นตอนและไม่สามารถย้อนกลับได้', 'warning');
            return;
        }

        if (isActualCostChanged && nextActualCostReason.length < 8) {
            showToast('กรุณาระบุเหตุผลการแก้ค่าใช้จ่ายจริงอย่างน้อย 8 ตัวอักษร', 'warning');
            return;
        }

        if (isReopenFromClosedByManager && nextReopenReason.length < 8) {
            showToast('กรุณาระบุเหตุผลการเปิดงานใหม่อย่างน้อย 8 ตัวอักษร', 'warning');
            return;
        }

        const isTechnicianClosingJob =
            isTechnician
            && editData.status === 'confirmed'
            && editData.status !== selectedRequest.status;
        if (isTechnicianClosingJob && nextNotes.trim().length === 0) {
            showToast('กรุณากรอกบันทึกการแก้ไขของช่างก่อนส่งงานตรวจรับ', 'warning');
            return;
        }

        const changeSummary: string[] = [];
        if (submitData.status) {
            changeSummary.push(`สถานะ: ${STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.label || selectedRequest.status} -> ${STATUS_CONFIG[submitData.status as keyof typeof STATUS_CONFIG]?.label || submitData.status}`);
        }
        if (submitData.priority) {
            changeSummary.push(`ความเร่งด่วน: ${PRIORITY_CONFIG[selectedRequest.priority as keyof typeof PRIORITY_CONFIG]?.label || selectedRequest.priority} -> ${PRIORITY_CONFIG[submitData.priority as keyof typeof PRIORITY_CONFIG]?.label || submitData.priority}`);
        }
        if (submitData.assigned_to !== undefined) {
            changeSummary.push(`ช่างรับผิดชอบ: ${currentAssignedTo || '-'} -> ${submitData.assigned_to || '-'}`);
        }
        if (submitData.scheduled_date !== undefined) {
            changeSummary.push(`วันที่นัดหมาย: ${currentScheduledDate || '-'} -> ${submitData.scheduled_date || '-'}`);
        }
        if (submitData.actual_cost !== undefined) {
            changeSummary.push(`ค่าใช้จ่ายจริง: ฿${currentActualCost.toLocaleString()} -> ฿${nextActualCost.toLocaleString()}`);
        }
        if (submitData.notes !== undefined) {
            changeSummary.push(`หมายเหตุ: ${nextNotes || '-'}`);
        }
        if (submitData.reopen_reason) {
            changeSummary.push(`เหตุผลเปิดงานใหม่: ${submitData.reopen_reason}`);
        }

        if (changeSummary.length === 0) {
            showToast('ยังไม่มีข้อมูลที่เปลี่ยนแปลง', 'warning');
            return;
        }

        const confirmed = await showConfirm({
            title: 'ยืนยันบันทึกการเปลี่ยนแปลง',
            message: [
                `ใบงาน: ${selectedRequest.request_number}`,
                `เรื่อง: ${selectedRequest.title}`,
                '',
                'รายการที่จะบันทึก:',
                ...changeSummary.map((item) => `• ${item}`),
            ].join('\n'),
            confirmText: 'ยืนยันบันทึก',
            cancelText: 'กลับไปแก้ไข',
            type: 'info',
        });

        if (!confirmed) {
            return;
        }

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
            showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
        }
    }

    async function handleHeadTechnicianApproval() {
        if (!selectedRequest || !session?.user?.name) return;
        if (!ensureCanEditPage()) return;
        if (!canApproveCompletion) {
            showToast('เฉพาะหัวหน้าช่างเท่านั้นที่ตรวจรับงานได้', 'warning');
            return;
        }

        const confirmed = await showConfirm({
            title: 'ยืนยันตรวจรับงาน',
            message: [
                `ใบงาน: ${selectedRequest.request_number}`,
                `เรื่อง: ${selectedRequest.title}`,
                `ห้อง: ${selectedRequest.tbl_rooms?.room_code || '-'} - ${selectedRequest.tbl_rooms?.room_name || '-'}`,
                `ช่างรับผิดชอบ: ${selectedRequest.assigned_to || '-'}`,
                '',
                'เมื่อยืนยันแล้ว ระบบจะเปลี่ยนสถานะเป็น "ปิดงานแล้ว"',
            ].join('\n'),
            confirmText: 'ยืนยันตรวจรับ',
            cancelText: 'กลับไปตรวจสอบ',
            type: 'warning',
        });

        if (!confirmed) {
            return;
        }

        const result = await updateMaintenanceRequest(
            selectedRequest.request_id,
            {
                status: 'completed',
                notes: editData.notes || selectedRequest.notes || 'หัวหน้าช่างตรวจรับงานแล้ว'
            },
            session.user.name
        );

        if (result.success) {
            setShowDetailModal(false);
            loadData();
            showToast('หัวหน้าช่างตรวจรับงานเรียบร้อยแล้ว', 'success');
        } else {
            showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
        }
    }

    async function handleReturnForRework(note: string) {
        if (!selectedRequest) return;
        if (!ensureCanEditPage()) return;
        if (!canApproveCompletion) {
            showToast('เฉพาะหัวหน้าช่างเท่านั้นที่ส่งงานกลับแก้ได้', 'warning');
            return;
        }

        const result = await returnMaintenanceForRework(selectedRequest.request_id, note);

        if (result.success) {
            setShowReworkModal(false);
            setReworkRequest(null);
            setShowDetailModal(false);
            loadData();
            showToast('ส่งใบงานกลับไปแก้ไขแล้ว', 'success');
        } else {
            throw new Error(result.error || 'Failed to return maintenance request for rework');
        }
    }

    const currentUserName = session?.user?.name || '';
    const normalizedCurrentUserName = normalizePersonName(currentUserName);
    const filteredRequests = requests.filter(req => {
        // Handle search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchesSearch = 
                req.title.toLowerCase().includes(search) ||
                req.request_number.toLowerCase().includes(search) ||
                req.tbl_rooms.room_name.toLowerCase().includes(search) ||
                req.tbl_rooms.room_code.toLowerCase().includes(search) ||
                (req.reported_by || '').toLowerCase().includes(search) ||
                (req.assigned_to || '').toLowerCase().includes(search);
            if (!matchesSearch) return false;
        }

        // Show completed logic
        if (!showCompleted) {
            // Only hide if the user hasn't explicitly filtered by "completed" or "verified"
            const isCompletedStatus = req.status === 'completed' || req.status === 'verified';
            const isExplicitlyFilteringCompleted = filterStatus === 'completed' || filterStatus === 'verified';
            
            if (isCompletedStatus && !isExplicitlyFilteringCompleted) {
                return false;
            }
        }

        if (!showCancelled) {
            const isCancelledStatus = req.status === 'cancelled';
            const isExplicitlyFilteringCancelled = filterStatus === 'cancelled';
            if (isCancelledStatus && !isExplicitlyFilteringCancelled) {
                return false;
            }
        }

        if (assignedToMeOnly && normalizedCurrentUserName) {
            const normalizedAssignedTo = normalizePersonName(req.assigned_to);
            if (normalizedAssignedTo !== normalizedCurrentUserName) {
                return false;
            }
        }

        if (urgentOnly && req.priority !== 'urgent') {
            return false;
        }

        if (reopenedOnly && !hasReopenHistory(req.tbl_maintenance_history)) {
            return false;
        }

        return true;
    });

    const reopenedCount = requests.filter((req) => hasReopenHistory(req.tbl_maintenance_history)).length;
    const reopenedRate = requests.length > 0 ? (reopenedCount / requests.length) * 100 : 0;

    const hasActiveRequestFilters = (
        filterStatus !== 'all'
        || filterRoom !== null
        || Boolean(filterStartDate)
        || Boolean(filterEndDate)
        || Boolean(searchTerm.trim())
        || showCompleted
        || showCancelled
        || assignedToMeOnly
        || urgentOnly
        || reopenedOnly
    );
    const emptyStateMessage = hasActiveRequestFilters
        ? 'ไม่พบงานที่ตรงกับตัวกรอง'
        : 'ไม่มีงานแจ้งซ่อมในขณะนี้';

    const clearAllRequestFilters = () => {
        setFilterStatus('all');
        setFilterRoom(null);
        setFilterStartDate('');
        setFilterEndDate('');
        setShowCompleted(false);
        setShowCancelled(false);
        setAssignedToMeOnly(false);
        setUrgentOnly(false);
        setReopenedOnly(false);
        setSearchTerm('');
    };

    const triggerCsvDownload = (filename: string, rows: string[][]) => {
        const csvContent = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportFilteredCsv = () => {
        if (filteredRequests.length === 0) {
            showToast('ไม่พบข้อมูลสำหรับ Export', 'warning');
            return;
        }

        const header = [
            'request_number',
            'title',
            'status',
            'priority',
            'room_code',
            'room_name',
            'reported_by',
            'assigned_to',
            'created_at',
            'is_reopened',
            'reopened_at',
            'reopen_reason',
        ];

        const dataRows = filteredRequests.map((request) => {
            const isReopened = hasReopenHistory(request.tbl_maintenance_history);
            const reopenedAt = getLatestHistoryTimeByAction(request.tbl_maintenance_history, 'reopen_request');
            const reopenReason = getLatestHistoryValueByAction(request.tbl_maintenance_history, 'reopen_reason') || '';

            return [
                request.request_number || '',
                request.title || '',
                request.status || '',
                request.priority || '',
                request.tbl_rooms?.room_code || '',
                request.tbl_rooms?.room_name || '',
                request.reported_by || '',
                request.assigned_to || '',
                request.created_at ? format(new Date(request.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
                isReopened ? 'Y' : 'N',
                reopenedAt ? format(reopenedAt, 'yyyy-MM-dd HH:mm:ss') : '',
                reopenReason,
            ];
        });

        const filename = `maintenance_filtered_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        triggerCsvDownload(filename, [header, ...dataRows]);
        showToast(`Export แล้ว ${dataRows.length} รายการ`, 'success');
    };

    const handleExportReopenedCsv = () => {
        const reopenedRequests = filteredRequests.filter((request) => hasReopenHistory(request.tbl_maintenance_history));
        if (reopenedRequests.length === 0) {
            showToast('ไม่พบงาน Reopened สำหรับ Export', 'warning');
            return;
        }

        const header = [
            'request_number',
            'title',
            'status',
            'priority',
            'room_code',
            'room_name',
            'reported_by',
            'assigned_to',
            'created_at',
            'reopened_at',
            'reopen_reason',
        ];

        const dataRows = reopenedRequests.map((request) => {
            const reopenedAt = getLatestHistoryTimeByAction(request.tbl_maintenance_history, 'reopen_request');
            const reopenReason = getLatestHistoryValueByAction(request.tbl_maintenance_history, 'reopen_reason') || '';

            return [
                request.request_number || '',
                request.title || '',
                request.status || '',
                request.priority || '',
                request.tbl_rooms?.room_code || '',
                request.tbl_rooms?.room_name || '',
                request.reported_by || '',
                request.assigned_to || '',
                request.created_at ? format(new Date(request.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
                reopenedAt ? format(reopenedAt, 'yyyy-MM-dd HH:mm:ss') : '',
                reopenReason,
            ];
        });

        const filename = `maintenance_reopened_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        triggerCsvDownload(filename, [header, ...dataRows]);
        showToast(`Export Reopened แล้ว ${dataRows.length} รายการ`, 'success');
    };

    const summaryCards = [
        { key: 'all', label: 'ทั้งหมด', value: summary.total, className: 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white', accent: 'text-gray-900 dark:text-white', helper: 'ทุกใบงาน', status: 'all' },
        { key: 'pending', label: 'รอเรื่อง', value: summary.pending, className: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700', accent: 'text-yellow-600', helper: 'ยังไม่เริ่มดำเนินการ', status: 'pending' },
        { key: 'approved', label: 'แจ้งเรื่องต่อ', value: summary.approved, className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700', accent: 'text-orange-600', helper: 'รอเริ่มงาน', status: 'approved' },
        { key: 'in_progress', label: 'ดำเนินการ', value: summary.in_progress, className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700', accent: 'text-blue-600', helper: 'กำลังซ่อม', status: 'in_progress' },
        { key: 'completed', label: 'ปิดงานแล้ว', value: summary.completed, className: 'bg-green-50 dark:bg-green-900/20 text-green-700', accent: 'text-green-600', helper: 'ตรวจรับเสร็จสิ้น', status: 'completed' },
        { key: 'confirmed', label: 'รอหัวหน้าช่างตรวจรับ', value: summary.pending_verification || 0, className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700', accent: 'text-orange-600', helper: 'งานเสร็จแล้ว รอยืนยันรับงาน', status: 'confirmed' },
        { key: 'reopened', label: 'Reopened', value: reopenedCount, className: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700', accent: 'text-amber-600', helper: `อัตรา ${reopenedRate.toFixed(1)}%`, status: null },
        { key: 'cost', label: 'ค่าใช้จ่ายรวม', value: `฿${summary.total_cost.toLocaleString()}`, className: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700', accent: 'text-purple-600', helper: 'รวมทุกใบงาน', status: null },
    ] as const;

    const handleViewRequest = (request: MaintenanceRequestItem) => {
        openDetailModal(request);
    };

    const selectedRequestImageUrls = parseMaintenanceImageUrls(selectedRequest?.image_url);
    const selectedRequestCopiedImageMeta = getCopiedImageMetadata(selectedRequest?.tags);
    const selectedWorkflowStatus = normalizeMaintenanceWorkflowStatus(selectedRequest?.status);
    const selectedRequestHasBeenReopened = hasReopenHistory(historyItems);
    const selectedRequestLatestReopenReason = getLatestHistoryValueByAction(historyItems, 'reopen_reason');
    const selectedRequestLatestReopenAt = getLatestHistoryTimeByAction(historyItems, 'reopen_request');
    const selectedRequestExecutionTechnician = getLatestExecutionTechnician(historyItems, selectedRequest?.assigned_to);
    const shouldLockAssignedTechnician =
        ['in_progress', 'confirmed', 'completed'].includes(selectedWorkflowStatus || '')
        && Boolean(selectedRequestExecutionTechnician);
    const assignedTechnicianFieldValue = shouldLockAssignedTechnician
        ? selectedRequestExecutionTechnician
        : (editData.assigned_to || '');
    const isEmployeeRole = loggedInRole === 'employee';
    const isHeadTechnicianRole = loggedInRole === 'leader_technician';
    const isSelectedRequestAwaitingHeadApproval = selectedWorkflowStatus === 'confirmed';
    const canRoleEditMaintenanceStatus = new Set(['technician', 'leader_technician', 'manager', 'admin', 'owner']).has(loggedInRole);
    const canEditDetailStatusByRole = canRoleEditMaintenanceStatus || canManageMaintenanceStatus || canApproveCompletion;
    const canManagerEditClosedRequest =
        Boolean(selectedRequest)
        && isManagerRole(loggedInRole)
        && isMaintenanceWorkflowClosed(selectedRequest?.status);
    const isSelectedRequestReadOnly = !canEditPage || isEmployeeRole;
    const isDetailReadOnly = !canEditPage || isEmployeeRole;
    const managerClosedReopenStatusOptions: MaintenanceWorkflowStatus[] = ['pending', 'approved', 'in_progress'];
    const allowedDetailStatusTransitions = selectedRequest && canEditDetailStatusByRole
        ? (
            canManagerEditClosedRequest
                ? managerClosedReopenStatusOptions.filter((status) => status !== selectedRequest.status)
                : getAllowedMaintenanceTransitions(selectedRequest.status, { canApproveCompletion })
        )
        : [];
    const detailStatusOptions = selectedRequest
        ? [
            {
                value: selectedRequest.status,
                label: `${STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.label || selectedRequest.status} (ปัจจุบัน)`,
            },
            ...allowedDetailStatusTransitions
                .filter((status) => status !== selectedRequest.status)
                .map((status) => ({
                    value: status,
                    label: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status,
                })),
        ]
        : [];
    const canEditDetailStatus = !isEmployeeRole && canEditDetailStatusByRole && detailStatusOptions.length > 1;
    const canShowDetailSaveButton = !isEmployeeRole && canEditDetailStatus;
    const canShowHeadTechnicianActions =
        Boolean(selectedRequest)
        && isHeadTechnicianRole
        && isSelectedRequestAwaitingHeadApproval
        && canApproveCompletion
        && !isSelectedRequestReadOnly;
    const requiresTechnicianRepairLog =
        Boolean(selectedRequest)
        && isMaintenanceTechnician(loggedInRole)
        && editData.status === 'confirmed'
        && editData.status !== selectedRequest?.status;
    const canShowPartsAddSection = canEditPage && !isSelectedRequestReadOnly && editData.status === 'confirmed';
    const isAssignedTechnicianInputDisabled =
        isDetailReadOnly
        || shouldLockAssignedTechnician
        || (selectedRequest?.status === 'in_progress' && !canAssignMaintenance);

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

                        {true && (
                        <button
                            onClick={() => {
                                if (!ensureCanCreateMaintenanceRequest()) return;
                                setShowForm(true);
                            }}
                            disabled={!canCreateNewMaintenanceRequest}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                            title={canCreateNewMaintenanceRequest ? undefined : 'เฉพาะ ผู้ใช้ ที่กำหนดเท่านั้น'}
                        >
                            <Wrench size={18} /> แจ้งใหม่
                        </button>
                    )}
                </div>
            </div>


            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
                {summaryCards.map((card) => {
                    const isSelected = card.status !== null && filterStatus === card.status;
                    const isInteractive = card.status !== null;

                    return (
                        <button
                            key={card.key}
                            type="button"
                            onClick={() => {
                                if (!card.status) return;
                                setFilterStatus((prev) => (prev === card.status ? 'all' : card.status));
                            }}
                            className={`${card.className} rounded-xl p-4 shadow-sm text-left transition ${isInteractive ? 'hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                        >
                            <div className={`text-2xl font-bold ${card.accent}`}>{card.value}</div>
                            <div className="text-sm font-medium">{card.label}</div>
                            <div className="mt-1 text-xs opacity-80">{card.helper}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setAssignedToMeOnly((prev) => !prev)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${assignedToMeOnly ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200'}`}
                    >
                        งานของฉัน
                    </button>
                    <button
                        type="button"
                        onClick={() => setUrgentOnly((prev) => !prev)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${urgentOnly ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200'}`}
                    >
                        เฉพาะงานด่วน
                    </button>
                    <button
                        type="button"
                        onClick={() => setReopenedOnly((prev) => !prev)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${reopenedOnly ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200'}`}
                    >
                        เฉพาะงานที่ Reopened
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCompleted((prev) => !prev)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${showCompleted ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200'}`}
                    >
                        แสดงงานที่เสร็จแล้ว
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCancelled((prev) => !prev)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${showCancelled ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200'}`}
                    >
                        แสดงงานที่ยกเลิก
                    </button>
                    {hasActiveRequestFilters ? (
                        <button
                            type="button"
                            onClick={clearAllRequestFilters}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            ล้างตัวกรองทั้งหมด
                        </button>
                    ) : null}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportReopenedCsv}
                            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200"
                            title="Export เฉพาะงาน Reopened"
                        >
                            <Download size={14} />
                            Export Reopened CSV
                        </button>
                        <button
                            type="button"
                            onClick={handleExportFilteredCsv}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200"
                            title="Export ตามตัวกรองปัจจุบัน"
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            แสดง {filteredRequests.length} จาก {requests.length} ใบงาน
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
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
                        <option value="pending">รอเรื่อง</option>
                        <option value="approved">แจ้งเรื่องต่อ</option>
                        <option value="in_progress">ดำเนินการ</option>
                        <option value="confirmed">รอหัวหน้าช่างตรวจรับ</option>
                        <option value="completed">ปิดงานแล้ว</option>
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
                                                    {hasPartsStockPostedHistory(request.tbl_maintenance_history) && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                                                            <Package size={12} />
                                                            ตัดสต็อกแล้ว
                                                        </span>
                                                    )}
                                                    {hasReopenHistory(request.tbl_maintenance_history) && (
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 w-fit"
                                                            title={getLatestHistoryValueByAction(request.tbl_maintenance_history, 'reopen_reason') || 'เปิดงานใหม่'}
                                                        >
                                                            <RotateCcw size={12} />
                                                            Reopened
                                                        </span>
                                                    )}
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
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Filter size={40} className="text-gray-200" />
                                                <p className="text-lg font-medium text-gray-400">{emptyStateMessage}</p>
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
                                <p className="text-lg font-medium text-gray-400">{emptyStateMessage}</p>
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
                            {allowGeneralRequestPull && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextPullState = !pullFromGeneral;
                                            setPullFromGeneral(nextPullState);
                                            if (nextPullState) {
                                                void fetchGeneralRequests();
                                                return;
                                            }
                                            setSelectedGeneralRequestId(null);
                                        }}
                                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                            pullFromGeneral
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                                        }`}
                                    >
                                        {pullFromGeneral ? 'ซ่อนการดึงข้อมูล' : 'ดึงข้อมูลจากการรับเรื่อง'}
                                    </button>
                                    {pullFromGeneral && (
                                        <button
                                            type="button"
                                            onClick={() => void fetchGeneralRequests()}
                                            disabled={fetchingGeneral}
                                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                        >
                                            {fetchingGeneral ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} />
                                                    กำลังโหลด...
                                                </>
                                            ) : (
                                                'รีเฟรชรายการรับเรื่อง'
                                            )}
                                        </button>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-blue-700">
                                    ดึงข้อมูลจากหน้า /general-request แล้วอัปเดตสถานะใบงานเดิม (ไม่สร้างใบงานใหม่)
                                </p>

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
                                                        {req.title} ({req.reported_by}) - ห้อง {req.tbl_rooms?.room_code || '-'}
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
                                        {selectedGeneralRequestId && (
                                            <p className="mt-2 text-xs text-blue-700">
                                                ห้องที่ดึงมา: {selectedPulledRequest?.tbl_rooms?.room_code || '-'}
                                            </p>
                                        )}
                                        {selectedPulledRequestImageUrls.length > 0 && (
                                            <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3">
                                                <p className="mb-2 text-xs font-medium text-blue-800">
                                                    รูปจากการรับเรื่องจะถูกคัดลอกไปแนบกับใบงานเดิม ({selectedPulledRequestImageUrls.length} รูป)
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {selectedPulledRequestImageUrls.map((imageUrl, index) => (
                                                        <a
                                                            key={`${selectedPulledRequest?.request_id ?? 'general'}-${index}`}
                                                            href={imageUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block overflow-hidden rounded-lg border border-blue-100"
                                                        >
                                                            <Image
                                                                src={imageUrl}
                                                                alt={`รูปแนบจากเคสด่วน ${index + 1}`}
                                                                width={320}
                                                                height={96}
                                                                unoptimized
                                                                className="h-24 w-full object-cover"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Problem Title */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">หัวข้อปัญหา <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="เช่น  เครื่องปรับอากาศห้อง ไม่เย็น"
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
                                                        {asset.category} / {asset.location || 'No location'}
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
                                        title="Select Priority"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
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

                            {/* Reporter Name and Department and Target Role */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                      <label className="block text-sm font-medium mb-1">ผู้เแจ้ง *</label>
                                    <input
                                        type="text"
                                        value={formData.reported_by}
                                        readOnly
                                        className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 dark:border-slate-600 cursor-not-allowed"
                                        placeholder="ชื่อแจ้ง"
                                    />
                                </div>
                                <div>
                                      <label className="block text-sm font-medium mb-1">แผนก *</label>
                                    <input
                                        type="text"
                                        value={formData.department || session?.user?.role || ''}
                                        readOnly
                                        className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 dark:bg-slate-600 dark:text-gray-300 dark:border-slate-400 cursor-not-allowed"
                                        placeholder="ชื่อแผนก/หน่วยงาน"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">แผนกงานที่ต้องการแจ้งไปหา <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.target_role}
                                        onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600"
                                        required
                                    >
                                        {maintenanceTargetRoleOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
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
                                    <label className="block text-sm font-medium mb-2 text-gray-700">สถานที่ / ทะเบียนรถ <span className="text-red-500">*</span></label>

                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLocationMode('location');
                                                setFormData(prev => {
                                                    const currentTags = prev.tags ? prev.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                                    const nextTags = currentTags.filter(t => !t.toLowerCase().startsWith('รถ:'));
                                                    return { ...prev, vehicle_id: 0, tags: nextTags.join(',') };
                                                });
                                            }}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${locationMode === 'location' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            สถานที่
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLocationMode('vehicle');
                                                setFormData(prev => {
                                                    const currentTags = prev.tags ? prev.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                                    const nextTags = currentTags.filter(t => !t.toLowerCase().startsWith('รถ:'));
                                                    return { ...prev, room_id: 0, location: '', vehicle_id: 0, tags: nextTags.join(',') };
                                                });
                                            }}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${locationMode === 'vehicle' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            ทะเบียนรถ
                                        </button>
                                    </div>

                                    {locationMode === 'location' ? (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">ห้อง</label>
                                                <select
                                                    value={selectedLocationRoomCode}
                                                    onChange={(event) => {
                                                        const nextRoomCode = event.target.value;
                                                        const nextRoomOption = locationRoomOptions.find((room) => room.roomCode === nextRoomCode) || null;
                                                        setFormData((prev) => ({ ...prev, room_id: nextRoomOption?.roomId || 0 }));
                                                    }}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                    required
                                                >
                                                    <option value="">-- เลือกห้อง --</option>
                                                    {locationRoomOptions.map((room) => (
                                                        <option key={room.roomCode} value={room.roomCode}>
                                                            {room.roomLabel}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-600">สถานที่ / โซน (ถ้ามี)</label>
                                                <select
                                                    value={selectedLocationZoneId ? String(selectedLocationZoneId) : ''}
                                                    onChange={(event) => {
                                                        const nextZoneRoomId = Number.parseInt(event.target.value, 10);
                                                        setFormData((prev) => {
                                                            if (Number.isFinite(nextZoneRoomId) && nextZoneRoomId > 0) {
                                                                return { ...prev, room_id: nextZoneRoomId };
                                                            }
                                                            return { ...prev, room_id: selectedLocationRoomOption?.roomId || 0 };
                                                        });
                                                    }}
                                                    disabled={!selectedLocationRoomCode}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                                >
                                                    <option value="">{selectedLocationRoomCode ? '-- เลือกโซน (ถ้ามี) --' : '-- กรุณาเลือกห้องก่อน --'}</option>
                                                    {availableLocationZones.map((zone) => (
                                                        <option key={zone.roomId} value={zone.roomId}>
                                                            {zone.zoneLabel}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <VehicleLicensePlateSelector
                                                vehicles={vehicles}
                                                value={formData.vehicle_id}
                                                onChange={(vehicleId) => {
                                                    const selected = vehicleId ? vehicles.find(v => v.vehicle_id === vehicleId) : null;
                                                    const plate = selected?.license_plate?.trim() || '';
                                                    const vehicleTag = plate ? `รถ:${plate}` : '';
                                                    setFormData(prev => {
                                                        const currentTags = prev.tags ? prev.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                                        const nextTags = currentTags.filter(t => !t.toLowerCase().startsWith('รถ:'));
                                                        if (vehicleTag) nextTags.push(vehicleTag);
                                                        return { ...prev, vehicle_id: vehicleId, tags: nextTags.join(',') };
                                                    });
                                                }}
                                            />
                                            {(() => {
                                                if (!formData.vehicle_id) return null;
                                                const v = vehicles.find(x => x.vehicle_id === formData.vehicle_id);
                                                if (!v) return null;
                                                const ownerRoom = v.owner_room?.trim();
                                                if (!ownerRoom) {
                                                    return <div className="text-xs text-amber-600 mt-2">ทะเบียนรถนี้ยังไม่ระบุเลขห้อง (owner_room) ในระบบ</div>;
                                                }
                                                const matchedRoom = rooms.find(r => r.room_code.trim().toLowerCase() === ownerRoom.toLowerCase());
                                                if (!matchedRoom) {
                                                    return (
                                                        <div className="text-xs text-amber-600 mt-2">
                                                            ไม่พบห้องรหัส <span>&quot;{ownerRoom}&quot;</span> ที่ผูกกับทะเบียนรถนี้ (แก้ไขได้ที่หน้า /admin/rooms)
                                                        </div>
                                                    );
                                                }
                                                return <div className="text-xs text-gray-500 mt-2">ระบบจะใช้สถานที่อัตโนมัติ: {matchedRoom.room_code} — {matchedRoom.room_name}</div>;
                                            })()}
                                        </>
                                    )}
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
                                                ร—
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
                                    disabled={!canEditPage}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                    disabled={!canEditPage}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }

                      {/* Detail Modal - Light Theme */}
{showDetailModal && selectedRequest && (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-2xl">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner ring-1 ring-white/15">
              <Wrench size={28} />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold leading-tight">
                รายละเอียดใบงาน
              </h2>
              <p className="mt-1 text-lg font-semibold text-white/90">
                #{selectedRequest.request_number}
              </p>
              {selectedRequestHasBeenReopened && (
                <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  <RotateCcw size={12} />
                  Reopened
                  {selectedRequestLatestReopenAt && (
                    <span className="text-amber-700/90">
                      {selectedRequestLatestReopenAt.toLocaleString('th-TH')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-start">
            <Link
              href={`/maintenance/job-sheet/${selectedRequest.request_id}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              title="พิมพ์ใบงาน"
            >
              <Printer size={18} />
              พิมพ์ใบงาน
            </Link>

            <button
              onClick={() => setShowDetailModal(false)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/20"
              title="ปิด"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
        <WorkflowStepper
          currentStep={getMaintenanceWorkflowStep(selectedRequest.status)}
          totalSteps={5}
          status={selectedRequest.status as WorkflowStatus}
          labels={[...MAINTENANCE_WORKFLOW_LABELS]}
          size="md"
        />
      </div>

      {selectedRequestHasBeenReopened && selectedRequestLatestReopenReason && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 sm:px-6">
          <span className="font-semibold">เหตุผลเปิดงานใหม่:</span> {selectedRequestLatestReopenReason}
        </div>
      )}

      {/* Body */}
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
        <div className="grid grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)] sm:px-6">
          {/* Left Column */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-500">หัวข้อปัญหา</div>
              <div className="mt-2 text-3xl font-bold leading-snug text-slate-900">
                {selectedRequest.title}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500">สถานที่</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedRequest.tbl_rooms?.room_code || '-'}
                </div>
                <div className="mt-1 text-base text-slate-500">
                  {[selectedRequest.tbl_rooms?.building, selectedRequest.tbl_rooms?.floor]
                    .filter(Boolean)
                    .join(' ')}{' '}
                  {selectedRequest.tbl_rooms?.room_name}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500">ผู้แจ้ง</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedRequest.reported_by}
                </div>
                <div className="mt-1 text-base text-slate-500">
                  {new Date(selectedRequest.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>
            </div>

            {selectedRequestImageUrls.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-medium text-slate-500">รูปภาพ</div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedRequestImageUrls.map((imageUrl, index) => (
                    <a
                      key={`${selectedRequest.request_id}-${index}`}
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50"
                    >
                      {index < selectedRequestCopiedImageMeta.copiedImageCount && (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white shadow">
                          {selectedRequestCopiedImageMeta.sourceRequestId
                            ? `คัดลอกจากเคสด่วน #${selectedRequestCopiedImageMeta.sourceRequestId}`
                            : 'คัดลอกจากเคสด่วนออนไลน์'}
                        </span>
                      )}

                      {/* Use native img for robust fallback to proxy when /uploads path is unavailable on this node */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`รูปภาพปัญหา ${index + 1}`}
                        loading="lazy"
                        className="h-48 w-full object-cover transition duration-200 group-hover:scale-[1.02] group-hover:opacity-95"
                        onError={(event) => {
                            const target = event.currentTarget;
                            if (target.dataset.fallbackApplied === '1') return;
                            target.dataset.fallbackApplied = '1';
                            target.src = resolveMaintenanceImageProxyUrl(imageUrl);
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-medium text-slate-500">
                ความเร่งด่วน & หมวดหมู่
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
                  {PRIORITY_CONFIG[selectedRequest.priority]?.label || selectedRequest.priority}
                </span>
                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">
                  {MAINTENANCE_CATEGORY_OPTIONS.find((c) => c.value === selectedRequest.category)?.label ||
                    selectedRequest.category ||
                    'ทั่วไป'}
                </span>
              </div>

              {selectedRequest.description && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="mb-2 text-sm font-medium text-slate-500">รายละเอียด</div>
                  <div className="whitespace-pre-line text-base leading-7 text-slate-700">
                    {selectedRequest.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    สถานะ
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => {
                      setEditData({ ...editData, status: e.target.value });
                      if (e.target.value !== 'confirmed') {
                        setNewPartsUsed([]);
                      }
                    }}
                    disabled={!canEditDetailStatus}
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-xl font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {detailStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {isSelectedRequestAwaitingHeadApproval && (
                    <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700">
                      ใบงานนี้รอหัวหน้าช่างตรวจรับ 
                    </div>
                  )}

                  {selectedWorkflowStatus === 'completed' && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      ใบงานนี้ปิดสมบูรณ์แล้วและไม่สามารถแก้ไขได้
                    </div>
                  )}

                  {hasCompletedStockPosting(parts, historyItems) && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <Package size={12} />
                      ตัดสต็อกแล้ว
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    ผู้รับผิดชอบ/ช่าง
                  </label>
                  <select
                    value={assignedTechnicianFieldValue}
                    onChange={(e) => {
                      if (shouldLockAssignedTechnician) return;
                      const nextAssignedTo = e.target.value;
                      const nextEditData = { ...editData, assigned_to: nextAssignedTo };

                      if (
                        selectedRequest.status === 'pending' &&
                        editData.status === 'pending' &&
                        nextAssignedTo
                      ) {
                        nextEditData.status = 'approved';
                      }

                      setEditData(nextEditData);
                    }}
                    className={`h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-xl font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
                      isAssignedTechnicianInputDisabled
                        ? 'cursor-not-allowed bg-slate-100 opacity-70'
                        : ''
                    }`}
                    disabled={isAssignedTechnicianInputDisabled}
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {Array.from(
                      new Set([
                        ...technicians.map((t) => t.name),
                        ...lineTechnicians.map((u) => u.display_name),
                      ]),
                    )
                      .filter(Boolean)
                      .sort()
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    {assignedTechnicianFieldValue &&
                      !Array.from(
                        new Set([
                          ...technicians.map((t) => t.name),
                          ...lineTechnicians.map((u) => u.display_name),
                        ]),
                      ).includes(assignedTechnicianFieldValue) && (
                        <option value={assignedTechnicianFieldValue}>
                          {assignedTechnicianFieldValue}
                        </option>
                      )}
                  </select>
                  {shouldLockAssignedTechnician && (
                    <p className="mt-2 text-xs text-slate-500">
                      อ้างอิงช่างผู้ดำเนินการล่าสุด: {selectedRequestExecutionTechnician}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    วันที่นัดซ่อม
                  </label>
                  <input
                    type="date"
                    value={editData.scheduled_date}
                    onChange={(e) =>
                      setEditData({ ...editData, scheduled_date: e.target.value })
                    }
                    disabled={isDetailReadOnly}
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-xl font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    ค่าใช้จ่ายจริง (บาท)
                  </label>
                  <input
                    type="number"
                    value={editData.actual_cost || ''}
                    onChange={(e) =>
                      setEditData({ ...editData, actual_cost: Number(e.target.value) })
                    }
                    disabled={!canEditActualCost || isSelectedRequestReadOnly}
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-2xl font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="0"
                    min="0"
                  />
                  
                  {canEditActualCost &&
                    !isSelectedRequestReadOnly &&
                    Number(editData.actual_cost || 0) !== Number(selectedRequest.actual_cost || 0) && (
                      <div className="mt-3">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-amber-700">
                          เหตุผลการแก้ค่าใช้จ่ายจริง
                        </label>
                        <textarea
                          value={editData.actual_cost_reason}
                          onChange={(e) =>
                            setEditData({ ...editData, actual_cost_reason: e.target.value })
                          }
                          className="min-h-[90px] w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-amber-700/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                          rows={3}
                          placeholder="เช่น ปรับตามใบเสร็จจริง / แก้จากยอดคำนวณเดิมที่บันทึกผิด"
                        />
                      </div>
                    )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    {requiresTechnicianRepairLog ? 'บันทึกการแก้ไขของช่าง *' : 'หมายเหตุ'}
                  </label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    disabled={isDetailReadOnly}
                    className="min-h-[130px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    rows={4}
                    placeholder={requiresTechnicianRepairLog ? 'ระบุวิธีซ่อม, อาการที่พบ, และผลหลังทดสอบ' : 'เพิ่มหมายเหตุ...'}
                  />
                  {requiresTechnicianRepairLog && (
                    <p className="mt-2 text-xs text-amber-700">ต้องกรอกก่อนส่งงานให้หัวหน้าช่างตรวจรับ</p>
                  )}
                </div>

                {canManagerEditClosedRequest && editData.status !== selectedRequest.status && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-amber-700">
                      เหตุผลการเปิดงานใหม่ *
                    </label>
                    <textarea
                      value={editData.reopen_reason}
                      onChange={(e) => setEditData({ ...editData, reopen_reason: e.target.value })}
                      disabled={isDetailReadOnly}
                      className="min-h-[110px] w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-amber-700/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      rows={3}
                      placeholder="ระบุสาเหตุที่ต้องเปิดงานที่ปิดแล้วกลับมาแก้ไข (อย่างน้อย 8 ตัวอักษร)"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Parts Add Section */}
        {canShowPartsAddSection && (
          <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
            <details open className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 text-lg font-semibold text-slate-900">
                <Package size={18} />
                เพิ่มอะไหล่ที่ใช้
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {newPartsUsed.length} รายการ
                </span>
              </summary>

              <div className="border-t border-slate-200 px-5 py-5">
                <p className="mb-5 text-sm text-slate-500">
                  เลือกอะไหล่ที่ใช้กับใบงานนี้ แล้วกดยืนยันเบิกอะไหล่เพื่อเพิ่มเข้ารายการทันที
                </p>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          ค้นหาอะไหล่จากคลัง WH-01
                        </div>
                        <div className="text-xs text-slate-500">
                          ค้นหาด้วยชื่อหรือรหัสสินค้า แล้วกดเลือกเพื่อเพิ่มเข้ารายการ
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600">
                        <Search size={12} />
                        ค้นหาได้ทั้งชื่อและรหัส
                      </div>
                    </div>

                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="เช่น ลูกลอย, ปั๊มน้ำ, P-0001"
                        value={modalPartSearch}
                        onChange={(e) => setModalPartSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-24 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      {modalPartSearch && (
                        <button
                          type="button"
                          onClick={() => setModalPartSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          ล้างคำค้น
                        </button>
                      )}
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
                      {!modalPartSearch && (
                        <div className="flex min-h-[180px] items-center justify-center text-center">
                          <div className="max-w-sm space-y-2">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shadow-sm">
                              <Search size={18} />
                            </div>
                            <div className="text-sm font-medium text-slate-900">
                              เริ่มค้นหาอะไหล่ที่ต้องการเบิก
                            </div>                            
                          </div>
                        </div>
                      )}

                      {modalPartSearch && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500">ผลการค้นหา</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                              {filteredModalProducts.length} รายการ
                            </span>
                          </div>

                          {filteredModalProducts.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {filteredModalProducts.map((p) => (
                                <button
                                  key={p.p_id}
                                  type="button"
                                  onClick={() => {
                                    setNewPartsUsed([
                                      ...newPartsUsed,
                                      { p_id: p.p_id, quantity: 1 },
                                    ]);
                                    setModalPartSearch('');
                                  }}
                                  className="group rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={p.p_count <= 0}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div
                                        className={`truncate text-sm font-semibold ${
                                          p.p_count <= 0 ? 'text-slate-400' : 'text-slate-900'
                                        }`}
                                      >
                                        {p.p_name}
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-400">
                                        รหัส {p.p_id}
                                      </div>
                                    </div>
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                                        p.p_count <= 0
                                          ? 'bg-slate-100 text-slate-300'
                                          : 'bg-blue-100 text-blue-600'
                                      }`}
                                    >
                                      <Plus size={14} />
                                    </div>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                        p.p_count <= 0
                                          ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                      }`}
                                    >
                                      คงเหลือ {p.p_count} {p.p_unit || 'ชิ้น'}
                                    </span>
                                    <span className="text-[11px] text-slate-400 group-hover:text-blue-600">
                                      เลือกอะไหล่
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                              ไม่พบอะไหล่ที่ค้นหา หรือรายการนั้นถูกเลือกไปแล้ว
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-900">รายการรอยืนยันเบิก</div>
                      <div className="text-xs text-slate-500">
                        ตรวจสอบจำนวนก่อนเพิ่มเข้ารายการอะไหล่ที่เบิก
                      </div>
                    </div>

                    <div className="space-y-2">
                      {newPartsUsed.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-xs text-slate-500">
                          ยังไม่ได้เลือกอะไหล่
                        </div>
                      )}

                      {newPartsUsed.map((part, index) => {
                        const product = products.find((p) => p.p_id === part.p_id);
                        const avail = Number(product?.p_count ?? 0);

                        return (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900">
                                  {product?.p_name || part.p_id}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  รหัส {part.p_id} • คงเหลือใน WH-01 {avail} ชิ้น
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setNewPartsUsed(newPartsUsed.filter((_, i) => i !== index))
                                }
                                className="text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                                aria-label="Remove part"
                              >
                                ลบ
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-500">จำนวนที่เบิก</span>
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
                                className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">พร้อมเบิกเข้าหน้างาน</span>
                        <span className="font-semibold text-slate-900">
                          {newPartsUsed.reduce((sum, part) => sum + part.quantity, 0)} ชิ้น
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleWithdrawSelectedParts}
                        disabled={newPartsUsed.length === 0 || isWithdrawingParts}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingCart size={15} className={isWithdrawingParts ? 'animate-pulse' : ''} />
                        {isWithdrawingParts ? 'กำลังยืนยันการเบิก...' : 'ยืนยันเบิกอะไหล่'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Parts Usage Section */}
        {parts.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Package size={18} /> รายการอะไหล่ที่เบิก
            </h3>

            <div className="space-y-3">
              {parts.map((part) => (
                <div
                  key={part.part_id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {part.product?.p_name || part.p_id}
                      </div>
                      <div className="text-sm text-slate-500">
                        เบิก: {part.quantity} {part.unit || 'ชิ้น'} • โดย {part.withdrawn_by}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          part.status === 'withdrawn'
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : part.status === 'pending_verification'
                              ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200'
                              : part.status === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : part.status === 'verification_failed'
                                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                  : part.status === 'defective'
                                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                    : part.status === 'returned'
                                      ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                                      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                        }`}
                      >
                        {part.status === 'withdrawn'
                          ? 'เบิกแล้ว (รอใช้งาน)'
                          : part.status === 'pending_verification'
                            ? 'รอตรวจนับ'
                            : part.status === 'verified'
                              ? 'ตรวจนับแล้ว'
                              : part.status === 'verification_failed'
                                ? 'ตรวจนับไม่ตรง'
                                : part.status === 'defective'
                                  ? 'ของเสีย'
                                  : part.status === 'returned'
                                    ? 'คืนสต็อก'
                                    : part.status}
                      </span>

                      {isPartMarkedDefective(part) && (
                        <span className="mt-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                          มีของเสีย รอคลังยืนยัน
                        </span>
                      )}

                      {part.actual_used !== null && part.actual_used !== undefined && (
                        <span className="mt-1 text-xs text-slate-500">
                          ใช้จริง: {part.actual_used}
                        </span>
                      )}
                    </div>
                  </div>

                  {part.status === 'withdrawn' &&
                    !isSelectedRequestReadOnly &&
                    canConfirmMaintenancePartUsage(loggedInRole, userPermissions) && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        {confirmingPartId === part.part_id ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={part.quantity}
                                value={confirmQty}
                                onChange={(e) => setConfirmQty(Number(e.target.value))}
                                className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="จำนวน"
                              />
                              <span className="text-sm text-slate-500">ที่ใช้จริง</span>
                              <label className="ml-2 flex items-center gap-1 text-sm text-red-600">
                                <input
                                  type="checkbox"
                                  checked={isDefective}
                                  onChange={(e) => setIsDefective(e.target.checked)}
                                  className="h-4 w-4"
                                />
                                เป็นของเสีย
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmUsage(part.part_id)}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                ยืนยัน
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmingPartId(null);
                                  setIsDefective(false);
                                }}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmingPartId(part.part_id);
                              setConfirmQty(part.quantity);
                              setIsDefective(false);
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Wrench size={12} /> ยืนยันการใช้อะไหล่
                          </button>
                        )}
                      </div>
                    )}

                  {['pending_verification', 'used', 'defective'].includes(part.status) && !isSelectedRequestReadOnly && canVerifyParts && (
                    <div className="mt-3 rounded-xl bg-yellow-50 px-3 pb-2 pt-3 ring-1 ring-yellow-200">
                      {verifyingPartId === part.part_id ? (
                        <div className="flex flex-col gap-2">
                          {isPartMarkedDefective(part) ? (
                            <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
                              รายการนี้ถูกแจ้งเป็นของเสียจากฝ่ายช่าง กดยืนยันเพื่อส่งสถานะของเสียให้คลัง
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={verifyQty}
                                onChange={(e) => setVerifyQty(Number(e.target.value))}
                                className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="จำนวน"
                              />
                              <span className="text-sm text-slate-500">นับได้จริง</span>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerifyPart(part.part_id)}
                              className={`rounded-xl px-4 py-2 text-xs font-medium text-white ${
                                isPartMarkedDefective(part)
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {isPartMarkedDefective(part) ? 'ยืนยันของเสีย' : 'ยืนยันถูกต้อง'}
                            </button>
                            <button
                              onClick={() => setVerifyingPartId(null)}
                              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setVerifyingPartId(part.part_id);
                            setVerifyQty(part.actual_used || 0);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-yellow-700 hover:text-yellow-800"
                        >
                          <CheckCircle2 size={12} /> {isPartMarkedDefective(part) ? 'ยืนยันของเสีย' : 'ตรวจนับสินค้า'}
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
        {['confirmed', 'completed'].includes(selectedRequest.status) && (
          <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
            {selectedRequest.status === 'confirmed' && (
              <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700">
                งานนี้ถูกส่งให้หัวหน้าช่างตรวจรับแล้ว และยังไม่ปิดใบงาน
              </div>
            )}

            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CheckCircle2 size={18} className="text-emerald-500" />
              ข้อมูลการซ่อมเสร็จสิ้น
            </h3>

            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Activity className="h-4 w-4 text-blue-500" />
                  สถานะขั้นตอนการทำงาน
                </h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.color ||
                      'bg-slate-100'
                    }`}
                  >
                    {selectedRequest.status === 'confirmed'
                      ? 'รอหัวหน้าช่างตรวจรับ'
                      : STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.label ||
                        selectedRequest.status}
                  </span>

                  {hasCompletedStockPosting(parts, historyItems) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <Package size={12} />
                      ตัดสต็อกแล้ว
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 size={16} />
                  ดำเนินการเสร็จสิ้น
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ช่างผู้รับผิดชอบ
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedRequest.assigned_to || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      วันที่ดำเนินการเสร็จ
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedRequest.completed_at
                        ? new Date(selectedRequest.completed_at).toLocaleString('th-TH')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {selectedRequest.completion_image_url && (
                <div>
                  <div className="mb-2 text-sm text-slate-500">รูปถ่ายหลังซ่อมเสร็จ</div>
                  <a
                    href={selectedRequest.completion_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src={selectedRequest.completion_image_url}
                      alt="Completion"
                      width={960}
                      height={384}
                      unoptimized
                      className="max-h-48 w-full rounded-2xl border border-slate-200 object-cover transition hover:opacity-90"
                    />
                  </a>
                </div>
              )}

              <div className="space-y-4">
                {selectedRequest.technician_signature && (
                  <div>
                    <div className="mb-2 text-sm text-slate-500">ลายเซ็นช่างผู้ซ่อม</div>
                    <div className="flex min-h-[100px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      <Image
                        src={selectedRequest.technician_signature}
                        alt="Technician Signature"
                        width={320}
                        height={96}
                        unoptimized
                        className="max-h-24 object-contain"
                      />
                    </div>
                  </div>
                )}

                {selectedRequest.customer_signature && (
                  <div>
                    <div className="mb-2 text-sm text-slate-500">ลายเซ็นลูกค้ารับงาน</div>
                    <div className="flex min-h-[100px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      <Image
                        src={selectedRequest.customer_signature}
                        alt="Customer Signature"
                        width={320}
                        height={96}
                        unoptimized
                        className="max-h-24 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {historyItems.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <HistoryIcon size={18} /> ประวัติการเปลี่ยนแปลง
            </h3>

            <div className="max-h-48 space-y-2 overflow-y-auto">
              {historyItems.map((h) => (
                <div
                  key={h.history_id}
                  className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center"
                >
                  <div className="text-slate-700">
                    <span className="font-medium text-slate-900">
                      {getHistoryActionLabel(h.action)}
                    </span>
                    {h.old_value && h.new_value && (
                      <span className="text-slate-400"> ({h.old_value} → {h.new_value})</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    โดย {h.changed_by} เมื่อ {new Date(h.changed_at).toLocaleString('th-TH')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setShowDetailModal(false)}
              className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-slate-300 px-5 py-4 text-lg font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ปิด
            </button>

            <div className="flex-1" />

            {canShowHeadTechnicianActions && (
              <button
                onClick={() => {
                  setReworkRequest(selectedRequest);
                  setShowReworkModal(true);
                }}
                disabled={!canEditPage}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-4 text-lg font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AlertTriangle size={18} />
                ให้แก้งานใหม่
              </button>
            )}

            {canShowHeadTechnicianActions && (
              <button
                onClick={handleHeadTechnicianApproval}
                disabled={!canEditPage}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                ตรวจรับงาน
              </button>
            )}

            {canShowDetailSaveButton && !canShowHeadTechnicianActions && (
                <button
                  onClick={handleUpdateRequest}
                  disabled={!canEditPage && !canEditDetailStatus}
                  className="inline-flex min-w-[280px] items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}


            {/* Status Change Confirmation Modal */}
            {
                showStatusModal && statusChangeData.request && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
                            {/* Modal Header */}
                            <div className={`p-5 ${statusChangeData.newStatus === 'in_progress'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                : statusChangeData.newStatus === 'approved'
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                                : statusChangeData.newStatus === 'confirmed'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                    : 'bg-gradient-to-r from-gray-500 to-gray-600'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        {statusChangeData.newStatus === 'in_progress' ? (
                                            <Wrench className="text-white" size={24} />
                                        ) : statusChangeData.newStatus === 'approved' ? (
                                            <ArrowRight className="text-white" size={24} />
                                        ) : statusChangeData.newStatus === 'confirmed' ? (
                                            <CheckCircle2 className="text-white" size={24} />
                                        ) : (
                                            <Clock className="text-white" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {statusChangeData.newStatus === 'approved' && 'แจ้งเรื่องต่อ'}
                                            {statusChangeData.newStatus === 'in_progress' && 'เริ่มดำเนินการซ่อม'}
                                            {statusChangeData.newStatus === 'confirmed' && 'ส่งงานให้หัวหน้าช่างตรวจรับ'}
                                            {statusChangeData.newStatus === 'pending' && 'ยืนยันการเปลี่ยนสถานะ'}
                                        </h3>
                                        <p className="text-white/80 text-sm mb-2">
                                            ใบงาน: {statusChangeData.request.request_number}
                                        </p>
                                        <div className="w-[180px]">
                                            <WorkflowStepper
                                                currentStep={getMaintenanceWorkflowStep(statusChangeData.newStatus)}
                                                totalSteps={5}
                                                labels={[...MAINTENANCE_WORKFLOW_LABELS]}
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

                                {/* Confirmed: Summary */}
                                {statusChangeData.newStatus === 'confirmed' && (
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
                                                เพิ่มอะไหล่ที่ใช้ก่อนส่งตรวจรับ (ถ้ามี)
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
                                                    {products.filter(p => !statusChangeData.partsUsed.some(pu => pu.p_id === p.p_id)).map(p => (
                                                        <option
                                                            key={p.p_id}
                                                            value={p.p_id}
                                                            disabled={(p.available_stock ?? p.p_count) <= 0}
                                                        >
                                                            {(p.available_stock ?? p.p_count) > 0
                                                                ? `${p.p_name} (คงเหลือใน WH-01 ${p.available_stock ?? p.p_count})`
                                                                : `${p.p_name} (WH-01 หมด)`}
                                                        </option>
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
                                                บันทึกการแก้ไขของช่าง *
                                            </label>
                                            <textarea
                                                value={statusChangeData.completionNotes}
                                                onChange={(e) => setStatusChangeData({ ...statusChangeData, completionNotes: e.target.value })}
                                                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                rows={3}
                                                placeholder="ระบุวิธีซ่อม, อาการที่พบ, และผลหลังทดสอบ"
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
                                    disabled={!canEditPage}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 ${statusChangeData.newStatus === 'in_progress'
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : statusChangeData.newStatus === 'approved'
                                            ? 'bg-orange-600 hover:bg-orange-700'
                                        : statusChangeData.newStatus === 'confirmed'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-gray-600 hover:bg-gray-700'
                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    {statusChangeData.newStatus === 'approved' && (
                                        <>
                                            <ArrowRight size={18} />
                                            แจ้งเรื่องต่อ
                                        </>
                                    )}
                                    {statusChangeData.newStatus === 'in_progress' && (
                                        <>
                                            <Wrench size={18} />
                                            เริ่มซ่อม
                                        </>
                                    )}
                                    {statusChangeData.newStatus === 'confirmed' && (
                                        <>
                                            <CheckCircle2 size={18} />
                                            ส่งตรวจรับ
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

            {showReworkModal && reworkRequest && (
                <ReworkModal
                    request={reworkRequest}
                    onClose={() => {
                        setShowReworkModal(false);
                        setReworkRequest(null);
                    }}
                    onConfirm={handleReturnForRework}
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

function ReworkModal({
    request,
    onClose,
    onConfirm
}: {
    request: MaintenanceRequestItem;
    onClose: () => void;
    onConfirm: (note: string) => Promise<void>;
}) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await onConfirm(note);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Failed to return for rework');
        }

        setLoading(false);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl border dark:border-slate-700">
                <h2 className="text-xl font-bold mb-2 text-amber-600 flex items-center gap-2">
                    <AlertTriangle size={24} />
                    ให้แก้งานใหม่
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    ส่งใบงาน <b>#{request.request_number}</b> กลับไปที่ขั้นดำเนินการ
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">หมายเหตุถึงช่าง</label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600 resize-none focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="ระบุสิ่งที่ต้องแก้ไขเพิ่มเติม"
                            required
                            rows={3}
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
                            className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                            disabled={loading}
                        >
                            {loading ? 'กำลังส่งกลับ...' : 'ยืนยันส่งกลับ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
