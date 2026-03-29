'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';

import QrScannerModal from '@/components/QrScannerModal';

type RoomRefLite = {
    room_code: string;
    room_name: string;
};

function normalizeScanValue(raw: string) {
    const input = raw.trim();
    if (!input) return '';

    try {
        if (/^https?:\/\//i.test(input)) {
            const parsed = new URL(input);
            const byQuery =
                parsed.searchParams.get('code') ||
                parsed.searchParams.get('asset_code') ||
                parsed.searchParams.get('q') ||
                '';
            if (byQuery.trim()) {
                return byQuery.trim();
            }

            const pathnameToken = parsed.pathname.split('/').filter(Boolean).pop();
            if (pathnameToken) {
                return decodeURIComponent(pathnameToken).trim();
            }
        }
    } catch {
        // keep original text
    }

    return input;
}

export default function RoomScanButton({
    rooms,
    currentRoomCode,
    currentStatus,
}: {
    rooms: RoomRefLite[];
    currentRoomCode: string;
    currentStatus: string;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const roomCodeIndex = useMemo(() => {
        const index = new Map<string, string>();
        for (const room of rooms) {
            index.set(room.room_code.trim().toLowerCase(), room.room_code);
        }
        return index;
    }, [rooms]);

    const handleScanSuccess = (decodedText: string) => {
        const scanText = normalizeScanValue(decodedText);
        if (!scanText) {
            setOpen(false);
            return;
        }

        const params = new URLSearchParams();
        if (currentStatus && currentStatus !== 'all') {
            params.set('status', currentStatus);
        }

        const normalizedScan = scanText.toLowerCase();
        const matchedRoomCode = roomCodeIndex.get(normalizedScan);

        if (matchedRoomCode) {
            params.set('room', matchedRoomCode);
            params.delete('q');
        } else {
            if (currentRoomCode) {
                params.set('room', currentRoomCode);
            }
            params.set('q', scanText);
        }

        params.set('scan', scanText);

        setOpen(false);
        router.push(`/assets/rooms?${params.toString()}`);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
                <QrCode className="mr-2 h-4 w-4" />
                สแกน QR ค้นหา
            </button>

            <QrScannerModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onScanSuccess={handleScanSuccess}
            />
        </>
    );
}
