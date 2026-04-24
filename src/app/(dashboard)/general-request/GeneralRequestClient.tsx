'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { FloatingSearchInput } from '@/components/FloatingField';
import { useToast } from '@/components/ToastProvider';
import {
    Plus, CheckCircle2, AlertCircle,
    Eye, Calendar, MapPin, Loader2,
    X, ClipboardList, LayoutGrid, TableProperties, BarChart3
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import HierarchicalRoomSelector from '@/components/HierarchicalRoomSelector';
import VehicleLicensePlateSelector from '@/components/VehicleLicensePlateSelector';
import {
    getMaintenanceRequests,
    createMaintenanceRequest,
    acknowledgeGeneralRequest,
    updateMaintenanceRequest,
    deleteAcknowledgedGeneralRequest,
    getRooms
} from '@/actions/maintenanceActions';
import { getAllVehicles } from '@/actions/vehicleActions';
import { resolveGeneralRequestAccess } from '@/lib/rbac';
import { parseMaintenanceImageUrls } from '@/lib/maintenance-images';
import {
    GENERAL_REQUEST_CATEGORY_OPTIONS,
    GENERAL_REQUEST_PRIORITY_CONFIG,
    GENERAL_REQUEST_PRIORITY_OPTIONS,
    GENERAL_REQUEST_STATUS_CONFIG,
} from '@/lib/general-request-options';

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
    category?: string | null;
    department?: string | null;
    contact_info?: string | null;
    tags?: string | null;
}

type GeneralRequestEditFormState = {
    title: string;
    description: string;
    category: string;
    priority: string;
    department: string;
    contact_info: string;
    notes: string;
    edit_reason: string;
};

interface Vehicle {
    vehicle_id: number;
    license_plate: string;
    province: string | null;
    vehicle_type: string | null;
    owner_name: string | null;
    owner_room: string | null;
    active: boolean;
}

interface Props {
    userPermissions: Record<string, boolean>;
}

type SessionUserLike = {
    role?: string;
    name?: string | null;
    email?: string | null;
};

const hasCustomerTag = (tags?: string | null) =>
    (tags || '')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .includes('ลูกค้า');

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const ACKNOWLEDGED_REQUEST_STATUSES = new Set(['approved']);
const IN_PROGRESS_REQUEST_STATUSES = new Set(['in_progress']);
const FINISHED_REQUEST_STATUSES = new Set(['confirmed', 'completed', 'verified']);
const INFORMATIONAL_REQUEST_CATEGORIES = new Set(['general']);
const GENERAL_REQUEST_EDIT_ROLE_SET = new Set(['leader_employee', 'manager', 'admin']);
const GENERAL_REQUEST_CANCEL_ALLOWED_STATUS_SET = new Set(['pending', 'approved', 'in_progress']);

const normalizeRequestStatus = (status?: string | null) => (status || '').toLowerCase();
const normalizeRequestCategory = (category?: string | null) => (category || '').trim().toLowerCase();
const isPendingRequestStatus = (status?: string | null) => normalizeRequestStatus(status) === 'pending';
const isAcknowledgedRequestStatus = (status?: string | null) =>
    ACKNOWLEDGED_REQUEST_STATUSES.has(normalizeRequestStatus(status));
const isInProgressRequestStatus = (status?: string | null) =>
    IN_PROGRESS_REQUEST_STATUSES.has(normalizeRequestStatus(status));
const getRequestStatusMeta = (status?: string | null) =>
    GENERAL_REQUEST_STATUS_CONFIG[normalizeRequestStatus(status)]
    || GENERAL_REQUEST_STATUS_CONFIG.pending;
const getStatusHint = (status?: string | null) => {
    const normalized = normalizeRequestStatus(status);
    if (normalized === 'pending') return 'รอฝ่ายธุรการรับเรื่อง';
    if (normalized === 'approved') return 'ฝ่ายธุรการรับเรื่องแล้ว';
    if (normalized === 'in_progress') return 'ช่างกำลังดำเนินการ';
    return '';
};

function resolveMaintenanceImageProxyUrl(imageUrl: string): string {
    const trimmed = imageUrl.trim();
    if (!trimmed) return '';
    if (ABSOLUTE_URL_PATTERN.test(trimmed)) return trimmed;

    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (!normalized.startsWith('/uploads/')) return normalized;
    return `/api/maintenance/image-proxy?path=${encodeURIComponent(normalized)}`;
}

const isFinishedRequestStatus = (status?: string | null) =>
    FINISHED_REQUEST_STATUSES.has(normalizeRequestStatus(status));

const isCancelledRequestStatus = (status?: string | null) =>
    normalizeRequestStatus(status) === 'cancelled';

const isInformationalRequestCategory = (category?: string | null) =>
    INFORMATIONAL_REQUEST_CATEGORIES.has(normalizeRequestCategory(category));

const isAcknowledgedInformationalRequest = (request: Pick<MaintenanceRequestItem, 'category' | 'status'>) =>
    isInformationalRequestCategory(request.category)
    && isFinishedRequestStatus(request.status);

const isOperationalFinishedRequest = (request: Pick<MaintenanceRequestItem, 'category' | 'status'>) =>
    !isInformationalRequestCategory(request.category)
    && isFinishedRequestStatus(request.status);

export default function GeneralRequestClient({ userPermissions }: Props) {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const reqQueryParam = searchParams.get('req');

    const currentUser = session?.user as SessionUserLike | undefined;
    const currentRole = (currentUser?.role || '').toLowerCase();
    const loggedInReporter = (currentUser?.name || currentUser?.email || '').trim();

    const access = useMemo(
        () => resolveGeneralRequestAccess(currentRole, userPermissions),
        [currentRole, userPermissions]
    );

    const canViewGeneralRequest = access.canViewPage;
    const canCreateGeneralRequest = access.canCreate;
    const canEditGeneralRequest = access.canEditPage;
    const canAcknowledgeFromGeneralRequest =
        ['employee', 'leader_employee', 'admin', 'manager'].includes(currentRole);
    const canOpenKpiDashboard = ['admin', 'manager', 'leader_employee'].includes(currentRole);
    // Data
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [acknowledgingRequestId, setAcknowledgingRequestId] = useState<number | null>(null);

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFinishedRequests, setShowFinishedRequests] = useState(true);
    const [showCancelledRequests, setShowCancelledRequests] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestItem | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);
    const [locationMode, setLocationMode] = useState<'location' | 'vehicle'>('location');
    const [isEditingDetail, setIsEditingDetail] = useState(false);
    const [savingDetail, setSavingDetail] = useState(false);
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancellingDetail, setCancellingDetail] = useState(false);
    const [deletingAcknowledgedDetail, setDeletingAcknowledgedDetail] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [detailEditForm, setDetailEditForm] = useState<GeneralRequestEditFormState>({
        title: '',
        description: '',
        category: 'general',
        priority: 'normal',
        department: '',
        contact_info: '',
        notes: '',
        edit_reason: '',
    });

    // Form
    const [formData, setFormData] = useState({
        room_id: 0,
        vehicle_id: 0,
        title: '',
        description: '',
        category: 'general',
        priority: 'normal',
        reported_by: '',
        contact_info: '',
        department: '',
        tags: '',
        tagInput: '',
        target_role: 'general',
    });

    const loadData = useCallback(async () => {
        if (!canViewGeneralRequest) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [reqResult, roomResult, vehicleResult] = await Promise.all([
                getMaintenanceRequests({ scope: 'general' }),
                getRooms(),
                getAllVehicles()
            ]);

            if (reqResult.success && reqResult.data) {
                const normalizedRequests = (reqResult.data as unknown as MaintenanceRequestItem[]).map((request) =>
                    hasCustomerTag(request.tags)
                        ? { ...request, priority: 'urgent' }
                        : request
                );
                setRequests(normalizedRequests);
            }

            if (roomResult.success && roomResult.data) {
                setRooms(roomResult.data);
            }

            if (vehicleResult) {
                setVehicles(vehicleResult as Vehicle[]);
            }
        } catch (err) {
            console.error('Failed to load data', err);
            showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
        } finally {
            setLoading(false);
        }
    }, [canViewGeneralRequest, showToast]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        setFormData((prev) => ({ ...prev, reported_by: loggedInReporter }));
    }, [loggedInReporter]);

    useEffect(() => {
        if (!reqQueryParam || requests.length === 0 || hasOpenedFromUrl) return;

        const targetReq = requests.find(r => r.request_id === Number(reqQueryParam));
        if (!targetReq) return;

        setSelectedRequest(targetReq);
        setShowDetail(true);
        setHasOpenedFromUrl(true);

        const url = new URL(window.location.href);
        url.searchParams.delete('req');
        window.history.replaceState({}, '', url.toString());
    }, [reqQueryParam, requests, hasOpenedFromUrl]);

    useEffect(() => {
        if (!selectedRequest) return;
        setDetailEditForm({
            title: selectedRequest.title || '',
            description: selectedRequest.description || '',
            category: selectedRequest.category || 'general',
            priority: selectedRequest.priority || 'normal',
            department: selectedRequest.department || '',
            contact_info: selectedRequest.contact_info || '',
            notes: selectedRequest.notes || '',
            edit_reason: '',
        });
        setIsEditingDetail(false);
        setShowCancelForm(false);
        setCancelReason('');
    }, [selectedRequest]);

    const filteredRequests = requests.filter(req => {
        const matchSearch =
            req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.tbl_rooms?.room_name?.toLowerCase().includes(searchQuery.toLowerCase());

        const normalizedStatus = normalizeRequestStatus(req.status);
        const matchStatus = (() => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'finished') return isOperationalFinishedRequest(req);
            if (statusFilter === 'approved') return isAcknowledgedRequestStatus(normalizedStatus);
            if (statusFilter === 'acknowledged_info') return isAcknowledgedInformationalRequest(req);
            return normalizedStatus === statusFilter;
        })();
        const matchFinishedVisibility =
            showFinishedRequests
            || statusFilter === 'finished'
            || statusFilter === 'acknowledged_info'
            || !isFinishedRequestStatus(req.status);
        const matchCancelledVisibility =
            showCancelledRequests
            || statusFilter === 'cancelled'
            || !isCancelledRequestStatus(req.status);

        return matchSearch && matchStatus && matchFinishedVisibility && matchCancelledVisibility;
    });

    const acknowledgedInfoRequests = filteredRequests.filter((request) => isAcknowledgedInformationalRequest(request));
    const primaryFilteredRequests = statusFilter === 'acknowledged_info'
        ? []
        : filteredRequests.filter((request) => !isAcknowledgedInformationalRequest(request));
    const hasVisibleRequests = primaryFilteredRequests.length > 0 || acknowledgedInfoRequests.length > 0;

    const canShowAcknowledgeAction = (request: MaintenanceRequestItem) =>
        canAcknowledgeFromGeneralRequest
        && isInformationalRequestCategory(request.category)
        && isPendingRequestStatus(request.status);

    const canEditGeneralRequestDetail =
        canEditGeneralRequest && GENERAL_REQUEST_EDIT_ROLE_SET.has(currentRole);
    const canCancelGeneralRequestDetail =
        Boolean(selectedRequest)
        && canEditGeneralRequestDetail
        && GENERAL_REQUEST_CANCEL_ALLOWED_STATUS_SET.has(normalizeRequestStatus(selectedRequest?.status));
    const canDeleteAcknowledgedGeneralRequestDetail =
        Boolean(selectedRequest)
        && canEditGeneralRequestDetail
        && (selectedRequest ? isAcknowledgedInformationalRequest(selectedRequest) : false);

    const handleAcknowledgeRequest = async (request: MaintenanceRequestItem) => {
        if (!canShowAcknowledgeAction(request)) return;
        setAcknowledgingRequestId(request.request_id);
        try {
            const result = await acknowledgeGeneralRequest(
                request.request_id,
                loggedInReporter || 'System',
            );
            if (result.success) {
                showToast('รับทราบเรื่องเรียบร้อยแล้ว', 'success');
                await loadData();
                if (selectedRequest?.request_id === request.request_id) {
                    setShowDetail(false);
                    setSelectedRequest(null);
                }
            } else {
                showToast(result.error || 'ไม่สามารถรับทราบรายการได้', 'error');
            }
        } catch {
            showToast('เกิดข้อผิดพลาดในการรับทราบรายการ', 'error');
        } finally {
            setAcknowledgingRequestId(null);
        }
    };

    const handleSaveDetail = async () => {
        if (!selectedRequest) return;
        if (!canEditGeneralRequestDetail) {
            showToast('คุณไม่มีสิทธิ์แก้ไขรายการนี้', 'warning');
            return;
        }

        const nextTitle = detailEditForm.title.trim();
        if (!nextTitle) {
            showToast('กรุณาระบุหัวเรื่อง', 'warning');
            return;
        }

        const editReason = detailEditForm.edit_reason.trim();
        if (editReason.length < 8) {
            showToast('กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 8 ตัวอักษร', 'warning');
            return;
        }

        const currentDescription = (selectedRequest.description || '').trim();
        const nextDescription = detailEditForm.description.trim();
        const currentDepartment = (selectedRequest.department || '').trim();
        const nextDepartment = detailEditForm.department.trim();
        const currentContactInfo = (selectedRequest.contact_info || '').trim();
        const nextContactInfo = detailEditForm.contact_info.trim();
        const currentNotes = (selectedRequest.notes || '').trim();
        const nextNotes = detailEditForm.notes.trim();
        const nextCategory = (detailEditForm.category || 'general').trim() || 'general';
        const nextPriority = (detailEditForm.priority || 'normal').trim() || 'normal';

        const updateData = {
            title: nextTitle !== (selectedRequest.title || '').trim() ? nextTitle : undefined,
            description: nextDescription !== currentDescription ? nextDescription : undefined,
            category: nextCategory !== (selectedRequest.category || 'general') ? nextCategory : undefined,
            priority: nextPriority !== (selectedRequest.priority || 'normal') ? nextPriority : undefined,
            department: nextDepartment !== currentDepartment ? nextDepartment : undefined,
            contact_info: nextContactInfo !== currentContactInfo ? nextContactInfo : undefined,
            notes: nextNotes !== currentNotes ? nextNotes : undefined,
            edit_reason: editReason,
        };

        const changedFields = Object.values(updateData).filter((value) => value !== undefined);
        if (changedFields.length <= 1) {
            showToast('ไม่มีข้อมูลที่เปลี่ยนแปลง', 'info');
            return;
        }

        setSavingDetail(true);
        try {
            const result = await updateMaintenanceRequest(
                selectedRequest.request_id,
                updateData,
                loggedInReporter || 'System',
            );

            if (!result.success) {
                showToast(result.error || 'ไม่สามารถบันทึกการแก้ไขได้', 'error');
                return;
            }

            showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
            setShowDetail(false);
            setSelectedRequest(null);
            setShowCancelForm(false);
            setCancelReason('');
            await loadData();
        } catch {
            showToast('เกิดข้อผิดพลาดในการบันทึกการแก้ไข', 'error');
        } finally {
            setSavingDetail(false);
        }
    };

    const handleCancelDetail = async () => {
        if (!selectedRequest) return;
        if (!canCancelGeneralRequestDetail) {
            showToast('คุณไม่มีสิทธิ์ยกเลิกรายการนี้', 'warning');
            return;
        }

        const reason = cancelReason.trim();
        if (reason.length < 8) {
            showToast('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 8 ตัวอักษร', 'warning');
            return;
        }

        setCancellingDetail(true);
        try {
            const result = await updateMaintenanceRequest(
                selectedRequest.request_id,
                {
                    status: 'cancelled',
                    notes: reason,
                    edit_reason: reason,
                },
                loggedInReporter || 'System',
            );

            if (!result.success) {
                showToast(result.error || 'ไม่สามารถยกเลิกรายการได้', 'error');
                return;
            }

            showToast('ยกเลิกรายการเรียบร้อยแล้ว', 'success');
            setShowDetail(false);
            setSelectedRequest(null);
            setShowCancelForm(false);
            setCancelReason('');
            await loadData();
        } catch {
            showToast('เกิดข้อผิดพลาดในการยกเลิกรายการ', 'error');
        } finally {
            setCancellingDetail(false);
        }
    };

    const handleDeleteAcknowledgedDetail = async () => {
        if (!selectedRequest) return;
        if (!canDeleteAcknowledgedGeneralRequestDetail) {
            showToast('คุณไม่มีสิทธิ์ลบรายการนี้', 'warning');
            return;
        }

        const reasonInput = window.prompt('กรุณาระบุเหตุผลการลบรายการนี้ (อย่างน้อย 8 ตัวอักษร)');
        if (reasonInput === null) return;

        const reason = reasonInput.trim();
        if (reason.length < 8) {
            showToast('กรุณาระบุเหตุผลการลบอย่างน้อย 8 ตัวอักษร', 'warning');
            return;
        }

        setDeletingAcknowledgedDetail(true);
        try {
            const result = await deleteAcknowledgedGeneralRequest(
                selectedRequest.request_id,
                reason,
                loggedInReporter || 'System',
            );

            if (!result.success) {
                showToast(result.error || 'ไม่สามารถลบรายการได้', 'error');
                return;
            }

            showToast('ลบรายการรับทราบเรียบร้อยแล้ว', 'success');
            setShowDetail(false);
            setSelectedRequest(null);
            setIsEditingDetail(false);
            setShowCancelForm(false);
            setCancelReason('');
            await loadData();
        } catch {
            showToast('เกิดข้อผิดพลาดในการลบรายการ', 'error');
        } finally {
            setDeletingAcknowledgedDetail(false);
        }
    };

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
        const newTags = formData.tags
            .split(',')
            .filter(t => t.trim() !== tag)
            .join(',');
        setFormData({ ...formData, tags: newTags });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canCreateGeneralRequest) {
            showToast('คุณไม่มีสิทธิ์สร้างรายการแจ้งซ่อม', 'warning');
            return;
        }

        if (!formData.title.trim()) {
            showToast('กรุณาระบุชื่อเรื่อง', 'warning');
            return;
        }

        const reportedBy = loggedInReporter || formData.reported_by.trim();
        if (!reportedBy) {
            showToast('กรุณาระบุชื่อผู้แจ้ง', 'warning');
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
                showToast('กรุณาเลือกสถานที่จากรายการ', 'warning');
                return;
            }
        } else {
            if (!formData.vehicle_id || formData.vehicle_id === 0) {
                showToast('กรุณาเลือกทะเบียนรถจากรายการ', 'warning');
                return;
            }
            if (!derivedRoomIdFromVehicle) {
                showToast('ทะเบียนรถนี้ยังไม่ได้ผูกกับเลขห้อง (owner_room) กรุณาแก้ไขที่หน้า /admin/rooms หรือเลือกสถานที่แทน', 'warning');
                return;
            }
        }

        setSubmitting(true);
        try {
            const roomIdToSend = locationMode === 'vehicle' ? derivedRoomIdFromVehicle : formData.room_id;

            const data = new FormData();
            data.append('room_id', roomIdToSend.toString());
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('category', formData.category);
            data.append('priority', formData.priority);
            data.append('reported_by', reportedBy);
            data.append('contact_info', formData.contact_info);
            data.append('department', formData.department);

            const vehiclePlate = selectedVehicle?.license_plate?.trim() || '';
            const vehicleTag = vehiclePlate ? `รถ:${vehiclePlate}` : '';

            const tagsToSend = (() => {
                const current = formData.tags
                    ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : [];
                if (vehicleTag && !current.some(t => t.toLowerCase() === vehicleTag.toLowerCase())) {
                    current.push(vehicleTag);
                }
                return current.join(',');
            })();

            const priorityToSend = hasCustomerTag(tagsToSend) ? 'urgent' : formData.priority;

            data.append('tags', tagsToSend);
            if (vehiclePlate) {
                data.append('vehicle_id', formData.vehicle_id.toString());
                data.append('vehicle_plate', vehiclePlate);
            }
            data.append('target_role', 'general');
            data.append('request_scope', 'general_only');
            data.set('priority', priorityToSend);

            if (selectedFile) {
                data.append('image_file', selectedFile);
            }

            const result = await createMaintenanceRequest(data);

            if (result.success) {
                setShowForm(false);
                setLocationMode('location');
                setFormData({
                    room_id: 0,
                    vehicle_id: 0,
                    title: '',
                    description: '',
                    category: 'general',
                    priority: 'normal',
                    reported_by: loggedInReporter,
                    contact_info: '',
                    department: '',
                    tags: '',
                    tagInput: '',
                    target_role: 'general',
                });
                setSelectedFile(null);
                void loadData();
                showToast('บันทึกเรียบร้อย ระบบจะแจ้งเตือนฝ่ายธุรการ', 'success');
            } else {
                showToast('เกิดข้อผิดพลาด: ' + result.error, 'error');
            }
        } catch {
            showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: Date | null | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (date: Date | null | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '-';
        return `THB ${numeric.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const selectedRequestImageUrls = parseMaintenanceImageUrls(selectedRequest?.image_url);
    const selectedRequestTags = (selectedRequest?.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    const selectedRequestCategoryLabel = selectedRequest?.category
        ? (GENERAL_REQUEST_CATEGORY_OPTIONS.find((option) => option.value === selectedRequest.category)?.label || selectedRequest.category)
        : '-';
    const selectedRequestLocationMeta = selectedRequest
        ? [
            selectedRequest.tbl_rooms?.building || null,
            selectedRequest.tbl_rooms?.floor ? `Floor ${selectedRequest.tbl_rooms.floor}` : null,
            selectedRequest.tbl_rooms?.zone ? `Zone ${selectedRequest.tbl_rooms.zone}` : null,
        ].filter(Boolean).join(' / ')
        : '';

    const pendingCount = requests.filter((request) => isPendingRequestStatus(request.status)).length;
    const acknowledgedCount = requests.filter((request) => isAcknowledgedRequestStatus(request.status)).length;
    const acknowledgedInfoCount = requests.filter((request) => isAcknowledgedInformationalRequest(request)).length;
    const inProgressCount = requests.filter((request) => isInProgressRequestStatus(request.status)).length;
    const finishedCount = requests.filter((request) => isOperationalFinishedRequest(request)).length;

    const statusSummaryCards = [
        {
            label: 'ทั้งหมด',
            value: requests.length,
            helper: 'รวมทุกสถานะ',
            color: 'bg-blue-50 border-blue-200 text-blue-700',
            filterValue: 'all',
        },
        {
            label: GENERAL_REQUEST_STATUS_CONFIG.pending.label,
            value: pendingCount,
            helper: 'รอฝ่ายธุรการรับเรื่อง',
            color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            filterValue: 'pending',
        },
        {
            label: GENERAL_REQUEST_STATUS_CONFIG.approved.label,
            value: acknowledgedCount,
            helper: 'รับเรื่องไปแล้ว รอมอบหมายงาน',
            color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
            filterValue: 'approved',
        },
       
        {
            label: GENERAL_REQUEST_STATUS_CONFIG.in_progress.label,
            value: inProgressCount,
            helper: 'ช่างกำลังดำเนินการ',
            color: 'bg-blue-50 border-blue-200 text-blue-700',
            filterValue: 'in_progress',
        },
         {
            label: 'รับทราบเรื่องเรียบร้อยแล้ว',
            value: acknowledgedInfoCount,
            helper: 'รับทราบแล้ว (ไม่สร้างใบงานซ่อม)',
            color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            filterValue: 'acknowledged_info',
        },
        {
            label: 'งานเสร็จสิ้น',
            value: finishedCount,
            helper: 'ปิดงานแล้ว',
            color: 'bg-green-50 border-green-200 text-green-700',
            filterValue: 'finished',
        },
    ] as const;

    if (!canViewGeneralRequest) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
                    <p className="text-sm text-gray-500 mt-2">
                        คุณไม่มีสิทธิ์ดูข้อมูลการแจ้งซ่อมในหน้านี้
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <ClipboardList className="w-6 h-6 text-blue-600" />
                                รับแจ้งซ่อม
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                ส่งคำขอซ่อม -
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {canOpenKpiDashboard && (
                                <Link
                                    href="/general-request/dashboard"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Dashboard KPI</span>
                                </Link>
                            )}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${
                                        viewMode === 'grid'
                                            ? 'bg-white shadow-sm text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-md transition-all ${
                                        viewMode === 'table'
                                            ? 'bg-white shadow-sm text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    title="Table View"
                                >
                                    <TableProperties className="w-4 h-4" />
                                </button>
                            </div>

                            {canCreateGeneralRequest && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium border-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">สร้างรายการ</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {statusSummaryCards.map((stat) => {
                        const isActive = statusFilter === stat.filterValue;
                        return (
                            <button
                                key={stat.label}
                                type="button"
                                onClick={() => setStatusFilter(stat.filterValue)}
                                className={`${stat.color} border rounded-xl p-3 text-center transition-all ${
                                    isActive ? 'ring-2 ring-offset-1 ring-blue-300 shadow-sm' : 'hover:shadow-sm'
                                }`}
                                aria-pressed={isActive}
                                title={`กรองสถานะ ${stat.label}`}
                            >
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs font-semibold mt-0.5">{stat.label}</p>
                                <p className="mt-0.5 text-[10px] opacity-80">{stat.helper}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <FloatingSearchInput
                            label="ค้นหา"
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="focus:ring-blue-500/20"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        aria-label="กรองตามสถานะ"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="acknowledged_info">รับทราบเรื่องเรียบร้อยแล้ว</option>
                        <option value="finished">งานเสร็จสิ้น</option>
                        {Object.entries(GENERAL_REQUEST_STATUS_CONFIG).filter(([key]) => key !== 'urgent' && key !== 'approved').map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                        <option value="approved">รับเรื่องแล้ว</option>
                    </select>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={showFinishedRequests}
                        onClick={() => setShowFinishedRequests(prev => !prev)}
                        className="inline-flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                        title="ซ่อนหรือแสดงงานที่เสร็จสิ้น"
                    >
                        <span className="whitespace-nowrap">แสดงงานเสร็จสิ้น</span>
                        <span
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                                showFinishedRequests ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    showFinishedRequests ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                        </span>
                    </button>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={showCancelledRequests}
                        onClick={() => setShowCancelledRequests(prev => !prev)}
                        className="inline-flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                        title="ซ่อนหรือแสดงงานที่ยกเลิก"
                    >
                        <span className="whitespace-nowrap">แสดงงานที่ยกเลิก</span>
                        <span
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                                showCancelledRequests ? 'bg-rose-600' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    showCancelledRequests ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                        </span>
                    </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-yellow-800">
                        รอรับเรื่อง: รอฝ่ายธุรการรับเรื่อง
                    </span>
                    <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800">
                        รับเรื่องแล้ว: ฝ่ายธุรการรับเรื่องแล้ว
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : !hasVisibleRequests ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">ยังไม่มีรายการแจ้งซ่อม / รายการแจ้งซ่อมทั้งหมดได้รับการแก้ไขเรียบร้อยแล้ว</p>
                        
                    </div>
                ) : primaryFilteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-2xl bg-white">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="font-medium">ไม่มีรายการแจ้งซ่อมที่ต้องติดตามในส่วนนี้</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">งาน</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานที่</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ความเร่งด่วน</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {primaryFilteredRequests.map(req => {
                                        const statusCfg = getRequestStatusMeta(req.status);
                                        const statusHint = getStatusHint(req.status);
                                        const priorityCfg = GENERAL_REQUEST_PRIORITY_CONFIG[req.priority] || GENERAL_REQUEST_PRIORITY_CONFIG.normal;
                                        const rowToneClass = isPendingRequestStatus(req.status)
                                            ? 'bg-yellow-50/20'
                                            : isAcknowledgedRequestStatus(req.status)
                                                ? 'bg-cyan-50/20'
                                                : '';

                                        return (
                                            <tr
                                                key={req.request_id}
                                                className={`${rowToneClass} hover:bg-gray-50/80 transition-colors cursor-pointer`}
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setShowDetail(true);
                                                }}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-900">{req.title}</span>
                                                        <span className="text-[10px] font-mono text-gray-400 mt-0.5">{req.request_number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-gray-700 font-medium">
                                                                [{req.tbl_rooms?.room_code}] {req.tbl_rooms?.room_name}
                                                            </span>
                                                            <span className="text-[10px] text-gray-500">
                                                                {[
                                                                    req.tbl_rooms?.zone,
                                                                    req.tbl_rooms?.building,
                                                                    req.tbl_rooms?.floor ? `ชั้น ${req.tbl_rooms.floor}` : null
                                                                ].filter(Boolean).join(' / ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${priorityCfg.color}`}>
                                                        {priorityCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                                                            {statusCfg.label}
                                                        </span>
                                                        {statusHint && (
                                                            <span className="text-[10px] text-gray-500">{statusHint}</span>
                                                        )}
                                                        {hasCustomerTag(req.tags) && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                                                                แจ้งโดยลูกค้า
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setSelectedRequest(req);
                                                            setShowDetail(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {primaryFilteredRequests.map(req => {
                            const statusCfg = getRequestStatusMeta(req.status);
                            const statusHint = getStatusHint(req.status);
                            const priorityCfg = GENERAL_REQUEST_PRIORITY_CONFIG[req.priority] || GENERAL_REQUEST_PRIORITY_CONFIG.normal;
                            const StatusIcon = statusCfg.icon;
                            const statusToneClass = isPendingRequestStatus(req.status)
                                ? 'border-l-4 border-l-yellow-400 bg-yellow-50/30'
                                : isAcknowledgedRequestStatus(req.status)
                                    ? 'border-l-4 border-l-cyan-500 bg-cyan-50/30'
                                    : isInProgressRequestStatus(req.status)
                                        ? 'border-l-4 border-l-blue-500 bg-blue-50/30'
                                        : '';

                            return (
                                <div
                                    key={req.request_id}
                                    className={`bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group ${statusToneClass}`}
                                    onClick={() => {
                                        setSelectedRequest(req);
                                        setShowDetail(true);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <span className="text-[10px] font-mono text-gray-400">{req.request_number}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusCfg.label}
                                                </span>
                                                {statusHint && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                        {statusHint}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityCfg.color}`}>
                                                    {priorityCfg.label}
                                                </span>
                                                {hasCustomerTag(req.tags) && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                                                        แจ้งโดยลูกค้า
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                {req.title}
                                            </h3>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-start gap-1.5 text-[11px] text-gray-500">
                                                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                    <span className="leading-tight">
                                                        [{req.tbl_rooms?.room_code}] {req.tbl_rooms?.room_name}
                                                        <br />
                                                        <span className="text-[10px] text-gray-400">
                                                            {[
                                                                req.tbl_rooms?.zone,
                                                                req.tbl_rooms?.building,
                                                                req.tbl_rooms?.floor ? `ชั้น ${req.tbl_rooms.floor}` : null
                                                            ].filter(Boolean).join(' / ')}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(req.created_at)}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors self-start"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setSelectedRequest(req);
                                                setShowDetail(true);
                                            }}
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

            {acknowledgedInfoRequests.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-emerald-900">รับทราบเรื่องเรียบร้อยแล้ว</h2>
                                <p className="text-sm text-emerald-700 mt-0.5">
                                    แยกรายการแจ้งเพื่อรับทราบออกจากงานแจ้งซ่อม เพื่อให้ติดตามได้ง่ายขึ้น
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-3 py-1 text-sm font-semibold">
                                {acknowledgedInfoRequests.length} รายการ
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {acknowledgedInfoRequests.map((req) => {
                            return (
                                <div
                                    key={`ack-info-${req.request_id}`}
                                    className="bg-white rounded-xl border border-emerald-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer"
                                    onClick={() => {
                                        setSelectedRequest(req);
                                        setShowDetail(true);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-mono text-gray-400">{req.request_number}</p>
                                            <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2">{req.title}</h3>
                                            <p className="mt-2 text-xs text-gray-500">
                                                [{req.tbl_rooms?.room_code}] {req.tbl_rooms?.room_name}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">{formatDate(req.created_at)}</p>
                                        </div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-emerald-100 text-emerald-700 border-emerald-200">
                                            รับทราบแล้ว
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showDetail && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">รายละเอียดคำขอแจ้งซ่อม</h2>
                                <p className="text-sm text-gray-500 mt-1">ตรวจสอบข้อมูลก่อนเริ่มดำเนินงาน</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDetail(false);
                                    setSelectedRequest(null);
                                    setIsEditingDetail(false);
                                    setShowCancelForm(false);
                                    setCancelReason('');
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-gray-600">{selectedRequest.request_number}</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium border ${getRequestStatusMeta(selectedRequest.status).color}`}>
                                    {getRequestStatusMeta(selectedRequest.status).label}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${GENERAL_REQUEST_PRIORITY_CONFIG[selectedRequest.priority]?.color}`}>
                                    {GENERAL_REQUEST_PRIORITY_CONFIG[selectedRequest.priority]?.label}
                                </span>
                                {hasCustomerTag(selectedRequest.tags) && (
                                    <span className="px-2.5 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700 border border-pink-200">
                                        แจ้งโดยลูกค้า
                                    </span>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                                {isEditingDetail ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                หัวเรื่อง <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={detailEditForm.title}
                                                onChange={(event) => setDetailEditForm((prev) => ({ ...prev, title: event.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด</label>
                                            <textarea
                                                value={detailEditForm.description}
                                                onChange={(event) => setDetailEditForm((prev) => ({ ...prev, description: event.target.value }))}
                                                rows={4}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedRequest.title}</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed mt-2 whitespace-pre-line">
                                            {selectedRequest.description?.trim() || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">สถานที่</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {selectedRequest.tbl_rooms?.room_code || '-'} - {selectedRequest.tbl_rooms?.room_name || '-'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{selectedRequestLocationMeta || '-'}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">หมวดหมู่ / แผนก</p>
                                    {isEditingDetail ? (
                                        <div className="space-y-2">
                                            <select
                                                value={detailEditForm.category}
                                                onChange={(event) => setDetailEditForm((prev) => ({ ...prev, category: event.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {GENERAL_REQUEST_CATEGORY_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={detailEditForm.priority}
                                                onChange={(event) => setDetailEditForm((prev) => ({ ...prev, priority: event.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {GENERAL_REQUEST_PRIORITY_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={detailEditForm.department}
                                                onChange={(event) => setDetailEditForm((prev) => ({ ...prev, department: event.target.value }))}
                                                placeholder="ระบุแผนก (ถ้ามี)"
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-semibold text-gray-900">{selectedRequestCategoryLabel}</p>
                                            <p className="text-xs text-gray-500 mt-1">{selectedRequest.department || '-'}</p>
                                        </>
                                    )}
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">ผู้แจ้ง</p>
                                    <p className="text-sm font-semibold text-gray-900">{selectedRequest.reported_by || '-'}</p>
                                    {isEditingDetail ? (
                                        <input
                                            type="text"
                                            value={detailEditForm.contact_info}
                                            onChange={(event) => setDetailEditForm((prev) => ({ ...prev, contact_info: event.target.value }))}
                                            placeholder="เบอร์โทร / อีเมล / ไลน์"
                                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-xs text-gray-500 mt-1">{selectedRequest.contact_info || '-'}</p>
                                    )}
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">ผู้รับผิดชอบ</p>
                                    <p className="text-sm font-semibold text-gray-900">{selectedRequest.assigned_to || '-'}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">เวลาแจ้ง</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(selectedRequest.created_at)}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">วันที่นัดหมาย</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(selectedRequest.scheduled_date)}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">วันที่เสร็จงาน</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDateTime(selectedRequest.completed_at)}</p>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">ค่าใช้จ่าย (ประมาณการ / จริง)</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(selectedRequest.estimated_cost)} / {formatCurrency(selectedRequest.actual_cost)}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 p-4">
                                <p className="text-xs text-gray-500 mb-1">บันทึกช่าง / หมายเหตุ</p>
                                {isEditingDetail ? (
                                    <textarea
                                        value={detailEditForm.notes}
                                        onChange={(event) => setDetailEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                                        rows={4}
                                        placeholder="เพิ่มหมายเหตุ (ถ้ามี)"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-800 whitespace-pre-line">{selectedRequest.notes?.trim() || '-'}</p>
                                )}
                            </div>

                            {isEditingDetail && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <label className="block text-xs font-medium text-amber-800 mb-1">
                                        เหตุผลการแก้ไข <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={detailEditForm.edit_reason}
                                        onChange={(event) => setDetailEditForm((prev) => ({ ...prev, edit_reason: event.target.value }))}
                                        rows={3}
                                        placeholder="ระบุเหตุผลการแก้ไขอย่างน้อย 8 ตัวอักษร"
                                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                    />
                                </div>
                            )}

                            <div className="rounded-xl border border-gray-200 p-4">
                                <p className="text-xs text-gray-500 mb-2">แท็ก</p>
                                {selectedRequestTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRequestTags.map((tag) => (
                                            <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-100 text-blue-700">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">-</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 p-4">
                                <p className="text-xs text-gray-500 mb-2">รูปภาพประกอบ</p>
                                {selectedRequestImageUrls.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {selectedRequestImageUrls.map((src, idx) => {
                                            const resolvedSrc = resolveMaintenanceImageProxyUrl(src);
                                            return (
                                                <a
                                                    key={`${src}-${idx}`}
                                                    href={resolvedSrc}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={resolvedSrc}
                                                        alt={`maintenance-${idx + 1}`}
                                                        className="w-full h-32 object-cover transition-transform group-hover:scale-[1.02]"
                                                        onError={(event) => {
                                                            const target = event.currentTarget;
                                                            if (target.dataset.fallbackApplied === '1') return;
                                                            target.dataset.fallbackApplied = '1';
                                                            target.src = resolveMaintenanceImageProxyUrl(src);
                                                        }}
                                                    />
                                                </a>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">ไม่มีรูปภาพแนบ</p>
                                )}
                            </div>
                        </div>

                        {showCancelForm && canCancelGeneralRequestDetail && !isEditingDetail && (
                            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                <label className="block text-xs font-medium text-rose-800 mb-1">
                                    เหตุผลการยกเลิก <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(event) => setCancelReason(event.target.value)}
                                    rows={3}
                                    placeholder="ระบุเหตุผลการยกเลิกอย่างน้อย 8 ตัวอักษร"
                                    className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                                />
                                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCancelDetail}
                                        disabled={cancellingDetail}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
                                    >
                                        {cancellingDetail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        ยืนยันยกเลิกรายการ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCancelForm(false);
                                            setCancelReason('');
                                        }}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        ปิดส่วนยกเลิก
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t">
    <div className="flex flex-col sm:flex-row gap-2">
        {canEditGeneralRequestDetail && !isEditingDetail && !showCancelForm && (
            <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                onClick={() => {
                    setIsEditingDetail(true);
                    setShowCancelForm(false);
                    setCancelReason('');
                }}
            >
                แก้ไขรายการ
            </button>
        )}
        {isEditingDetail && (
            <>
                <button
                    type="button"
                    onClick={handleSaveDetail}
                    disabled={savingDetail}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                    {savingDetail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    บันทึกการแก้ไข
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsEditingDetail(false);
                        setDetailEditForm({
                            title: selectedRequest.title || '',
                            description: selectedRequest.description || '',
                            category: selectedRequest.category || 'general',
                            priority: selectedRequest.priority || 'normal',
                            department: selectedRequest.department || '',
                            contact_info: selectedRequest.contact_info || '',
                            notes: selectedRequest.notes || '',
                            edit_reason: '',
                        });
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    ยกเลิกการแก้ไข
                </button>
            </>
        )}
        {canCancelGeneralRequestDetail && !isEditingDetail && (
            <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                onClick={() => {
                    setShowCancelForm((prev) => !prev);
                    if (showCancelForm) setCancelReason('');
                }}
            >
                ยกเลิกรายการ
            </button>
        )}
        {canDeleteAcknowledgedGeneralRequestDetail && !isEditingDetail && !showCancelForm && (
            <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60"
                onClick={handleDeleteAcknowledgedDetail}
                disabled={deletingAcknowledgedDetail}
            >
                {deletingAcknowledgedDetail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ลบรายการ
            </button>
        )}
        {canShowAcknowledgeAction(selectedRequest) && !isEditingDetail && !showCancelForm && (
            <button
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                onClick={async () => {
                    await handleAcknowledgeRequest(selectedRequest);
                }}
                disabled={acknowledgingRequestId === selectedRequest.request_id}
            >
                {acknowledgingRequestId === selectedRequest.request_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <CheckCircle2 className="w-4 h-4" />
                )}
                รับทราบเรื่องเรียบร้อยแล้ว
            </button>
        )}
        <button
            onClick={() => {
                setShowDetail(false);
                setSelectedRequest(null);
                setIsEditingDetail(false);
                setShowCancelForm(false);
                setCancelReason('');
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
        >
            ปิด
        </button>
    </div>
</div>
                    </div>
                </div>
            )}
            {showForm && canCreateGeneralRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
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
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">เลือกอย่างใดอย่างหนึ่ง</label>
                                <div className="grid grid-cols-2 gap-2">
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
                                        className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${locationMode === 'location' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
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
                                                return { ...prev, room_id: 0, vehicle_id: 0, tags: nextTags.join(',') };
                                            });
                                        }}
                                        className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${locationMode === 'vehicle' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        ทะเบียนรถ
                                    </button>
                                </div>
                            </div>

                            {locationMode === 'location' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                        สถานที่ <span className="text-red-500">*</span>
                                    </label>
                                    <HierarchicalRoomSelector
                                        rooms={rooms}
                                        value={formData.room_id}
                                        onChange={(roomId) => setFormData(prev => ({ ...prev, room_id: roomId }))}
                                        placeholder="เลือกสถานที่..."
                                        closeDelayMs={120}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                        ทะเบียนรถ <span className="text-red-500">*</span>
                                    </label>
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
                                            return <p className="text-xs text-amber-600 mt-2">ทะเบียนรถนี้ยังไม่ได้ระบุเลขห้อง (owner_room) ในระบบ</p>;
                                        }
                                        const matchedRoom = rooms.find(r => r.room_code.trim().toLowerCase() === ownerRoom.toLowerCase());
                                        if (!matchedRoom) {
                                            return <p className="text-xs text-amber-600 mt-2">ไม่พบห้องรหัส "{ownerRoom}" ที่ผูกกับทะเบียนรถนี้ (แก้ไขได้ที่หน้า /admin/rooms)</p>;
                                        }
                                        return <p className="text-xs text-gray-500 mt-2">ระบบจะใช้สถานที่อัตโนมัติ: {matchedRoom.room_code} - {matchedRoom.room_name}</p>;
                                    })()}
                                </div>
                            )}

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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">ประเภท</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        aria-label="เลือกประเภทงาน"
                                    >
                                        {GENERAL_REQUEST_CATEGORY_OPTIONS.map(opt => (
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
                                        {GENERAL_REQUEST_PRIORITY_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                        ชื่อผู้แจ้ง <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.reported_by}
                                        readOnly
                                        className="w-full border border-gray-200 bg-gray-100 text-gray-700 rounded-lg px-4 py-2.5 outline-none cursor-not-allowed"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500">ระบบดึงชื่อจากบัญชีที่ล็อกอินอัตโนมัติ</p>
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

                            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">ระบบจะแจ้งเตือนฝ่ายธุรการผ่านหน้าเว็บแทน LINE</p>
                                    <p className="text-blue-600 mt-0.5">เมื่อบันทึกสำเร็จ ผู้ใช้ role general จะได้รับการแจ้งเตือนพร้อมเสียงบนเว็บ</p>
                                </div>
                            </div>

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
