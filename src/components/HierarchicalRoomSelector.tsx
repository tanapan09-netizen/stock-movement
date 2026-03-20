'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Room {
    room_id: number;
    room_code: string;
    room_name: string;
    room_type: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
    active: boolean;
}

type TreeZone = { id: number; code: string; name: string };
type TreeRoom = { id: number; code: string; name: string; zones: TreeZone[] };
type TreeFloor = { code: string; name: string; rooms: TreeRoom[] };
type TreeType = { code: string; name: string; floors: TreeFloor[] };

interface FlatLocation {
    id: number;
    code: string;
    name: string;
    type: 'room' | 'zone';
    path: string;
}

interface Props {
    rooms: Room[];
    value: number;
    onChange: (roomId: number) => void;
    placeholder?: string;
    closeDelayMs?: number;
}

export default function HierarchicalRoomSelector({ rooms, value, onChange, placeholder = 'เลือกสถานที่...', closeDelayMs = 0 }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<number | null>(null);
    const flyoutTimers = useRef<Map<HTMLElement, ReturnType<typeof setTimeout>>>(new Map());

    const clearCloseTimer = () => {
        if (!closeTimerRef.current) return;
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    };

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent | PointerEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(e.target as Node)) return;
            clearCloseTimer();
            setOpen(false);
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    useEffect(() => {
        return () => clearCloseTimer();
    }, []);

    const { types, flatLocations, selectedText } = useMemo(() => {
        const realRooms = rooms.filter(r => r.active && !r.room_code.startsWith('T-') && !r.room_code.startsWith('F-'));

        const typeNameMap = new Map<string, string>();
        const floorNameMap = new Map<string, string>();
        for (const r of rooms) {
            if (!r.active) continue;
            if (r.room_name.startsWith('[TYPE] ')) typeNameMap.set(r.room_type || '', r.room_name.replace('[TYPE] ', ''));
            if (r.room_name.startsWith('[FLOOR] ')) floorNameMap.set(`${r.room_type}__${r.floor}`, r.room_name.replace('[FLOOR] ', ''));
        }

        const typeMap = new Map<string, TreeType>();
        for (const r of realRooms) {
            const typeCode = r.room_type || 'GENERAL';
            const floorCode = r.floor || 'FL-0';
            if (!typeMap.has(typeCode)) typeMap.set(typeCode, { code: typeCode, name: typeNameMap.get(typeCode) || typeCode, floors: [] });
            const typeNode = typeMap.get(typeCode)!;

            let floorNode = typeNode.floors.find(f => f.code === floorCode);
            if (!floorNode) {
                let floorName = floorNameMap.get(`${typeCode}__${floorCode}`) || floorCode;
                if (floorName.startsWith('ชั้น ชั้น')) floorName = floorName.replace('ชั้น ชั้น', 'ชั้น');
                floorNode = { code: floorCode, name: floorName, rooms: [] };
                typeNode.floors.push(floorNode);
            }

            if (r.zone) {
                const parentCode = r.building || r.room_code;
                let parentRoom = floorNode.rooms.find(rm => rm.code === parentCode);
                if (!parentRoom) {
                    parentRoom = { id: r.room_id, code: parentCode, name: parentCode, zones: [] };
                    floorNode.rooms.push(parentRoom);
                }
                parentRoom.zones.push({ id: r.room_id, code: r.room_code, name: r.room_name });
            } else {
                if (!floorNode.rooms.find(rm => rm.code === r.room_code)) {
                    floorNode.rooms.push({ id: r.room_id, code: r.room_code, name: r.room_name, zones: [] });
                }
            }
        }

        const treeTypes = Array.from(typeMap.values());

        const flat: FlatLocation[] = [];
        for (const t of treeTypes) {
            for (const f of t.floors) {
                for (const rm of f.rooms) {
                    const roomPath = `${t.name} › ${f.name}`;
                    flat.push({ id: rm.id, code: rm.code, name: rm.name, type: 'room', path: roomPath });
                    for (const z of rm.zones) {
                        flat.push({ id: z.id, code: z.code, name: z.name, type: 'zone', path: `${roomPath} › ${rm.name}` });
                    }
                }
            }
        }

        const text = value
            ? (() => {
                const r = rooms.find(rm => rm.room_id === value);
                if (!r) return '';
                const locInfo = [r.building || '', r.floor || ''].filter(Boolean).join(' ');
                const namePart = (!r.room_name || r.room_name === r.room_code) ? r.room_code : `${r.room_name} (${r.room_code})`;
                return locInfo ? `${locInfo} › ${namePart}` : namePart;
            })()
            : '';

        return { types: treeTypes, flatLocations: flat, selectedText: text };
    }, [rooms, value]);

    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return flatLocations
            .filter(loc => loc.code.toLowerCase().includes(q) || loc.name.toLowerCase().includes(q))
            .slice(0, 15);
    }, [flatLocations, query]);

    const PANEL: React.CSSProperties = useMemo(() => ({
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        boxShadow: '0 8px 32px -4px rgba(15,23,42,0.18), 0 2px 8px -2px rgba(15,23,42,0.08)',
        minWidth: 280,
        overflow: 'hidden',
    }), []);

    const ROW_BASE: React.CSSProperties = useMemo(() => ({
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
    }), []);

    const FLYOUT_BASE: React.CSSProperties = useMemo(() => ({
        display: 'none',
        position: 'fixed',
        ...PANEL,
        maxHeight: 400,
        overflowY: 'auto',
    }), [PANEL]);

    const positionFlyout = (triggerEl: HTMLElement, flyoutEl: HTMLElement, offsetX = 4) => {
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
        // ยกเลิก timer ซ่อนที่ค้างอยู่ก่อน
        const existing = flyoutTimers.current.get(triggerEl);
        if (existing) { clearTimeout(existing); flyoutTimers.current.delete(triggerEl); }

        const flyout = triggerEl.querySelector<HTMLElement>(selector);
        if (!flyout) return;
        flyout.style.display = 'block';
        requestAnimationFrame(() => positionFlyout(triggerEl, flyout));
    };

    const hideFlyout = (triggerEl: HTMLElement, selector: string, delay = 300) => {
        // หนวงเวลากอนซอน ใหเมาสมเวลาเลอนเขา submenu ได
        const existing = flyoutTimers.current.get(triggerEl);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            const flyout = triggerEl.querySelector<HTMLElement>(selector);
            if (flyout) flyout.style.display = 'none';
            flyoutTimers.current.delete(triggerEl);
        }, delay);
        flyoutTimers.current.set(triggerEl, timer);
    };

    const Badge = ({ label, type = 'default' }: { label: string; type?: 'type' | 'floor' | 'room' | 'zone' | 'default' }) => {
        const colors = {
            type: { bg: '#eff6ff', fg: '#1e40af', border: '#dbeafe' },
            floor: { bg: '#f0fdf4', fg: '#166534', border: '#dcfce7' },
            room: { bg: '#fff7ed', fg: '#9a3412', border: '#ffedd5' },
            zone: { bg: '#faf5ff', fg: '#6b21a8', border: '#f3e8ff' },
            default: { bg: '#f1f5f9', fg: '#64748b', border: '#e2e8f0' }
        }[type];
        return (
            <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.02em',
                background: colors.bg,
                color: colors.fg,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: '1px 5px',
                marginLeft: 4,
                textTransform: 'uppercase',
                flexShrink: 0
            }}>{label}</span>
        );
    };

    const Chevron = () => (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
        >
            <path d="M9 5l7 7-7 7" />
        </svg>
    );

    const selectRoom = (id: number) => {
        onChange(id);
        setQuery('');
        clearCloseTimer();
        if (closeDelayMs > 0) {
            closeTimerRef.current = window.setTimeout(() => {
                setOpen(false);
                closeTimerRef.current = null;
            }, closeDelayMs);
            return;
        }
        setOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <button
                type="button"
                onClick={() => {
                    clearCloseTimer();
                    setOpen(o => !o);
                    setQuery('');
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
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke={selectedText ? '#6366f1' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {selectedText || placeholder}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            <div
                style={{
                    display: open ? 'block' : 'none',
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    ...PANEL,
                    zIndex: 99999,
                }}
            >
                <div style={{ padding: 10, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ position: 'relative' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="ค้นหารหัส หรือชื่อห้อง..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
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

                <div style={{ maxHeight: 380, overflowY: query.trim() ? 'auto' : 'visible' }}>
                    {query.trim() ? (
                        searchResults.length === 0 ? (
                            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                ไม่พบรายการที่ค้นหา
                            </div>
                        ) : (
                            searchResults.map(loc => (
                                <div
                                    key={`${loc.type}-${loc.id}-${loc.code}`}
                                    onClick={() => selectRoom(loc.id)}
                                    style={{ ...ROW_BASE, flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 14px' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                        <span>{loc.code === loc.name ? loc.code : `${loc.code} – ${loc.name}`}</span>
                                        <Badge label={loc.type === 'zone' ? 'ZONE' : 'RM'} type={loc.type} />
                                    </div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        {loc.path.replace(/ชั้น ชั้น/g, 'ชั้น')}
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        <>
                            {types.length === 0 && (
                                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>ไม่พบข้อมูลห้อง</div>
                            )}

                            {types.length > 0 && (
                                <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                                    ประเภทสถานที่
                                </div>
                            )}

                            {types.map((t, tIdx) => (
                                <div key={t.code} style={{ position: 'relative' }}>
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
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                background: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 14,
                                                flexShrink: 0,
                                            }}>🏢</span>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                                            <Badge label={t.code} type="type" />
                                        </span>
                                        <Chevron />

                                        <div className="sub-floor" style={{ ...FLYOUT_BASE, zIndex: 100100 + tIdx }}>
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
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 6,
                                                            background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 12,
                                                            flexShrink: 0,
                                                        }}>📁</span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                                        <Badge label={f.code} type="floor" />
                                                    </span>
                                                    <Chevron />

                                                    <div className="sub-room" style={{ ...FLYOUT_BASE, zIndex: 100200 + tIdx * 20 + fIdx }}>
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
                                                                                width: 22,
                                                                                height: 22,
                                                                                borderRadius: 6,
                                                                                background: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: 11,
                                                                                flexShrink: 0,
                                                                            }}>🚪</span>
                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                {rm.code === rm.name ? rm.code : `${rm.code} – ${rm.name}`}
                                                                            </span>
                                                                            <Badge label="RM" type="room" />
                                                                        </span>
                                                                        <Chevron />

                                                                        <div className="sub-zone" style={{ ...FLYOUT_BASE, zIndex: 100400 + tIdx * 100 + fIdx * 10 + rmIdx }}>
                                                                            <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                                                                                โซน
                                                                            </div>
                                                                            {rm.zones.map(z => (
                                                                                <div
                                                                                    key={z.id}
                                                                                    onClick={() => selectRoom(z.id)}
                                                                                    style={{ ...ROW_BASE, color: '#6d28d9', fontWeight: 500 }}
                                                                                    onMouseEnter={e => (e.currentTarget.style.background = '#faf5ff')}
                                                                                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                                                                                >
                                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                        {z.code === z.name ? z.code : `${z.code} – ${z.name}`}
                                                                                    </span>
                                                                                    <Badge label="ZONE" type="zone" />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        onClick={() => selectRoom(rm.id)}
                                                                        style={{ ...ROW_BASE, color: '#374151' }}
                                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff7ed')}
                                                                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                                                                    >
                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                            <span style={{
                                                                                width: 22,
                                                                                height: 22,
                                                                                borderRadius: 6,
                                                                                background: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: 11,
                                                                                flexShrink: 0,
                                                                            }}>🚪</span>
                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                {rm.code === rm.name ? rm.code : `${rm.code} – ${rm.name}`}
                                                                            </span>
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
    );
}

