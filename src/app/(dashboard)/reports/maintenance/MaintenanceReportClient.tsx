'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Building, Building2, ChevronDown, ChevronRight, Clock, Wrench, CheckCircle, Filter, X, Package, User, Calendar, Hash, Layers, ShieldAlert, TriangleAlert, ScanSearch, BadgeDollarSign, Download } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { getMaintenanceExceptionReport, getMaintenancePartUsageReports, getMaintenanceReportByRoom, getMaintenanceRequestById, getAllRooms, getProducts } from '@/actions/maintenanceActions';
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

interface RoomOption {
    room_id: number;
    room_code: string;
    room_name: string;
    floor: string | null;
}

interface TechnicianOption {
    id?: string | number;
    name: string;
}

interface ProductOption {
    p_id: string;
    p_name: string;
}

type ReportApiFilters = {
    roomId?: number;
    technician?: string;
    partId?: string;
    startDate?: Date;
    endDate?: Date;
};

type RoomTree = Record<string, Record<string, RoomOption[]>>;

interface ExceptionReportItem {
    type: 'verification_failed' | 'pending_verification_overdue' | 'manual_actual_cost_override' | 'reservation_cleared';
    request_id: number;
    request_number: string;
    title: string;
    room_code: string;
    room_name: string;
    assigned_to: string | null;
    actor_name: string;
    occurred_at: Date;
    detail: string;
}

interface ExceptionReportData {
    summary: {
        verification_failed: number;
        pending_verification_overdue: number;
        manual_actual_cost_override: number;
        reservation_cleared: number;
    };
    items: ExceptionReportItem[];
}

interface PartUsageSummary {
    records: number;
    withdrawn_qty: number;
    used_qty: number;
    verified_qty: number;
    returned_qty: number;
    scrap_qty: number;
    usage_cost: number;
}

interface ConsumptionReportItem {
    p_id: string;
    p_name: string;
    unit: string | null;
    withdrawn_qty: number;
    used_qty: number;
    verified_qty: number;
    returned_qty: number;
    estimated_scrap_qty: number;
    usage_cost: number;
    request_count: number;
}

interface ScrapReportItem {
    request_id: number;
    request_number: string;
    title: string;
    room_code: string;
    room_name: string;
    technician: string;
    p_id: string;
    p_name: string;
    unit: string | null;
    status: string;
    expected_qty: number;
    verified_qty: number;
    verification_loss_qty: number;
    defective_marked_qty: number;
    scrap_estimate_qty: number;
    occurred_at: Date;
}

interface TechnicianUsageReportItem {
    technician: string;
    withdrawn_qty: number;
    used_qty: number;
    verified_qty: number;
    returned_qty: number;
    estimated_scrap_qty: number;
    usage_cost: number;
    request_count: number;
}

interface PartUsageDailyTrendItem {
    date_key: string;
    date_label: string;
    consumption_qty: number;
    scrap_qty: number;
    defective_scrap_qty: number;
    usage_cost: number;
}

interface ScrapParetoItem {
    p_id: string;
    p_name: string;
    scrap_qty: number;
    item_share_pct: number;
    cumulative_pct: number;
}

interface ScrapParetoChartItem {
    p_id: string;
    label: string;
    scrap_qty: number;
    cumulative_pct: number;
}

interface MaintenanceRequestDetail {
    request_id: number;
    request_number: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    reported_by?: string | null;
    assigned_to?: string | null;
    notes?: string | null;
    created_at: Date;
    completed_at?: Date | null;
    tbl_rooms?: {
        room_code?: string | null;
        room_name?: string | null;
    } | null;
    tbl_maintenance_parts?: Array<{
        part_id: number;
        p_id: string;
        quantity: number;
        unit?: string | null;
        status: string;
        actual_used?: number | null;
        verified_quantity?: number | null;
        returned_qty?: number | null;
        notes?: string | null;
        tbl_products?: {
            p_name?: string | null;
            p_unit?: string | null;
        } | null;
    }> | null;
    tbl_maintenance_history?: Array<{
        action: string;
        old_value?: string | null;
        new_value?: string | null;
        changed_by: string;
        changed_at: Date;
    }> | null;
}

interface PartUsageReportData {
    summary: PartUsageSummary;
    consumption: ConsumptionReportItem[];
    scrap: ScrapReportItem[];
    technician_usage: TechnicianUsageReportItem[];
    daily_trend: PartUsageDailyTrendItem[];
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
    const [exceptionReport, setExceptionReport] = useState<ExceptionReportData>({
        summary: {
            verification_failed: 0,
            pending_verification_overdue: 0,
            manual_actual_cost_override: 0,
            reservation_cleared: 0,
        },
        items: [],
    });
    const [partUsageReport, setPartUsageReport] = useState<PartUsageReportData>({
        summary: {
            records: 0,
            withdrawn_qty: 0,
            used_qty: 0,
            verified_qty: 0,
            returned_qty: 0,
            scrap_qty: 0,
            usage_cost: 0,
        },
        consumption: [],
        scrap: [],
        technician_usage: [],
        daily_trend: [],
    });
    const [loading, setLoading] = useState(true);
    const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
    const [expandedMainRooms, setExpandedMainRooms] = useState<Set<string>>(new Set());
    const [exceptionTypeFilter, setExceptionTypeFilter] = useState<'all' | ExceptionReportItem['type']>('all');
    const [partsReportFilter, setPartsReportFilter] = useState<'all' | 'scrap_only' | 'defective_only'>('all');
    const [selectedParetoPartId, setSelectedParetoPartId] = useState<string | null>(null);
    const [selectedDrilldownItem, setSelectedDrilldownItem] = useState<ScrapReportItem | null>(null);
    const [selectedRequestDetail, setSelectedRequestDetail] = useState<MaintenanceRequestDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        roomId: '', technician: '', partId: '', startDate: '', endDate: ''
    });

    const [rooms, setRooms] = useState<RoomOption[]>([]);
    const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);

    // Hierarchical Filter State & Logic
    const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
    const [roomMenuStep, setRoomMenuStep] = useState(1); // 1: Floor, 2: Main Room, 3: Zone
    const [navFloor, setNavFloor] = useState<string | null>(null);
    const [navMainRoom, setNavMainRoom] = useState<string | null>(null);
    const roomMenuRef = useRef<HTMLDivElement>(null);

    const roomTree = useMemo(() => {
        return rooms.reduce((acc: RoomTree, r: RoomOption) => {
            const floor = r.floor || 'อื่นๆ';
            const parts = r.room_code.split('-');
            const mainRoomCode = parts[0];
            
            if (!acc[floor]) acc[floor] = {};
            if (!acc[floor][mainRoomCode]) acc[floor][mainRoomCode] = [];
            acc[floor][mainRoomCode].push(r);
            return acc;
        }, {} as RoomTree);
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
        const apiFilters: ReportApiFilters = {};
        if (currentFilters.roomId) apiFilters.roomId = parseInt(currentFilters.roomId);
        if (currentFilters.technician) apiFilters.technician = currentFilters.technician;
        if (currentFilters.partId) apiFilters.partId = currentFilters.partId;
        if (currentFilters.startDate) apiFilters.startDate = new Date(currentFilters.startDate);
        if (currentFilters.endDate) apiFilters.endDate = new Date(currentFilters.endDate);

        const [result, exceptionResult, partUsageResult] = await Promise.all([
            getMaintenanceReportByRoom(apiFilters),
            getMaintenanceExceptionReport(apiFilters),
            getMaintenancePartUsageReports(apiFilters),
        ]);

        if (result.success) {
            setReport(result.data as RoomReport[]);
            if (currentFilters.roomId || currentFilters.technician || currentFilters.partId || currentFilters.startDate) {
                setExpandedRooms(new Set((result.data as RoomReport[]).map(r => r.room_id)));
            }
        }
        if (exceptionResult.success) {
            setExceptionReport(exceptionResult.data as ExceptionReportData);
        }
        if (partUsageResult.success) {
            setPartUsageReport(partUsageResult.data as PartUsageReportData);
        }
        setLoading(false);
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadData();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

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
        if (newSet.has(roomId)) {
            newSet.delete(roomId);
        } else {
            newSet.add(roomId);
        }
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

    const exceptionTypeConfig: Record<ExceptionReportItem['type'], { label: string; icon: LucideIcon; chip: string }> = {
        verification_failed: { label: 'ตรวจนับไม่ตรง', icon: TriangleAlert, chip: 'bg-rose-100 text-rose-700' },
        pending_verification_overdue: { label: 'รอตรวจนับเกิน 24 ชม.', icon: ScanSearch, chip: 'bg-amber-100 text-amber-700' },
        manual_actual_cost_override: { label: 'แก้ค่าใช้จ่ายจริง', icon: BadgeDollarSign, chip: 'bg-violet-100 text-violet-700' },
        reservation_cleared: { label: 'เคลียร์ของค้าง', icon: ShieldAlert, chip: 'bg-slate-200 text-slate-700' },
    };

    const filteredExceptionItems = exceptionTypeFilter === 'all'
        ? exceptionReport.items
        : exceptionReport.items.filter((item) => item.type === exceptionTypeFilter);

    const defectivePartIds = new Set(
        partUsageReport.scrap
            .filter((item) => item.defective_marked_qty > 0)
            .map((item) => item.p_id)
    );

    const defectiveTechnicians = new Set(
        partUsageReport.scrap
            .filter((item) => item.defective_marked_qty > 0)
            .map((item) => item.technician || 'Unassigned')
    );

    const filteredConsumptionItems = partUsageReport.consumption.filter((item) => {
        if (partsReportFilter === 'scrap_only') {
            return item.estimated_scrap_qty > 0;
        }
        if (partsReportFilter === 'defective_only') {
            return defectivePartIds.has(item.p_id);
        }
        return true;
    });

    const filteredScrapItems = partUsageReport.scrap.filter((item) => {
        if (partsReportFilter === 'scrap_only') {
            return item.scrap_estimate_qty > 0;
        }
        if (partsReportFilter === 'defective_only') {
            return item.defective_marked_qty > 0;
        }
        return true;
    });

    const filteredTechnicianUsageItems = partUsageReport.technician_usage.filter((item) => {
        if (partsReportFilter === 'scrap_only') {
            return item.estimated_scrap_qty > 0;
        }
        if (partsReportFilter === 'defective_only') {
            return defectiveTechnicians.has(item.technician);
        }
        return true;
    });

    const filteredDailyTrend = partUsageReport.daily_trend.filter((item) => {
        if (partsReportFilter === 'scrap_only') {
            return item.scrap_qty > 0;
        }
        if (partsReportFilter === 'defective_only') {
            return item.defective_scrap_qty > 0;
        }
        return true;
    });

    const filteredTotalScrapQty = filteredScrapItems.reduce((sum, item) => sum + item.scrap_estimate_qty, 0);
    const filteredVerificationLossQty = filteredScrapItems.reduce((sum, item) => sum + item.verification_loss_qty, 0);
    const filteredDefectiveQty = filteredScrapItems.reduce((sum, item) => sum + item.defective_marked_qty, 0);

    const scrapByPartMap = new Map<string, { p_id: string; p_name: string; scrap_qty: number }>();
    for (const item of filteredScrapItems) {
        const current = scrapByPartMap.get(item.p_id) || {
            p_id: item.p_id,
            p_name: item.p_name,
            scrap_qty: 0,
        };
        current.scrap_qty += item.scrap_estimate_qty;
        scrapByPartMap.set(item.p_id, current);
    }

    const sortedScrapParts = Array.from(scrapByPartMap.values()).sort((a, b) => b.scrap_qty - a.scrap_qty);
    const scrapParetoItems: ScrapParetoItem[] = sortedScrapParts.reduce<{
        rows: ScrapParetoItem[];
        cumulativeQty: number;
    }>((acc, item) => {
        const cumulativeQty = acc.cumulativeQty + item.scrap_qty;
        const itemSharePct = filteredTotalScrapQty > 0 ? (item.scrap_qty / filteredTotalScrapQty) * 100 : 0;
        const cumulativePct = filteredTotalScrapQty > 0 ? (cumulativeQty / filteredTotalScrapQty) * 100 : 0;
        return {
            cumulativeQty,
            rows: [
                ...acc.rows,
                {
                    p_id: item.p_id,
                    p_name: item.p_name,
                    scrap_qty: item.scrap_qty,
                    item_share_pct: itemSharePct,
                    cumulative_pct: cumulativePct,
                }
            ],
        };
    }, {
        rows: [],
        cumulativeQty: 0,
    }).rows;

    const pareto80Index = scrapParetoItems.findIndex((item) => item.cumulative_pct >= 80);
    const pareto80Count = pareto80Index >= 0 ? pareto80Index + 1 : scrapParetoItems.length;
    const activeParetoPartId = (selectedParetoPartId && scrapParetoItems.some((item) => item.p_id === selectedParetoPartId))
        ? selectedParetoPartId
        : (scrapParetoItems[0]?.p_id || null);
    const activeParetoPart = scrapParetoItems.find((item) => item.p_id === activeParetoPartId) || null;
    const paretoChartData: ScrapParetoChartItem[] = scrapParetoItems
        .slice(0, 12)
        .map((item, index) => ({
            p_id: item.p_id,
            label: `${index + 1}`,
            scrap_qty: item.scrap_qty,
            cumulative_pct: item.cumulative_pct,
        }));
    const paretoDrilldownItems = filteredScrapItems
        .filter((item) => item.p_id === activeParetoPartId)
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 12);
    const modalRequestId = selectedRequestDetail?.request_id ?? selectedDrilldownItem?.request_id ?? null;
    const modalRequestNumber = selectedRequestDetail?.request_number ?? selectedDrilldownItem?.request_number ?? '-';
    const modalTitle = selectedRequestDetail?.title ?? selectedDrilldownItem?.title ?? '-';
    const modalRoom = selectedRequestDetail?.tbl_rooms
        ? `${selectedRequestDetail.tbl_rooms.room_code || '-'} - ${selectedRequestDetail.tbl_rooms.room_name || '-'}`
        : `${selectedDrilldownItem?.room_code || '-'} - ${selectedDrilldownItem?.room_name || '-'}`;
    const modalTechnician = selectedRequestDetail?.assigned_to ?? selectedDrilldownItem?.technician ?? '-';
    const modalPartLabel = selectedDrilldownItem ? `${selectedDrilldownItem.p_name} (${selectedDrilldownItem.p_id})` : '-';
    const modalCause = selectedDrilldownItem
        ? (selectedDrilldownItem.defective_marked_qty > 0 ? 'Defective' : 'Verification Loss')
        : '-';
    const modalScrapQty = selectedDrilldownItem?.scrap_estimate_qty ?? 0;
    const modalOccurredAt = selectedDrilldownItem?.occurred_at ? new Date(selectedDrilldownItem.occurred_at).toLocaleString('th-TH') : '-';
    const modalStatus = selectedDrilldownItem
        ? (MAINTENANCE_PART_STATUS_CONFIG[selectedDrilldownItem.status]?.label ?? selectedDrilldownItem.status)
        : '-';
    const modalParts = selectedRequestDetail?.tbl_maintenance_parts || [];
    const modalHistory = selectedRequestDetail?.tbl_maintenance_history || [];

    function escapeCsvCell(value: unknown) {
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }

    function triggerCsvDownload(filename: string, rows: Array<Array<string | number>>) {
        const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    function exportExceptionCsv() {
        if (filteredExceptionItems.length === 0) return;

        const rows = [
            ['type', 'request_number', 'title', 'room_code', 'room_name', 'assigned_to', 'actor_name', 'occurred_at', 'detail'],
            ...filteredExceptionItems.map((item) => [
                exceptionTypeConfig[item.type].label,
                item.request_number,
                item.title,
                item.room_code,
                item.room_name,
                item.assigned_to || '',
                item.actor_name || '',
                new Date(item.occurred_at).toLocaleString('th-TH'),
                item.detail,
            ]),
        ];

        triggerCsvDownload(
            `maintenance-exceptions-${exceptionTypeFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
            rows
        );
    }

    function exportConsumptionCsv() {
        if (filteredConsumptionItems.length === 0) return;
        const rows: Array<Array<string | number>> = [
            ['p_id', 'part_name', 'unit', 'withdrawn_qty', 'used_qty', 'verified_qty', 'returned_qty', 'scrap_estimate_qty', 'request_count', 'usage_cost'],
            ...filteredConsumptionItems.map((item) => [
                item.p_id,
                item.p_name,
                item.unit || '',
                item.withdrawn_qty,
                item.used_qty,
                item.verified_qty,
                item.returned_qty,
                item.estimated_scrap_qty,
                item.request_count,
                item.usage_cost.toFixed(2),
            ]),
        ];
        triggerCsvDownload(`maintenance-consumption-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }

    function exportScrapCsv() {
        if (filteredScrapItems.length === 0) return;
        const rows: Array<Array<string | number>> = [
            ['request_number', 'title', 'room_code', 'room_name', 'technician', 'p_id', 'part_name', 'status', 'expected_qty', 'verified_qty', 'verification_loss_qty', 'defective_marked_qty', 'scrap_estimate_qty', 'occurred_at'],
            ...filteredScrapItems.map((item) => [
                item.request_number,
                item.title,
                item.room_code,
                item.room_name,
                item.technician,
                item.p_id,
                item.p_name,
                item.status,
                item.expected_qty,
                item.verified_qty,
                item.verification_loss_qty,
                item.defective_marked_qty,
                item.scrap_estimate_qty,
                new Date(item.occurred_at).toLocaleString('th-TH'),
            ]),
        ];
        triggerCsvDownload(`maintenance-scrap-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }

    function exportTechnicianUsageCsv() {
        if (filteredTechnicianUsageItems.length === 0) return;
        const rows: Array<Array<string | number>> = [
            ['technician', 'request_count', 'withdrawn_qty', 'used_qty', 'verified_qty', 'returned_qty', 'scrap_estimate_qty', 'usage_cost'],
            ...filteredTechnicianUsageItems.map((item) => [
                item.technician,
                item.request_count,
                item.withdrawn_qty,
                item.used_qty,
                item.verified_qty,
                item.returned_qty,
                item.estimated_scrap_qty,
                item.usage_cost.toFixed(2),
            ]),
        ];
        triggerCsvDownload(`maintenance-technician-usage-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }

    function exportScrapParetoCsv() {
        if (scrapParetoItems.length === 0) return;
        const rows: Array<Array<string | number>> = [
            ['rank', 'p_id', 'part_name', 'scrap_qty', 'item_share_pct', 'cumulative_pct'],
            ...scrapParetoItems.map((item, index) => [
                index + 1,
                item.p_id,
                item.p_name,
                item.scrap_qty,
                item.item_share_pct.toFixed(2),
                item.cumulative_pct.toFixed(2),
            ]),
        ];
        triggerCsvDownload(`maintenance-scrap-pareto-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }

    function exportParetoDrilldownCsv() {
        if (paretoDrilldownItems.length === 0) return;
        const rows: Array<Array<string | number>> = [
            ['request_number', 'request_id', 'room_code', 'room_name', 'technician', 'part_id', 'part_name', 'cause', 'scrap_qty', 'occurred_at'],
            ...paretoDrilldownItems.map((item) => [
                item.request_number,
                item.request_id,
                item.room_code,
                item.room_name,
                item.technician || '',
                item.p_id,
                item.p_name,
                item.defective_marked_qty > 0 ? 'Defective' : 'Verification Loss',
                item.scrap_estimate_qty,
                new Date(item.occurred_at).toLocaleString('th-TH'),
            ]),
        ];
        const partSuffix = activeParetoPartId ? `-${activeParetoPartId}` : '';
        triggerCsvDownload(`maintenance-scrap-drilldown${partSuffix}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }

    function handleParetoBarClick(data: unknown) {
        if (!data || typeof data !== 'object') return;
        const direct = data as { p_id?: unknown; payload?: { p_id?: unknown } };
        const partId = typeof direct.p_id === 'string'
            ? direct.p_id
            : (typeof direct.payload?.p_id === 'string' ? direct.payload.p_id : null);
        if (partId) {
            setSelectedParetoPartId(partId);
        }
    }

    function closeDrilldownModal() {
        setSelectedDrilldownItem(null);
        setSelectedRequestDetail(null);
        setDetailError(null);
        setDetailLoading(false);
    }

    async function openDrilldownDetail(item: ScrapReportItem) {
        setSelectedDrilldownItem(item);
        setSelectedRequestDetail(null);
        setDetailError(null);
        setDetailLoading(true);
        try {
            const result = await getMaintenanceRequestById(item.request_id);
            if (result.success && result.data) {
                setSelectedRequestDetail(result.data as MaintenanceRequestDetail);
            } else {
                setDetailError(result.error || 'Unable to load request details');
            }
        } catch (error) {
            console.error('Failed to load maintenance request detail:', error);
            setDetailError('Unable to load request details');
        } finally {
            setDetailLoading(false);
        }
    }

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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-rose-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                            <ShieldAlert size={18} />
                            <h2 className="text-sm font-bold uppercase tracking-wide">Exception Monitor</h2>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            รายการเสี่ยงที่ควรตรวจสอบจากประวัติระบบและสถานะอะไหล่
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-rose-600">{filteredExceptionItems.length}</div>
                        <div className="text-xs text-gray-400">รายการเสี่ยง</div>
                    </div>
                </div>

                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <label htmlFor="exception-type-filter" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            ประเภทความเสี่ยง
                        </label>
                        <select
                            id="exception-type-filter"
                            value={exceptionTypeFilter}
                            onChange={(e) => setExceptionTypeFilter(e.target.value as 'all' | ExceptionReportItem['type'])}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        >
                            <option value="all">ทั้งหมด</option>
                            {Object.entries(exceptionTypeConfig).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={exportExceptionCsv}
                        disabled={filteredExceptionItems.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {[
                        { label: 'ตรวจนับไม่ตรง', value: exceptionReport.summary.verification_failed, color: 'text-rose-600', bg: 'bg-rose-100', Icon: TriangleAlert },
                        { label: 'รอตรวจนับนาน', value: exceptionReport.summary.pending_verification_overdue, color: 'text-amber-600', bg: 'bg-amber-100', Icon: ScanSearch },
                        { label: 'แก้ต้นทุนมือ', value: exceptionReport.summary.manual_actual_cost_override, color: 'text-violet-600', bg: 'bg-violet-100', Icon: BadgeDollarSign },
                        { label: 'เคลียร์ของค้าง', value: exceptionReport.summary.reservation_cleared, color: 'text-slate-700', bg: 'bg-slate-200', Icon: ShieldAlert },
                    ].map(({ label, value, color, bg, Icon }) => (
                        <div key={label} className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${bg}`}>
                                    <Icon size={18} className={color} />
                                </div>
                                <div>
                                    <div className={`text-xl font-bold ${color}`}>{value}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="font-semibold text-sm text-gray-700 dark:text-gray-200">รายการล่าสุดที่ควรตรวจสอบ</div>
                        <div className="text-xs text-gray-400">{filteredExceptionItems.length} รายการ</div>
                    </div>
                    {filteredExceptionItems.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-center text-gray-400">
                            ไม่พบรายการเสี่ยงตามตัวกรองปัจจุบัน
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
                            {filteredExceptionItems.map((item, index) => {
                                const cfg = exceptionTypeConfig[item.type];
                                const Icon = cfg.icon;
                                return (
                                    <div key={`${item.type}-${item.request_id}-${index}`} className="px-4 py-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.chip}`}>
                                                    <Icon size={12} />
                                                    {cfg.label}
                                                </span>
                                                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.request_number}</span>
                                                <span className="text-xs text-gray-400">{item.room_code} - {item.room_name}</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-800 dark:text-white">{item.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.detail}</div>
                                        </div>
                                        <div className="text-xs text-gray-400 lg:text-right">
                                            <div>ผู้ดำเนินการ: {item.actor_name || '-'}</div>
                                            <div>ช่างรับผิดชอบ: {item.assigned_to || '-'}</div>
                                            <div>{new Date(item.occurred_at).toLocaleString('th-TH')}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-indigo-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                            Parts Consumption / Scrap / Technician Usage
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            ข้อมูลรวมการเบิก ใช้จริง ตรวจรับ คืน และของเสียจากงานซ่อมตามตัวกรองปัจจุบัน
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">{partUsageReport.summary.records.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">part records</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Used Qty</div>
                        <div className="text-xl font-bold text-blue-600">{partUsageReport.summary.used_qty.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Returned Qty</div>
                        <div className="text-xl font-bold text-emerald-600">{partUsageReport.summary.returned_qty.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Scrap Estimate Qty</div>
                        <div className="text-xl font-bold text-rose-600">{partUsageReport.summary.scrap_qty.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Usage Cost</div>
                        <div className="text-xl font-bold text-violet-600">฿{partUsageReport.summary.usage_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter:</span>
                    <button
                        type="button"
                        onClick={() => setPartsReportFilter('all')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${partsReportFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200'}`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setPartsReportFilter('scrap_only')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${partsReportFilter === 'scrap_only' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200'}`}
                    >
                        Scrap {'>'} 0
                    </button>
                    <button
                        type="button"
                        onClick={() => setPartsReportFilter('defective_only')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${partsReportFilter === 'defective_only' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200'}`}
                    >
                        Defective only
                    </button>
                </div>

                <div className="mb-4 rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Daily Trend
                    </div>
                    {filteredDailyTrend.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400">No trend data</div>
                    ) : (
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredDailyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date_key"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value) => String(value).slice(5)}
                                    />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <RechartsTooltip
                                        labelFormatter={(value) => `Date: ${value}`}
                                        formatter={(value, name) => {
                                            const metric = String(name);
                                            const numericValue = Number(value ?? 0);

                                            if (metric === 'consumption_qty') return [numericValue.toLocaleString(), 'Consumption'];
                                            if (metric === 'scrap_qty') return [numericValue.toLocaleString(), 'Scrap'];
                                            if (metric === 'defective_scrap_qty') return [numericValue.toLocaleString(), 'Defective Scrap'];
                                            return [numericValue.toLocaleString(), metric];
                                        }}
                                    />
                                    <Legend
                                        formatter={(value) => {
                                            if (value === 'consumption_qty') return 'Consumption';
                                            if (value === 'scrap_qty') return 'Scrap';
                                            if (value === 'defective_scrap_qty') return 'Defective Scrap';
                                            return value;
                                        }}
                                    />
                                    {partsReportFilter !== 'defective_only' && (
                                        <Line
                                            type="monotone"
                                            dataKey="consumption_qty"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey={partsReportFilter === 'defective_only' ? 'defective_scrap_qty' : 'scrap_qty'}
                                        stroke={partsReportFilter === 'defective_only' ? '#d97706' : '#e11d48'}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="mb-4 grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Top Scrap Causes
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Verification Loss</div>
                                <div className="text-lg font-bold text-rose-600">{filteredVerificationLossQty.toLocaleString()}</div>
                                <div className="text-[11px] text-gray-400">
                                    {filteredTotalScrapQty > 0 ? ((filteredVerificationLossQty / filteredTotalScrapQty) * 100).toFixed(1) : '0.0'}%
                                </div>
                            </div>
                            <div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Defective Marked</div>
                                <div className="text-lg font-bold text-amber-600">{filteredDefectiveQty.toLocaleString()}</div>
                                <div className="text-[11px] text-gray-400">
                                    {filteredTotalScrapQty > 0 ? ((filteredDefectiveQty / filteredTotalScrapQty) * 100).toFixed(1) : '0.0'}%
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-2 dark:border-slate-700">
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Total Scrap</div>
                                <div className="text-lg font-bold text-gray-700 dark:text-gray-200">{filteredTotalScrapQty.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Scrap Pareto 80/20
                                <span className="ml-2 text-[11px] text-gray-400">
                                    {pareto80Count}/{scrapParetoItems.length} parts explain 80%
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={exportScrapParetoCsv}
                                disabled={scrapParetoItems.length === 0}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-slate-700 dark:text-slate-300"
                            >
                                <Download size={12} />
                                CSV
                            </button>
                        </div>
                        <div className="border-b border-gray-100 px-3 py-3 dark:border-slate-700">
                            {paretoChartData.length === 0 ? (
                                <div className="py-8 text-center text-xs text-gray-400">No pareto chart data</div>
                            ) : (
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={paretoChartData} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                            <RechartsTooltip
                                                formatter={(value, name) => {
                                                    const metric = String(name);
                                                    const numericValue = Number(value ?? 0);

                                                    if (metric === 'scrap_qty') return [numericValue.toLocaleString(), 'Scrap Qty'];
                                                    if (metric === 'cumulative_pct') return [`${numericValue.toFixed(1)}%`, 'Cumulative %'];
                                                    return [numericValue.toLocaleString(), metric];
                                                }}
                                                labelFormatter={(value) => `Rank: ${value}`}
                                            />
                                            <Legend
                                                formatter={(value) => {
                                                    if (value === 'scrap_qty') return 'Scrap Qty';
                                                    if (value === 'cumulative_pct') return 'Cumulative %';
                                                    return value;
                                                }}
                                            />
                                            <ReferenceLine yAxisId="right" y={80} stroke="#f59e0b" strokeDasharray="5 5" />
                                            <Bar yAxisId="left" dataKey="scrap_qty" fill="#ef4444" radius={[4, 4, 0, 0]} onClick={handleParetoBarClick} />
                                            <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="#2563eb" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="max-h-56 overflow-auto border-b border-gray-100 dark:border-slate-700">
                            <table className="w-full text-xs">
                                <thead className="bg-white dark:bg-slate-800 sticky top-0">
                                    <tr className="text-gray-400 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left font-semibold">Part</th>
                                        <th className="px-3 py-2 text-right font-semibold">Scrap</th>
                                        <th className="px-3 py-2 text-right font-semibold">Share</th>
                                        <th className="px-3 py-2 text-right font-semibold">Cum%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                    {scrapParetoItems.slice(0, 12).map((item, index) => (
                                        <tr
                                            key={item.p_id}
                                            onClick={() => setSelectedParetoPartId(item.p_id)}
                                            className={`cursor-pointer transition ${
                                                item.p_id === activeParetoPartId
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                                    : item.cumulative_pct <= 80
                                                        ? 'bg-rose-50/40 dark:bg-rose-950/10'
                                                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                                            }`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{item.p_name}</div>
                                                <div className="text-[11px] text-gray-400">#{index + 1} | {item.p_id}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-rose-600">{item.scrap_qty.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{item.item_share_pct.toFixed(1)}%</td>
                                            <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{item.cumulative_pct.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                    {scrapParetoItems.length === 0 && (
                                        <tr>
                                            <td className="px-3 py-6 text-center text-gray-400" colSpan={4}>No scrap data</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-3 py-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    Drilldown
                                    {activeParetoPart && (
                                        <span className="ml-2 text-[11px] text-gray-400">{activeParetoPart.p_name} ({activeParetoPart.p_id})</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={exportParetoDrilldownCsv}
                                    disabled={paretoDrilldownItems.length === 0}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-slate-700 dark:text-slate-300"
                                >
                                    <Download size={12} />
                                    CSV
                                </button>
                            </div>
                            {paretoDrilldownItems.length === 0 ? (
                                <div className="py-4 text-xs text-gray-400">No matching requests</div>
                            ) : (
                                <div className="max-h-40 overflow-auto">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-white dark:bg-slate-800">
                                            <tr className="text-gray-400 uppercase tracking-wide">
                                                <th className="px-2 py-2 text-left font-semibold">Request</th>
                                                <th className="px-2 py-2 text-left font-semibold">Cause</th>
                                                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                                                <th className="px-2 py-2 text-right font-semibold">Date</th>
                                                <th className="px-2 py-2 text-right font-semibold">Go</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                            {paretoDrilldownItems.map((item, idx) => (
                                                <tr
                                                    key={`${item.request_id}-${item.p_id}-${idx}`}
                                                    onClick={() => void openDrilldownDetail(item)}
                                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40"
                                                >
                                                    <td className="px-2 py-2">
                                                        <div className="font-mono text-[11px] text-indigo-600">{item.request_number}</div>
                                                        <div className="text-[11px] text-gray-400">{item.room_code}</div>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {item.defective_marked_qty > 0 && (
                                                            <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Defective</span>
                                                        )}
                                                        {item.defective_marked_qty <= 0 && item.verification_loss_qty > 0 && (
                                                            <span className="inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Verification Loss</span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-semibold text-rose-600">{item.scrap_estimate_qty.toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-right text-gray-500">{new Date(item.occurred_at).toLocaleDateString('th-TH')}</td>
                                                    <td className="px-2 py-2 text-right">
                                                        <a
                                                            href={`/maintenance?req=${item.request_id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex rounded border border-indigo-200 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-300"
                                                        >
                                                            Open
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Consumption Report</div>
                            <button
                                type="button"
                                onClick={exportConsumptionCsv}
                                disabled={filteredConsumptionItems.length === 0}
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-indigo-900/60 dark:text-indigo-300"
                            >
                                <Download size={12} />
                                CSV
                            </button>
                        </div>
                        <div className="max-h-72 overflow-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-white dark:bg-slate-800 sticky top-0">
                                    <tr className="text-gray-400 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left font-semibold">Part</th>
                                        <th className="px-3 py-2 text-right font-semibold">Used</th>
                                        <th className="px-3 py-2 text-right font-semibold">Scrap</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                    {filteredConsumptionItems.slice(0, 10).map((item) => (
                                        <tr key={item.p_id}>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{item.p_name}</div>
                                                <div className="text-[11px] text-gray-400">{item.p_id}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-blue-600 font-semibold">{item.used_qty.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-rose-600 font-semibold">{item.estimated_scrap_qty.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {filteredConsumptionItems.length === 0 && (
                                        <tr>
                                            <td className="px-3 py-4 text-center text-gray-400" colSpan={3}>No data</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Scrap Report</div>
                            <button
                                type="button"
                                onClick={exportScrapCsv}
                                disabled={filteredScrapItems.length === 0}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-rose-900/60 dark:text-rose-300"
                            >
                                <Download size={12} />
                                CSV
                            </button>
                        </div>
                        <div className="max-h-72 overflow-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-white dark:bg-slate-800 sticky top-0">
                                    <tr className="text-gray-400 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left font-semibold">Request</th>
                                        <th className="px-3 py-2 text-left font-semibold">Part</th>
                                        <th className="px-3 py-2 text-right font-semibold">Scrap</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                    {filteredScrapItems.slice(0, 10).map((item, idx) => (
                                        <tr key={`${item.request_id}-${item.p_id}-${idx}`}>
                                            <td className="px-3 py-2">
                                                <div className="font-mono text-[11px] text-indigo-600">{item.request_number}</div>
                                                <div className="text-[11px] text-gray-400">{item.technician || '-'}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{item.p_name}</div>
                                                <div className={`inline-flex mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${MAINTENANCE_PART_STATUS_CONFIG[item.status]?.bg ?? 'bg-gray-100'} ${MAINTENANCE_PART_STATUS_CONFIG[item.status]?.color ?? 'text-gray-600'}`}>
                                                    {MAINTENANCE_PART_STATUS_CONFIG[item.status]?.label ?? item.status}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-rose-600 font-semibold">{item.scrap_estimate_qty.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {filteredScrapItems.length === 0 && (
                                        <tr>
                                            <td className="px-3 py-4 text-center text-gray-400" colSpan={3}>No data</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Technician Usage</div>
                            <button
                                type="button"
                                onClick={exportTechnicianUsageCsv}
                                disabled={filteredTechnicianUsageItems.length === 0}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 dark:border-blue-900/60 dark:text-blue-300"
                            >
                                <Download size={12} />
                                CSV
                            </button>
                        </div>
                        <div className="max-h-72 overflow-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-white dark:bg-slate-800 sticky top-0">
                                    <tr className="text-gray-400 uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left font-semibold">Technician</th>
                                        <th className="px-3 py-2 text-right font-semibold">Used</th>
                                        <th className="px-3 py-2 text-right font-semibold">Jobs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                    {filteredTechnicianUsageItems.slice(0, 10).map((item) => (
                                        <tr key={item.technician}>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{item.technician}</div>
                                                <div className="text-[11px] text-gray-400">Scrap {item.estimated_scrap_qty.toLocaleString()}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-blue-600 font-semibold">{item.used_qty.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{item.request_count.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {filteredTechnicianUsageItems.length === 0 && (
                                        <tr>
                                            <td className="px-3 py-4 text-center text-gray-400" colSpan={3}>No data</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

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
                                                {roomTree[navFloor][navMainRoom].sort((a: RoomOption, b: RoomOption) => a.room_code.localeCompare(b.room_code)).map((r: RoomOption) => {
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

            {selectedDrilldownItem && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={closeDrilldownModal}>
                    <div
                        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                            <div>
                                <div className="text-sm font-semibold text-gray-800 dark:text-white">Maintenance Detail</div>
                                <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{modalRequestNumber}</div>
                            </div>
                            <button
                                type="button"
                                onClick={closeDrilldownModal}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {detailLoading && (
                            <div className="border-b border-gray-100 px-5 py-2 text-xs text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                Loading latest request detail...
                            </div>
                        )}
                        {detailError && (
                            <div className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                                {detailError}
                            </div>
                        )}

                        <div className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-2">
                            <div>
                                <div className="text-xs text-gray-500">Title</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalTitle}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Room</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalRoom}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Technician</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalTechnician || '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Part</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalPartLabel}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Cause</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalCause}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Scrap Qty</div>
                                <div className="font-semibold text-rose-600">{modalScrapQty.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Occurred At</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalOccurredAt}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Status</div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{modalStatus}</div>
                            </div>
                        </div>

                        <div className="grid gap-4 border-t border-gray-100 px-5 py-4 sm:grid-cols-2 dark:border-slate-700">
                            <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Parts</div>
                                <div className="max-h-44 overflow-auto rounded-lg border border-gray-100 dark:border-slate-700">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-white dark:bg-slate-800">
                                            <tr className="text-gray-400 uppercase tracking-wide">
                                                <th className="px-2 py-2 text-left font-semibold">Part</th>
                                                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                                                <th className="px-2 py-2 text-right font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                            {modalParts.slice(0, 12).map((part) => (
                                                <tr key={part.part_id}>
                                                    <td className="px-2 py-2">
                                                        <div className="font-medium text-gray-700 dark:text-gray-200">{part.tbl_products?.p_name || part.p_id}</div>
                                                        <div className="text-[11px] text-gray-400">{part.p_id}</div>
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-200">{part.quantity.toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{MAINTENANCE_PART_STATUS_CONFIG[part.status]?.label ?? part.status}</td>
                                                </tr>
                                            ))}
                                            {modalParts.length === 0 && (
                                                <tr>
                                                    <td className="px-2 py-4 text-center text-gray-400" colSpan={3}>No parts data</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recent History</div>
                                <div className="max-h-44 overflow-auto rounded-lg border border-gray-100 dark:border-slate-700">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-white dark:bg-slate-800">
                                            <tr className="text-gray-400 uppercase tracking-wide">
                                                <th className="px-2 py-2 text-left font-semibold">Action</th>
                                                <th className="px-2 py-2 text-left font-semibold">By</th>
                                                <th className="px-2 py-2 text-right font-semibold">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                                            {modalHistory.slice(0, 12).map((h, idx) => (
                                                <tr key={`${h.action}-${idx}`}>
                                                    <td className="px-2 py-2">
                                                        <div className="font-medium text-gray-700 dark:text-gray-200">{h.action}</div>
                                                        {h.new_value && <div className="text-[11px] text-gray-400 truncate">{h.new_value}</div>}
                                                    </td>
                                                    <td className="px-2 py-2 text-gray-700 dark:text-gray-200">{h.changed_by || '-'}</td>
                                                    <td className="px-2 py-2 text-right text-gray-500">{new Date(h.changed_at).toLocaleString('th-TH')}</td>
                                                </tr>
                                            ))}
                                            {modalHistory.length === 0 && (
                                                <tr>
                                                    <td className="px-2 py-4 text-center text-gray-400" colSpan={3}>No history data</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
                            {modalRequestId && (
                                <a
                                    href={`/maintenance?req=${modalRequestId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    Open Maintenance
                                </a>
                            )}
                            {modalRequestId && (
                                <a
                                    href={`/maintenance/job-sheet/${modalRequestId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Open Job Sheet
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={closeDrilldownModal}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
