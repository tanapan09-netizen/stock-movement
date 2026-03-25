'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Building, Building2, ChevronDown, ChevronRight, Clock, Wrench, CheckCircle, Filter, X, Package, User, Calendar, Hash, Layers } from 'lucide-react';
import { getMaintenanceReportByRoom, getAllRooms, getProducts } from '@/actions/maintenanceActions';
import { getActiveTechnicians } from '@/actions/technicianActions';
import {
    MAINTENANCE_PART_STATUS_CONFIG,
    MAINTENANCE_REPORT_PRIORITY_CONFIG,
    MAINTENANCE_REPORT_STATUS_CONFIG,
} from '@/lib/maintenance-report-options';

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

function StatusBadge({ status }: { status: string }) {
    const cfg = MAINTENANCE_REPORT_STATUS_CONFIG[status] ?? { label: status, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

export default function MaintenanceReportClient() {
    const [report, setReport] = useState<RoomReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
    const [expandedMainRooms, setExpandedMainRooms] = useState<Set<string>>(new Set());

    const [filters, setFilters] = useState<FilterState>({
        roomId: '', technician: '', partId: '', startDate: '', endDate: ''
    });

    const [rooms, setRooms] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Hierarchical Filter State & Logic
    const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
    const [roomMenuStep, setRoomMenuStep] = useState(1); // 1: Floor, 2: Main Room, 3: Zone
    const [navFloor, setNavFloor] = useState<string | null>(null);
    const [navMainRoom, setNavMainRoom] = useState<string | null>(null);
    const roomMenuRef = useRef<HTMLDivElement>(null);

    const roomTree = useMemo(() => {
        return rooms.reduce((acc: any, r: any) => {
            const floor = r.floor || 'อื่นๆ';
            const parts = r.room_code.split('-');
            const mainRoomCode = parts[0];
            
            if (!acc[floor]) acc[floor] = {};
            if (!acc[floor][mainRoomCode]) acc[floor][mainRoomCode] = [];
            acc[floor][mainRoomCode].push(r);
            return acc;
        }, {});
    }, [rooms]);

    const selectedRoomData = useMemo(() => 
        rooms.find(r => r.room_id.toString() === filters.roomId),
        [rooms, filters.roomId]
    );

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (roomMenuRef.current && !roomMenuRef.current.contains(event.target as Node)) {
                setIsRoomMenuOpen(false);
            }
        }
        if (isRoomMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isRoomMenuOpen]);

    const hasActiveFilter = Object.values(filters).some(v => v !== '');

    async function loadData() {
        setLoading(true);
        try {
            const [roomsRes, techsRes, productsRes] = await Promise.all([
                getAllRooms(), getActiveTechnicians(), getProducts()
            ]);
            if (roomsRes.success) setRooms(roomsRes.data || []);
            if (techsRes.success) setTechnicians(techsRes.data || []);
            if (productsRes.success) setProducts(productsRes.data || []);
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
            if (currentFilters.roomId || currentFilters.technician || currentFilters.partId || currentFilters.startDate) {
                setExpandedRooms(new Set((result.data as RoomReport[]).map(r => r.room_id)));
            }
        }
        setLoading(false);
    }

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const timer = setTimeout(() => loadReport(filters), 500);
        return () => clearTimeout(timer);
    }, [filters]);

    function handleFilterChange(key: keyof FilterState, value: string) {
        setFilters(prev => ({ ...prev, [key]: value }));
    }

    function clearFilters() {
        setFilters({ roomId: '', technician: '', partId: '', startDate: '', endDate: '' });
    }

    function toggleRoom(roomId: number) {
        const newSet = new Set(expandedRooms);
        newSet.has(roomId) ? newSet.delete(roomId) : newSet.add(roomId);
        setExpandedRooms(newSet);
    }

    const totals = report.reduce(
        (acc, room) => ({
            total: acc.total + room.total,
            pending: acc.pending + room.pending,
            in_progress: acc.in_progress + room.in_progress,
            completed: acc.completed + room.completed,
        }),
        { total: 0, pending: 0, in_progress: 0, completed: 0 }
    );

    const groupedByFloor = report.reduce((acc, room) => {
        const floor = room.floor || 'อื่นๆ';
        if (!acc[floor]) acc[floor] = {};
        
        const mainRoom = room.room_code.split('-')[0];
        if (!acc[floor][mainRoom]) acc[floor][mainRoom] = [];
        
        acc[floor][mainRoom].push(room);
        return acc;
    }, {} as Record<string, Record<string, RoomReport[]>>);

    const floorList = Object.keys(groupedByFloor).sort((a, b) => {
        if (a === 'อื่นๆ') return 1;
        if (b === 'อื่นๆ') return -1;
        return a.localeCompare(b, undefined, { numeric: true });
    });

    const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

    function toggleFloor(floor: string) {
        setExpandedFloors(prev => {
            const next = new Set(prev);
            if (next.has(floor)) next.delete(floor);
            else next.add(floor);
            return next;
        });
    }

    const uniqueMainRoomsCount = new Set(report.map(r => r.room_code.split('-')[0])).size;

    function toggleMainRoom(roomCode: string) {
        setExpandedMainRooms(prev => {
            const next = new Set(prev);
            if (next.has(roomCode)) next.delete(roomCode);
            else next.add(roomCode);
            return next;
        });
    }

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายงานแจ้งซ่อมแยกตามห้อง</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">สรุปสถานะการแจ้งซ่อมของแต่ละห้อง</p>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'ห้องหลักทั้งหมด',    value: uniqueMainRoomsCount, icon: Building,     color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-700' },
                    { label: 'รอดำเนินการ',    value: totals.pending,      icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-100' },
                    { label: 'กำลังซ่อม',       value: totals.in_progress,  icon: Wrench,       color: 'text-blue-600',    bg: 'bg-blue-100' },
                    { label: 'เสร็จแล้ว',       value: totals.completed,    icon: CheckCircle,  color: 'text-emerald-600', bg: 'bg-emerald-100' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${bg}`}>
                                <Icon size={20} className={color} />
                            </div>
                            <div>
                                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Filter size={16} />
                        <span className="text-sm font-semibold">ตัวกรองข้อมูล</span>
                        {hasActiveFilter && (
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                                กำลังกรอง
                            </span>
                        )}
                    </div>
                    {hasActiveFilter && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={14} /> ล้างทั้งหมด
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ห้อง</label>
                        <div className="relative room-filter-container" ref={roomMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
                                className="w-full text-left text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition flex items-center justify-between"
                            >
                                <span className="truncate">
                                    {selectedRoomData ? `${selectedRoomData.room_code}` : 'ห้องทั้งหมด'}
                                </span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isRoomMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isRoomMenuOpen && (
                                <div className="absolute z-[60] mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                    {/* Menu Header */}
                                    <div className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                        {roomMenuStep > 1 && (
                                            <button
                                                onClick={() => setRoomMenuStep(roomMenuStep - 1)}
                                                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                                            >
                                                <ChevronRight size={14} className="rotate-180" />
                                            </button>
                                        )}
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {roomMenuStep === 1 ? 'เลือกชั้น' : roomMenuStep === 2 ? `ชั้น ${navFloor}` : `${navMainRoom}`}
                                        </span>
                                        {roomMenuStep === 1 && filters.roomId !== '' && (
                                            <button
                                                onClick={() => {
                                                    handleFilterChange('roomId', '');
                                                    setIsRoomMenuOpen(false);
                                                }}
                                                className="ml-auto text-[10px] text-indigo-600 font-bold hover:underline"
                                            >
                                                ล้าง
                                            </button>
                                        )}
                                    </div>

                                    {/* Menu Content */}
                                    <div className="max-h-64 overflow-y-auto p-1">
                                        {roomMenuStep === 1 && (
                                            <div className="grid grid-cols-2 gap-1">
                                                <button
                                                    onClick={() => {
                                                        handleFilterChange('roomId', '');
                                                        setIsRoomMenuOpen(false);
                                                    }}
                                                    className={`col-span-2 px-3 py-2 text-sm text-left rounded-lg transition-colors ${filters.roomId === '' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                                >
                                                    ทั้งหมด
                                                </button>
                                                {Object.keys(roomTree).sort((a, b) => {
                                                    if (a === 'อื่นๆ') return 1;
                                                    if (b === 'อื่นๆ') return -1;
                                                    return a.localeCompare(b, undefined, { numeric: true });
                                                }).map(floor => (
                                                    <button
                                                        key={floor}
                                                        onClick={() => {
                                                            setNavFloor(floor);
                                                            setRoomMenuStep(2);
                                                        }}
                                                        className="px-3 py-3 text-sm text-left hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-between group"
                                                    >
                                                        <span>ชั้น {floor}</span>
                                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {roomMenuStep === 2 && navFloor && (
                                            <div className="space-y-0.5">
                                                {Object.keys(roomTree[navFloor]).sort().map(mainRoom => (
                                                    <button
                                                        key={mainRoom}
                                                        onClick={() => {
                                                            setNavMainRoom(mainRoom);
                                                            setRoomMenuStep(3);
                                                        }}
                                                        className="w-full px-3 py-2.5 text-sm text-left hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-between group"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                            <span>ห้อง {mainRoom}</span>
                                                        </div>
                                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {roomMenuStep === 3 && navFloor && navMainRoom && (
                                            <div className="space-y-0.5">
                                                {roomTree[navFloor][navMainRoom].sort((a: any, b: any) => a.room_code.localeCompare(b.room_code)).map((r: any) => {
                                                    const zonePart = r.room_code.split('-').slice(1).join('-') || 'MAIN';
                                                    return (
                                                        <button
                                                            key={r.room_id}
                                                            onClick={() => {
                                                                handleFilterChange('roomId', r.room_id.toString());
                                                                setIsRoomMenuOpen(false);
                                                                setRoomMenuStep(1);
                                                            }}
                                                            className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center justify-between
                                                                ${filters.roomId === r.room_id.toString() ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}
                                                            `}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-mono uppercase text-indigo-500">{zonePart}</span>
                                                                <span className="text-[11px] text-gray-500 truncate">{r.room_name}</span>
                                                            </div>
                                                            {filters.roomId === r.room_id.toString() && <CheckCircle size={14} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ช่างผู้รับผิดชอบ</label>
                        <select
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                            value={filters.technician}
                            onChange={e => handleFilterChange('technician', e.target.value)}
                        >
                            <option value="">ช่างทั้งหมด</option>
                            {technicians.map(t => (
                                <option key={t.id || t.name} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">อะไหล่ที่ใช้</label>
                        <select
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                            value={filters.partId}
                            onChange={e => handleFilterChange('partId', e.target.value)}
                        >
                            <option value="">อะไหล่ทั้งหมด</option>
                            {products.map(p => (
                                <option key={p.p_id} value={p.p_id}>{p.p_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ตั้งแต่วันที่</label>
                        <input
                            type="date"
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                            value={filters.startDate}
                            onChange={e => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ถึงวันที่</label>
                        <input
                            type="date"
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                            value={filters.endDate}
                            onChange={e => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* ── Room List grouped by Building ── */}
            <div className="space-y-3">

                {loading ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 py-16 flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-sm">กำลังโหลดข้อมูล...</span>
                    </div>
                ) : report.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 py-16 text-center text-gray-400">
                        <Building size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">ไม่พบข้อมูลห้อง</p>
                    </div>
                ) : (
                    floorList.map(floor => {
                        const roomsInFloor = groupedByFloor[floor];
                        const isFloorOpen = expandedFloors.has(floor);
                        
                        const floorTotals = Object.values(roomsInFloor).flat().reduce(
                            (acc, r) => ({ pending: acc.pending + r.pending, in_progress: acc.in_progress + r.in_progress, completed: acc.completed + r.completed, total: acc.total + r.total }),
                            { pending: 0, in_progress: 0, completed: 0, total: 0 }
                        );

                        return (
                            <div key={floor} className="space-y-3">
                                {/* ── Floor Header ── */}
                                <div 
                                    className="flex items-center justify-between px-2 cursor-pointer group"
                                    onClick={() => toggleFloor(floor)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded transition-colors ${isFloorOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                            {isFloorOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">ชั้น {floor}</span>
                                            <span className="h-px w-8 bg-gray-200 dark:bg-slate-700" />
                                            <span className="text-[10px] text-gray-400 font-medium">{Object.keys(roomsInFloor).length} ห้อง</span>
                                        </div>
                                    </div>
                                    
                                    {/* Floor summary totals */}
                                    <div className="flex items-center gap-3 scale-90 origin-right opacity-60">
                                        {floorTotals.pending > 0 && <span className="text-[11px] font-semibold text-amber-600">รอ {floorTotals.pending}</span>}
                                        {floorTotals.in_progress > 0 && <span className="text-[11px] font-semibold text-blue-600">ซ่อม {floorTotals.in_progress}</span>}
                                        {floorTotals.completed > 0 && <span className="text-[11px] font-semibold text-emerald-600">เสร็จ {floorTotals.completed}</span>}
                                    </div>
                                </div>

                                {/* ── Rooms in Floor ── */}
                                {isFloorOpen && (
                                    <div className="space-y-3 ml-4">
                                        {Object.entries(roomsInFloor).map(([mainRoomCode, zones]) => {
                                            const isRoomOpen = expandedMainRooms.has(mainRoomCode);
                                            const rTotals = zones.reduce(
                                                (acc, r) => ({ pending: acc.pending + r.pending, in_progress: acc.in_progress + r.in_progress, completed: acc.completed + r.completed, total: acc.total + r.total }),
                                                { pending: 0, in_progress: 0, completed: 0, total: 0 }
                                            );

                                            return (
                                                <div key={mainRoomCode} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                                                    {/* Room Header */}
                                                    <div
                                                        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                                                        onClick={() => toggleMainRoom(mainRoomCode)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                                                ${isRoomOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                                                                <Building2 size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-800 dark:text-white text-sm">{mainRoomCode}</div>
                                                                <div className="text-xs text-gray-400">{zones.length} โซน</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="hidden sm:flex items-center gap-2">
                                                                {rTotals.pending > 0 && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />รอ {rTotals.pending}
                                                                    </span>
                                                                )}
                                                                {rTotals.in_progress > 0 && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />ซ่อม {rTotals.in_progress}
                                                                    </span>
                                                                )}
                                                                {rTotals.completed > 0 && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />เสร็จ {rTotals.completed}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-gray-400 ml-1">รวม {rTotals.total}</span>
                                                            </div>
                                                            <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isRoomOpen ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>

                                                    {/* Zones inside Room */}
                                                    {isRoomOpen && (
                                                        <div className="border-t border-gray-100 dark:border-slate-700">
                                                            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-gray-50 dark:bg-slate-900/50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                                                <div className="col-span-5 pl-10">โซน</div>
                                                                <div className="col-span-2 text-center">รอ</div>
                                                                <div className="col-span-2 text-center">ซ่อม</div>
                                                                <div className="col-span-2 text-center">เสร็จ</div>
                                                                <div className="col-span-1 text-center">รวม</div>
                                                            </div>

                                                            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                                                {zones.map(room => {
                                                                    const isExpanded = expandedRooms.has(room.room_id);
                                                                    const hasRequests = room.total > 0;

                                                                    return (
                                                                        <div key={room.room_id}>
                                                                            <div
                                                                                className={`grid grid-cols-12 gap-4 px-5 py-3 items-center transition-colors
                                                                                    ${hasRequests ? 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-slate-700/40' : 'opacity-60'}
                                                                                    ${isExpanded ? 'bg-indigo-50/30 dark:bg-slate-700/20' : ''}
                                                                                `}
                                                                                onClick={() => hasRequests && toggleRoom(room.room_id)}
                                                                            >
                                                                                <div className="col-span-5 flex items-center gap-3 min-w-0 pl-6">
                                                                                    <div className="flex-shrink-0 flex items-center gap-2">
                                                                                        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600" />
                                                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0
                                                                                            ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                                                                                            {hasRequests ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <Layers size={12} />}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="font-semibold text-sm text-gray-800 dark:text-white truncate">
                                                                                            {(() => {
                                                                                                const parts = room.room_code.split('-');
                                                                                                const zoneStr = parts.slice(1).join('-');
                                                                                                return (
                                                                                                    <>
                                                                                                        <span className="text-gray-400 font-normal">[{zoneStr || 'MAIN'}]</span>
                                                                                                        <span className="font-normal text-gray-500 ml-2">— {room.room_name}</span>
                                                                                                    </>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="col-span-2 text-center">
                                                                                    {room.pending > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{room.pending}</span> : <span className="text-gray-300 text-sm">—</span>}
                                                                                </div>
                                                                                <div className="col-span-2 text-center">
                                                                                    {room.in_progress > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{room.in_progress}</span> : <span className="text-gray-300 text-sm">—</span>}
                                                                                </div>
                                                                                <div className="col-span-2 text-center">
                                                                                    {room.completed > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{room.completed}</span> : <span className="text-gray-300 text-sm">—</span>}
                                                                                </div>
                                                                                <div className="col-span-1 text-center">
                                                                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{room.total}</span>
                                                                                </div>
                                                                            </div>

                                                                            {isExpanded && room.requests.length > 0 && (
                                                                                <div className="border-t border-indigo-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40">
                                                                                    <table className="w-full text-sm">
                                                                                        <thead>
                                                                                            <tr className="border-b border-gray-200 dark:border-slate-700">
                                                                                                <th className="pl-16 pr-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-36"><Hash size={11} />เลขที่</th>
                                                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">รายละเอียด</th>
                                                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">สถานะ</th>
                                                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-28"><Calendar size={11} />วันที่</th>
                                                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-32"><User size={11} />ผู้รับผิดชอบ</th>
                                                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"><Package size={11} />อะไหล่</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                                                                            {room.requests.map(req => (
                                                                                                <tr key={req.request_id} className="hover:bg-white dark:hover:bg-slate-800/60 transition-colors">
                                                                                                    <td className="pl-16 pr-4 py-3 align-top">
                                                                                                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{req.request_number}</span>
                                                                                                    </td>
                                                                                                    <td className="px-4 py-3 align-top">
                                                                                                        <div className="font-medium text-gray-800 dark:text-white text-sm leading-snug">{req.title}</div>
                                                                                <div className={`text-xs mt-0.5 ${MAINTENANCE_REPORT_PRIORITY_CONFIG[req.priority]?.color ?? 'text-gray-400'}`}>{MAINTENANCE_REPORT_PRIORITY_CONFIG[req.priority]?.label ?? req.priority}</div>
                                                                                                    </td>
                                                                                                    <td className="px-4 py-3 align-top"><StatusBadge status={req.status} /></td>
                                                                                                    <td className="px-4 py-3 align-top text-xs text-gray-500 whitespace-nowrap">{new Date(req.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                                                                                    <td className="px-4 py-3 align-top">
                                                                                                        {req.assigned_to ? (
                                                                                                            <div className="flex items-center gap-1.5">
                                                                                                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{req.assigned_to.charAt(0)}</div>
                                                                                                                <span className="text-xs text-gray-700 dark:text-gray-300">{req.assigned_to}</span>
                                                                                                            </div>
                                                                                                        ) : <span className="text-xs text-gray-300">—</span>}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-3 align-top">
                                                                                                        {req.parts && req.parts.length > 0 ? (
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                {req.parts.map((p, idx) => (
                                                                                                                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                                                                                                                        <span className="text-xs text-gray-700 dark:text-gray-300">{p.p_name}<span className="text-gray-400 ml-1">×{p.quantity}{p.unit ? ` ${p.unit}` : ''}</span></span>
                                                                            {p.status && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${MAINTENANCE_PART_STATUS_CONFIG[p.status]?.bg ?? 'bg-gray-100'} ${MAINTENANCE_PART_STATUS_CONFIG[p.status]?.color ?? 'text-gray-600'}`}>{MAINTENANCE_PART_STATUS_CONFIG[p.status]?.label ?? p.status}</span>}
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        ) : <span className="text-xs text-gray-300">—</span>}
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
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
