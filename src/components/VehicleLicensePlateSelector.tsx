'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface Vehicle {
    vehicle_id: number;
    license_plate: string;
    province: string | null;
    vehicle_type: string | null;
    owner_name: string | null;
    owner_room: string | null;
    active: boolean;
}

interface Props {
    vehicles: Vehicle[];
    value: number;
    onChange: (vehicleId: number) => void;
    placeholder?: string;
}

export default function VehicleLicensePlateSelector({
    vehicles,
    value,
    onChange,
    placeholder = 'เลือกทะเบียนรถ (ถ้ามี)...',
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent | PointerEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const selected = useMemo(() => vehicles.find(v => v.vehicle_id === value) ?? null, [vehicles, value]);
    const selectedText = selected ? `${selected.license_plate}${selected.province ? ` (${selected.province})` : ''}` : '';

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return vehicles
            .filter(v => v.active)
            .filter(v => {
                if (!q) return true;
                return (
                    (v.license_plate || '').toLowerCase().includes(q) ||
                    (v.province || '').toLowerCase().includes(q) ||
                    (v.owner_room || '').toLowerCase().includes(q) ||
                    (v.owner_name || '').toLowerCase().includes(q)
                );
            })
            .slice(0, 30);
    }, [vehicles, query]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    setOpen(o => !o);
                    setQuery('');
                }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
                <span className={`text-sm truncate ${selectedText ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {selectedText || placeholder}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="p-2 border-b bg-gray-50">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="ค้นหาทะเบียนรถ / เจ้าของ / ห้อง..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">ไม่พบข้อมูลทะเบียนรถ</div>
                        ) : (
                            filtered.map(v => (
                                <button
                                    key={v.vehicle_id}
                                    type="button"
                                    onClick={() => {
                                        onChange(v.vehicle_id);
                                        setOpen(false);
                                        setQuery('');
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b last:border-0"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <div className="font-bold text-gray-900 truncate">
                                                {v.license_plate}
                                                {v.province ? <span className="font-medium text-gray-500"> ({v.province})</span> : null}
                                            </div>
                                            <div className="text-[11px] text-gray-500 truncate">
                                                {[v.vehicle_type, v.owner_room ? `ห้อง ${v.owner_room}` : null, v.owner_name].filter(Boolean).join(' • ') || '-'}
                                            </div>
                                        </div>
                                        <span className="text-xs text-blue-600 font-medium">เลือก</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t bg-gray-50 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(0);
                                setOpen(false);
                                setQuery('');
                            }}
                            className="text-xs text-gray-600 hover:text-red-600"
                        >
                            ล้างค่า
                        </button>
                        <div className="text-xs text-gray-500">{vehicles.filter(v => v.active).length} รายการ</div>
                    </div>
                </div>
            )}
        </div>
    );
}

