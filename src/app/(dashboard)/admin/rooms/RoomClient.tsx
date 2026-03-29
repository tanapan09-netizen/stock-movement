'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    getAllRooms,
    createRoom,
    createRoomsBulk,
    updateRoom,
    deleteRoom,
    toggleRoomActive,
    getRoomServiceSummary,
} from '@/actions/maintenanceActions';
import { getAllVehicles, createVehicle, updateVehicle, deleteVehicle, toggleVehicleActive } from '@/actions/vehicleActions';
import Swal from 'sweetalert2';

// --- Types ---
interface Room {
    room_id: number;
    room_code: string;
    room_name: string;
    room_type: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
    active: boolean;
    created_at: Date;
}

interface Vehicle {
    vehicle_id: number;
    license_plate: string;
    province: string | null;
    brand: string | null;
    model_name: string | null;
    color: string | null;
    vehicle_type: string | null;
    owner_name: string | null;
    owner_room: string | null;
    owner_phone: string | null;
    parking_slot: string | null;
    notes: string | null;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

// Hierarchical Data Structures
interface ZoneNode { id: string; code: string; name: string; originalId?: number; active?: boolean }
interface RoomNode { id: string; code: string; name: string; originalId?: number; active?: boolean; zones: ZoneNode[] }
interface FloorNode { id: string; code: string; name: string; originalId?: number; active?: boolean; rooms: RoomNode[] }
interface TypeNode { id: string; code: string; name: string; originalId?: number; active?: boolean; floors: FloorNode[] }
type HierarchyDetailNode = Pick<ZoneNode, "id" | "code" | "name">;
interface RoomServiceSummary {
    room_id: number;
    room_code: string;
    room_name: string;
    active: boolean;
    maintenance_total: number;
    maintenance_open: number;
    asset_count: number;
    last_maintenance_at: Date | null;
}
interface ServiceTotals {
    total_rooms: number;
    active_rooms: number;
    maintenance_total: number;
    maintenance_open: number;
    asset_total: number;
}
interface NodeServiceSummary {
    maintenanceTotal: number;
    maintenanceOpen: number;
    assetCount: number;
    latestMaintenanceAt: Date | null;
}
interface VehicleFormValues {
    vehicle_id?: number;
    license_plate: string;
    province: string;
    brand: string;
    model_name: string;
    color: string;
    vehicle_type: string;
    owner_name: string;
    owner_room: string;
    owner_phone: string;
    parking_slot: string;
    notes: string;
    active?: boolean;
}
interface QuickActionPermissions {
    canCreateMaintenance: boolean;
    canViewRoomAssets: boolean;
    canCreateAsset: boolean;
}

function toVehicleFormValues(data?: Vehicle): VehicleFormValues {
    return {
        vehicle_id: data?.vehicle_id,
        license_plate: data?.license_plate || "",
        province: data?.province || "",
        vehicle_type: data?.vehicle_type || "รถยนต์",
        brand: data?.brand || "",
        model_name: data?.model_name || "",
        color: data?.color || "",
        owner_name: data?.owner_name || "",
        owner_room: data?.owner_room || "",
        owner_phone: data?.owner_phone || "",
        parking_slot: data?.parking_slot || "",
        notes: data?.notes || "",
        active: data?.active,
    };
}

// <-- UPDATED: Toast includes exiting flag -->
type Toast = { type: 'success' | 'error'; text: string; id: number; exiting?: boolean };

const ICONS = {
    type: "🏢",
    floor: "📐",
    room: "🚪",
    zone: "📍",
};

const LEVEL_LABELS = {
    type: "ประเภท",
    floor: "ชั้น",
    room: "ห้อง",
    zone: "โซน",
};

const LEVEL_COLORS = {
    type: { bg: "#1e3a5f", accent: "#3b82f6", light: "#dbeafe" },
    floor: { bg: "#1e4034", accent: "#10b981", light: "#d1fae5" },
    room: { bg: "#3b1f5e", accent: "#8b5cf6", light: "#ede9fe" },
    zone: { bg: "#5e2d1e", accent: "#f97316", light: "#ffedd5" },
};

// Common small icon button style
const iconBtnStyle = (color: string): React.CSSProperties => ({
    background: "none", border: `1.5px solid ${color}33`, borderRadius: 6, cursor: "pointer",
    padding: "3px 7px", fontSize: 13, lineHeight: 1, color, display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s"
});

const safeLower = (value: unknown) => (typeof value === "string" ? value.toLowerCase() : "");

const EMPTY_NODE_SERVICE_SUMMARY: NodeServiceSummary = {
    maintenanceTotal: 0,
    maintenanceOpen: 0,
    assetCount: 0,
    latestMaintenanceAt: null,
};
const EMPTY_SERVICE_TOTALS: ServiceTotals = {
    total_rooms: 0,
    active_rooms: 0,
    maintenance_total: 0,
    maintenance_open: 0,
    asset_total: 0,
};

function formatSummaryDate(value?: Date | string | null) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function mergeNodeSummaries(summaries: Array<RoomServiceSummary | undefined>): NodeServiceSummary {
    return summaries.reduce<NodeServiceSummary>((acc, current) => {
        if (!current) return acc;
        const nextLatest = current.last_maintenance_at
            ? new Date(current.last_maintenance_at)
            : null;
        if (nextLatest && (!acc.latestMaintenanceAt || nextLatest > acc.latestMaintenanceAt)) {
            acc.latestMaintenanceAt = nextLatest;
        }
        acc.maintenanceTotal += current.maintenance_total || 0;
        acc.maintenanceOpen += current.maintenance_open || 0;
        acc.assetCount += current.asset_count || 0;
        return acc;
    }, { ...EMPTY_NODE_SERVICE_SUMMARY });
}

const UI = {
    pageBg: "#f0f4f8",
    card: {
        background: "#fff",
        borderRadius: 18,
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 6px 26px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
    } as React.CSSProperties,
    cardHeader: {
        padding: "18px 18px 14px",
        borderBottom: "1px solid #f1f5f9",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        background: "linear-gradient(180deg, rgba(226,232,240,0.45) 0%, rgba(255,255,255,1) 80%)",
    } as React.CSSProperties,
    headerLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 } as React.CSSProperties,
    headerIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
        color: "#fff",
        boxShadow: "0 10px 18px rgba(59,130,246,0.18)",
        flex: "0 0 auto",
    } as React.CSSProperties,
    headerTitle: { margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em" } as React.CSSProperties,
    headerSubtitle: { margin: "4px 0 0", fontSize: 12, color: "#64748b" } as React.CSSProperties,
    headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" } as React.CSSProperties,
    toolbar: { padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } as React.CSSProperties,
    inputWrap: { position: "relative", flex: 1, minWidth: 240 } as React.CSSProperties,
    inputIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.75 } as React.CSSProperties,
    input: {
        width: "100%",
        padding: "10px 14px 10px 38px",
        boxSizing: "border-box",
        borderRadius: 12,
        border: "1.5px solid #e2e8f0",
        fontSize: 14,
        background: "#fff",
        outline: "none",
        fontFamily: "'Sarabun', sans-serif",
        transition: "box-shadow .15s, border-color .15s",
    } as React.CSSProperties,
    btnSecondary: {
        padding: "10px 18px",
        borderRadius: 12,
        border: "1.5px solid #e2e8f0",
        background: "#fff",
        color: "#475569",
        cursor: "pointer",
        fontFamily: "'Sarabun', sans-serif",
        fontWeight: 700,
        fontSize: 14,
        transition: "transform .15s, box-shadow .15s",
    } as React.CSSProperties,
    btnPrimary: {
        padding: "10px 18px",
        borderRadius: 12,
        border: "none",
        background: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "'Sarabun', sans-serif",
        fontWeight: 800,
        fontSize: 14,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 18px rgba(59,130,246,0.18)",
        transition: "transform .15s, box-shadow .15s",
    } as React.CSSProperties,
    btnSuccess: {
        padding: "10px 18px",
        borderRadius: 12,
        border: "none",
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "'Sarabun', sans-serif",
        fontWeight: 800,
        fontSize: 14,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 18px rgba(16,185,129,0.18)",
        transition: "transform .15s, box-shadow .15s",
    } as React.CSSProperties,
    body: { padding: "0 18px 18px" } as React.CSSProperties,
    emptyBox: {
        textAlign: "center",
        padding: "56px 20px",
        background: "#fff",
        borderRadius: 16,
        border: "1.5px dashed #e2e8f0",
    } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse", fontSize: 14 } as React.CSSProperties,
    th: { padding: "12px 12px", color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" } as React.CSSProperties,
    td: { padding: "12px 12px", verticalAlign: "top" } as React.CSSProperties,
    pill: { background: "#f1f5f9", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties,
    iconBtn: (variant: "primary" | "danger" | "neutral") =>
        ({
            padding: "6px 10px",
            borderRadius: 10,
            border: "1.5px solid #e2e8f0",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
            color: variant === "danger" ? "#ef4444" : variant === "primary" ? "#2563eb" : "#475569",
        }) as React.CSSProperties,
    modalOverlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        backdropFilter: "blur(6px)",
        padding: 16,
    } as React.CSSProperties,
    modalCard: {
        background: "#fff",
        borderRadius: 20,
        width: "100%",
        maxWidth: 560,
        boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
        border: "1.5px solid #e2e8f0",
        overflow: "hidden",
    } as React.CSSProperties,
    modalHeader: {
        padding: "18px 18px 14px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: "1px solid #f1f5f9",
        background: "linear-gradient(180deg, rgba(226,232,240,0.45) 0%, rgba(255,255,255,1) 85%)",
    } as React.CSSProperties,
    modalTitle: { margin: 0, fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em" } as React.CSSProperties,
    modalSubtitle: { margin: "4px 0 0", fontSize: 12, color: "#64748b" } as React.CSSProperties,
    modalBody: { padding: 18 } as React.CSSProperties,
    modalClose: {
        width: 36,
        height: 36,
        borderRadius: 999,
        border: "1.5px solid #e2e8f0",
        background: "#fff",
        cursor: "pointer",
        fontWeight: 900,
        color: "#0f172a",
    } as React.CSSProperties,
    formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
    fieldLabel: { display: "block", fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 } as React.CSSProperties,
    control: {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1.5px solid #e2e8f0",
        background: "#fff",
        outline: "none",
        fontFamily: "'Sarabun', sans-serif",
        fontSize: 14,
    } as React.CSSProperties,
    textarea: {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1.5px solid #e2e8f0",
        background: "#fff",
        outline: "none",
        fontFamily: "'Sarabun', sans-serif",
        fontSize: 14,
        minHeight: 88,
        resize: "vertical",
    } as React.CSSProperties,
    modalActions: { display: "flex", gap: 12, marginTop: 18 } as React.CSSProperties,
    btnDanger: {
        padding: "10px 18px",
        borderRadius: 12,
        border: "none",
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "'Sarabun', sans-serif",
        fontWeight: 900,
        fontSize: 14,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 18px rgba(239,68,68,0.18)",
        transition: "transform .15s, box-shadow .15s",
    } as React.CSSProperties,
    btnAccent: (accent: string, disabled?: boolean) =>
        ({
            padding: "10px 18px",
            borderRadius: 12,
            border: "none",
            background: disabled ? "#e2e8f0" : accent,
            color: disabled ? "#94a3b8" : "#fff",
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "'Sarabun', sans-serif",
            fontWeight: 900,
            fontSize: 14,
        }) as React.CSSProperties,
} as const;

function ManagementCard({
    icon,
    title,
    subtitle,
    headerRight,
    toolbar,
    children,
}: {
    icon: string;
    title: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    toolbar?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div style={UI.card}>
            <div style={UI.cardHeader}>
                <div style={UI.headerLeft}>
                    <div style={UI.headerIcon}>{icon}</div>
                    <div style={{ minWidth: 0 }}>
                        <h2 style={UI.headerTitle}>{title}</h2>
                        {subtitle && <p style={UI.headerSubtitle}>{subtitle}</p>}
                    </div>
                </div>
                {headerRight && <div style={UI.headerRight}>{headerRight}</div>}
            </div>
            {toolbar && <div style={UI.toolbar}>{toolbar}</div>}
            <div style={UI.body}>{children}</div>
        </div>
    );
}

function ModalShell({
    icon,
    title,
    subtitle,
    maxWidth,
    children,
    onClose,
    headerAccent,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string | null;
    maxWidth?: number;
    children: React.ReactNode;
    onClose: () => void;
    headerAccent?: string;
}) {
    return (
        <div style={UI.modalOverlay} onMouseDown={onClose} role="dialog" aria-modal="true">
            <div
                style={{ ...UI.modalCard, maxWidth: maxWidth ?? UI.modalCard.maxWidth }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        ...UI.modalHeader,
                        borderBottom: headerAccent ? `2px solid ${headerAccent}22` : UI.modalHeader.borderBottom,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div
                            style={{
                                ...UI.headerIcon,
                                width: 44,
                                height: 44,
                                borderRadius: 16,
                                background: headerAccent
                                    ? `linear-gradient(135deg, ${headerAccent} 0%, #0f172a 140%)`
                                    : UI.headerIcon.background,
                            }}
                        >
                            {icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={UI.modalTitle}>{title}</h3>
                            {subtitle ? <p style={UI.modalSubtitle}>{subtitle}</p> : null}
                        </div>
                    </div>
                    <button onClick={onClose} style={UI.modalClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div style={UI.modalBody}>{children}</div>
            </div>
        </div>
    );
}

// ---- AddModal ----
function AddModal({
    level,
    parentName,
    onAdd,
    onClose,
    loading,
}: {
    level: string;
    parentName: string | null;
    onAdd: (c: string, n: string) => void;
    onClose: () => void;
    loading?: boolean;
}) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const col = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS];
    const canSubmit = Boolean(code.trim() && name.trim() && !loading);

    return (
        <ModalShell
            icon={ICONS[level as keyof typeof ICONS]}
            title={`เพิ่ม${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}ใหม่`}
            subtitle={parentName ? `ภายใต้: ${parentName}` : null}
            onClose={onClose}
            maxWidth={520}
            headerAccent={col.accent}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                    <label style={UI.fieldLabel}>รหัส{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} *</label>
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={`เช่น ${level === "type" ? "TYPE-01" : level === "floor" ? "FL-01" : level === "room" ? "RM-101" : "ZN-A"}`}
                        disabled={loading}
                        style={{
                            ...UI.control,
                            border: `1.5px solid ${code.trim() ? col.accent : "#e2e8f0"}`,
                        }}
                    />
                </div>
                <div>
                    <label style={UI.fieldLabel}>ชื่อ{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} *</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`กรอกชื่อ${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`}
                        disabled={loading}
                        style={{
                            ...UI.control,
                            border: `1.5px solid ${name.trim() ? col.accent : "#e2e8f0"}`,
                        }}
                    />
                </div>
            </div>

            <div style={UI.modalActions}>
                <button onClick={onClose} style={{ ...UI.btnSecondary, flex: 1 }}>
                    ยกเลิก
                </button>
                <button
                    onClick={() => onAdd(code.trim(), name.trim())}
                    disabled={!canSubmit}
                    style={{ ...UI.btnAccent(col.accent, !canSubmit), flex: 1 }}
                >
                    {loading ? "กำลังบันทึก..." : `+ เพิ่ม${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`}
                </button>
            </div>
        </ModalShell>
    );
}

// ---- ZoneRow ----
function ZoneRow({ zone, summary, quickActionPermissions, onDelete, onEdit, onDetail }: {
    zone: ZoneNode;
    summary: NodeServiceSummary;
    quickActionPermissions: QuickActionPermissions;
    onDelete: (zid: number) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void;
    onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean) => void;
}) {
    const col = LEVEL_COLORS.zone;
    const maintenanceHref = zone.originalId
        ? `/maintenance?room_id=${zone.originalId}&open_form=1&location=${encodeURIComponent(zone.code)}`
        : null;
    const roomAssetsHref = `/assets/rooms?room=${encodeURIComponent(zone.code)}`;
    const newAssetHref = `/assets/new?location=${encodeURIComponent(zone.code)}&room_section=${encodeURIComponent(zone.name || zone.code)}`;

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px 9px 48px", background: col.light, borderRadius: 8, marginBottom: 4, border: `1px solid ${col.accent}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14 }}> {ICONS.zone} </span>
                <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 13, color: "#374151" }}>
                    <span style={{ fontWeight: 700, color: col.accent }}> {zone.code} </span>
                    <span style={{ color: "#6b7280", marginLeft: 8 }}> {zone.name} </span>
                </span>
                <span style={{ fontSize: 11, background: col.accent, color: "#fff", borderRadius: 6, padding: "1px 8px", fontWeight: 600 }}> โซน </span>
                {!zone.active && <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', borderRadius: 6, padding: "1px 8px", fontWeight: 600 }}>ปิด</span>}
                <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>
                    Open {summary.maintenanceOpen}
                </span>
                <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>
                    Asset {summary.assetCount}
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                    Last {formatSummaryDate(summary.latestMaintenanceAt)}
                </span>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {quickActionPermissions.canCreateMaintenance && maintenanceHref ? (
                    <a
                        href={maintenanceHref}
                        onClick={(event) => event.stopPropagation()}
                        style={{ ...iconBtnStyle("#0f766e"), textDecoration: "none" }}
                        title="Create maintenance request"
                    >
                        Repair
                    </a>
                ) : null}
                {quickActionPermissions.canViewRoomAssets ? (
                    <a
                        href={roomAssetsHref}
                        onClick={(event) => event.stopPropagation()}
                        style={{ ...iconBtnStyle("#0369a1"), textDecoration: "none" }}
                        title="View assets for this room"
                    >
                        Assets
                    </a>
                ) : null}
                {quickActionPermissions.canCreateAsset ? (
                    <a
                        href={newAssetHref}
                        onClick={(event) => event.stopPropagation()}
                        style={{ ...iconBtnStyle("#4f46e5"), textDecoration: "none" }}
                        title="Register new asset for this room"
                    >
                        +Asset
                    </a>
                ) : null}
                <button onClick={() => onDetail("zone", zone.code, zone.name, zone.originalId, zone.active)} style={iconBtnStyle("#3b82f6")} title="รายละเอียด">👁️</button>
                <button onClick={() => zone.originalId && onEdit(zone.originalId, "zone", zone.code, zone.name)} style={iconBtnStyle("#f59e0b")} title="แก้ไข">✏️</button>
                <button onClick={() => zone.originalId && onDelete(zone.originalId)} style={iconBtnStyle("#ef4444")} title="ลบ">🗑️</button>
            </div>
        </div>
    );
}

// ---- RoomRow ----
function RoomRow({ room, roomSummaryMap, quickActionPermissions, onDelete, onAddZone, onAddZonesBulk, onEdit, onDetail, expandAll }: {
    room: RoomNode;
    roomSummaryMap: Record<number, RoomServiceSummary>;
    quickActionPermissions: QuickActionPermissions;
    onDelete: (rid: number) => void;
    onAddZone: (room: RoomNode, code: string, name: string) => void;
    onAddZonesBulk: (room: RoomNode, text: string) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void;
    onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: HierarchyDetailNode[]) => void;
    expandAll: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState(false);
    const isOpen = expandAll || open;
    const col = LEVEL_COLORS.room;
    const roomSummary = room.originalId ? roomSummaryMap[room.originalId] : undefined;
    const zoneSummaries = room.zones.map((zone) => (zone.originalId ? roomSummaryMap[zone.originalId] : undefined));
    const nodeSummary = mergeNodeSummaries([roomSummary, ...zoneSummaries]);
    const roomIdForActions = room.originalId || room.zones.find((zone) => Boolean(zone.originalId))?.originalId;
    const maintenanceHref = roomIdForActions
        ? `/maintenance?room_id=${roomIdForActions}&open_form=1&location=${encodeURIComponent(room.code)}`
        : null;
    const roomAssetsHref = `/assets/rooms?room=${encodeURIComponent(room.code)}`;
    const newAssetHref = `/assets/new?location=${encodeURIComponent(room.code)}&room_section=${encodeURIComponent(room.name || room.code)}`;

    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 10px 32px", background: isOpen ? col.light : "#fff", border: `1.5px solid ${isOpen ? col.accent : "#e2e8f0"}`, borderRadius: isOpen && room.zones.length ? "10px 10px 0 0" : 10, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} onClick={() => setOpen(v => !v)}>
                    <span style={{ fontSize: 15 }}> {ICONS.room} </span>
                    <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 13, color: "#374151" }}>
                        <span style={{ fontWeight: 700, color: col.accent }}> {room.code} </span>
                        <span style={{ color: "#6b7280", marginLeft: 8 }}> {room.name} </span>
                    </span>
                    <span style={{ fontSize: 11, background: col.accent + "22", color: col.accent, borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}> ห้อง </span>
                    {!room.active && <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', borderRadius: 6, padding: "1px 8px", fontWeight: 600 }}>ปิด</span>}
                    {room.zones.length > 0 && (<span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 6, padding: "1px 8px" }}>{room.zones.length} โซน</span>)}
                    <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>
                        Open {nodeSummary.maintenanceOpen}
                    </span>
                    <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>
                        Asset {nodeSummary.assetCount}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                        Last {formatSummaryDate(nodeSummary.latestMaintenanceAt)}
                    </span>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {quickActionPermissions.canCreateMaintenance && maintenanceHref ? (
                        <a
                            href={maintenanceHref}
                            onClick={(event) => event.stopPropagation()}
                            style={{ ...iconBtnStyle("#0f766e"), textDecoration: "none" }}
                            title="Create maintenance request"
                        >
                            Repair
                        </a>
                    ) : null}
                    {quickActionPermissions.canViewRoomAssets ? (
                        <a
                            href={roomAssetsHref}
                            onClick={(event) => event.stopPropagation()}
                            style={{ ...iconBtnStyle("#0369a1"), textDecoration: "none" }}
                            title="View assets for this room"
                        >
                            Assets
                        </a>
                    ) : null}
                    {quickActionPermissions.canCreateAsset ? (
                        <a
                            href={newAssetHref}
                            onClick={(event) => event.stopPropagation()}
                            style={{ ...iconBtnStyle("#4f46e5"), textDecoration: "none" }}
                            title="Register new asset for this room"
                        >
                            +Asset
                        </a>
                    ) : null}
                    <button onClick={e => { e.stopPropagation(); onDetail("room", room.code, room.name, room.originalId, room.active, room.zones); }} style={iconBtnStyle("#3b82f6")} title="รายละเอียด">👁️</button>
                    <button onClick={e => { e.stopPropagation(); if (room.originalId) onEdit(room.originalId, "room", room.code, room.name); }} style={iconBtnStyle("#f59e0b")} title="แก้ไข">✏️</button>
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${col.accent}`, background: col.light, color: col.accent, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 11 }}> + โซน </button>
                    <button onClick={e => {
                        e.stopPropagation();
                        Swal.fire({
                            title: 'เพิ่มโซนแบบรวดเร็ว',
                            input: 'textarea',
                            inputPlaceholder: 'กรอกชื่อโซน แยกด้วยเครื่องหมายจุลภาค (,) เช่น A, B, C',
                            showCancelButton: true,
                            confirmButtonText: 'บันทึก',
                            cancelButtonText: 'ยกเลิก',
                            confirmButtonColor: col.accent,
                        }).then((result) => {
                            if (result.isConfirmed && result.value) {
                                onAddZonesBulk(room, result.value);
                            }
                        });
                    }} style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${col.accent}`, background: "#fff", color: col.accent, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 11, marginLeft: 4 }}> Bulk </button>
                    <button onClick={e => { e.stopPropagation(); if (room.originalId) { onDelete(room.originalId) } }} style={iconBtnStyle("#ef4444")} title="ลบห้องนี้">🗑️</button>
                    <span onClick={() => setOpen(v => !v)} style={{ color: "#94a3b8", fontSize: 16, userSelect: "none", cursor: "pointer" }}>{open ? "▼" : "▶"}</span>
                </div>
            </div>
            {isOpen && room.zones.length > 0 && (
                <div style={{ background: "#fafbfc", border: `1.5px solid ${col.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 4px" }}>
                    {room.zones.map((zone) => (
                        <ZoneRow
                            key={zone.id}
                            zone={zone}
                            summary={mergeNodeSummaries([zone.originalId ? roomSummaryMap[zone.originalId] : undefined])}
                            quickActionPermissions={quickActionPermissions}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onDetail={onDetail}
                        />
                    ))}
                </div>
            )}
            {modal && (<AddModal level="zone" parentName={`${room.code} ${room.name}`} onAdd={(c, n) => { onAddZone(room, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

// ---- FloorRow ----
function FloorRow({ floor, roomSummaryMap, quickActionPermissions, onDelete, onAddRoom, onAddZone, onAddZonesBulk, onEdit, onDetail, expandAll }: {
    floor: FloorNode;
    roomSummaryMap: Record<number, RoomServiceSummary>;
    quickActionPermissions: QuickActionPermissions;
    onDelete: (id: number) => void;
    onAddRoom: (floor: FloorNode, c: string, n: string) => void;
    onAddZone: (room: RoomNode, c: string, n: string) => void;
    onAddZonesBulk: (room: RoomNode, text: string) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void;
    onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: HierarchyDetailNode[]) => void;
    expandAll: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState(false);
    const isOpen = expandAll || open;
    const col = LEVEL_COLORS.floor;

    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px 11px 18px", background: isOpen ? col.light : "#f8fafc", border: `1.5px solid ${isOpen ? col.accent : "#e2e8f0"}`, borderRadius: isOpen && floor.rooms.length ? "10px 10px 0 0" : 10, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setOpen(v => !v)}>
                    <span style={{ fontSize: 16 }}> {ICONS.floor} </span>
                    <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 14, color: "#374151" }}>
                        <span style={{ fontWeight: 700, color: col.accent }}> {floor.code} </span>
                        <span style={{ color: "#6b7280", marginLeft: 8 }}> {floor.name} </span>
                    </span>
                    <span style={{ fontSize: 11, background: col.accent + "22", color: col.accent, borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}> ชั้น </span>
                    {floor.rooms.length > 0 && (<span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 6, padding: "1px 8px" }}>{floor.rooms.length} ห้อง</span>)}
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <button onClick={e => { e.stopPropagation(); onDetail("floor", floor.code, floor.name, floor.originalId, floor.active, floor.rooms); }} style={iconBtnStyle("#3b82f6")} title="รายละเอียด">👁️</button>
                    {floor.originalId && (
                        <>
                            <button onClick={e => { e.stopPropagation(); onEdit(floor.originalId!, "floor", floor.code, floor.name); }} style={iconBtnStyle("#f59e0b")} title="แก้ไข">✏️</button>
                            <button onClick={e => { e.stopPropagation(); onDelete(floor.originalId!); }} style={iconBtnStyle("#ef4444")} title="ลบชั้นนี้">🗑️</button>
                        </>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${col.accent}`, background: col.light, color: col.accent, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 11 }}> + ห้อง </button>
                    <span onClick={() => setOpen(v => !v)} style={{ color: "#94a3b8", fontSize: 16, userSelect: "none", cursor: "pointer", marginLeft: 4 }}>{open ? "▼" : "▶"}</span>
                </div>
            </div>
            {isOpen && floor.rooms.length > 0 && (
                <div style={{ background: "#f8fafc", border: `1.5px solid ${col.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 4px" }}>
                    {floor.rooms.map((room) => (
                        <RoomRow
                            key={room.id}
                            room={room}
                            roomSummaryMap={roomSummaryMap}
                            quickActionPermissions={quickActionPermissions}
                            onDelete={onDelete}
                            onAddZone={onAddZone}
                            onAddZonesBulk={onAddZonesBulk}
                            onEdit={onEdit}
                            onDetail={onDetail}
                            expandAll={expandAll}
                        />
                    ))}
                </div>
            )}
            {modal && (<AddModal level="room" parentName={`${floor.code} ${floor.name}`} onAdd={(c, n) => { onAddRoom(floor, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

// ---- TypeRow ----
function TypeRow({ type, roomSummaryMap, quickActionPermissions, onDelete, onAddFloor, onAddRoom, onAddZone, onAddZonesBulk, onEdit, onDetail, expandAll }: {
    type: TypeNode;
    roomSummaryMap: Record<number, RoomServiceSummary>;
    quickActionPermissions: QuickActionPermissions;
    onDelete: (id: number) => void;
    onAddFloor: (type: TypeNode, c: string, n: string) => void;
    onAddRoom: (floor: FloorNode, c: string, n: string) => void;
    onAddZone: (room: RoomNode, c: string, n: string) => void;
    onAddZonesBulk: (room: RoomNode, text: string) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void;
    onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: HierarchyDetailNode[]) => void;
    expandAll: boolean;
}) {
    const [open, setOpen] = useState(true);
    const [modal, setModal] = useState(false);
    const isOpen = expandAll || open;
    const col = LEVEL_COLORS.type;

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: `linear-gradient(135deg, ${col.bg}, #2d4a7a)`, borderRadius: isOpen && type.floors.length > 0 ? "12px 12px 0 0" : 12, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(30,58,95,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => setOpen(v => !v)}>
                    <span style={{ fontSize: 20 }}> {ICONS.type} </span>
                    <div>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{type.name} - {type.code}</span>
                    </div>
                    <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 10px", fontWeight: 700 }}>ประเภท</span>
                    <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 10px" }}>{type.floors.length} ชั้น</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={e => { e.stopPropagation(); onDetail("type", type.code, type.name, type.originalId, type.active, type.floors); }}
                        style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", padding: "4px 8px", fontSize: 13, color: "#fff" }} title="รายละเอียด">👁️</button>
                    {type.originalId && (
                        <>
                            <button onClick={e => { e.stopPropagation(); onEdit(type.originalId!, "type", type.code, type.name); }}
                                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", padding: "4px 8px", fontSize: 13, color: "#fff" }} title="แก้ไข">✏️</button>
                            <button onClick={e => { e.stopPropagation(); onDelete(type.originalId!); }}
                                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", padding: "4px 8px", fontSize: 13, color: "#fff" }} title="ลบประเภทนี้">🗑️</button>
                        </>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 12 }}> + ชั้น </button>
                    <span onClick={() => setOpen(v => !v)} style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, userSelect: "none", cursor: "pointer", marginLeft: 4 }}>{open ? "▼" : "▶"}</span>
                </div>
            </div>
            {isOpen && type.floors.length > 0 && (
                <div style={{ background: "#fff", border: `1.5px solid ${col.accent}44`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "10px 10px 6px" }}>
                    {type.floors.map((floor) => (
                        <FloorRow
                            key={floor.id}
                            floor={floor}
                            roomSummaryMap={roomSummaryMap}
                            quickActionPermissions={quickActionPermissions}
                            onDelete={onDelete}
                            onAddRoom={onAddRoom}
                            onAddZone={onAddZone}
                            onAddZonesBulk={onAddZonesBulk}
                            onEdit={onEdit}
                            onDetail={onDetail}
                            expandAll={expandAll}
                        />
                    ))}
                </div>
            )}
            {modal && (<AddModal level="floor" parentName={`${type.code} ${type.name}`} onAdd={(c, n) => { onAddFloor(type, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

// ---- Vehicle Components ----
function VehicleSection({
    vehicles,
    search,
    onEdit,
    onDelete,
    onToggleActive,
}: {
    vehicles: Vehicle[];
    search: string;
    onEdit: (vehicle: Vehicle) => void;
    onDelete: (vehicleId: number) => void;
    onToggleActive: (vehicleId: number) => void;
}) {
    const q = safeLower(search);
    const filtered = vehicles.filter((v) => {
        if (!q) return true;
        return (
            safeLower(v.license_plate).includes(q) ||
            safeLower(v.owner_name).includes(q) ||
            safeLower(v.owner_room).includes(q)
        );
    });

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={UI.table}>
                <thead>
                    <tr style={{ borderBottom: "1.5px solid #f1f5f9", textAlign: "left" }}>
                        <th style={UI.th}>เลขทะเบียน</th>
                        <th style={UI.th}>ประเภท</th>
                        <th style={UI.th}>สี</th>
                        <th style={UI.th}>ยี่ห้อ/รุ่น</th>
                        <th style={UI.th}>ห้อง</th>
                        <th style={UI.th}>เจ้าของ</th>
                        <th style={UI.th}>สถานะ</th>
                        <th style={{ ...UI.th, textAlign: "right" }}>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ ...UI.td, padding: "28px 12px" }}>
                                <div style={UI.emptyBox}>
                                    <div style={{ fontSize: 40, marginBottom: 10 }}>🚗</div>
                                    <div style={{ fontSize: 15, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
                                        ไม่พบข้อมูลทะเบียนรถ
                                    </div>
                                    <div style={{ color: "#94a3b8", fontSize: 13 }}>
                                        ลองเปลี่ยนคำค้นหา หรือเพิ่มทะเบียนรถใหม่
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filtered.map((v) => (
                            <tr key={v.vehicle_id} style={{ borderBottom: "1px solid #f8fafc" }}>
                                <td style={{ ...UI.td, fontWeight: 900, color: "#0f172a" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: 999,
                                                background: v.active ? "#10b981" : "#94a3b8",
                                                boxShadow: v.active ? "0 0 0 4px rgba(16,185,129,0.12)" : "none",
                                            }}
                                            title={v.active ? "Active" : "Inactive"}
                                        />
                                        <div>
                                            <div>{v.license_plate}</div>
                                            {v.province && (
                                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginTop: 2 }}>
                                                    {v.province}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td style={UI.td}>{v.vehicle_type || "-"}</td>
                                <td style={UI.td}>{v.color || "-"}</td>
                                <td style={UI.td}>
                                    {(v.brand || "-") + (v.model_name ? ` ${v.model_name}` : "")}
                                </td>
                                <td style={UI.td}>
                                    {v.owner_room ? <span style={UI.pill}>{v.owner_room}</span> : "-"}
                                </td>
                                <td style={UI.td}>{v.owner_name || "-"}</td>
                                <td style={UI.td}>
                                    <span style={{ ...UI.pill, background: v.active ? "#dcfce7" : "#f1f5f9", color: v.active ? "#166534" : "#334155" }}>
                                        {v.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                    </span>
                                </td>
                                <td style={{ ...UI.td, textAlign: "right" }}>
                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                        <button onClick={() => onEdit(v)} style={UI.iconBtn("primary")} title="แก้ไข">
                                            ✏️
                                        </button>
                                        <button onClick={() => onToggleActive(v.vehicle_id)} style={UI.iconBtn("neutral")} title="เปิด/ปิด">
                                            ⏻
                                        </button>
                                        <button onClick={() => onDelete(v.vehicle_id)} style={UI.iconBtn("danger")} title="ลบ">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function VehicleEditModal({
    data,
    onClose,
    onSave,
}: {
    data?: Vehicle;
    onClose: () => void;
    onSave: (value: VehicleFormValues) => void;
}) {
    const [form, setForm] = useState<VehicleFormValues>(toVehicleFormValues(data));

    return (
        <div style={UI.modalOverlay}>
            <div style={{ ...UI.modalCard, maxWidth: 720, padding: 18 }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>{data ? "แก้ไขข้อมูลรถ" : "เพิ่มทะเบียนรถใหม่"}</h3>
                <div style={UI.formGrid2}>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เลขทะเบียน (เช่น กก 1234)</label>
                        <input value={form.license_plate} onChange={e => setForm({...form, license_plate: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>จังหวัด</label>
                        <input value={form.province} onChange={e => setForm({...form, province: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ประเภท</label>
                        <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})} style={UI.control}>
                            <option value="รถยนต์">รถยนต์</option>
                            <option value="จักรยานยนต์">จักรยานยนต์</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>สี</label>
                        <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ยี่ห้อ</label>
                        <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>รุ่น</label>
                        <input value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} style={UI.control} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ชื่อเจ้าของ / ผู้ติดต่อ</label>
                        <input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เลขห้อง</label>
                        <input value={form.owner_room} onChange={e => setForm({...form, owner_room: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เบอร์โทรศัพท์</label>
                        <input value={form.owner_phone} onChange={e => setForm({...form, owner_phone: e.target.value})} style={UI.control} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เลขที่จอดรถ</label>
                        <input value={form.parking_slot} onChange={e => setForm({...form, parking_slot: e.target.value})} style={UI.control} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>หมายเหตุ</label>
                        <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={UI.textarea} />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "none", fontWeight: 700, cursor: "pointer" }}>ยกเลิก</button>
                    <button onClick={() => onSave(form)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#1e3a5f", color: "#fff", fontWeight: 700, cursor: "pointer" }}>บันทึกข้อมูล</button>
                </div>
            </div>
        </div>
    );
}

// ==================== MAIN COMPONENT ====================
export default function RoomManagement({
    quickActionPermissions,
}: {
    quickActionPermissions?: Partial<QuickActionPermissions>;
}) {
    const resolvedQuickActionPermissions: QuickActionPermissions = {
        canCreateMaintenance: quickActionPermissions?.canCreateMaintenance ?? true,
        canViewRoomAssets: quickActionPermissions?.canViewRoomAssets ?? true,
        canCreateAsset: quickActionPermissions?.canCreateAsset ?? true,
    };

    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"rooms" | "vehicles">("rooms");
    
    // Vehicle States
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleSearch, setVehicleSearch] = useState("");
    const [vehicleModal, setVehicleModal] = useState<{ show: boolean; data?: Vehicle } | null>(null);
    const [search, setSearch] = useState("");
    const [expandAll, setExpandAll] = useState(false);
    const [modal, setModal] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [roomServiceSummaries, setRoomServiceSummaries] = useState<RoomServiceSummary[]>([]);
    const [serviceTotals, setServiceTotals] = useState<ServiceTotals>(EMPTY_SERVICE_TOTALS);

    // Edit modal state
    const [editModal, setEditModal] = useState<{ roomId: number; level: string; code: string; name: string } | null>(null);
    // Detail modal state
    const [detailModal, setDetailModal] = useState<{
        level: string;
        code: string;
        name: string;
        originalId?: number;
        active?: boolean;
        children?: HierarchyDetailNode[];
    } | null>(null);

    // <-- UPDATED: showToast marks exiting and removes after animation -->
    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { type, text, id }]);

        // After visible duration, mark exiting to trigger exit animation
        const visibleMs = 3000;
        const exitAnimMs = 350; // must match CSS .toast-exit animation duration
        setTimeout(() => {
            setToasts(prev =>
                prev.map(t =>
                    t.id === id ? { ...t, exiting: true } : t
                )
            );

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, exitAnimMs);
        }, visibleMs);
    }, []);

    // optional: allow clicking toast to dismiss immediately
    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [roomsRes, vehiclesRes, summaryRes] = await Promise.all([
                getAllRooms(),
                getAllVehicles(),
                getRoomServiceSummary(),
            ]);
            
            if (roomsRes.success && roomsRes.data) {
                setRooms(roomsRes.data);
            }
            if (vehiclesRes) {
                setVehicles(vehiclesRes as Vehicle[]);
            }
            if (summaryRes.success && summaryRes.data) {
                setRoomServiceSummaries(summaryRes.data as RoomServiceSummary[]);
                setServiceTotals(summaryRes.totals || EMPTY_SERVICE_TOTALS);
            } else {
                setRoomServiceSummaries([]);
                setServiceTotals(EMPTY_SERVICE_TOTALS);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            showToast("error", "ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const buildVirtualTree = () => {
        const typesMap = new Map<string, TypeNode>();
        const activeRooms = rooms.filter(r => r.active);

        for (const r of activeRooms) {
            const tCode = r.room_type || 'GENERAL';
            const fCode = r.floor || 'FL-0';
            const rCode = r.room_code || 'N/A';
            const zCode = r.zone;

            // Extract real type name from dummy records like "[TYPE] ส่วนกลาง"
            let typeName = tCode;
            let typeId: number | undefined = undefined;
            if (r.room_name.startsWith('[TYPE] ')) {
                typeName = r.room_name.replace('[TYPE] ', '');
                typeId = r.room_id;
            }

            if (!typesMap.has(tCode)) {
                typesMap.set(tCode, { id: `T_${tCode}`, code: tCode, name: typeName, floors: [], originalId: typeId, active: true });
            } else {
                const node = typesMap.get(tCode)!;
                if (typeId) {
                    node.originalId = typeId;
                    node.name = typeName;
                }
            }
            const tNode = typesMap.get(tCode)!;

            // Extract real floor name from dummy records like "[FLOOR] ชั้น 2"
            let floorName = fCode;
            let floorId: number | undefined = undefined;
            if (r.room_name.startsWith('[FLOOR] ')) {
                floorName = r.room_name.replace('[FLOOR] ', '');
                floorId = r.room_id;
            }

            let fNode = tNode.floors.find(f => f.code === fCode);
            if (!fNode) {
                fNode = { id: `F_${tCode}_${fCode}`, code: fCode, name: floorName, rooms: [], originalId: floorId, active: true };
                tNode.floors.push(fNode);
            } else if (floorId) {
                fNode.originalId = floorId;
                fNode.name = floorName;
            }

            if (zCode) {
                const parentRoomCode = (r.building && r.building !== r.room_code) ? r.building : r.room_code;
                let parentRoom = fNode.rooms.find(rm => rm.code === parentRoomCode);
                if (!parentRoom) {
                    parentRoom = { id: `R_${tCode}_${fCode}_${parentRoomCode}`, code: parentRoomCode, name: parentRoomCode, zones: [] };
                    fNode.rooms.push(parentRoom);
                }
                parentRoom.zones.push({ id: `Z_${r.room_id}`, code: r.room_code, name: r.room_name, originalId: r.room_id, active: r.active });
            } else {
                let rNode = fNode.rooms.find(rm => rm.code === rCode);
                if (!rNode) {
                    rNode = { id: `R_${tCode}_${fCode}_${rCode}`, code: rCode, name: r.room_name, zones: [], originalId: r.room_id, active: r.active };
                    fNode.rooms.push(rNode);
                } else {
                    rNode.name = r.room_name;
                    rNode.originalId = r.room_id;
                    rNode.active = r.active;
                }
            }
        }
        return Array.from(typesMap.values());
    };

    const types = useMemo(buildVirtualTree, [rooms]);
    const roomSummaryLookup = useMemo(() => {
        return roomServiceSummaries.reduce<Record<number, RoomServiceSummary>>((acc, summary) => {
            acc[summary.room_id] = summary;
            return acc;
        }, {});
    }, [roomServiceSummaries]);
    const totalRooms = types.reduce((a, t) => a + t.floors.reduce((b, f) => b + f.rooms.length, 0), 0);

    const filteredTypes = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return types;
        return types.map(t => {
            const floors = t.floors.map(f => {
                const fRooms = f.rooms.map(r => {
                    const zones = r.zones.filter(z => z.code.toLowerCase().includes(q) || z.name.toLowerCase().includes(q));
                    return { ...r, zones };
                }).filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.zones.length > 0);
                return { ...f, rooms: fRooms };
            }).filter(f => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.rooms.length > 0);
            return { ...t, floors };
        }).filter(t => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.floors.length > 0);
    }, [types, search]);

    useEffect(() => {
        if (search && search.length > 0) setExpandAll(true);
        else setExpandAll(false);
    }, [search]);

    // Backend Handlers
    const deleteNode = async (roomId: number) => {
        const result = await Swal.fire({
            title: '<div style="font-size: 22px; font-weight: 800; margin-bottom: 8px;">ยืนยันการลบรายการ?</div>',
            html: '<div style="font-size: 15px; opacity: 0.8; line-height: 1.6;">การลบรายการนี้จะทำให้ข้อมูลที่เกี่ยวข้องทั้งหมด<br/><span style="color: #ef4444; font-weight: 600;">ถูกลบออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้</span></div>',
            icon: 'warning',
            iconColor: '#fbbf24',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ฉันต้องการลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'transparent',
            background: '#111827', // Gray 900
            color: '#f3f4f6', // Gray 100
            padding: '2.5rem',
            showClass: { popup: 'animate__animated animate__fadeInDown animate__faster' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp animate__faster' },
            buttonsStyling: false,
            customClass: {
                confirmButton: 'premium-swal-confirm',
                cancelButton: 'premium-swal-cancel',
                popup: 'premium-swal-popup'
            }
        });

        if (!result.isConfirmed) return;
        const res = await deleteRoom(roomId);
        if (res.success) {
            showToast('success', 'ลบเรียบร้อยแล้ว');
            loadData();
        } else showToast('error', res.error || 'ลบไม่สำเร็จ');
    };

    const handleCreateType = async (code: string, name: string) => {
        const ts = Date.now().toString(36).slice(-6);
        const shortCode = code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
        const res = await createRoom({ room_type: code, floor: 'FL-00', room_code: `T-${shortCode}-${ts}`, room_name: `[TYPE] ${name}` });
        if (res.success) {
            showToast('success', 'เพิ่มประเภทห้องใหม่เรียบร้อยแล้ว');
            loadData();
        } else showToast('error', res.error || 'บันทึกไม่สำเร็จ');
    };

    const handleCreateFloor = async (type: TypeNode, fCode: string, fName: string) => {
        const ts = Date.now().toString(36).slice(-6);
        const shortCode = fCode.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
        const res = await createRoom({ room_type: type.code, floor: fCode, room_code: `F-${shortCode}-${ts}`, room_name: `[FLOOR] ${fName}` });
        if (res.success) {
            showToast('success', 'เพิ่มชั้นใหม่เรียบร้อยแล้ว');
            loadData();
        } else showToast('error', res.error || 'บันทึกไม่สำเร็จ');
    };

    const handleCreateRoom = async (floor: FloorNode, rCode: string, rName: string) => {
        const parts = floor.id.split('_');
        const tCode = parts[1];
        const res = await createRoom({ room_type: tCode, floor: floor.code, room_code: rCode, room_name: rName });
        if (res.success) {
            showToast('success', 'เพิ่มห้องใหม่เรียบร้อยแล้ว');
            loadData();
        } else showToast('error', res.error || 'บันทึกไม่สำเร็จ');
    };

    const handleCreateZone = async (room: RoomNode, zCode: string, zName: string) => {
        const parts = room.id.split('_');
        const tCode = parts[1];
        const fCode = parts[2];
        const res = await createRoom({
            room_type: tCode,
            floor: fCode,
            building: room.code,
            room_code: `${room.code}-${zCode.toUpperCase()}`,
            room_name: zName,
            zone: zCode.toUpperCase()
        });
        if (res.success) {
            showToast('success', 'เพิ่มโซนใหม่เรียบร้อยแล้ว');
            loadData();
        } else showToast('error', res.error || 'บันทึกไม่สำเร็จ');
    };

    const handleCreateZonesBulk = async (room: RoomNode, zonesText: string) => {
        const parts = room.id.split('_');
        const tCode = parts[1];
        const fCode = parts[2];

        const zoneList = zonesText.split(',').map(z => z.trim()).filter(z => z !== '');

        if (zoneList.length === 0) return;

        const roomsData = zoneList.map(z => ({
            room_type: tCode,
            floor: fCode,
            building: room.code,
            room_code: `${room.code}-${z.toUpperCase()}`,
            room_name: z,
            zone: z.toUpperCase()
        }));

        const res = await createRoomsBulk(roomsData);
        if (res.success) {
            showToast('success', `เพิ่ม ${res.count} โซนเรียบร้อยแล้ว`);
            loadData();
        } else showToast('error', res.error || 'บันทึกไม่สำเร็จ');
    };

    const handleEditSave = async (newCode: string, newName: string) => {
        if (!editModal) return;
        const res = await updateRoom(editModal.roomId, { room_code: newCode, room_name: newName });
        if (res.success) {
            showToast('success', 'แก้ไขเรียบร้อยแล้ว');
            setEditModal(null);
            loadData();
        } else showToast('error', res.error || 'แก้ไขไม่สำเร็จ');
    };

    const openEdit = (id: number, level: string, code: string, name: string) => {
        setEditModal({ roomId: id, level, code, name });
    };

    const handleDeleteVehicle = async (id: number) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบข้อมูลรถ?',
            text: "ข้อมูลนี้จะถูกลบออกจากระบบอย่างถาวร",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก',
            background: '#111827',
            color: '#fff'
        });

        if (result.isConfirmed) {
            const res = await deleteVehicle(id);
            if (res.success) {
                showToast('success', 'ลบข้อมูลเรียบร้อยแล้ว');
                loadData();
            } else showToast('error', res.error || 'ลบไม่สำเร็จ');
        }
    };

    const handleToggleVehicleActive = async (id: number) => {
        const res = await toggleVehicleActive(id);
        if (res.success) {
            showToast('success', res.vehicle?.active ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
            loadData();
        } else {
            showToast('error', res.error || 'เปลี่ยนสถานะไม่สำเร็จ');
        }
    };

    const openDetail = (
        level: string,
        code: string,
        name: string,
        originalId?: number,
        active?: boolean,
        children?: HierarchyDetailNode[]
    ) => {
        setDetailModal({ level, code, name, originalId, active, children });
    };

    return (
        <div style={{ minHeight: "100vh", background: UI.pageBg, fontFamily: "'Sarabun', sans-serif" }}>

            {/* Premium Toast */}
            <div className="toast-container" aria-live="polite">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`toast ${t.type} ${t.exiting ? "toast-exit" : ""}`}
                        onClick={() => dismissToast(t.id)}
                        role="status"
                        title="คลิกเพื่อปิด"
                    >
                        <div className="toast-icon">
                            {t.type === 'success' ? '✓' : '✕'}
                        </div>
                        <div className="toast-body">
                            <div className="toast-text">{t.text}</div>
                            <div className="toast-progress" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Header Section */}
            <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", padding: "40px 40px 0", color: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}> Admin Dashboard </h1>
                        <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 15 }}> จัดการโครงสร้างห้องพักและข้อมูลทะเบียนรถยนต์ </p>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end", opacity: 0.95 }}>
                        <span style={{ ...UI.pill, background: "#dcfce7", color: "#166534" }}>
                            ใช้งาน {serviceTotals.active_rooms}
                        </span>
                        <span style={{ ...UI.pill, background: "#fef3c7", color: "#92400e" }}>
                            งานซ่อมเปิด {serviceTotals.maintenance_open}
                        </span>
                        <span style={{ ...UI.pill, background: "#dbeafe", color: "#1d4ed8" }}>
                            ทรัพย์สิน {serviceTotals.asset_total}
                        </span>
                    </div>
                </div>
                
                {/* Tab Switcher */}
                <div style={{ display: "flex", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 0 }}>
                    <button 
                        onClick={() => setActiveTab("rooms")}
                        style={{ 
                            padding: "12px 24px", 
                            background: activeTab === "rooms" ? "rgba(255,255,255,0.1)" : "transparent",
                            border: "none",
                            borderBottom: activeTab === "rooms" ? "3px solid #10b981" : "3px solid transparent",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 15,
                            transition: "all 0.2s"
                        }}
                    >
                        🏢 จัดการห้องพัก
                    </button>
                    <button 
                        onClick={() => setActiveTab("vehicles")}
                        style={{ 
                            padding: "12px 24px", 
                            background: activeTab === "vehicles" ? "rgba(255,255,255,0.1)" : "transparent",
                            border: "none",
                            borderBottom: activeTab === "vehicles" ? "3px solid #10b981" : "3px solid transparent",
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 15,
                            transition: "all 0.2s"
                        }}
                    >
                        🚗 ทะเบียนรถยนต์
                    </button>
                </div>
            </div>

            <div style={{ padding: "24px 40px" }}>
                {activeTab === "rooms" ? (
                    <ManagementCard
                        icon="🏘️"
                        title="จัดการห้องพัก"
                        subtitle="สร้างโครงสร้างประเภท > ชั้น > ห้อง > โซน"
                        headerRight={
                            <>
                                <span style={UI.pill}>{totalRooms} ห้อง</span>
                                <span style={{ ...UI.pill, background: "#fef3c7", color: "#92400e" }}>
                                    งานซ่อมเปิด {serviceTotals.maintenance_open}
                                </span>
                                <span style={{ ...UI.pill, background: "#dbeafe", color: "#1d4ed8" }}>
                                    ทรัพย์สิน {serviceTotals.asset_total}
                                </span>
                                <button onClick={() => setModal(true)} style={UI.btnPrimary}>
                                    + เพิ่มประเภทใหม่
                                </button>
                            </>
                        }
                    >
                        {/* Toolbar */}
                        <div style={UI.toolbar}>
                            <div style={UI.inputWrap}>
                                <span style={UI.inputIcon}>🔍</span>
                                <input
                                    value={search} onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหารหัส, ชื่อ..."
                                    style={UI.input}
                                />
                            </div>
                            <button onClick={() => setExpandAll((v) => !v)} style={UI.btnSecondary}>
                                {expandAll ? "พับทั้งหมด" : "กางทั้งหมด"}
                            </button>
                            <button onClick={() => loadData()} style={UI.btnSecondary}>
                                รีโหลดข้อมูล
                            </button>
                            <button onClick={() => setModal(true)} style={{ display: "none", padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1e3a5f, #3b82f6)", color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", boxShadow: "0 4px 14px #3b82f633" }}>
                                + เพิ่มประเภทใหม่
                            </button>
                        </div>

                        {/* Tree */}
                        <div>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "64px 20px", background: "#fff", borderRadius: 16, border: "1.5px dashed #e2e8f0" }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>กำลังโหลดข้อมูลห้อง...</div>
                                </div>
                            ) : filteredTypes.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "64px 20px", background: "#fff", borderRadius: 16, border: "1.5px dashed #e2e8f0" }}>
                                    <div style={{ fontSize: 52, marginBottom: 12 }}>🏢</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                                        {search ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีข้อมูลห้อง"}
                                    </div>
                                    <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
                                        {search ? "ลองเปลี่ยนคำค้นหา" : "เริ่มต้นด้วยการเพิ่มประเภทห้องแรก"}
                                    </div>
                                    {!search && (
                                        <button onClick={() => setModal(true)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700 }}>
                                            + เพิ่มรายการแรก
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredTypes.map(type => (
                                    <TypeRow
                                        key={type.id} type={type}
                                        roomSummaryMap={roomSummaryLookup}
                                        quickActionPermissions={resolvedQuickActionPermissions}
                                        onDelete={deleteNode}
                                        onAddFloor={handleCreateFloor}
                                        onAddRoom={handleCreateRoom}
                                        onAddZone={handleCreateZone}
                                        onAddZonesBulk={handleCreateZonesBulk}
                                        onEdit={openEdit}
                                        onDetail={openDetail}
                                        expandAll={expandAll}
                                    />
                                ))
                            )}
                        </div>
                    </ManagementCard>
                ) : (
                    <ManagementCard
                        icon="🚗"
                        title="ทะเบียนรถยนต์"
                        subtitle="ค้นหา / เพิ่ม / เปิด-ปิด / ลบข้อมูลทะเบียนรถ"
                        headerRight={
                            <>
                                <span style={UI.pill}>{vehicles.length} รายการ</span>
                                <button onClick={() => setVehicleModal({ show: true })} style={UI.btnSuccess}>
                                    + เพิ่มทะเบียนรถ
                                </button>
                            </>
                        }
                    >
                        <div style={UI.toolbar}>
                            <div style={UI.inputWrap}>
                                <span style={UI.inputIcon}>🔍</span>
                                <input
                                    value={vehicleSearch}
                                    onChange={(e) => setVehicleSearch(e.target.value)}
                                    placeholder="ค้นหาทะเบียน, ชื่อเจ้าของ, ห้อง..."
                                    style={UI.input}
                                />
                            </div>
                            <button onClick={() => loadData()} style={UI.btnSecondary}>
                                รีโหลดข้อมูล
                            </button>
                        </div>

                        {loading ? (
                            <div style={UI.emptyBox}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: "#334155" }}>กำลังโหลดข้อมูลทะเบียนรถ...</div>
                            </div>
                        ) : (
                            <VehicleSection
                                vehicles={vehicles}
                                search={vehicleSearch}
                                onEdit={(v: Vehicle) => setVehicleModal({ show: true, data: v })}
                                onDelete={handleDeleteVehicle}
                                onToggleActive={handleToggleVehicleActive}
                            />
                        )}
                    </ManagementCard>
                )}
            </div>

            {/* Modals */}
            {modal && (
                <AddModal level="type" parentName={null} onAdd={handleCreateType} onClose={() => setModal(false)} />
            )}
            
            {editModal && (
                <div style={UI.modalOverlay}>
                    <div style={{ ...UI.modalCard, maxWidth: 520, padding: 18 }}>
                        <h3 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}> แก้ไข {LEVEL_LABELS[editModal.level as keyof typeof LEVEL_LABELS]} </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>รหัส</label>
                                <input value={editModal.code} onChange={e => setEditModal({ ...editModal, code: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ชื่อ</label>
                                <input value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                            <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "none", fontWeight: 700, cursor: "pointer" }}> ยกเลิก </button>
                            <button onClick={() => handleEditSave(editModal.code, editModal.name)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#1e3a5f", color: "#fff", fontWeight: 700, cursor: "pointer" }}> บันทึก </button>
                        </div>
                    </div>
                </div>
            )}

            {detailModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 650, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
                        <div style={{ background: "linear-gradient(135deg, #1e3a5f, #0f172a)", padding: "24px 32px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, textTransform: "uppercase" }}> {LEVEL_LABELS[detailModal.level as keyof typeof LEVEL_LABELS]} Details </div>
                                <h3 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}> {detailModal.code} - {detailModal.name} </h3>
                            </div>
                            <button onClick={() => setDetailModal(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 20 }}> × </button>
                        </div>
                        
                        <div style={{ padding: 32, overflowY: "auto", flex: 1 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
                                <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1.5px solid #f1f5f9" }}>
                                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>สถานะการใช้งาน</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: detailModal.active ? "#10b981" : "#ef4444" }}></div>
                                        <span style={{ fontWeight: 700, fontSize: 16 }}> {detailModal.active ? "เปิดใช้งานอยู่ในระบบ" : "ปิดใช้งานชั่วคราว"} </span>
                                    </div>
                                </div>
                                <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1.5px solid #f1f5f9" }}>
                                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>ID ในระบบ</div>
                                    <div style={{ fontWeight: 800, fontSize: 16 }}> #{detailModal.originalId || "N/A"} </div>
                                </div>
                            </div>
                            
                            {detailModal.level === 'room' && detailModal.children && (
                                <div>
                                    <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}>
                                        📍 โซนย่อยในห้องนี้ ({detailModal.children.length})
                                    </h4>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                                        {detailModal.children.map((z) => (
                                            <div key={z.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                                                {z.code} - {z.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div style={{ padding: "20px 32px", borderTop: "1.5px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#f8fafc" }}>
                            {detailModal.originalId && (
                                <button
                                    onClick={async () => {
                                        const res = await toggleRoomActive(detailModal.originalId!);
                                        if (res.success) {
                                            showToast('success', 'เปลี่ยนสถานะเรียบร้อยแล้ว');
                                            setDetailModal(null);
                                            loadData();
                                        }
                                    }}
                                    style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
                                >
                                    {detailModal.active ? "🚫 ปิดใช้งาน" : "✅ เปิดใช้งาน"}
                                </button>
                            )}
                            <button onClick={() => setDetailModal(null)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#1e3a5f", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}> ตกลง </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Edit Modal */}
            {vehicleModal?.show && (
                <VehicleEditModal 
                    data={vehicleModal.data} 
                    onClose={() => setVehicleModal(null)} 
                    onSave={async (v: VehicleFormValues) => {
                        const res = v.vehicle_id 
                            ? await updateVehicle(v.vehicle_id, v)
                            : await createVehicle(v);
                        if (res.success) {
                            showToast('success', 'บันทึกข้อมูลสำเร็จ');
                            setVehicleModal(null);
                            loadData();
                        } else showToast('error', res.error || 'บันทึกไม่สำเร็จ');
                    }}
                />
            )}
            <style>{`
                /* =========================
                   PREMIUM TOAST SYSTEM
                ========================= */
                .toast-container{
                    position:fixed;
                    top:24px;
                    right:24px;
                    z-index:9999;
                    display:flex;
                    flex-direction:column;
                    gap:12px;
                    pointer-events: none; /* allow clicks only on toasts themselves */
                }

                .toast{
                    pointer-events: auto;
                    display:flex;
                    align-items:center;
                    gap:14px;

                    min-width:260px;
                    max-width:420px;

                    padding:14px 18px;

                    border-radius:14px;

                    backdrop-filter:blur(12px);

                    color:white;

                    font-size:14px;
                    font-weight:600;

                    box-shadow:
                        0 15px 35px rgba(0,0,0,0.35),
                        0 4px 10px rgba(0,0,0,0.2);

                    animation:toastSlideIn .35s ease;

                    overflow:hidden;
                    cursor: pointer;
                }

                .toast.success{
                    background:linear-gradient(135deg,#10b981,#059669);
                }

                .toast.error{
                    background:linear-gradient(135deg,#ef4444,#dc2626);
                }

                .toast-icon{
                    font-size:20px;
                    font-weight:800;
                    width:30px;
                    text-align:center;
                }

                .toast-body{
                    flex:1;
                }

                .toast-text{
                    line-height:1.4;
                }

                .toast-progress{
                    margin-top:8px;
                    height:3px;
                    background:rgba(255,255,255,0.9);
                    border-radius:3px;
                    animation:toastProgress 3s linear forwards;
                }

                @keyframes toastSlideIn{
                    from{
                        opacity:0;
                        transform:translateX(60px) scale(.95);
                    }
                    to{
                        opacity:1;
                        transform:translateX(0) scale(1);
                    }
                }

                .toast-exit{
                    animation:toastExit .35s forwards;
                }

                @keyframes toastExit{
                    to{
                        opacity:0;
                        transform:translateX(40px) scale(.98);
                        height:0;
                        margin:0;
                        padding:0;
                        }
                }

                @keyframes toastProgress{
                    from{width:100%}
                    to{width:0%}
                }

                /* -------------------------
                   SweetAlert custom styles
                ------------------------- */
                .premium-swal-popup {
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    font-family: 'Sarabun', sans-serif !important;
                    border-radius: 24px !important;
                }
                .premium-swal-confirm {
                    padding: 12px 32px !important;
                    border-radius: 12px !important;
                    background: #ef4444 !important;
                    color: white !important;
                    font-weight: 700 !important;
                    font-size: 15px !important;
                    border: none !important;
                    cursor: pointer !important;
                    margin: 0 8px !important;
                    transition: all 0.2s !important;
                }
                .premium-swal-confirm:hover {
                    background: #dc2626 !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3) !important;
                }
                .premium-swal-cancel {
                    padding: 12px 32px !important;
                    border-radius: 12px !important;
                    background: transparent !important;
                    color: #94a3b8 !important;
                    font-weight: 600 !important;
                    font-size: 15px !important;
                    border: 1px solid #334155 !important;
                    cursor: pointer !important;
                    margin: 0 8px !important;
                    transition: all 0.2s !important;
                }
                .premium-swal-cancel:hover {
                    background: #1f2937 !important;
                    color: white !important;
                }
            `}</style>
        </div>
    );
}

