'use client';

import { useState, useRef, useMemo } from 'react';
import { createAsset, updateAsset } from '@/actions/assetActions';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '@/components/FloatingField';
import { Save, X } from 'lucide-react';
import { useToast } from './ToastProvider';
import { useRouter } from 'next/navigation';
import CurrencyInput from './CurrencyInput';
import Image from 'next/image';

type Asset = {
    asset_id?: number;
    asset_code: string;
    asset_name: string;
    description: string | null;
    category: string;
    purchase_date: Date;
    purchase_price: number;
    useful_life_years: number;
    salvage_value: number;
    location: string | null;
    room_section: string | null;
    status: string;
    image_url: string | null;
    vendor: string | null;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
};

type AssetRoomReference = {
    room_id: number;
    room_code: string;
    room_name: string;
    room_type: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
    active?: boolean;
};

type RoomOption = {
    roomCode: string;
    roomName: string;
    roomLabel: string;
};

type ZoneOption = {
    roomCode: string;
    zoneCode: string;
    zoneName: string;
    zoneLabel: string;
};

type AcquisitionType = 'register' | 'purchase' | 'opening';

const ROOM_SECTION_PRESETS = [
    'ประตูทางเข้า',
    'พื้นที่นั่งเล่น',
    'โซนเตียงนอน',
    'หัวเตียง',
    'ปลายเตียง',
    'มุมซ้ายห้อง',
    'มุมขวาห้อง',
    'ห้องน้ำ',
    'ระเบียง',
    'ตู้เสื้อผ้า',
    'โต๊ะทำงาน',
    'ครัว/แพนทรี',
];

const DEFAULT_ASSET_CATEGORIES = ['Furniture', 'Electronics', 'Vehicle', 'Machinery', 'Other'];

const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();

export default function AssetForm({
    asset,
    prefill,
    suggestedAssetCode,
    roomReferences = [],
    assetGroups = [],
    acquisitionType = 'register',
}: {
    asset?: Asset;
    prefill?: Partial<Asset>;
    suggestedAssetCode?: string;
    roomReferences?: AssetRoomReference[];
    assetGroups?: string[];
    acquisitionType?: AcquisitionType;
}) {
    const [isPending, setIsPending] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(asset?.status || prefill?.status || 'Active');

    // Auto-detect image URL format
    const getInitialPreview = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
        return `/uploads/${url}`;
    };

    const [preview, setPreview] = useState<string | null>(getInitialPreview(asset?.image_url));
    const formRef = useRef<HTMLFormElement>(null);
    const { showConfirm, showToast } = useToast();
    const router = useRouter();
    const initialAssetCode = asset?.asset_code || prefill?.asset_code || suggestedAssetCode || '';
    const isAssetCodeReadOnly = Boolean(asset) || Boolean(suggestedAssetCode);
    const effectiveAcquisitionType: AcquisitionType = asset ? 'register' : acquisitionType;
    const initialLocationText = (asset?.location || prefill?.location || '').trim();
    const initialRoomSectionText = (asset?.room_section || prefill?.room_section || '').trim();
    const categoryOptions = useMemo(
        () => Array.from(
            new Set([
                ...DEFAULT_ASSET_CATEGORIES,
                ...assetGroups,
                asset?.category || '',
                prefill?.category || '',
            ]),
        ).filter((value): value is string => Boolean(value)).sort((left, right) => left.localeCompare(right)),
        [asset?.category, assetGroups, prefill?.category],
    );

    const { roomOptions, zoneOptionsByRoom } = useMemo(() => {
        const activeReferences = roomReferences
            .filter((room) => room.active !== false)
            .filter((room) => !room.room_code.startsWith('T-') && !room.room_code.startsWith('F-'));

        const roomMap = new Map<string, RoomOption>();
        const zoneMap = new Map<string, ZoneOption[]>();

        for (const room of activeReferences) {
            if (room.zone) {
                const parentRoomCode = room.building && room.building !== room.room_code
                    ? room.building
                    : room.room_code;

                if (!zoneMap.has(parentRoomCode)) {
                    zoneMap.set(parentRoomCode, []);
                }
                zoneMap.get(parentRoomCode)!.push({
                    roomCode: parentRoomCode,
                    zoneCode: room.room_code,
                    zoneName: room.room_name,
                    zoneLabel: `${room.room_code} - ${room.room_name}`,
                });
            } else if (!roomMap.has(room.room_code)) {
                roomMap.set(room.room_code, {
                    roomCode: room.room_code,
                    roomName: room.room_name,
                    roomLabel: `${room.room_code} - ${room.room_name}`,
                });
            }
        }

        const sortedRoomOptions = Array.from(roomMap.values()).sort((left, right) =>
            left.roomCode.localeCompare(right.roomCode),
        );

        const sortedZoneMap = new Map<string, ZoneOption[]>();
        for (const [roomCode, zones] of zoneMap.entries()) {
            sortedZoneMap.set(
                roomCode,
                [...zones].sort((left, right) => left.zoneCode.localeCompare(right.zoneCode)),
            );
        }

        return { roomOptions: sortedRoomOptions, zoneOptionsByRoom: sortedZoneMap };
    }, [roomReferences]);

    const hasRoomReferenceData = roomOptions.length > 0;

    const initialRoomCode = useMemo(() => {
        if (!hasRoomReferenceData) return '';
        const normalizedLocation = normalizeText(initialLocationText);
        const normalizedRoomSection = normalizeText(initialRoomSectionText);

        const matchFromRooms = roomOptions.find((room) => {
            const roomCode = normalizeText(room.roomCode);
            const roomName = normalizeText(room.roomName);
            return (
                normalizedLocation === roomCode ||
                (roomCode && normalizedLocation.includes(roomCode)) ||
                (roomName && normalizedLocation.includes(roomName)) ||
                (roomCode && normalizedRoomSection.includes(roomCode))
            );
        });
        if (matchFromRooms) return matchFromRooms.roomCode;

        for (const [roomCode, zones] of zoneOptionsByRoom.entries()) {
            const zoneMatch = zones.find((zone) => {
                const zoneCode = normalizeText(zone.zoneCode);
                const zoneName = normalizeText(zone.zoneName);
                return (
                    (zoneCode && normalizedLocation.includes(zoneCode)) ||
                    (zoneName && normalizedLocation.includes(zoneName)) ||
                    (zoneCode && normalizedRoomSection.includes(zoneCode)) ||
                    (zoneName && normalizedRoomSection.includes(zoneName))
                );
            });
            if (zoneMatch) return roomCode;
        }

        return '';
    }, [hasRoomReferenceData, initialLocationText, initialRoomSectionText, roomOptions, zoneOptionsByRoom]);

    const [selectedRoomCode, setSelectedRoomCode] = useState(initialRoomCode);
    const availableZoneOptions = useMemo(
        () => zoneOptionsByRoom.get(selectedRoomCode) || [],
        [zoneOptionsByRoom, selectedRoomCode],
    );

    const initialZoneCode = useMemo(() => {
        if (!selectedRoomCode) return '';
        const normalizedRoomSection = normalizeText(initialRoomSectionText);
        const normalizedLocation = normalizeText(initialLocationText);
        const matchedZone = availableZoneOptions.find((zone) => {
            const zoneCode = normalizeText(zone.zoneCode);
            const zoneName = normalizeText(zone.zoneName);
            return (
                normalizedRoomSection === zoneCode ||
                (zoneCode && normalizedRoomSection.includes(zoneCode)) ||
                (zoneName && normalizedRoomSection.includes(zoneName)) ||
                (zoneCode && normalizedLocation.includes(zoneCode))
            );
        });
        return matchedZone?.zoneCode || '';
    }, [availableZoneOptions, initialLocationText, initialRoomSectionText, selectedRoomCode]);

    const [selectedZoneCode, setSelectedZoneCode] = useState(initialZoneCode);

    const selectedRoomOption = useMemo(
        () => roomOptions.find((room) => room.roomCode === selectedRoomCode) || null,
        [roomOptions, selectedRoomCode],
    );
    const selectedZoneOption = useMemo(
        () => availableZoneOptions.find((zone) => zone.zoneCode === selectedZoneCode) || null,
        [availableZoneOptions, selectedZoneCode],
    );

    const resolvedLocationValue = hasRoomReferenceData
        ? (selectedRoomOption?.roomCode || '')
        : initialLocationText;
    const resolvedRoomSectionValue = hasRoomReferenceData
        ? (selectedZoneOption?.zoneCode || '')
        : initialRoomSectionText;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(formRef.current!);
        const assetCode = formData.get('asset_code') as string;
        const assetName = formData.get('asset_name') as string;

        // Show confirmation dialog
        const confirmed = await showConfirm({
            title: asset ? 'ยืนยันการแก้ไขข้อมูล' : 'ยืนยันการลงทะเบียนทรัพย์สิน',
            message: asset
                ? `คุณต้องการบันทึกการแก้ไขข้อมูลทรัพย์สิน "${assetName}" หรือไม่?`
                : `คุณต้องการลงทะเบียนทรัพย์สินใหม่\nรหัส: ${assetCode}\nชื่อ: ${assetName}\n\nกรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก`,
            confirmText: 'บันทึก',
            cancelText: 'ยกเลิก',
            type: 'info'
        });

        if (!confirmed) return;

        setIsPending(true);
        try {
            if (asset?.asset_id) {
                formData.append('asset_id', asset.asset_id.toString());
                await updateAsset(formData);
                showToast(`แก้ไขทรัพย์สิน "${assetName}" สำเร็จ`, 'success');
                router.push(`/assets/${asset.asset_id}`);
            } else {
                await createAsset(formData);
                showToast(`ลงทะเบียนทรัพย์สิน "${assetName}" สำเร็จ`, 'success');
                router.push('/assets');
            }
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
            showToast(message, 'error');
            setIsPending(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleOpenProductNew = () => {
        if (!formRef.current) return;
        const fd = new FormData(formRef.current);
        const getText = (name: string) => String(fd.get(name) || '').trim();

        const params = new URLSearchParams();
        params.set('source', 'asset');

        const assetName = getText('asset_name');
        const description = getText('description');
        const vendor = getText('vendor');
        const brand = getText('brand');
        const model = getText('model');
        const location = getText('location');
        const roomSection = getText('room_section');

        if (assetName) params.set('asset_name', assetName);
        if (description) params.set('description', description);
        if (vendor) params.set('vendor', vendor);
        if (brand) params.set('brand', brand);
        if (model) params.set('model', model);
        if (location) params.set('location', location);
        if (roomSection) params.set('room_section', roomSection);

        const mergedLocation = [location, roomSection].filter(Boolean).join(' / ');
        if (mergedLocation) params.set('asset_current_location', mergedLocation);

        params.set('is_asset', 'true');
        window.location.href = `/products/new?${params.toString()}`;
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <input type="hidden" name="acquisition_type" value={effectiveAcquisitionType} />
            <div className="p-6 border-b bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">
                    {asset
                        ? 'แก้ไขข้อมูลทรัพย์สิน'
                        : effectiveAcquisitionType === 'opening'
                            ? 'เพิ่มสินทรัพย์ยกมา'
                            : effectiveAcquisitionType === 'purchase'
                                ? 'ซื้อสินทรัพย์'
                                : 'ลงทะเบียนทรัพย์สินใหม่'}
                </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: General Info */}
                <div className="space-y-4">
                    <div>
                        <FloatingInput
                            label="รหัสทรัพย์สิน *"
                            type="text"
                            name="asset_code"
                            defaultValue={initialAssetCode}
                            required
                            readOnly={isAssetCodeReadOnly}
                            className={isAssetCodeReadOnly ? 'bg-gray-100 text-gray-500' : 'focus:ring-blue-500/20'}
                        />
                        {!asset && suggestedAssetCode && (
                            <p className="mt-1 text-xs text-gray-500">สร้างรหัสอัตโนมัติตามนโยบายทะเบียนทรัพย์สิน</p>
                        )}
                    </div>
                    <FloatingInput
                        label="ชื่อทรัพย์สิน *"
                        type="text"
                        name="asset_name"
                        defaultValue={asset?.asset_name || prefill?.asset_name || ''}
                        className="focus:ring-blue-500/20"
                        required
                    />
                    <div>
                        <FloatingInput
                            label="หมวดหมู่ *"
                            type="text"
                            name="category"
                            list="asset-category-options"
                            defaultValue={asset?.category || prefill?.category || 'Other'}
                            className="focus:ring-blue-500/20"
                            required
                        />
                        <datalist id="asset-category-options">
                            {categoryOptions.map((category) => (
                                <option key={category} value={category} />
                            ))}
                        </datalist>
                    </div>
                    {!asset && (effectiveAcquisitionType === 'purchase' || effectiveAcquisitionType === 'opening') && (
                        <>
                            <div>
                                <FloatingInput
                                    label={effectiveAcquisitionType === 'opening' ? 'อ้างอิงเอกสารยกมา' : 'อ้างอิงการซื้อ'}
                                    type="text"
                                    name="acquisition_note"
                                    className="focus:ring-blue-500/20"
                                />
                            </div>
                            {effectiveAcquisitionType === 'opening' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ค่าเสื่อมสะสมยกมา (บาท)</label>
                                    <CurrencyInput name="opening_accumulated_depreciation" defaultValue={0} placeholder="0.00" />
                                </div>
                            )}
                        </>
                    )}
                    {hasRoomReferenceData ? (
                        <>
                            <div>
                                <FloatingSelect
                                    label="สถานที่ตั้ง (อ้างอิงห้อง) *"
                                    value={selectedRoomCode}
                                    onChange={(event) => {
                                        setSelectedRoomCode(event.target.value);
                                        setSelectedZoneCode('');
                                    }}
                                    className="focus:ring-blue-500/20"
                                    required
                                >
                                    <option value="">-- เลือกห้อง --</option>
                                    {roomOptions.map((room) => (
                                        <option key={room.roomCode} value={room.roomCode}>
                                            {room.roomLabel}
                                        </option>
                                    ))}
                                </FloatingSelect>
                                <input type="hidden" name="location" value={resolvedLocationValue} />
                                <p className="mt-1 text-xs text-gray-500">
                                    บันทึกค่า Location จากรหัสห้อง: {resolvedLocationValue || '-'}
                                </p>
                            </div>

                            <div>
                                <FloatingSelect
                                    label="ส่วนของห้องพัก / จุดติดตั้ง (อ้างอิงโซน)"
                                    value={selectedZoneCode}
                                    onChange={(event) => setSelectedZoneCode(event.target.value)}
                                    className="focus:ring-blue-500/20"
                                    disabled={!selectedRoomCode}
                                >
                                    <option value="">{selectedRoomCode ? '-- เลือกโซน (ถ้ามี) --' : '-- กรุณาเลือกห้องก่อน --'}</option>
                                    {availableZoneOptions.map((zone) => (
                                        <option key={zone.zoneCode} value={zone.zoneCode}>
                                            {zone.zoneLabel}
                                        </option>
                                    ))}
                                </FloatingSelect>
                                <input type="hidden" name="room_section" value={resolvedRoomSectionValue} />
                                <p className="mt-1 text-xs text-gray-500">
                                    บันทึกค่า Room section จากโซน: {resolvedRoomSectionValue || '-'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <FloatingInput
                                label="สถานที่ตั้ง"
                                type="text"
                                name="location"
                                defaultValue={asset?.location || prefill?.location || ''}
                                className="focus:ring-blue-500/20"
                            />
                            <div>
                                <FloatingInput
                                    label="ส่วนของห้องพัก / จุดติดตั้ง"
                                    type="text"
                                    name="room_section"
                                    list="room-section-presets"
                                    defaultValue={asset?.room_section || prefill?.room_section || ''}
                                    className="focus:ring-blue-500/20"
                                />
                                <datalist id="room-section-presets">
                                    {ROOM_SECTION_PRESETS.map((section) => (
                                        <option key={section} value={section} />
                                    ))}
                                </datalist>
                            </div>
                        </>
                    )}
                    {asset?.asset_id && (
                        <FloatingInput
                            label="Transfer Approval Ref"
                            type="text"
                            name="transfer_approval_ref"
                            className="focus:ring-blue-500/20"
                        />
                    )}
                    <FloatingSelect
                        label="สถานะ"
                        name="status"
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                        className="focus:ring-blue-500/20"
                    >
                        <option value="Active">Active (ใช้งานปกติ)</option>
                        <option value="DepreciationPaused">Depreciation Paused (หยุดคิดค่าเสื่อม)</option>
                        <option value="InRepair">In Repair (ส่งซ่อม)</option>
                        <option value="Sold">Sold (ขายแล้ว)</option>
                        <option value="Disposed">Disposed (จำหน่ายออก)</option>
                        <option value="Lost">Lost (สูญหาย)</option>
                    </FloatingSelect>
                    {selectedStatus === 'Disposed' && (
                        <>
                            <FloatingTextarea
                                label="Disposal Reason *"
                                name="disposal_reason"
                                rows={2}
                                className="focus:ring-blue-500/20"
                                required
                            />
                            <FloatingInput
                                label="Secondary Approver"
                                type="text"
                                name="secondary_approver"
                                className="focus:ring-blue-500/20"
                            />
                        </>
                    )}
                    <FloatingInput
                        label="Serial Number (S/N)"
                        type="text"
                        name="serial_number"
                        defaultValue={asset?.serial_number || prefill?.serial_number || ''}
                        className="focus:ring-blue-500/20"
                    />
                    <FloatingInput
                        label="ยี่ห้อ (Brand)"
                        type="text"
                        name="brand"
                        defaultValue={asset?.brand || prefill?.brand || ''}
                        className="focus:ring-blue-500/20"
                    />
                    <FloatingInput
                        label="รุ่น (Model)"
                        type="text"
                        name="model"
                        defaultValue={asset?.model || prefill?.model || ''}
                        className="focus:ring-blue-500/20"
                    />
                    <FloatingInput
                        label="ร้านค้า/ตัวแทนจำหน่าย (Vendor)"
                        type="text"
                        name="vendor"
                        defaultValue={asset?.vendor || prefill?.vendor || ''}
                        className="focus:ring-blue-500/20"
                    />
                    <FloatingTextarea
                        label="รายละเอียดเพิ่มเติม"
                        name="description"
                        rows={3}
                        defaultValue={asset?.description || prefill?.description || ''}
                        className="focus:ring-blue-500/20"
                    />
                </div>

                {/* Right: Accounting & Image */}
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
                        <h3 className="text-sm font-bold text-blue-800 mb-2">ข้อมูลทางบัญชี (สำหรับการคำนวณค่าเสื่อม)</h3>
                        <FloatingInput
                            label="วันที่ซื้อ *"
                            type="date"
                            name="purchase_date"
                            defaultValue={asset?.purchase_date ? new Date(asset.purchase_date).toISOString().split('T')[0] : ''}
                            className="bg-white focus:ring-blue-500/20"
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ราคาซื้อ (บาท) *</label>
                                <CurrencyInput name="purchase_price" defaultValue={asset ? Number(asset.purchase_price) : 0} required placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ราคาซาก (บาท)</label>
                                <CurrencyInput name="salvage_value" defaultValue={asset ? Number(asset.salvage_value) : 0} placeholder="0.00" />
                            </div>
                        </div>
                        <FloatingInput
                            label="อายุการใช้งาน (ปี) *"
                            type="number"
                            name="useful_life_years"
                            defaultValue={asset?.useful_life_years || 5}
                            className="bg-white focus:ring-blue-500/20"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">รูปภาพทรัพย์สิน</label>
                        <div className="flex items-center gap-4">
                            <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                                {preview ? (
                                    <Image
                                        src={preview}
                                        alt="Asset preview"
                                        width={128}
                                        height={128}
                                        unoptimized
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs text-gray-400">No Image</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <input type="file" name="image" accept="image/*" onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                <p className="text-xs text-gray-500 mt-2">รองรับไฟล์ JPG, PNG</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                {!asset?.asset_id && (
                    <button
                        type="button"
                        onClick={handleOpenProductNew}
                        className="px-4 py-2 border border-violet-200 bg-violet-50 rounded-lg hover:bg-violet-100 transition text-violet-700"
                    >
                        ไปเพิ่มสินค้าโดยใช้ข้อมูลนี้
                    </button>
                )}
                <button type="button" onClick={() => window.history.back()} className="px-4 py-2 border rounded-lg hover:bg-white transition text-gray-700 flex items-center">
                    <X className="w-4 h-4 mr-2" /> ยกเลิก
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center disabled:opacity-50">
                    <Save className="w-4 h-4 mr-2" /> {isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>
        </form>
    );
}

