'use client';

import { useState, useEffect } from 'react';
import { Building, ChevronDown, ChevronRight, Clock, Wrench, CheckCircle, Search, Filter, X } from 'lucide-react';
import { getMaintenanceReportByRoom, getAllRooms, getProducts } from '@/actions/maintenanceActions';
import { getActiveTechnicians } from '@/actions/technicianActions';

interface RoomReport {
    room_id: number;
    room_code: string;
    room_name: string;
    building: string | null;
    floor: string | null;
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    requests: Array<{
        request_id: number;
        request_number: string;
        title: string;
        status: string;
        priority: string;
        created_at: Date;
        assigned_to: string | null;
        parts: Array<{
            part_id: number;
            p_name: string;
            quantity: number;
            unit: string | null;
            status: string;
        }>;
    }>;
}

interface FilterState {
    roomId: string;
    technician: string;
    partId: string;
    startDate: string;
    endDate: string;
}

export default function MaintenanceReportClient() {
    const [report, setReport] = useState<RoomReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());

    // Filter States
    const [filters, setFilters] = useState<FilterState>({
        roomId: '',
        technician: '',
        partId: '',
        startDate: '',
        endDate: ''
    });

    // Options for dropdowns
    const [rooms, setRooms] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    async function loadData() {
        setLoading(true);
        try {
            // Load options in parallel
            const [roomsRes, techsRes, productsRes] = await Promise.all([
                getAllRooms(),
                getActiveTechnicians(),
                getProducts()
            ]);

            if (roomsRes.success) setRooms(roomsRes.data || []);
            if (techsRes.success) setTechnicians(techsRes.data || []);
            if (productsRes.success) setProducts(productsRes.data || []);

            // Initial report load
            await loadReport(filters);
        } catch (error) {
            console.error("Failed to load initial data", error);
        }
        setLoading(false);
    }

    async function loadReport(currentFilters: FilterState) {
        setLoading(true);
        const apiFilters: any = {};

        if (currentFilters.roomId) apiFilters.roomId = parseInt(currentFilters.roomId);
        if (currentFilters.technician) apiFilters.technician = currentFilters.technician;
        if (currentFilters.partId) apiFilters.partId = currentFilters.partId;
        if (currentFilters.startDate) apiFilters.startDate = new Date(currentFilters.startDate);
        if (currentFilters.endDate) apiFilters.endDate = new Date(currentFilters.endDate);

        const result = await getMaintenanceReportByRoom(apiFilters);
        if (result.success) {
            setReport(result.data as RoomReport[]);
            // If filtering, expand all rooms that have data for better visibility
            if (currentFilters.roomId || currentFilters.technician || currentFilters.partId || currentFilters.startDate) {
                const allRoomIds = new Set((result.data as RoomReport[]).map(r => r.room_id));
                setExpandedRooms(allRoomIds);
            }
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounce filter changes
    useEffect(() => {
        const timer = setTimeout(() => {
            loadReport(filters);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    function handleFilterChange(key: keyof FilterState, value: string) {
        setFilters(prev => ({ ...prev, [key]: value }));
    }

    function clearFilters() {
        setFilters({
            roomId: '',
            technician: '',
            partId: '',
            startDate: '',
            endDate: ''
        });
    }

    function toggleRoom(roomId: number) {
        const newSet = new Set(expandedRooms);
        if (newSet.has(roomId)) {
            newSet.delete(roomId);
        } else {
            newSet.add(roomId);
        }
        setExpandedRooms(newSet);
    }

    // Calculate totals
    const totals = report.reduce((acc, room) => ({
        total: acc.total + room.total,
        pending: acc.pending + room.pending,
        in_progress: acc.in_progress + room.in_progress,
        completed: acc.completed + room.completed
    }), { total: 0, pending: 0, in_progress: 0, completed: 0 });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายงานแจ้งซ่อมแยกตามห้อง</h1>
                <p className="text-gray-600 dark:text-gray-400">สรุปสถานะการแจ้งซ่อมของแต่ละห้อง</p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <Filter size={20} />
                    <span className="font-medium">ตัวกรองข้อมูล</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Room Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ห้อง
                        </label>
                        <select
                            className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            value={filters.roomId}
                            onChange={e => handleFilterChange('roomId', e.target.value)}
                        >
                            <option value="">ทั้งหมด</option>
                            {rooms.map(room => (
                                <option key={room.room_id} value={room.room_id}>
                                    {room.room_code} - {room.room_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Technician Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ช่างผู้รับผิดชอบ
                        </label>
                        <select
                            className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            value={filters.technician}
                            onChange={e => handleFilterChange('technician', e.target.value)}
                        >
                            <option value="">ทั้งหมด</option>
                            {technicians.map(tech => (
                                <option key={tech.tech_id} value={tech.name}>
                                    {tech.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Part Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            อะไหล่ที่ใช้
                        </label>
                        <select
                            className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            value={filters.partId}
                            onChange={e => handleFilterChange('partId', e.target.value)}
                        >
                            <option value="">ทั้งหมด</option>
                            {products.map(p => (
                                <option key={p.p_id} value={p.p_id}>
                                    {p.p_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ตั้งแต่วันที่
                        </label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            value={filters.startDate}
                            onChange={e => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ถึงวันที่
                        </label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            value={filters.endDate}
                            onChange={e => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-end">
                        <button
                            onClick={clearFilters}
                            className="w-full py-2 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <X size={18} />
                            ล้างตัวกรอง
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                            <Building size={24} className="text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{report.length}</div>
                            <div className="text-gray-600 dark:text-gray-400 text-sm">ห้องทั้งหมด</div>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock size={24} className="text-yellow-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-yellow-600">{totals.pending}</div>
                            <div className="text-yellow-600 text-sm">รอดำเนินการ</div>
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Wrench size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{totals.in_progress}</div>
                            <div className="text-blue-600 text-sm">กำลังซ่อม</div>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">{totals.completed}</div>
                            <div className="text-green-600 text-sm">เสร็จแล้ว</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : report.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">ไม่พบข้อมูลห้อง</div>
                ) : (
                    <div className="divide-y dark:divide-slate-700">
                        {report.map(room => {
                            const isExpanded = expandedRooms.has(room.room_id);
                            const hasRequests = room.total > 0;

                            return (
                                <div key={room.room_id}>
                                    {/* Room Header */}
                                    <div
                                        className={`p-4 flex items-center justify-between ${hasRequests ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50' : ''}`}
                                        onClick={() => hasRequests && toggleRoom(room.room_id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {hasRequests ? (
                                                isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />
                                            ) : (
                                                <div className="w-5" />
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {room.room_code} - {room.room_name}
                                                </div>
                                                {(room.building || room.floor) && (
                                                    <div className="text-sm text-gray-500">
                                                        {room.building}{room.building && room.floor ? ' / ' : ''}{room.floor && `ชั้น ${room.floor}`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                                    รอ {room.pending}
                                                </span>
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                    ซ่อม {room.in_progress}
                                                </span>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                    เสร็จ {room.completed}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                รวม {room.total} รายการ
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && room.requests.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-slate-900/50 px-4 pb-4">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500">
                                                        <th className="py-2">เลขที่</th>
                                                        <th className="py-2">รายละเอียด</th>
                                                        <th className="py-2">สถานะ</th>
                                                        <th className="py-2">วันที่</th>
                                                        <th className="py-2">ผู้รับผิดชอบ</th>
                                                        <th className="py-2">อะไหล่ที่ใช้</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-slate-700">
                                                    {room.requests.map(req => (
                                                        <tr key={req.request_id}>
                                                            <td className="py-2 font-mono text-gray-600 align-top">{req.request_number}</td>
                                                            <td className="py-2 text-gray-900 dark:text-white align-top">
                                                                <div>{req.title}</div>
                                                                <div className="text-xs text-gray-500">{req.priority}</div>
                                                            </td>
                                                            <td className="py-2 align-top">
                                                                {req.status === 'pending' && <span className="text-yellow-600">รอดำเนินการ</span>}
                                                                {req.status === 'in_progress' && <span className="text-blue-600">กำลังซ่อม</span>}
                                                                {req.status === 'completed' && <span className="text-green-600">เสร็จแล้ว</span>}
                                                                {req.status === 'cancelled' && <span className="text-gray-500">ยกเลิก</span>}
                                                            </td>
                                                            <td className="py-2 text-gray-500 align-top">
                                                                {new Date(req.created_at).toLocaleDateString('th-TH')}
                                                            </td>
                                                            <td className="py-2 text-gray-600 dark:text-gray-400 align-top">
                                                                {req.assigned_to || '-'}
                                                            </td>
                                                            <td className="py-2 text-gray-600 dark:text-gray-400 align-top">
                                                                {req.parts && req.parts.length > 0 ? (
                                                                    <ul className="list-disc list-inside text-xs space-y-1">
                                                                        {req.parts.map((p, idx) => (
                                                                            <li key={idx} className="flex items-center gap-2">
                                                                                <span>{p.p_name} ({p.quantity} {p.unit})</span>
                                                                                {p.status && (
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium 
                                                                                        ${p.status === 'verified' ? 'bg-green-100 text-green-700' :
                                                                                            p.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                                                                                                p.status === 'defective' ? 'bg-red-100 text-red-700' :
                                                                                                    'bg-gray-100 text-gray-600'}`}>
                                                                                        {p.status === 'verified' ? 'ตรวจสอบแล้ว' :
                                                                                            p.status === 'pending_verification' ? 'รอตรวจสอบ' :
                                                                                                p.status === 'defective' ? 'ของเสีย' :
                                                                                                    p.status === 'withdrawn' ? 'เบิกแล้ว' : p.status}
                                                                                    </span>
                                                                                )}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                ) : (
                                                                    <span className="text-gray-400 text-xs">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
