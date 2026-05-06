'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Building2, ChevronDown, ChevronRight, FolderTree, Home, Layers3, MapPin } from 'lucide-react';
import { FloatingSearchInput } from '@/components/FloatingField';

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

const byCode = <T extends { code: string }>(a: T, b: T) =>
    a.code.localeCompare(b.code, 'th', { numeric: true, sensitivity: 'base' });

const makeFloorKey = (typeCode: string, floorCode: string) => `${typeCode}::${floorCode}`;
const makeRoomKey = (typeCode: string, floorCode: string, roomCode: string) =>
    `${typeCode}::${floorCode}::${roomCode}`;

function toggleSetValue(setter: Dispatch<SetStateAction<Set<string>>>, key: string) {
    setter((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    });
}

export default function HierarchicalRoomSelector({
    rooms,
    value,
    onChange,
    placeholder = 'Select location...',
    closeDelayMs = 0,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
    const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

    const containerRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<number | null>(null);

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

    useEffect(() => () => clearCloseTimer(), []);

    const { types, flatLocations, selectedText } = useMemo(() => {
        const realRooms = rooms.filter(
            (room) => room.active && !room.room_code.startsWith('T-') && !room.room_code.startsWith('F-'),
        );

        const typeNameMap = new Map<string, string>();
        const floorNameMap = new Map<string, string>();

        for (const room of rooms) {
            if (!room.active) continue;
            if (room.room_name.startsWith('[TYPE] ')) {
                typeNameMap.set(room.room_type || '', room.room_name.replace('[TYPE] ', ''));
            }
            if (room.room_name.startsWith('[FLOOR] ')) {
                floorNameMap.set(
                    `${room.room_type || ''}__${room.floor || ''}`,
                    room.room_name.replace('[FLOOR] ', ''),
                );
            }
        }

        const typeMap = new Map<string, TreeType>();

        for (const room of realRooms) {
            const typeCode = room.room_type || 'GENERAL';
            const floorCode = room.floor || 'FL-0';

            if (!typeMap.has(typeCode)) {
                typeMap.set(typeCode, {
                    code: typeCode,
                    name: typeNameMap.get(typeCode) || typeCode,
                    floors: [],
                });
            }

            const typeNode = typeMap.get(typeCode)!;
            let floorNode = typeNode.floors.find((floor) => floor.code === floorCode);
            if (!floorNode) {
                const floorLookupKey = `${typeCode}__${floorCode}`;
                let floorName = floorNameMap.get(floorLookupKey) || floorCode;
                if (floorName.startsWith('ชั้น ชั้น')) floorName = floorName.replace('ชั้น ชั้น', 'ชั้น');
                floorNode = { code: floorCode, name: floorName, rooms: [] };
                typeNode.floors.push(floorNode);
            }

            if (room.zone) {
                const parentCode = room.building || room.room_code;
                let parentRoom = floorNode.rooms.find((r) => r.code === parentCode);
                if (!parentRoom) {
                    parentRoom = {
                        id: room.room_id,
                        code: parentCode,
                        name: parentCode,
                        zones: [],
                    };
                    floorNode.rooms.push(parentRoom);
                }
                if (!parentRoom.zones.some((zone) => zone.id === room.room_id)) {
                    parentRoom.zones.push({ id: room.room_id, code: room.room_code, name: room.room_name });
                }
                continue;
            }

            if (!floorNode.rooms.some((r) => r.code === room.room_code)) {
                floorNode.rooms.push({
                    id: room.room_id,
                    code: room.room_code,
                    name: room.room_name,
                    zones: [],
                });
            }
        }

        const treeTypes = Array.from(typeMap.values())
            .map((typeNode) => ({
                ...typeNode,
                floors: typeNode.floors
                    .map((floorNode) => ({
                        ...floorNode,
                        rooms: floorNode.rooms
                            .map((roomNode) => ({
                                ...roomNode,
                                zones: [...roomNode.zones].sort(byCode),
                            }))
                            .sort(byCode),
                    }))
                    .sort(byCode),
            }))
            .sort(byCode);

        const flat: FlatLocation[] = [];
        for (const typeNode of treeTypes) {
            for (const floorNode of typeNode.floors) {
                for (const roomNode of floorNode.rooms) {
                    const basePath = `${typeNode.name} > ${floorNode.name}`;
                    if (roomNode.zones.length === 0) {
                        flat.push({
                            id: roomNode.id,
                            code: roomNode.code,
                            name: roomNode.name,
                            type: 'room',
                            path: basePath,
                        });
                    }
                    for (const zone of roomNode.zones) {
                        flat.push({
                            id: zone.id,
                            code: zone.code,
                            name: zone.name,
                            type: 'zone',
                            path: `${basePath} > ${roomNode.code}`,
                        });
                    }
                }
            }
        }

        const selected = value ? rooms.find((room) => room.room_id === value) : null;
        const selectedValue = selected
            ? (() => {
                  const roomLabel =
                      !selected.room_name || selected.room_name === selected.room_code
                          ? selected.room_code
                          : `${selected.room_code} - ${selected.room_name}`;
                  const scope = [selected.room_type, selected.floor].filter(Boolean).join(' / ');
                  return scope ? `${scope} / ${roomLabel}` : roomLabel;
              })()
            : '';

        return { types: treeTypes, flatLocations: flat, selectedText: selectedValue };
    }, [rooms, value]);

    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return flatLocations
            .filter(
                (location) =>
                    location.code.toLowerCase().includes(q) ||
                    location.name.toLowerCase().includes(q) ||
                    location.path.toLowerCase().includes(q),
            )
            .slice(0, 30);
    }, [flatLocations, query]);

    const selectRoom = (roomId: number) => {
        onChange(roomId);
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
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    clearCloseTimer();
                    setQuery('');
                    setOpen((prev) => !prev);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedText
                        ? 'border-indigo-300 bg-gradient-to-r from-slate-50 to-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                aria-expanded={open}
            >
                <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                        <Home className={`h-4 w-4 ${selectedText ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`truncate text-sm ${selectedText ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                            {selectedText || placeholder}
                        </span>
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </span>
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[99999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 bg-slate-50 p-3">
                        <FloatingSearchInput
                            type="text"
                            label="ค้นหาห้อง"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            dense
                            className="text-sm"
                        />
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {query.trim() ? (
                            searchResults.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-slate-400">
                                    ไม่พบรายการที่ค้นหา
                                </div>
                            ) : (
                                <div className="py-1">
                                    {searchResults.map((location) => (
                                        <button
                                            key={`${location.type}-${location.id}-${location.code}`}
                                            type="button"
                                            onClick={() => selectRoom(location.id)}
                                            className={`w-full px-4 py-2.5 text-left transition hover:bg-sky-50 ${
                                                value === location.id ? 'bg-indigo-50' : ''
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="truncate text-sm font-medium text-slate-800">
                                                    {location.code === location.name
                                                        ? location.code
                                                        : `${location.code} - ${location.name}`}
                                                </span>
                                                <span
                                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                        location.type === 'zone'
                                                            ? 'bg-violet-100 text-violet-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}
                                                >
                                                    {location.type === 'zone' ? 'ZONE' : 'ROOM'}
                                                </span>
                                            </span>
                                            <span className="mt-0.5 block truncate pl-5 text-[11px] text-slate-500">
                                                {location.path}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="py-2">
                                {types.length === 0 && (
                                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                                        ไม่พบข้อมูลห้อง
                                    </div>
                                )}

                                {types.map((typeNode) => {
                                    const typeOpen = expandedTypes.has(typeNode.code);
                                    return (
                                        <div key={typeNode.code} className="border-b border-slate-100 last:border-b-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleSetValue(setExpandedTypes, typeNode.code)}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                                                aria-expanded={typeOpen}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="rounded-lg bg-blue-100 p-1.5 text-blue-700">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className="truncate text-sm font-semibold text-slate-800">
                                                        {typeNode.name}
                                                    </span>
                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                                        {typeNode.code}
                                                    </span>
                                                </span>
                                                {typeOpen ? (
                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                )}
                                            </button>

                                            {typeOpen && (
                                                <div className="space-y-1 pb-2 pl-4 pr-2">
                                                    {typeNode.floors.map((floorNode) => {
                                                        const floorKey = makeFloorKey(typeNode.code, floorNode.code);
                                                        const floorOpen = expandedFloors.has(floorKey);
                                                        return (
                                                            <div key={floorKey}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleSetValue(setExpandedFloors, floorKey)}
                                                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-emerald-50"
                                                                    aria-expanded={floorOpen}
                                                                >
                                                                    <span className="flex min-w-0 items-center gap-2">
                                                                        <span className="rounded-md bg-emerald-100 p-1.5 text-emerald-700">
                                                                            <Layers3 className="h-3.5 w-3.5" />
                                                                        </span>
                                                                        <span className="truncate text-sm text-slate-700">
                                                                            {floorNode.name}
                                                                        </span>
                                                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                                            {floorNode.code}
                                                                        </span>
                                                                    </span>
                                                                    {floorOpen ? (
                                                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                    )}
                                                                </button>

                                                                {floorOpen && (
                                                                    <div className="space-y-1 pb-1 pl-4">
                                                                        {floorNode.rooms.map((roomNode) => {
                                                                            if (roomNode.zones.length === 0) {
                                                                                const selected = value === roomNode.id;
                                                                                return (
                                                                                    <button
                                                                                        key={`${floorKey}::${roomNode.code}`}
                                                                                        type="button"
                                                                                        onClick={() => selectRoom(roomNode.id)}
                                                                                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${
                                                                                            selected
                                                                                                ? 'bg-indigo-50 text-indigo-700'
                                                                                                : 'hover:bg-amber-50'
                                                                                        }`}
                                                                                    >
                                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                                            <span className="rounded-md bg-amber-100 p-1.5 text-amber-700">
                                                                                                <Home className="h-3.5 w-3.5" />
                                                                                            </span>
                                                                                            <span className="truncate text-sm">
                                                                                                {roomNode.code === roomNode.name
                                                                                                    ? roomNode.code
                                                                                                    : `${roomNode.code} - ${roomNode.name}`}
                                                                                            </span>
                                                                                        </span>
                                                                                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                                                                            ROOM
                                                                                        </span>
                                                                                    </button>
                                                                                );
                                                                            }

                                                                            const roomKey = makeRoomKey(
                                                                                typeNode.code,
                                                                                floorNode.code,
                                                                                roomNode.code,
                                                                            );
                                                                            const roomOpen = expandedRooms.has(roomKey);
                                                                            return (
                                                                                <div key={roomKey}>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggleSetValue(setExpandedRooms, roomKey)}
                                                                                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-amber-50"
                                                                                        aria-expanded={roomOpen}
                                                                                    >
                                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                                            <span className="rounded-md bg-amber-100 p-1.5 text-amber-700">
                                                                                                <FolderTree className="h-3.5 w-3.5" />
                                                                                            </span>
                                                                                            <span className="truncate text-sm text-slate-700">
                                                                                                {roomNode.code === roomNode.name
                                                                                                    ? roomNode.code
                                                                                                    : `${roomNode.code} - ${roomNode.name}`}
                                                                                            </span>
                                                                                            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                                                                                                {roomNode.zones.length} ZONES
                                                                                            </span>
                                                                                        </span>
                                                                                        {roomOpen ? (
                                                                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                                        ) : (
                                                                                            <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                                        )}
                                                                                    </button>

                                                                                    {roomOpen && (
                                                                                        <div className="space-y-1 pl-4">
                                                                                            {roomNode.zones.map((zoneNode) => {
                                                                                                const selected = value === zoneNode.id;
                                                                                                return (
                                                                                                    <button
                                                                                                        key={`${roomKey}::${zoneNode.id}`}
                                                                                                        type="button"
                                                                                                        onClick={() => selectRoom(zoneNode.id)}
                                                                                                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${
                                                                                                            selected
                                                                                                                ? 'bg-indigo-50 text-indigo-700'
                                                                                                                : 'hover:bg-violet-50'
                                                                                                        }`}
                                                                                                    >
                                                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                                                            <span className="rounded-md bg-violet-100 p-1.5 text-violet-700">
                                                                                                                <MapPin className="h-3.5 w-3.5" />
                                                                                                            </span>
                                                                                                            <span className="truncate text-sm">
                                                                                                                {zoneNode.code === zoneNode.name
                                                                                                                    ? zoneNode.code
                                                                                                                    : `${zoneNode.code} - ${zoneNode.name}`}
                                                                                                            </span>
                                                                                                        </span>
                                                                                                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                                                                                                            ZONE
                                                                                                        </span>
                                                                                                    </button>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
