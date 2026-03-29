'use client';

import { useMemo, useState } from 'react';
import { DoorOpen, X } from 'lucide-react';

import SearchableSelect from '@/components/SearchableSelect';

type RoomRef = {
    room_id: number;
    room_code: string;
    room_name: string;
};

export default function RoomSelectorField({
    rooms,
    defaultRoomCode,
}: {
    rooms: RoomRef[];
    defaultRoomCode: string;
}) {
    const [selectedRoomCode, setSelectedRoomCode] = useState(defaultRoomCode);

    const options = useMemo(
        () =>
            rooms.map((room) => ({
                value: room.room_code,
                label: `${room.room_code} • ${room.room_name}`,
            })),
        [rooms],
    );

    const selectedRoom = useMemo(
        () => rooms.find((room) => room.room_code === selectedRoomCode) || null,
        [rooms, selectedRoomCode],
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">ห้อง</label>
                <span className="text-[11px] text-slate-500">{rooms.length.toLocaleString()} ห้อง</span>
            </div>

            <SearchableSelect
                options={options}
                value={selectedRoomCode}
                onChange={setSelectedRoomCode}
                placeholder="ค้นหารหัสห้องหรือชื่อห้อง..."
                className="w-full"
            />

            <input type="hidden" name="room" value={selectedRoomCode} />

            <div className="mt-2 flex min-h-7 items-center justify-between">
                {selectedRoom ? (
                    <div className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                        <DoorOpen className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-medium">{selectedRoom.room_code}</span>
                        <span className="text-slate-500">-</span>
                        <span className="truncate">{selectedRoom.room_name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-slate-500">ยังไม่ได้เลือกห้อง</span>
                )}

                {selectedRoomCode && (
                    <button
                        type="button"
                        onClick={() => setSelectedRoomCode('')}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                    >
                        <X className="h-3.5 w-3.5" />
                        ล้าง
                    </button>
                )}
            </div>
        </div>
    );
}
