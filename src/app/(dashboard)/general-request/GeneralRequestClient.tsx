'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import {
    Search, Plus, CheckCircle2, Clock, AlertCircle, XCircle,
    Eye, Calendar, MapPin, ShieldCheck, Loader2,
    X, ClipboardList, LayoutGrid, TableProperties
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import HierarchicalRoomSelector from '@/components/HierarchicalRoomSelector';
import VehicleLicensePlateSelector from '@/components/VehicleLicensePlateSelector';
import {
    getMaintenanceRequests,
    createMaintenanceRequest,
    getRooms
} from '@/actions/maintenanceActions';
import { getAllVehicles } from '@/actions/vehicleActions';
import { resolveGeneralRequestAccess } from '@/lib/rbac';
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
        .includes('เธฅเธนเธเธเนเธฒ');

export default function GeneralRequestClient({ userPermissions }: Props) {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const reqQueryParam = searchParams.get('req');

    const currentUser = session?.user as SessionUserLike | undefined;
    const currentRole = (currentUser?.role || '').toLowerCase();

    const access = useMemo(
        () => resolveGeneralRequestAccess(currentRole, userPermissions),
        [currentRole, userPermissions]
    );

    const canViewGeneralRequest = access.canViewPage;
    const canCreateGeneralRequest = access.canCreate;
    const canEditGeneralRequest = access.canEditPage;
    const canApproveGeneralRequest = access.canApprove;
    const canDeleteGeneralRequest = access.canDelete;
    // Data
    const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestItem | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);
    const [locationMode, setLocationMode] = useState<'location' | 'vehicle'>('location');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
                getMaintenanceRequests(),
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
            showToast('เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ', 'error');
        } finally {
            setLoading(false);
        }
    }, [canViewGeneralRequest, showToast]);

    useEffect(() => {
        void loadData();

        if (currentUser) {
            const user = currentUser;
            setFormData(f => ({ ...f, reported_by: user.name || user.email || '' }));
        }
    }, [currentUser, loadData]);

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

    const filteredRequests = requests.filter(req => {
        const matchSearch =
            req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.tbl_rooms?.room_name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchStatus = statusFilter === 'all'
            || (statusFilter === 'finished' ? ['completed', 'verified'].includes(req.status) : req.status === statusFilter);
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
        const newTags = formData.tags
            .split(',')
            .filter(t => t.trim() !== tag)
            .join(',');
        setFormData({ ...formData, tags: newTags });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canCreateGeneralRequest) {
            showToast('เธเธธเธ“เนเธกเนเธกเธตเธชเธดเธ—เธเธดเนเธชเธฃเนเธฒเธเธฃเธฒเธขเธเธฒเธฃเนเธเนเธเธเนเธญเธก', 'warning');
            return;
        }

        if (!formData.title.trim()) {
            showToast('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธทเนเธญเน€เธฃเธทเนเธญเธ', 'warning');
            return;
        }

        if (!formData.reported_by.trim()) {
            showToast('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธทเนเธญเธเธนเนเนเธเนเธ', 'warning');
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
                showToast('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธชเธ–เธฒเธเธ—เธตเนเธเธฒเธเธฃเธฒเธขเธเธฒเธฃ', 'warning');
                return;
            }
        } else {
            if (!formData.vehicle_id || formData.vehicle_id === 0) {
                showToast('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธ—เธฐเน€เธเธตเธขเธเธฃเธ–เธเธฒเธเธฃเธฒเธขเธเธฒเธฃ', 'warning');
                return;
            }
            if (!derivedRoomIdFromVehicle) {
                showToast('เธ—เธฐเน€เธเธตเธขเธเธฃเธ–เธเธตเนเธขเธฑเธเนเธกเนเนเธ”เนเธเธนเธเธเธฑเธเน€เธฅเธเธซเนเธญเธ (owner_room) เธเธฃเธธเธ“เธฒเนเธเนเนเธเธ—เธตเนเธซเธเนเธฒ /admin/rooms เธซเธฃเธทเธญเน€เธฅเธทเธญเธเธชเธ–เธฒเธเธ—เธตเนเนเธ—เธ', 'warning');
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
            data.append('reported_by', formData.reported_by);
            data.append('contact_info', formData.contact_info);
            data.append('department', formData.department);

            const vehiclePlate = selectedVehicle?.license_plate?.trim() || '';
            const vehicleTag = vehiclePlate ? `เธฃเธ–:${vehiclePlate}` : '';

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
                    reported_by: currentUser?.name || '',
                    contact_info: '',
                    department: '',
                    tags: '',
                    tagInput: '',
                    target_role: 'general',
                });
                setSelectedFile(null);
                void loadData();
                showToast('เธเธฑเธเธ—เธถเธเน€เธฃเธตเธขเธเธฃเนเธญเธข เธฃเธฐเธเธเธเธฐเนเธเนเธเน€เธ•เธทเธญเธเธเนเธฒเธขเธเธธเธฃเธเธฒเธฃ', 'success');
            } else {
                showToast('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”: ' + result.error, 'error');
            }
        } catch {
            showToast('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธเธฑเธเธ—เธถเธ', 'error');
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

    if (!canViewGeneralRequest) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-900">เนเธกเนเธกเธตเธชเธดเธ—เธเธดเนเน€เธเนเธฒเธ–เธถเธเธซเธเนเธฒเธเธตเน</h2>
                    <p className="text-sm text-gray-500 mt-2">
                        เธเธธเธ“เนเธกเนเธกเธตเธชเธดเธ—เธเธดเนเธ”เธนเธเนเธญเธกเธนเธฅเธเธฒเธฃเนเธเนเธเธเนเธญเธกเนเธเธซเธเนเธฒเธเธตเน
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
                                เธฃเธฑเธเนเธเนเธเธเนเธญเธก (เธเธธเธฃเธเธฒเธฃ)
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                เธชเนเธเธเธณเธเธญเธเนเธญเธก โ€” เธฃเธฐเธเธเธเธฐเนเธเนเธเน€เธ•เธทเธญเธเธเนเธฒเธขเธเธธเธฃเธเธฒเธฃเนเธ”เธขเธ•เธฃเธ
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
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
                                    <span className="hidden sm:inline">Create</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'เธ—เธฑเนเธเธซเธกเธ”', value: requests.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'เธฃเธญเธฃเธฑเธเน€เธฃเธทเนเธญเธ', value: requests.filter(r => r.status === 'pending').length, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                        { label: 'เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ', value: requests.filter(r => r.status === 'in_progress').length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                        { label: 'เน€เธชเธฃเนเธเธชเธดเนเธ', value: requests.filter(r => r.status === 'completed' || r.status === 'verified').length, color: 'bg-green-50 border-green-200 text-green-700' },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.color} border rounded-xl p-3 text-center`}>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs font-medium mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="เธเนเธเธซเธฒ..."
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        aria-label="เธเธฃเธญเธเธ•เธฒเธกเธชเธ–เธฒเธเธฐ"
                    >
                        <option value="all">เธ—เธธเธเธชเธ–เธฒเธเธฐ</option>
                        <option value="finished">งานเสร็จสิ้น</option>
                        {Object.entries(GENERAL_REQUEST_STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเนเธเนเธเธเนเธญเธก</p>
                        <p className="text-sm mt-1">เธเธ”เธเธธเนเธก "Create" เน€เธเธทเนเธญเธชเธฃเนเธฒเธเธฃเธฒเธขเธเธฒเธฃเนเธซเธกเน</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">เนเธเธเธฒเธ</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">เธชเธ–เธฒเธเธ—เธตเน</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">เธเธงเธฒเธกเน€เธฃเนเธเธ”เนเธงเธ</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">เธชเธ–เธฒเธเธฐ</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">เธเธฒเธฃเธเธฑเธ”เธเธฒเธฃ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRequests.map(req => {
                                        const statusCfg = GENERAL_REQUEST_STATUS_CONFIG[req.status] || GENERAL_REQUEST_STATUS_CONFIG.pending;
                                        const priorityCfg = GENERAL_REQUEST_PRIORITY_CONFIG[req.priority] || GENERAL_REQUEST_PRIORITY_CONFIG.normal;

                                        return (
                                            <tr
                                                key={req.request_id}
                                                className="hover:bg-gray-50/80 transition-colors cursor-pointer"
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
                                                                    req.tbl_rooms?.floor ? `เธเธฑเนเธ ${req.tbl_rooms.floor}` : null
                                                                ].filter(Boolean).join(' โ€ข ')}
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
                                                        {req.tags?.includes('เธฅเธนเธเธเนเธฒ') && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                                                                เนเธเนเธเนเธ”เธขเธฅเธนเธเธเนเธฒ
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
                        {filteredRequests.map(req => {
                            const statusCfg = GENERAL_REQUEST_STATUS_CONFIG[req.status] || GENERAL_REQUEST_STATUS_CONFIG.pending;
                            const priorityCfg = GENERAL_REQUEST_PRIORITY_CONFIG[req.priority] || GENERAL_REQUEST_PRIORITY_CONFIG.normal;
                            const StatusIcon = statusCfg.icon;

                            return (
                                <div
                                    key={req.request_id}
                                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
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
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityCfg.color}`}>
                                                    {priorityCfg.label}
                                                </span>
                                                {req.tags?.includes('เธฅเธนเธเธเนเธฒ') && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                                                        เนเธเนเธเนเธ”เธขเธฅเธนเธเธเนเธฒ
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
                                                                req.tbl_rooms?.floor ? `เธเธฑเนเธ ${req.tbl_rooms.floor}` : null
                                                            ].filter(Boolean).join(' โ€ข ')}
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

            {showDetail && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธณเธเธญ</h2>
                            <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-gray-500">{selectedRequest.request_number}</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium border ${GENERAL_REQUEST_STATUS_CONFIG[selectedRequest.status]?.color}`}>
                                    {GENERAL_REQUEST_STATUS_CONFIG[selectedRequest.status]?.label}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${GENERAL_REQUEST_PRIORITY_CONFIG[selectedRequest.priority]?.color}`}>
                                    {GENERAL_REQUEST_PRIORITY_CONFIG[selectedRequest.priority]?.label}
                                </span>
                                {selectedRequest.tags?.includes('เธฅเธนเธเธเนเธฒ') && (
                                    <span className="px-2.5 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700 border border-pink-200">
                                        เนเธเนเธเนเธ”เธขเธฅเธนเธเธเนเธฒ
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900">{selectedRequest.title}</h3>

                            {selectedRequest.description && (
                                <p className="text-gray-600 text-sm leading-relaxed">{selectedRequest.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">เธชเธ–เธฒเธเธ—เธตเน</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {selectedRequest.tbl_rooms?.room_code} โ€” {selectedRequest.tbl_rooms?.room_name}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">เธเธนเนเนเธเนเธ</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedRequest.reported_by}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 mb-1">เธงเธฑเธเธ—เธตเนเนเธเนเธ</p>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                                </div>
                                {selectedRequest.assigned_to && (
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-1">เธเธนเนเธฃเธฑเธเธเธดเธ”เธเธญเธ</p>
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
                                เธเธดเธ”
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && canCreateGeneralRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">เนเธเนเธเธเนเธญเธก (เธชเนเธเธ–เธถเธเธเธธเธฃเธเธฒเธฃ)</h2>
                                <p className="text-xs text-gray-500 mt-0.5">เธฃเธฐเธเธเธเธฐเนเธเนเธเน€เธ•เธทเธญเธเนเธเธขเธฑเธเธเนเธฒเธขเธเธธเธฃเธเธฒเธฃเนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">เน€เธฅเธทเธญเธเธญเธขเนเธฒเธเนเธ”เธญเธขเนเธฒเธเธซเธเธถเนเธ</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocationMode('location');
                                            setFormData(prev => {
                                                const currentTags = prev.tags ? prev.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                                const nextTags = currentTags.filter(t => !t.toLowerCase().startsWith('เธฃเธ–:'));
                                                return { ...prev, vehicle_id: 0, tags: nextTags.join(',') };
                                            });
                                        }}
                                        className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${locationMode === 'location' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        เธชเธ–เธฒเธเธ—เธตเน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocationMode('vehicle');
                                            setFormData(prev => {
                                                const currentTags = prev.tags ? prev.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                                const nextTags = currentTags.filter(t => !t.toLowerCase().startsWith('เธฃเธ–:'));
                                                return { ...prev, room_id: 0, vehicle_id: 0, tags: nextTags.join(',') };
                                            });
                                        }}
                                        className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${locationMode === 'vehicle' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        เธ—เธฐเน€เธเธตเธขเธเธฃเธ–
                                    </button>
                                </div>
                            </div>

                            {locationMode === 'location' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                        เธชเธ–เธฒเธเธ—เธตเน <span className="text-red-500">*</span>
                                    </label>
                                    <HierarchicalRoomSelector
                                        rooms={rooms}
                                        value={formData.room_id}
                                        onChange={(roomId) => setFormData(prev => ({ ...prev, room_id: roomId }))}
                                        closeDelayMs={2500}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                        เธ—เธฐเน€เธเธตเธขเธเธฃเธ– <span className="text-red-500">*</span>
                                    </label>
                                    <VehicleLicensePlateSelector
                                        vehicles={vehicles}
                                        value={formData.vehicle_id}
                                        onChange={(vehicleId) => {
                                            const selected = vehicleId ? vehicles.find(v => v.vehicle_id === vehicleId) : null;
                                            const plate = selected?.license_plate?.trim() || '';
                                            const vehicleTag = plate ? `เธฃเธ–:${plate}` : '';
                                            setFormData(prev => {
                                                const currentTags = prev.tags ? prev.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                                const nextTags = currentTags.filter(t => !t.toLowerCase().startsWith('เธฃเธ–:'));
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
                                            return <p className="text-xs text-amber-600 mt-2">เธ—เธฐเน€เธเธตเธขเธเธฃเธ–เธเธตเนเธขเธฑเธเนเธกเนเธฃเธฐเธเธธเน€เธฅเธเธซเนเธญเธ (owner_room) เนเธเธฃเธฐเธเธ</p>;
                                        }
                                        const matchedRoom = rooms.find(r => r.room_code.trim().toLowerCase() === ownerRoom.toLowerCase());
                                        if (!matchedRoom) {
                                            return <p className="text-xs text-amber-600 mt-2">เนเธกเนเธเธเธซเนเธญเธเธฃเธซเธฑเธช "{ownerRoom}" เธ—เธตเนเธเธนเธเธเธฑเธเธ—เธฐเน€เธเธตเธขเธเธฃเธ–เธเธตเน (เนเธเนเนเธเนเธ”เนเธ—เธตเนเธซเธเนเธฒ /admin/rooms)</p>;
                                        }
                                        return <p className="text-xs text-gray-500 mt-2">เธฃเธฐเธเธเธเธฐเนเธเนเธชเธ–เธฒเธเธ—เธตเนเธญเธฑเธ•เนเธเธกเธฑเธ•เธด: {matchedRoom.room_code} โ€” {matchedRoom.room_name}</p>;
                                    })()}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                    เธซเธฑเธงเน€เธฃเธทเนเธญเธ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="เธฃเธฐเธเธธเธเธฑเธเธซเธฒเนเธ”เธขเธขเนเธญ..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="เธญเธเธดเธเธฒเธขเธเธฑเธเธซเธฒเน€เธเธดเนเธกเน€เธ•เธดเธก..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">เธเธฃเธฐเน€เธ เธ—</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        aria-label="เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธเธฒเธ"
                                    >
                                        {GENERAL_REQUEST_CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">เธเธงเธฒเธกเน€เธฃเนเธเธ”เนเธงเธ</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        aria-label="เน€เธฅเธทเธญเธเธเธงเธฒเธกเน€เธฃเนเธเธ”เนเธงเธ"
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
                                        เธเธทเนเธญเธเธนเนเนเธเนเธ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.reported_by}
                                        onChange={e => setFormData({ ...formData, reported_by: e.target.value })}
                                        placeholder="เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">เน€เธเธญเธฃเนเธ•เธดเธ”เธ•เนเธญ</label>
                                    <input
                                        type="text"
                                        value={formData.contact_info}
                                        onChange={e => setFormData({ ...formData, contact_info: e.target.value })}
                                        placeholder="เน€เธเธญเธฃเนเนเธ—เธฃ / เนเธฅเธเน"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">เนเธเธเธ / เธเนเธฒเธข</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    placeholder="เธฃเธฐเธเธธเนเธเธเธ (เธ–เนเธฒเธกเธต)"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">เนเธ—เนเธ</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={formData.tagInput}
                                        onChange={e => setFormData({ ...formData, tagInput: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="เน€เธเธดเนเธกเนเธ—เนเธ..."
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button type="button" onClick={handleAddTag} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                                        เน€เธเธดเนเธก
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
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">เนเธเธเธฃเธนเธเธ เธฒเธ (เธ–เนเธฒเธกเธต)</label>
                                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                    <div className="pointer-events-none">
                                        {selectedFile ? (
                                            <p className="text-green-600 font-medium text-sm">
                                                <CheckCircle2 className="w-5 h-5 inline mr-1.5" />
                                                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                <span className="text-blue-600 font-medium">เธเธฅเธดเธเน€เธเธทเนเธญเน€เธฅเธทเธญเธเธฃเธนเธเธ เธฒเธ</span> เธซเธฃเธทเธญเธฅเธฒเธเธกเธฒเธงเธฒเธเธ—เธตเนเธเธตเน
                                            </p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*,.pdf"
                                        title="เน€เธฅเธทเธญเธเนเธเธฅเนเนเธเธ"
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">เธฃเธฐเธเธเธเธฐเนเธเนเธเน€เธ•เธทเธญเธเธเนเธฒเธขเธเธธเธฃเธเธฒเธฃเธเนเธฒเธเธซเธเนเธฒเน€เธงเนเธเนเธ—เธ LINE</p>
                                    <p className="text-blue-600 mt-0.5">เน€เธกเธทเนเธญเธเธฑเธเธ—เธถเธเธชเธณเน€เธฃเนเธ เธเธนเนเนเธเน role general เธเธฐเนเธ”เนเธฃเธฑเธเธเธฒเธฃเนเธเนเธเน€เธ•เธทเธญเธเธเธฃเนเธญเธกเน€เธชเธตเธขเธเธเธเน€เธงเนเธ</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    เธขเธเน€เธฅเธดเธ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                                    {submitting ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : 'เธชเนเธเธเธณเธเธญ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
