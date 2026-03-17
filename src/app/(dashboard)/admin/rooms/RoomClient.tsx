'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { getAllRooms, createRoom, createRoomsBulk, updateRoom, deleteRoom, toggleRoomActive } from '@/actions/maintenanceActions';
import { getAllVehicles, createVehicle, updateVehicle, deleteVehicle, toggleVehicleActive, VehicleData } from '@/actions/vehicleActions';
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

// ---- AddModal ----
function AddModal({ level, parentName, onAdd, onClose, loading }: { level: string; parentName: string | null; onAdd: (c: string, n: string) => void; onClose: () => void; loading?: boolean }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const col = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS];
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", minWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: `2px solid ${col.accent}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}> {ICONS[level as keyof typeof ICONS]} </span>
                    <div>
                        <div style={{ fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 18, color: col.bg }}>
                            เพิ่ม{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} ใหม่
                        </div>
                        {parentName && (<div style={{ fontSize: 12, color: "#94a3b8" }}> ภายใต้: {parentName} </div>)}
                    </div>
                </div>
                <hr style={{ border: "none", borderTop: `2px solid ${col.light}`, margin: "16px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                            รหัส{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} *
                        </label>
                        <input value={code} onChange={e => setCode(e.target.value)}
                            placeholder={`เช่น ${level === "type" ? "TYPE-01" : level === "floor" ? "FL-01" : level === "room" ? "RM-101" : "ZN-A"}`}
                            disabled={loading}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box", border: `1.5px solid ${code ? col.accent : "#e2e8f0"}`, fontSize: 14, outline: "none", fontFamily: "'Sarabun', sans-serif", transition: "border-color 0.2s" }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                            ชื่อ{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} *
                        </label>
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder={`กรอกชื่อ${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`}
                            disabled={loading}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box", border: `1.5px solid ${name ? col.accent : "#e2e8f0"}`, fontSize: 14, outline: "none", fontFamily: "'Sarabun', sans-serif", transition: "border-color 0.2s" }}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ padding: "9px 22px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 14 }}> ยกเลิก </button>
                    <button onClick={() => { if (code && name) onAdd(code.trim(), name.trim()); }} disabled={!code || !name || loading}
                        style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: code && name ? col.accent : "#e2e8f0", color: code && name ? "#fff" : "#94a3b8", cursor: code && name && !loading ? "pointer" : "not-allowed", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 14, transition: "background 0.2s" }}
                    > {loading ? 'กำลังบันทึก...' : `+ เพิ่ม${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`}</button>
                </div>
            </div>
        </div>
    );
}

// ---- EditModal ----
function EditModal({ level, initialCode, initialName, onSave, onClose, loading }: {
    level: string; initialCode: string; initialName: string;
    onSave: (newCode: string, newName: string) => void; onClose: () => void; loading?: boolean;
}) {
    const [code, setCode] = useState(initialCode);
    const [name, setName] = useState(initialName);
    const col = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS];
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", minWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: `2px solid ${col.accent}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>✏️</span>
                    <div>
                        <div style={{ fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 18, color: col.bg }}>
                            แก้ไข{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>รหัสเดิม: {initialCode}</div>
                    </div>
                </div>
                <hr style={{ border: "none", borderTop: `2px solid ${col.light}`, margin: "16px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                            รหัส{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}
                        </label>
                        <input value={code} onChange={e => setCode(e.target.value)} disabled={loading}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box", border: `1.5px solid ${col.accent}`, fontSize: 14, outline: "none", fontFamily: "'Sarabun', sans-serif" }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                            ชื่อ{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}
                        </label>
                        <input value={name} onChange={e => setName(e.target.value)} disabled={loading}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box", border: `1.5px solid ${col.accent}`, fontSize: 14, outline: "none", fontFamily: "'Sarabun', sans-serif" }}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ padding: "9px 22px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 14 }}>ยกเลิก</button>
                    <button onClick={() => { if (code && name) onSave(code.trim(), name.trim()); }} disabled={!code || !name || loading}
                        style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: col.accent, color: "#fff", cursor: code && name && !loading ? "pointer" : "not-allowed", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 14 }}
                    >{loading ? 'กำลังบันทึก...' : '💾 บันทึก'}</button>
                </div>
            </div>
        </div>
    );
}

// ---- DetailModal ----
function DetailModal({ level, code, name, originalId, active, rooms, onClose }: {
    level: string; code: string; name: string; originalId?: number; active?: boolean; rooms?: any; onClose: () => void;
}) {
    const col = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS];
    const lbl = LEVEL_LABELS[level as keyof typeof LEVEL_LABELS];
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", minWidth: 400, maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: `2px solid ${col.accent}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>{ICONS[level as keyof typeof ICONS]}</span>
                    <div>
                        <div style={{ fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 18, color: col.bg }}>
                            รายละเอียด{lbl}
                        </div>
                    </div>
                </div>
                <hr style={{ border: "none", borderTop: `2px solid ${col.light}`, margin: "16px 0" }} />
                <table style={{ width: "100%", fontFamily: "'Sarabun', sans-serif", fontSize: 14, borderCollapse: "collapse" }}>
                    <tbody>
                        {[
                            ["รหัส", code],
                            ["ชื่อ", name],
                            ...(originalId ? [["DB ID", String(originalId)]] : []),
                            ...(active !== undefined ? [["สถานะ", active ? "✅ เปิดใช้งาน" : "❌ ปิดใช้งาน"]] : []),
                        ].map(([k, v], i) => (
                            <tr key={i}>
                                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#475569", borderBottom: "1px solid #f1f5f9", width: 100 }}>{k}</td>
                                <td style={{ padding: "8px 12px", color: "#1e293b", borderBottom: "1px solid #f1f5f9" }}>{v}</td>
                            </tr>
                        ))}
                        {rooms && rooms.length > 0 && (
                            <tr>
                                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#475569", verticalAlign: "top" }}>รายการย่อย</td>
                                <td style={{ padding: "8px 12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {rooms.map((r: any, i: number) => (
                                            <span key={i} style={{ fontSize: 13, background: "#f1f5f9", borderRadius: 6, padding: "3px 10px", display: "inline-block" }}>
                                                {r.code || r.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                    <button onClick={onClose} style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: col.accent, color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 14 }}>ปิด</button>
                </div>
            </div>
        </div>
    );
}

// ---- ZoneRow ----
function ZoneRow({ zone, onDelete, onEdit, onDetail }: {
    zone: ZoneNode; onDelete: (zid: number) => void; onEdit: (id: number, level: string, code: string, name: string) => void; onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean) => void;
}) {
    const col = LEVEL_COLORS.zone;
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px 9px 48px", background: col.light, borderRadius: 8, marginBottom: 4, border: `1px solid ${col.accent}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}> {ICONS.zone} </span>
                <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 13, color: "#374151" }}>
                    <span style={{ fontWeight: 700, color: col.accent }}> {zone.code} </span>
                    <span style={{ color: "#6b7280", marginLeft: 8 }}> {zone.name} </span>
                </span>
                <span style={{ fontSize: 11, background: col.accent, color: "#fff", borderRadius: 6, padding: "1px 8px", fontWeight: 600 }}> โซน </span>
                {!zone.active && <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', borderRadius: 6, padding: "1px 8px", fontWeight: 600 }}>ปิด</span>}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button onClick={() => onDetail("zone", zone.code, zone.name, zone.originalId, zone.active)} style={iconBtnStyle("#3b82f6")} title="ดูรายละเอียด">👁️</button>
                <button onClick={() => zone.originalId && onEdit(zone.originalId, "zone", zone.code, zone.name)} style={iconBtnStyle("#f59e0b")} title="แก้ไข">✏️</button>
                <button onClick={() => zone.originalId && onDelete(zone.originalId)} style={iconBtnStyle("#ef4444")} title="ลบ">🗑️</button>
            </div>
        </div>
    );
}

// ---- RoomRow ----
function RoomRow({ room, onDelete, onAddZone, onAddZonesBulk, onEdit, onDetail, expandAll }: {
    room: RoomNode; onDelete: (rid: number) => void; onAddZone: (room: RoomNode, code: string, name: string) => void;
    onAddZonesBulk: (room: RoomNode, text: string) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void; onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: any) => void;
    expandAll: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState(false);
    const col = LEVEL_COLORS.room;

    useEffect(() => { if (expandAll) setOpen(true); }, [expandAll]);

    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 10px 32px", background: open ? col.light : "#fff", border: `1.5px solid ${open ? col.accent : "#e2e8f0"}`, borderRadius: open && room.zones.length ? "10px 10px 0 0" : 10, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setOpen(v => !v)}>
                    <span style={{ fontSize: 15 }}> {ICONS.room} </span>
                    <span style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 13, color: "#374151" }}>
                        <span style={{ fontWeight: 700, color: col.accent }}> {room.code} </span>
                        <span style={{ color: "#6b7280", marginLeft: 8 }}> {room.name} </span>
                    </span>
                    <span style={{ fontSize: 11, background: col.accent + "22", color: col.accent, borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}> ห้อง </span>
                    {!room.active && <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', borderRadius: 6, padding: "1px 8px", fontWeight: 600 }}>ปิด</span>}
                    {room.zones.length > 0 && (<span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 6, padding: "1px 8px" }}>{room.zones.length} โซน</span>)}
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <button onClick={e => { e.stopPropagation(); onDetail("room", room.code, room.name, room.originalId, room.active, room.zones); }} style={iconBtnStyle("#3b82f6")} title="ดูรายละเอียด">👁️</button>
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
                    <span onClick={() => setOpen(v => !v)} style={{ color: "#94a3b8", fontSize: 16, userSelect: "none", cursor: "pointer" }}>{open ? "▴" : "▾"}</span>
                </div>
            </div>
            {open && room.zones.length > 0 && (
                <div style={{ background: "#fafbfc", border: `1.5px solid ${col.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 4px" }}>
                    {room.zones.map(z => (<ZoneRow key={z.id} zone={z} onDelete={onDelete} onEdit={onEdit} onDetail={onDetail} />))}
                </div>
            )}
            {modal && (<AddModal level="zone" parentName={`${room.code} ${room.name}`} onAdd={(c, n) => { onAddZone(room, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

// ---- FloorRow ----
function FloorRow({ floor, onDelete, onAddRoom, onAddZone, onAddZonesBulk, onEdit, onDetail, expandAll }: {
    floor: FloorNode; onDelete: (id: number) => void; onAddRoom: (floor: FloorNode, c: string, n: string) => void;
    onAddZone: (room: RoomNode, c: string, n: string) => void;
    onAddZonesBulk: (room: RoomNode, text: string) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void; onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: any) => void;
    expandAll: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState(false);
    const col = LEVEL_COLORS.floor;

    useEffect(() => { if (expandAll) setOpen(true); }, [expandAll]);

    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px 11px 18px", background: open ? col.light : "#f8fafc", border: `1.5px solid ${open ? col.accent : "#e2e8f0"}`, borderRadius: open && floor.rooms.length ? "10px 10px 0 0" : 10, cursor: "pointer", transition: "all 0.15s" }}>
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
                    <button onClick={e => { e.stopPropagation(); onDetail("floor", floor.code, floor.name, floor.originalId, floor.active, floor.rooms); }} style={iconBtnStyle("#3b82f6")} title="ดูรายละเอียด">👁️</button>
                    {floor.originalId && (
                        <>
                            <button onClick={e => { e.stopPropagation(); onEdit(floor.originalId!, "floor", floor.code, floor.name); }} style={iconBtnStyle("#f59e0b")} title="แก้ไข">✏️</button>
                            <button onClick={e => { e.stopPropagation(); onDelete(floor.originalId!); }} style={iconBtnStyle("#ef4444")} title="ลบชั้นนี้">🗑️</button>
                        </>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${col.accent}`, background: col.light, color: col.accent, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 11 }}> + ห้อง </button>
                    <span onClick={() => setOpen(v => !v)} style={{ color: "#94a3b8", fontSize: 16, userSelect: "none", cursor: "pointer", marginLeft: 4 }}>{open ? "▴" : "▾"}</span>
                </div>
            </div>
            {open && floor.rooms.length > 0 && (
                <div style={{ background: "#f8fafc", border: `1.5px solid ${col.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 4px" }}>
                    {floor.rooms.map(r => (<RoomRow key={r.id} room={r} onDelete={onDelete} onAddZone={onAddZone} onAddZonesBulk={onAddZonesBulk} onEdit={onEdit} onDetail={onDetail} expandAll={expandAll} />))}
                </div>
            )}
            {modal && (<AddModal level="room" parentName={`${floor.code} ${floor.name}`} onAdd={(c, n) => { onAddRoom(floor, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

// ---- TypeRow ----
function TypeRow({ type, onDelete, onAddFloor, onAddRoom, onAddZone, onAddZonesBulk, onEdit, onDetail, expandAll }: {
    type: TypeNode; onDelete: (id: number) => void; onAddFloor: (type: TypeNode, c: string, n: string) => void;
    onAddRoom: (floor: FloorNode, c: string, n: string) => void;
    onAddZone: (room: RoomNode, c: string, n: string) => void;
    onAddZonesBulk: (room: RoomNode, text: string) => void;
    onEdit: (id: number, level: string, code: string, name: string) => void; onDetail: (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: any) => void;
    expandAll: boolean;
}) {
    const [open, setOpen] = useState(true);
    const [modal, setModal] = useState(false);
    const col = LEVEL_COLORS.type;

    useEffect(() => { if (expandAll) setOpen(true); }, [expandAll]);

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: `linear-gradient(135deg, ${col.bg}, #2d4a7a)`, borderRadius: open && type.floors.length > 0 ? "12px 12px 0 0" : 12, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(30,58,95,0.3)" }}>
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
                        style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", padding: "4px 8px", fontSize: 13, color: "#fff" }} title="ดูรายละเอียด">👁️</button>
                    {type.originalId && (
                        <>
                            <button onClick={e => { e.stopPropagation(); onEdit(type.originalId!, "type", type.code, type.name); }}
                                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", padding: "4px 8px", fontSize: 13, color: "#fff" }} title="แก้ไข">✏️</button>
                            <button onClick={e => { e.stopPropagation(); onDelete(type.originalId!); }}
                                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", padding: "4px 8px", fontSize: 13, color: "#fff" }} title="ลบประเภทนี้">🗑️</button>
                        </>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 12 }}> + ชั้น </button>
                    <span onClick={() => setOpen(v => !v)} style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, userSelect: "none", cursor: "pointer", marginLeft: 4 }}>{open ? "▴" : "▾"}</span>
                </div>
            </div>
            {open && type.floors.length > 0 && (
                <div style={{ background: "#fff", border: `1.5px solid ${col.accent}44`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "10px 10px 6px" }}>
                    {type.floors.map(floor => (<FloorRow key={floor.id} floor={floor} onDelete={onDelete} onAddRoom={onAddRoom} onAddZone={onAddZone} onAddZonesBulk={onAddZonesBulk} onEdit={onEdit} onDetail={onDetail} expandAll={expandAll} />))}
                </div>
            )}
            {modal && (<AddModal level="floor" parentName={`${type.code} ${type.name}`} onAdd={(c, n) => { onAddFloor(type, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

// ---- Vehicle Components ----
function VehicleSection({ vehicles, search, setSearch, onEdit, onAdd }: any) {
    const filtered = vehicles.filter((v: any) => 
        v.plate_number.toLowerCase().includes(search.toLowerCase()) ||
        v.owner_name.toLowerCase().includes(search.toLowerCase()) ||
        v.room_code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1.5px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}> รายการทะเบียนรถยนต์ ({filtered.length}) </h2>
                <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาทะเบียน, ชื่อ, ห้อง..." 
                            style={{ padding: "8px 12px 8px 36px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, minWidth: 260, outline: "none" }} />
                    </div>
                    <button onClick={onAdd} style={{ padding: "8px 16px", borderRadius: 8, background: "#10b981", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}> + เพิ่มทะเบียนรถ </button>
                </div>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                        <tr style={{ borderBottom: "1.5px solid #f1f5f9", textAlign: "left" }}>
                            <th style={{ padding: "12px 16px", color: "#64748b" }}>เลขทะเบียน</th>
                            <th style={{ padding: "12px 16px", color: "#64748b" }}>ประเภท</th>
                            <th style={{ padding: "12px 16px", color: "#64748b" }}>สี</th>
                            <th style={{ padding: "12px 16px", color: "#64748b" }}>ยี่ห้อ/รุ่น</th>
                            <th style={{ padding: "12px 16px", color: "#64748b" }}>ห้อง</th>
                            <th style={{ padding: "12px 16px", color: "#64748b" }}>เจ้าของ</th>
                            <th style={{ padding: "12px 16px", color: "#64748b", textAlign: "center" }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>ไม่พบข้อมูลรถยนต์</td></tr>
                        ) : filtered.map((v: any) => (
                            <tr key={v.vehicle_id} style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.2s" }}>
                                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1e293b" }}>{v.plate_number}</td>
                                <td style={{ padding: "12px 16px" }}>{v.vehicle_type}</td>
                                <td style={{ padding: "12px 16px" }}>{v.color || "-"}</td>
                                <td style={{ padding: "12px 16px" }}>{v.brand} {v.model}</td>
                                <td style={{ padding: "12px 16px" }}><span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{v.room_code}</span></td>
                                <td style={{ padding: "12px 16px" }}>{v.owner_name}</td>
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                    <button onClick={() => onEdit(v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✏️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function VehicleEditModal({ data, onClose, onSave }: any) {
    const [form, setForm] = useState(data || {
        plate_number: "",
        vehicle_type: "รถยนต์",
        brand: "",
        model: "",
        color: "",
        owner_name: "",
        room_code: "",
        phone: ""
    });

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, padding: 28, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>{data ? "แก้ไขข้อมูลรถ" : "เพิ่มทะเบียนรถใหม่"}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เลขทะเบียน (เช่น กก 1234 กทม)</label>
                        <input value={form.plate_number} onChange={e => setForm({...form, plate_number: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ประเภท</label>
                        <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }}>
                            <option value="รถยนต์">รถยนต์</option>
                            <option value="จักรยานยนต์">จักรยานยนต์</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>สี</label>
                        <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ยี่ห้อ</label>
                        <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>รุ่น</label>
                        <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ชื่อเจ้าของ / ผู้ติดต่อ</label>
                        <input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เลขห้อง</label>
                        <input value={form.room_code} onChange={e => setForm({...form, room_code: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>เบอร์โทรศัพท์</label>
                        <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} />
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
export default function RoomManagement() {
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

    // Edit modal state
    const [editModal, setEditModal] = useState<{ roomId: number; level: string; code: string; name: string } | null>(null);
    // Detail modal state
    const [detailModal, setDetailModal] = useState<{ level: string; code: string; name: string; originalId?: number; active?: boolean; children?: any } | null>(null);

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
            const [roomsRes, vehiclesRes] = await Promise.all([
                getAllRooms(),
                getAllVehicles()
            ]);
            
            if (roomsRes.success && roomsRes.data) {
                setRooms(roomsRes.data);
            }
            if (vehiclesRes) {
                setVehicles(vehiclesRes as Vehicle[]);
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
        } as any);

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

    const openDetail = (level: string, code: string, name: string, originalId?: number, active?: boolean, children?: any) => {
        setDetailModal({ level, code, name, originalId, active, children });
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Sarabun', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

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
                    <div style={{ textAlign: "right", opacity: 0.9 }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}> {totalRooms} </div>
                        <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6 }}> Total Rooms </div>
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
                    <>
                        {/* Toolbar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
                                <input
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder=" ค้นหารหัส, ชื่อ..."
                                    style={{ width: "100%", padding: "10px 14px 10px 38px", boxSizing: "border-box", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, background: "#fff", outline: "none", fontFamily: "'Sarabun', sans-serif" }}
                                />
                            </div>
                            <button onClick={() => setExpandAll(v => !v)} style={{ padding: "10px 22px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 14 }}>
                                {expandAll ? 'พับทั้งหมด' : 'กางทั้งหมด'}
                            </button>
                            <button onClick={() => loadData()} style={{ padding: "10px 22px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 14 }}>
                                รีโหลดข้อมูล
                            </button>
                            <button onClick={() => setModal(true)} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1e3a5f, #3b82f6)", color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", boxShadow: "0 4px 14px #3b82f633" }}>
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
                    </>
                ) : (
                    <VehicleSection 
                        vehicles={vehicles} 
                        search={vehicleSearch} 
                        setSearch={setVehicleSearch} 
                        onEdit={(v: Vehicle) => setVehicleModal({ show: true, data: v })}
                        onAdd={() => setVehicleModal({ show: true })}
                    />
                )}
            </div>

            {/* Modals */}
            {modal && (
                <AddModal level="type" parentName={null} onAdd={handleCreateType} onClose={() => setModal(false)} />
            )}
            
            {editModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 32, minWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
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
                                        {detailModal.children.map((z: any) => (
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
                    onSave={async (v: any) => {
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