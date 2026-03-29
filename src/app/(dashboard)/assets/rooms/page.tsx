import Link from 'next/link';
import { Building2, MapPin, Search } from 'lucide-react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import RoomSelectorField from './RoomSelectorField';
import RoomScanButton from './RoomScanButton';
import { prisma } from '@/lib/prisma';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

type RoomRef = {
    room_id: number;
    room_code: string;
    room_name: string;
    room_type: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
};

type RoomHierarchyZone = {
    code: string;
    name: string;
    href: string;
    isSelected: boolean;
};

type RoomHierarchyRoom = {
    code: string;
    name: string;
    href: string;
    isSelected: boolean;
    zones: RoomHierarchyZone[];
    hasSelectedDescendant: boolean;
};

type RoomHierarchyFloor = {
    code: string;
    name: string;
    rooms: RoomHierarchyRoom[];
    hasSelectedDescendant: boolean;
};

type RoomHierarchyType = {
    code: string;
    name: string;
    floors: RoomHierarchyFloor[];
    hasSelectedDescendant: boolean;
};

const STATUS_OPTIONS = ['all', 'Active', 'InRepair', 'Disposed', 'Lost'] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

function getSingleParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

function normalizeText(value: string | null | undefined) {
    return (value || '').trim().toLowerCase();
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasCodeToken(text: string, token: string) {
    if (!text || !token) return false;
    const escapedToken = escapeRegExp(token);
    const tokenRegex = new RegExp(`(^|[\\s,;:/()\\[\\]{}_-])${escapedToken}($|[\\s,;:/()\\[\\]{}_-])`);
    return tokenRegex.test(text);
}

function assetBelongsToRoom(location: string | null, room: RoomRef) {
    const normalizedLocation = normalizeText(location);
    if (!normalizedLocation) return false;

    const normalizedCode = normalizeText(room.room_code);
    const normalizedName = normalizeText(room.room_name);

    if (normalizedLocation === normalizedCode || normalizedLocation === normalizedName) {
        return true;
    }

    if (normalizedName && normalizedLocation.includes(normalizedName)) {
        return true;
    }

    if (!normalizedCode) {
        return false;
    }

    return (
        hasCodeToken(normalizedLocation, normalizedCode) ||
        normalizedLocation.startsWith(`${normalizedCode}-`) ||
        normalizedLocation.startsWith(`${normalizedCode}/`) ||
        normalizedLocation.includes(`${normalizedCode} -`) ||
        normalizedLocation.includes(`(${normalizedCode})`)
    );
}

function getStatusBadgeClass(status: string) {
    if (status === 'Active') return 'bg-green-100 text-green-800';
    if (status === 'InRepair') return 'bg-amber-100 text-amber-800';
    if (status === 'Disposed') return 'bg-red-100 text-red-800';
    if (status === 'Lost') return 'bg-gray-200 text-gray-800';
    return 'bg-slate-100 text-slate-700';
}

function buildRoomFilterHref(roomCode: string, statusFilter: StatusFilter) {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
        params.set('status', statusFilter);
    }
    params.set('room', roomCode);
    return `/assets/rooms?${params.toString()}`;
}

function buildRoomHierarchy(
    rooms: RoomRef[],
    selectedRoomCode: string,
    statusFilter: StatusFilter,
): RoomHierarchyType[] {
    const selectedCodeNormalized = normalizeText(selectedRoomCode);
    const typesMap = new Map<
        string,
        {
            code: string;
            name: string;
            floors: Array<{
                code: string;
                name: string;
                rooms: Array<{
                    code: string;
                    name: string;
                    zones: Array<{ code: string; name: string }>;
                }>;
            }>;
        }
    >();

    for (const room of rooms) {
        const typeCode = room.room_type || 'GENERAL';
        let typeName = typeCode;
        if (room.room_name.startsWith('[TYPE] ')) {
            typeName = room.room_name.replace('[TYPE] ', '');
        }

        const floorCode = room.floor || 'FL-0';
        let floorName = floorCode;
        if (room.room_name.startsWith('[FLOOR] ')) {
            floorName = room.room_name.replace('[FLOOR] ', '');
        }

        if (!typesMap.has(typeCode)) {
            typesMap.set(typeCode, { code: typeCode, name: typeName, floors: [] });
        } else if (room.room_name.startsWith('[TYPE] ')) {
            typesMap.get(typeCode)!.name = typeName;
        }
        const typeNode = typesMap.get(typeCode)!;

        let floorNode = typeNode.floors.find((floor) => floor.code === floorCode);
        if (!floorNode) {
            floorNode = { code: floorCode, name: floorName, rooms: [] };
            typeNode.floors.push(floorNode);
        } else if (room.room_name.startsWith('[FLOOR] ')) {
            floorNode.name = floorName;
        }

        if (room.zone) {
            const parentRoomCode = room.building && room.building !== room.room_code
                ? room.building
                : room.room_code;
            let parentRoom = floorNode.rooms.find((node) => node.code === parentRoomCode);
            if (!parentRoom) {
                parentRoom = { code: parentRoomCode, name: parentRoomCode, zones: [] };
                floorNode.rooms.push(parentRoom);
            }
            parentRoom.zones.push({ code: room.room_code, name: room.room_name });
        } else {
            let roomNode = floorNode.rooms.find((node) => node.code === room.room_code);
            if (!roomNode) {
                roomNode = { code: room.room_code, name: room.room_name, zones: [] };
                floorNode.rooms.push(roomNode);
            } else {
                roomNode.name = room.room_name;
            }
        }
    }

    return Array.from(typesMap.values())
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((typeNode) => {
            const floors = typeNode.floors
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((floorNode) => {
                    const roomsInFloor = floorNode.rooms
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map((roomNode) => {
                            const zones = roomNode.zones
                                .sort((a, b) => a.code.localeCompare(b.code))
                                .map((zoneNode) => {
                                    const zoneSelected = normalizeText(zoneNode.code) === selectedCodeNormalized;
                                    return {
                                        code: zoneNode.code,
                                        name: zoneNode.name,
                                        href: buildRoomFilterHref(zoneNode.code, statusFilter),
                                        isSelected: zoneSelected,
                                    };
                                });
                            const roomSelected = normalizeText(roomNode.code) === selectedCodeNormalized;
                            const hasSelectedDescendant = roomSelected || zones.some((zone) => zone.isSelected);
                            return {
                                code: roomNode.code,
                                name: roomNode.name,
                                href: buildRoomFilterHref(roomNode.code, statusFilter),
                                isSelected: roomSelected,
                                zones,
                                hasSelectedDescendant,
                            };
                        });

                    return {
                        code: floorNode.code,
                        name: floorNode.name,
                        rooms: roomsInFloor,
                        hasSelectedDescendant: roomsInFloor.some((roomNode) => roomNode.hasSelectedDescendant),
                    };
                });

            return {
                code: typeNode.code,
                name: typeNode.name,
                floors,
                hasSelectedDescendant: floors.some((floorNode) => floorNode.hasSelectedDescendant),
            };
        });
}

export default async function RoomAssetsPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canReadPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets/rooms',
        { isApprover: permissionContext.isApprover },
    );

    if (!canReadPage) {
        redirect('/assets');
    }

    const [rooms, rawParams] = await Promise.all([
        prisma.tbl_rooms.findMany({
            where: { active: true },
            select: {
                room_id: true,
                room_code: true,
                room_name: true,
                room_type: true,
                building: true,
                floor: true,
                zone: true,
            },
            orderBy: [{ room_code: 'asc' }],
        }),
        searchParams,
    ]);

    const params = rawParams || {};
    const roomCode = getSingleParam(params.room).trim();
    const statusParamRaw = getSingleParam(params.status).trim();
    const statusFilter: StatusFilter = STATUS_OPTIONS.includes(statusParamRaw as StatusFilter)
        ? (statusParamRaw as StatusFilter)
        : 'all';

    const scanText = getSingleParam(params.scan).trim();
    let keyword = getSingleParam(params.q).trim();

    let selectedRoom = rooms.find((room) => room.room_code === roomCode) || null;
    let scanResolution: 'room_code' | 'asset_match' | 'none' | null = null;

    if (scanText) {
        if (selectedRoom && normalizeText(selectedRoom.room_code) === normalizeText(scanText)) {
            scanResolution = 'room_code';
        } else if (!selectedRoom) {
            const scannedAsset = await prisma.tbl_assets.findFirst({
                where: {
                    OR: [
                        { asset_code: scanText },
                        { serial_number: scanText },
                        { asset_name: { contains: scanText } },
                    ],
                },
                select: {
                    location: true,
                },
                orderBy: { updated_at: 'desc' },
            });

            if (scannedAsset?.location) {
                const inferredRoom = rooms.find((room) => assetBelongsToRoom(scannedAsset.location, room)) || null;
                if (inferredRoom) {
                    selectedRoom = inferredRoom;
                    if (!keyword) {
                        keyword = scanText;
                    }
                    scanResolution = 'asset_match';
                } else {
                    scanResolution = 'none';
                }
            } else {
                scanResolution = 'none';
            }
        }
    }

    let assets: Array<{
        asset_id: number;
        asset_code: string;
        asset_name: string;
        category: string;
        status: string;
        location: string | null;
        room_section: string | null;
        brand: string | null;
        model: string | null;
        serial_number: string | null;
        purchase_price: unknown;
        updated_at: Date;
    }> = [];

    if (selectedRoom) {
        const locationTerms = [selectedRoom.room_code, selectedRoom.room_name]
            .map((term) => term.trim())
            .filter(Boolean);

        if (locationTerms.length > 0) {
            const keywordFilters = keyword
                ? [
                    { asset_code: { contains: keyword } },
                    { asset_name: { contains: keyword } },
                    { category: { contains: keyword } },
                    { brand: { contains: keyword } },
                    { model: { contains: keyword } },
                    { serial_number: { contains: keyword } },
                    { location: { contains: keyword } },
                    { room_section: { contains: keyword } },
                  ]
                : [];

            const queriedAssets = await prisma.tbl_assets.findMany({
                where: {
                    OR: locationTerms.map((term) => ({ location: { contains: term } })),
                    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
                    ...(keywordFilters.length > 0 ? { AND: [{ OR: keywordFilters }] } : {}),
                },
                select: {
                    asset_id: true,
                    asset_code: true,
                    asset_name: true,
                    category: true,
                    status: true,
                    location: true,
                    room_section: true,
                    brand: true,
                    model: true,
                    serial_number: true,
                    purchase_price: true,
                    updated_at: true,
                },
                orderBy: [{ updated_at: 'desc' }, { asset_code: 'asc' }],
            });

            assets = queriedAssets.filter((asset) => assetBelongsToRoom(asset.location, selectedRoom));
        }
    }

    const totalAssets = assets.length;
    const activeAssets = assets.filter((asset) => asset.status === 'Active').length;
    const inRepairAssets = assets.filter((asset) => asset.status === 'InRepair').length;
    const disposedAssets = assets.filter((asset) => asset.status === 'Disposed').length;
    const totalPurchaseValue = assets.reduce((sum, asset) => sum + Number(asset.purchase_price || 0), 0);
    const roomHierarchy = buildRoomHierarchy(rooms, selectedRoom?.room_code || roomCode, statusFilter);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">รายละเอียดสินทรัพย์ตามห้อง</h1>
                    <p className="text-sm text-gray-500">ดูสถานะปัจจุบันของทรัพย์สินที่อยู่ในห้องที่เลือก</p>
                </div>
                <Link
                    href="/assets"
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    กลับไปทะเบียนทรัพย์สิน
                </Link>
            </div>

            <form method="get" className="rounded-lg bg-white p-4 shadow">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <RoomSelectorField rooms={rooms} defaultRoomCode={selectedRoom?.room_code || ''} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-500">สถานะ</label>
                        <select
                            name="status"
                            defaultValue={statusFilter}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="Active">Active</option>
                            <option value="InRepair">InRepair</option>
                            <option value="Disposed">Disposed</option>
                            <option value="Lost">Lost</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-gray-500">ค้นหา</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                name="q"
                                defaultValue={keyword}
                                placeholder="รหัส, ชื่อ, หมวดหมู่, S/N..."
                                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        แสดงผล
                    </button>

                    <RoomScanButton
                        rooms={rooms}
                        currentRoomCode={selectedRoom?.room_code || ''}
                        currentStatus={statusFilter}
                    />

                    <Link
                        href="/assets/rooms"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        ล้างตัวกรอง
                    </Link>

                    {selectedRoom && (
                        <span className="ml-auto text-sm text-gray-500">
                            ห้องที่เลือก: {selectedRoom.room_code} - {selectedRoom.room_name}
                        </span>
                    )}
                </div>
            </form>

            {scanText && scanResolution && (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        scanResolution === 'none'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                >
                    {scanResolution === 'room_code' && (
                        <span>
                            สแกนรหัสห้อง <span className="font-semibold">{scanText}</span> และเลือกห้องให้อัตโนมัติแล้ว
                        </span>
                    )}
                    {scanResolution === 'asset_match' && selectedRoom && (
                        <span>
                            สแกนรหัส <span className="font-semibold">{scanText}</span> และจับคู่ห้องอัตโนมัติเป็น{' '}
                            <span className="font-semibold">{selectedRoom.room_code} - {selectedRoom.room_name}</span>
                        </span>
                    )}
                    {scanResolution === 'none' && (
                        <span>
                            สแกนรหัส <span className="font-semibold">{scanText}</span> แล้ว แต่ยังจับคู่ห้องอัตโนมัติไม่ได้ ลองเลือกห้องหรือพิมพ์คำค้นเพิ่ม
                        </span>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="rounded-lg bg-white p-4 shadow">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800">รายชื่อห้องแบบโครงสร้าง</h2>
                            <p className="text-xs text-gray-500">เหมือนหน้า admin/rooms เพื่อเลือกเช็คทรัพย์สินเร็วขึ้น</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {rooms.length.toLocaleString()} ห้อง
                        </span>
                    </div>

                    {roomHierarchy.length === 0 ? (
                        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-500">
                            ยังไม่พบข้อมูลห้อง
                        </p>
                    ) : (
                        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                            {roomHierarchy.map((typeNode) => (
                                <details key={typeNode.code} open={typeNode.hasSelectedDescendant} className="rounded-md border border-slate-200">
                                    <summary className="cursor-pointer bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                                        {typeNode.name} ({typeNode.code})
                                    </summary>
                                    <div className="space-y-2 p-2">
                                        {typeNode.floors.map((floorNode) => (
                                            <details
                                                key={`${typeNode.code}-${floorNode.code}`}
                                                open={floorNode.hasSelectedDescendant}
                                                className="rounded-md border border-slate-200"
                                            >
                                                <summary className="cursor-pointer bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                                    ชั้น: {floorNode.name} ({floorNode.code})
                                                </summary>
                                                <div className="space-y-1 p-2">
                                                    {floorNode.rooms.map((roomNode) => (
                                                        <div key={`${floorNode.code}-${roomNode.code}`} className="space-y-1">
                                                            <Link
                                                                href={roomNode.href}
                                                                className={`block rounded-md border px-2 py-1.5 text-xs transition ${
                                                                    roomNode.isSelected
                                                                        ? 'border-blue-300 bg-blue-50 font-semibold text-blue-700'
                                                                        : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                {roomNode.code} - {roomNode.name}
                                                            </Link>
                                                            {roomNode.zones.length > 0 && (
                                                                <div className="ml-3 space-y-1 border-l border-slate-200 pl-2">
                                                                    {roomNode.zones.map((zoneNode) => (
                                                                        <Link
                                                                            key={`${roomNode.code}-${zoneNode.code}`}
                                                                            href={zoneNode.href}
                                                                            className={`block rounded-md border px-2 py-1 text-[11px] transition ${
                                                                                zoneNode.isSelected
                                                                                    ? 'border-violet-300 bg-violet-50 font-semibold text-violet-700'
                                                                                    : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            {zoneNode.code} - {zoneNode.name}
                                                                        </Link>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </aside>

                <div className="space-y-4">
                    {selectedRoom ? (
                        <>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <div className="rounded-lg bg-white p-4 shadow">
                                    <div className="text-xs text-gray-500">ทรัพย์สินในห้องนี้</div>
                                    <div className="mt-1 text-xl font-bold text-gray-900">{totalAssets.toLocaleString()}</div>
                                </div>
                                <div className="rounded-lg bg-white p-4 shadow">
                                    <div className="text-xs text-gray-500">ใช้งานปกติ</div>
                                    <div className="mt-1 text-xl font-bold text-green-700">{activeAssets.toLocaleString()}</div>
                                </div>
                                <div className="rounded-lg bg-white p-4 shadow">
                                    <div className="text-xs text-gray-500">ส่งซ่อม</div>
                                    <div className="mt-1 text-xl font-bold text-amber-700">{inRepairAssets.toLocaleString()}</div>
                                </div>
                                <div className="rounded-lg bg-white p-4 shadow">
                                    <div className="text-xs text-gray-500">จำหน่ายแล้ว</div>
                                    <div className="mt-1 text-xl font-bold text-red-700">{disposedAssets.toLocaleString()}</div>
                                </div>
                                <div className="rounded-lg bg-white p-4 shadow">
                                    <div className="text-xs text-gray-500">มูลค่าซื้อรวม</div>
                                    <div className="mt-1 text-xl font-bold text-blue-700">{totalPurchaseValue.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-lg bg-white shadow">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                                            <tr>
                                                <th className="px-6 py-3">รหัสทรัพย์สิน</th>
                                                <th className="px-6 py-3">ชื่อทรัพย์สิน</th>
                                                <th className="px-6 py-3">หมวดหมู่</th>
                                                <th className="px-6 py-3">ตำแหน่งปัจจุบัน</th>
                                                <th className="px-6 py-3">รุ่น/ยี่ห้อ</th>
                                                <th className="px-6 py-3 text-right">ราคาซื้อ</th>
                                                <th className="px-6 py-3 text-center">สถานะ</th>
                                                <th className="px-6 py-3 text-right">อัปเดตล่าสุด</th>
                                                <th className="px-6 py-3 text-center">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {assets.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                                                        ไม่พบทรัพย์สินที่ตรงกับเงื่อนไขในห้องนี้
                                                    </td>
                                                </tr>
                                            ) : (
                                                assets.map((asset) => (
                                                    <tr key={asset.asset_id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">{asset.asset_code}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">{asset.asset_name}</div>
                                                            <div className="text-xs text-gray-500">S/N: {asset.serial_number || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-4">{asset.category || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="inline-flex items-center text-gray-600">
                                                                    <MapPin className="mr-1 h-3 w-3" />
                                                                    {asset.location || '-'}
                                                                </span>
                                                                <span className="inline-flex items-center text-xs text-gray-400">
                                                                    <Building2 className="mr-1 h-3 w-3" />
                                                                    {asset.room_section || '-'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div>{asset.model || '-'}</div>
                                                            <div className="text-xs text-gray-500">{asset.brand || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">{Number(asset.purchase_price || 0).toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(asset.status)}`}>
                                                                {asset.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs text-gray-500">
                                                            {new Date(asset.updated_at).toLocaleString('th-TH')}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <Link
                                                                href={`/assets/${asset.asset_id}`}
                                                                className="font-medium text-blue-600 hover:text-blue-800"
                                                            >
                                                                รายละเอียด
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                            กรุณาเลือกห้องเพื่อดูรายละเอียดสินทรัพย์ปัจจุบันในห้องนั้น หรือใช้ปุ่มสแกน QR เพื่อค้นหา
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
