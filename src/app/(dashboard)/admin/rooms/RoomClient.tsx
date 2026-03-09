'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { getAllRooms, createRoom, updateRoom, deleteRoom, toggleRoomActive } from '@/actions/maintenanceActions';

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

// Hierarchical Data Structures
interface ZoneNode { id: string; code: string; name: string; originalId?: number; active?: boolean }
interface RoomNode { id: string; code: string; name: string; originalId?: number; active?: boolean; zones: ZoneNode[] }
interface FloorNode { id: string; code: string; name: string; originalId?: number; active?: boolean; rooms: RoomNode[] }
interface TypeNode { id: string; code: string; name: string; originalId?: number; active?: boolean; floors: FloorNode[] }

type Toast = { type: 'success' | 'error'; text: string } | null;

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
                        {parentName && (
                            <div style={{ fontSize: 12, color: "#94a3b8" }}> ภายใต้: {parentName} </div>
                        )}
                    </div>
                </div>
                <hr style={{ border: "none", borderTop: `2px solid ${col.light}`, margin: "16px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                            รหัส{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} *
                        </label>
                        <input
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder={`เช่น ${level === "type" ? "TYPE-01" : level === "floor" ? "FL-01" : level === "room" ? "RM-101" : "ZN-A"}`}
                            disabled={loading}
                            style={{
                                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                                border: `1.5px solid ${code ? col.accent : "#e2e8f0"}`,
                                fontSize: 14, outline: "none", fontFamily: "'Sarabun', sans-serif", transition: "border-color 0.2s"
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                            ชื่อ{LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} *
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={`กรอกชื่อ${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`}
                            disabled={loading}
                            style={{
                                width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
                                border: `1.5px solid ${name ? col.accent : "#e2e8f0"}`,
                                fontSize: 14, outline: "none", fontFamily: "'Sarabun', sans-serif", transition: "border-color 0.2s"
                            }}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ padding: "9px 22px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 14 }}> ยกเลิก </button>
                    <button
                        onClick={() => { if (code && name) onAdd(code.trim(), name.trim()); }}
                        disabled={!code || !name || loading}
                        style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: code && name ? col.accent : "#e2e8f0", color: code && name ? "#fff" : "#94a3b8", cursor: code && name && !loading ? "pointer" : "not-allowed", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 14, transition: "background 0.2s" }}
                    > {loading ? 'กำลังบันทึก...' : `+ เพิ่ม${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`}</button>
                </div>
            </div>
        </div>
    );
}

function ZoneRow({ zone, onDelete, expandAll }: { zone: ZoneNode; onDelete: (zid: number) => void; expandAll: boolean }) {
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
            <button onClick={() => zone.originalId && onDelete(zone.originalId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, lineHeight: 1 }} title="ลบโซนนี้">✕</button>
        </div>
    );
}

function RoomRow({ room, onDelete, onAddZone, expandAll }: { room: RoomNode; onDelete: (rid: number) => void; onAddZone: (room: RoomNode, code: string, name: string) => void; expandAll: boolean }) {
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
                <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${col.accent}`, background: col.light, color: col.accent, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 12 }}> + โซน </button>
                    <button onClick={e => { e.stopPropagation(); if (room.originalId) { onDelete(room.originalId) } }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }} title="ลบห้องนี้">✕</button>
                    <span onClick={() => setOpen(v => !v)} style={{ color: "#94a3b8", fontSize: 16, userSelect: "none" }}>{open ? "▴" : "▾"}</span>
                </div>
            </div>
            {open && room.zones.length > 0 && (
                <div style={{ background: "#fafbfc", border: `1.5px solid ${col.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 4px" }}>
                    {room.zones.map(z => (<ZoneRow key={z.id} zone={z} onDelete={onDelete} expandAll={expandAll} />))}
                </div>
            )}
            {modal && (<AddModal level="zone" parentName={`${room.code} ${room.name}`} onAdd={(c, n) => { onAddZone(room, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

function FloorRow({ floor, onDelete, onAddRoom, onAddZone, expandAll }: { floor: FloorNode; onDelete: (id: number) => void; onAddRoom: (floor: FloorNode, c: string, n: string) => void; onAddZone: (room: RoomNode, c: string, n: string) => void; expandAll: boolean }) {
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
                <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${col.accent}`, background: col.light, color: col.accent, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 600, fontSize: 12 }}> + ห้อง </button>
                    {/* Only show delete on actual DB entities or we wait till it's just room. If floor has originalId, maybe it's a real entity (but floors don't exist as entities in schema, only rooms do). We'll hide delete for Floor/Type since they are virtual. */}
                </div>
            </div>
            {open && floor.rooms.length > 0 && (
                <div style={{ background: "#f8fafc", border: `1.5px solid ${col.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "8px 8px 4px" }}>
                    {floor.rooms.map(r => (<RoomRow key={r.id} room={r} onDelete={onDelete} onAddZone={onAddZone} expandAll={expandAll} />))}
                </div>
            )}
            {modal && (<AddModal level="room" parentName={`${floor.code} ${floor.name}`} onAdd={(c, n) => { onAddRoom(floor, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

function TypeRow({ type, onDelete, onAddFloor, onAddRoom, onAddZone, expandAll }: { type: TypeNode; onDelete: (id: number) => void; onAddFloor: (type: TypeNode, c: string, n: string) => void; onAddRoom: (floor: FloorNode, c: string, n: string) => void; onAddZone: (room: RoomNode, c: string, n: string) => void; expandAll: boolean; }) {
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
                        <span style={{ fontWeight: 800, fontSize: 15 }}> {type.code} </span>
                        <span style={{ opacity: 0.8, marginLeft: 10, fontSize: 14 }}> {type.name} </span>
                    </div>
                    <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 10px", fontWeight: 700 }}>ประเภท</span>
                    <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 10px" }}>{type.floors.length} ชั้น</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={e => { e.stopPropagation(); setModal(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontFamily: "'Sarabun', sans-serif", fontWeight: 700, fontSize: 12 }}> + ชั้น </button>
                </div>
            </div>
            {open && type.floors.length > 0 && (
                <div style={{ background: "#fff", border: `1.5px solid ${col.accent}44`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "10px 10px 6px" }}>
                    {type.floors.map(floor => (<FloorRow key={floor.id} floor={floor} onDelete={onDelete} onAddRoom={onAddRoom} onAddZone={onAddZone} expandAll={expandAll} />))}
                </div>
            )}
            {modal && (<AddModal level="floor" parentName={`${type.code} ${type.name}`} onAdd={(c, n) => { onAddFloor(type, c, n); setModal(false); setOpen(true); }} onClose={() => setModal(false)} />)}
        </div>
    );
}

export default function RoomManagement() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandAll, setExpandAll] = useState(false);
    const [modal, setModal] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const res = await getAllRooms();
        if (res.success && res.data) {
            setRooms(res.data);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const buildVirtualTree = () => {
        const typesMap = new Map<string, TypeNode>();
        for (const r of rooms) {
            // Because our tree requires code/name for every level, let's derive them
            const tCode = r.room_type || 'GENERAL';
            const fCode = r.floor || 'FL-0';
            const rCode = r.room_code || 'N/A';
            const zCode = r.zone;

            if (!typesMap.has(tCode)) {
                typesMap.set(tCode, { id: `T_${tCode}`, code: tCode, name: tCode, floors: [] });
            }
            const tNode = typesMap.get(tCode)!;

            let fNode = tNode.floors.find(f => f.code === fCode);
            if (!fNode) {
                fNode = { id: `F_${tCode}_${fCode}`, code: fCode, name: fCode, rooms: [] };
                tNode.floors.push(fNode);
            }

            if (zCode) {
                // If it has a zone, then this record represents a zone inside a room
                let rNode = fNode.rooms.find(rm => rm.code === rCode);
                if (!rNode) {
                    rNode = { id: `R_${tCode}_${fCode}_${rCode}`, code: rCode, name: r.room_name, zones: [] };
                    fNode.rooms.push(rNode);
                }
                rNode.zones.push({ id: `Z_${r.room_id}`, code: zCode, name: zCode, originalId: r.room_id, active: r.active });
            } else {
                // It's just a room level record
                let rNode = fNode.rooms.find(rm => rm.code === rCode);
                if (!rNode) {
                    rNode = { id: `R_${tCode}_${fCode}_${rCode}`, code: rCode, name: r.room_name, zones: [], originalId: r.room_id, active: r.active };
                    fNode.rooms.push(rNode);
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
        if (!confirm("ยืนยันการลบรายการนี้ ข้อมูลจะถูกซ่อน (Soft Delete)")) return;
        const res = await deleteRoom(roomId);
        if (res.success) {
            alert('ลบเรียบร้อยแล้ว');
            loadData();
        } else alert(res.error);
    };

    const handleCreateType = async (code: string, name: string) => {
        // A Type alone without floor/room is impossible in our DB, we'll create a dummy empty room just to hold the hierarchy
        const res = await createRoom({ room_type: code, floor: 'FL-00', room_code: `DUMMY-${code}`, room_name: `Room in ${name}` });
        if (res.success) loadData();
        else alert(res.error);
    };

    const handleCreateFloor = async (type: TypeNode, fCode: string, fName: string) => {
        // Similar, create a dummy room to attach the hierarchy level
        const res = await createRoom({ room_type: type.code, floor: fCode, room_code: `DUMMY-${type.code}-${fCode}`, room_name: `Room on ${fName}` });
        if (res.success) loadData();
        else alert(res.error);
    };

    const handleCreateRoom = async (floor: FloorNode, rCode: string, rName: string) => {
        // Parent tCode is part of the floor id or we can extract it, but actually floor doesn't have parent type explicitly in its object. Let's extract from its id which we formatted as `F_TYPE_FLOOR`.
        const parts = floor.id.split('_');
        const tCode = parts[1];
        const res = await createRoom({ room_type: tCode, floor: floor.code, room_code: rCode, room_name: rName });
        if (res.success) loadData();
        else alert(res.error);
    };

    const handleCreateZone = async (room: RoomNode, zCode: string, zName: string) => {
        // Same logic: extract parents from ID -> R_TYPE_FLOOR_ROOM
        const parts = room.id.split('_');
        const tCode = parts[1];
        const fCode = parts[2];
        const res = await createRoom({ room_type: tCode, floor: fCode, room_code: room.code, room_name: room.name, zone: zCode });
        if (res.success) loadData();
        else alert(res.error);
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Sarabun', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e4034 50%, #3b1f5e 100%)", padding: "28px 40px 24px", color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ fontSize: 32 }}>🏢</div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>จัดการห้องพัก / ส่วนกลาง</h1>
                                <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 13 }}>จัดกลุ่ม 4 ชั้น: ประเภท → ชั้น → ห้อง → โซน</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
                            {["ประเภท", "ชั้น", "ห้อง", "โซน"].map((step, i) => (
                                <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 700 }}>
                                        <span style={{ fontSize: 16 }}>{Object.values(ICONS)[i]}</span>{step}
                                    </div>
                                    {i < 3 && <span style={{ opacity: 0.5, fontSize: 18 }}>→</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {[
                            { label: "ประเภท", value: types.length, icon: "🏢", col: "#3b82f6" },
                            { label: "ชั้นทั้งหมด", value: types.reduce((a, t) => a + t.floors.length, 0), icon: "📐", col: "#10b981" },
                            { label: "ห้องทั้งหมด", value: totalRooms, icon: "🚪", col: "#8b5cf6" },
                        ].map(s => (
                            <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 18px", textAlign: "center", minWidth: 80, border: `1px solid rgba(255,255,255,0.2)` }}>
                                <div style={{ fontSize: 20 }}>{s.icon}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.col }}>{s.value}</div>
                                <div style={{ fontSize: 11, opacity: 0.7 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ padding: "20px 40px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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

            <div style={{ padding: "20px 40px 40px" }}>
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
                            expandAll={expandAll}
                        />
                    ))
                )}
            </div>

            {modal && (
                <AddModal
                    level="type" parentName={null}
                    onAdd={(c, n) => { handleCreateType(c, n); setModal(false); }}
                    onClose={() => setModal(false)}
                />
            )}
        </div>
    );
}
