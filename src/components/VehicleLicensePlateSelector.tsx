'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FloatingSearchInput } from '@/components/FloatingField';

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

    const selected = useMemo(
        () => vehicles.find((vehicle) => vehicle.vehicle_id === value) ?? null,
        [vehicles, value],
    );
    const selectedText = selected
        ? `${selected.license_plate}${selected.province ? ` (${selected.province})` : ''}`
        : '';

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return vehicles
            .filter((vehicle) => vehicle.active)
            .filter((vehicle) => {
                if (!keyword) return true;
                return (
                    (vehicle.license_plate || '').toLowerCase().includes(keyword) ||
                    (vehicle.province || '').toLowerCase().includes(keyword) ||
                    (vehicle.owner_room || '').toLowerCase().includes(keyword) ||
                    (vehicle.owner_name || '').toLowerCase().includes(keyword)
                );
            })
            .slice(0, 30);
    }, [vehicles, query]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    setOpen((prev) => !prev);
                    setQuery('');
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 transition-colors hover:bg-gray-50"
            >
                <span className={`truncate text-sm ${selectedText ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {selectedText || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    <div className="border-b bg-gray-50 p-2">
                        <FloatingSearchInput
                            type="text"
                            label="ค้นหาทะเบียนรถ"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ค้นหาทะเบียนรถ / เจ้าของ / ห้อง..."
                            dense
                            autoFocus
                            className="text-sm"
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">ไม่พบข้อมูลทะเบียนรถ</div>
                        ) : (
                            filtered.map((vehicle) => (
                                <button
                                    key={vehicle.vehicle_id}
                                    type="button"
                                    onClick={() => {
                                        onChange(vehicle.vehicle_id);
                                        setOpen(false);
                                        setQuery('');
                                    }}
                                    className="w-full border-b px-4 py-3 text-left text-sm hover:bg-blue-50 last:border-0"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 flex-col">
                                            <div className="truncate font-bold text-gray-900">
                                                {vehicle.license_plate}
                                                {vehicle.province ? (
                                                    <span className="font-medium text-gray-500"> ({vehicle.province})</span>
                                                ) : null}
                                            </div>
                                            <div className="truncate text-[11px] text-gray-500">
                                                {[
                                                    vehicle.vehicle_type,
                                                    vehicle.owner_room ? `ห้อง ${vehicle.owner_room}` : null,
                                                    vehicle.owner_name,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' | ') || '-'}
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-blue-600">เลือก</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t bg-gray-50 p-2">
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
                        <div className="text-xs text-gray-500">
                            {vehicles.filter((vehicle) => vehicle.active).length} รายการ
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}