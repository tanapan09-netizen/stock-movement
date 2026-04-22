'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { uploadFile } from '@/lib/gcs';
import type { Prisma } from '@prisma/client';
import type { Session } from 'next-auth';
import {
    getAssetPolicyFromDb,
    validateAssetInputByPolicy,
    validateDisposalByPolicy,
    validateTransferByPolicy,
} from '@/lib/server/asset-policy-service';
import { generateNextAssetCodeByPolicy } from '@/lib/server/asset-code-service';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

import { auth } from '@/auth';

const UPLOAD_DIR = 'assets';
const ASSET_GROUP_DESC_PREFIX = 'ASSET_GROUP:';

type AcquisitionType = 'register' | 'purchase' | 'opening';

type SessionUserLike = {
    id?: string | number | null;
    p_id?: string | number | null;
    name?: string | null;
    role?: string | null;
};

function getSessionUser(session: Session | null): SessionUserLike {
    return (session?.user ?? {}) as SessionUserLike;
}

function resolveSessionUserName(user: SessionUserLike, fallback = 'System') {
    return user.name || fallback;
}

function resolveSessionUserRole(user: SessionUserLike) {
    return user.role || '';
}

async function assertAssetWriteAccess(session: Session | null) {
    const permissionContext = await getUserPermissionContext(
        session?.user as PermissionSessionUser | undefined,
    );
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    if (!canEditPage) {
        throw new Error('Unauthorized: asset edit permission required');
    }
}

function isAssetCodeUniqueConstraintError(error: unknown) {
    if (!error || typeof error !== 'object') return false;

    const maybePrismaError = error as {
        code?: string;
        meta?: { target?: string | string[] };
    };

    if (maybePrismaError.code !== 'P2002') return false;

    const target = maybePrismaError.meta?.target;
    if (typeof target === 'string') return target.includes('asset_code');
    if (Array.isArray(target)) return target.includes('asset_code');
    return false;
}

function formatAssetPlacement(location?: string | null, roomSection?: string | null) {
    const loc = (location || '').trim();
    const section = (roomSection || '').trim();
    return [loc, section].filter(Boolean).join(' / ');
}

function normalizeAcquisitionType(raw: string): AcquisitionType {
    const value = raw.trim().toLowerCase();
    if (value === 'purchase') return 'purchase';
    if (value === 'opening') return 'opening';
    return 'register';
}

function formatCurrency(value: number) {
    return Number(value || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatAssetFieldValueForHistory(key: string, value: unknown) {
    if (value === null || value === undefined) return '-';

    if (key === 'purchase_date') {
        const dateValue = value instanceof Date ? value : new Date(String(value));
        if (Number.isFinite(dateValue.getTime())) {
            return dateValue.toLocaleDateString('th-TH');
        }
    }

    if (key === 'purchase_price' || key === 'salvage_value') {
        const numberValue = Number(value);
        if (Number.isFinite(numberValue)) {
            return `${formatCurrency(numberValue)} บาท`;
        }
    }

    if (key === 'useful_life_years') {
        const numberValue = Number(value);
        if (Number.isFinite(numberValue)) {
            return `${numberValue} ปี`;
        }
    }

    const textValue = String(value).trim();
    return textValue || '-';
}

async function getTransferApprovalByRef(reference: string) {
    const requestNumber = reference.trim();
    if (!requestNumber) return null;

    return prisma.tbl_approval_requests.findUnique({
        where: { request_number: requestNumber },
        select: {
            request_id: true,
            request_type: true,
            status: true,
            reference_job: true,
            approved_at: true,
        },
    });
}

export async function createAssetGroup(formData: FormData) {
    const session = await auth();
    await assertAssetWriteAccess(session);

    const groupName = String(formData.get('group_name') || '').trim();
    const groupDescription = String(formData.get('group_description') || '').trim();

    if (groupName.length < 2) {
        throw new Error('Asset group name must be at least 2 characters');
    }

    const taggedDescription = `${ASSET_GROUP_DESC_PREFIX}${groupDescription || groupName}`;

    const existing = await prisma.tbl_categories.findFirst({
        where: { cat_name: groupName },
        select: { cat_id: true, cat_desc: true },
    });

    if (existing) {
        await prisma.tbl_categories.update({
            where: { cat_id: existing.cat_id },
            data: {
                cat_desc: existing.cat_desc?.startsWith(ASSET_GROUP_DESC_PREFIX)
                    ? existing.cat_desc
                    : taggedDescription,
            },
        });
    } else {
        await prisma.tbl_categories.create({
            data: {
                cat_name: groupName,
                cat_desc: taggedDescription,
            },
        });
    }

    revalidatePath('/assets');
    revalidatePath('/assets/new');
}

export async function createAsset(formData: FormData) {
    const session = await auth();
    await assertAssetWriteAccess(session);

    const sessionUser = getSessionUser(session);
    const userName = resolveSessionUserName(sessionUser);

    const providedAssetCode = ((formData.get('asset_code') as string) || '').trim();
    let asset_code = providedAssetCode || await generateNextAssetCodeByPolicy();
    const acquisition_type = normalizeAcquisitionType(String(formData.get('acquisition_type') || ''));
    const acquisition_note = String(formData.get('acquisition_note') || '').trim();
    const opening_accumulated_depreciation = parseFloat(String(formData.get('opening_accumulated_depreciation') || '0')) || 0;
    const asset_name = formData.get('asset_name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const purchase_date = new Date(formData.get('purchase_date') as string);
    const purchase_price = parseFloat(formData.get('purchase_price') as string) || 0;
    const useful_life_years = parseInt(formData.get('useful_life_years') as string) || 1;
    const salvage_value = parseFloat(formData.get('salvage_value') as string) || 0;
    const location = formData.get('location') as string;
    const room_section = ((formData.get('room_section') as string) || '').trim();
    const status = formData.get('status') as string || 'Active';
    const vendor = formData.get('vendor') as string;
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const serial_number = formData.get('serial_number') as string;
    const imageFile = formData.get('image') as File;

    const policy = await getAssetPolicyFromDb();
    const policyValidation = validateAssetInputByPolicy(policy, {
        asset_code,
        serial_number,
        status,
        location,
    });
    if (!policyValidation.ok) {
        throw new Error(policyValidation.error);
    }

    let image_url = '';

    if (imageFile && imageFile.size > 0) {
        try {
            image_url = await uploadFile(imageFile, UPLOAD_DIR);
        } catch (error) {
            console.error('Asset image upload failed:', error);
        }
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const asset = await prisma.tbl_assets.create({
                data: {
                    asset_code,
                    asset_name,
                    description,
                    category,
                    purchase_date,
                    purchase_price,
                    useful_life_years,
                    salvage_value,
                    location,
                    room_section: room_section || null,
                    status,
                    vendor: vendor || null,
                    brand: brand || null,
                    model: model || null,
                    serial_number: serial_number || null,
                    image_url: image_url || null,
                },
            });

            const placement = formatAssetPlacement(location, room_section);
            const initialActionType =
                acquisition_type === 'opening'
                    ? 'OpeningBalance'
                    : acquisition_type === 'purchase'
                        ? 'Purchase'
                        : 'Create';
            const initialDescription = [
                acquisition_type === 'opening'
                    ? `บันทึกสินทรัพย์ยกมา: ${asset_name} (${asset_code})`
                    : acquisition_type === 'purchase'
                        ? `ซื้อสินทรัพย์ใหม่: ${asset_name} (${asset_code})`
                        : `ลงทะเบียนทรัพย์สินใหม่: ${asset_name} (${asset_code})`,
                placement ? `Location: ${placement}` : '',
                acquisition_note ? `หมายเหตุ: ${acquisition_note}` : '',
                acquisition_type === 'opening' && opening_accumulated_depreciation > 0
                    ? `ค่าเสื่อมสะสมยกมา: ${formatCurrency(opening_accumulated_depreciation)}`
                    : '',
            ].filter(Boolean).join(' | ');

            // Add initial history
            await prisma.tbl_asset_history.create({
                data: {
                    asset_id: asset.asset_id,
                    action_type: initialActionType,
                    description: initialDescription,
                    performed_by: userName,
                }
            });

            revalidatePath('/assets');
            return;
        } catch (error) {
            lastError = error;

            if (isAssetCodeUniqueConstraintError(error)) {
                asset_code = await generateNextAssetCodeByPolicy();
                continue;
            }

            break;
        }
    }

    console.error('Failed to create asset:', lastError);
    if (isAssetCodeUniqueConstraintError(lastError)) {
        throw new Error('Asset code already exists. Please try again.');
    }
    throw new Error('Failed to create asset');

    // Return success - redirect handled by client to avoid NEXT_REDIRECT error
}

export async function updateAsset(formData: FormData) {
    const session = await auth();
    await assertAssetWriteAccess(session);

    const sessionUser = getSessionUser(session);
    const userName = resolveSessionUserName(sessionUser);
    const userRole = resolveSessionUserRole(sessionUser);

    const asset_id = parseInt(formData.get('asset_id') as string);
    const asset_name = formData.get('asset_name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const location = formData.get('location') as string;
    const room_section = ((formData.get('room_section') as string) || '').trim();
    const status = formData.get('status') as string;
    const purchaseDateRaw = String(formData.get('purchase_date') || '').trim();

    // Note: Purchase details usually not edited often due to depreciation, allowing here though.
    const purchase_price = parseFloat(formData.get('purchase_price') as string);
    const useful_life_years = parseInt(formData.get('useful_life_years') as string);
    const salvage_value = parseFloat(formData.get('salvage_value') as string);
    const vendor = formData.get('vendor') as string;
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const serial_number = formData.get('serial_number') as string;
    const disposal_reason = ((formData.get('disposal_reason') as string) || '').trim();
    const secondary_approver = ((formData.get('secondary_approver') as string) || '').trim();
    const transfer_approval_ref = ((formData.get('transfer_approval_ref') as string) || '').trim();

    const imageFile = formData.get('image') as File;
    const purchase_date = new Date(purchaseDateRaw);

    if (!purchaseDateRaw || Number.isNaN(purchase_date.getTime())) {
        throw new Error('วันที่ซื้อไม่ถูกต้อง');
    }

    const data: Prisma.tbl_assetsUpdateInput = {
        asset_name,
        description,
        category,
        location,
        room_section: room_section || null,
        status,
        purchase_date,
        purchase_price,
        useful_life_years,
        salvage_value,
        vendor: vendor || null,
        brand: brand || null,
        model: model || null,
        serial_number: serial_number || null,
    };

    if (imageFile && imageFile.size > 0) {
        try {
            const imageName = await uploadFile(imageFile, UPLOAD_DIR);
            data.image_url = imageName;
        } catch (error) {
            console.error('Asset image upload failed:', error);
        }
    }

    try {
        const policy = await getAssetPolicyFromDb();

        // Fetch current asset (full record) to compare changes
        const currentAsset = await prisma.tbl_assets.findUnique({
            where: { asset_id },
        });
        if (!currentAsset) {
            throw new Error('Asset not found');
        }

        const policyValidation = validateAssetInputByPolicy(policy, {
            asset_code: currentAsset.asset_code,
            serial_number,
            status,
            location,
        });
        if (!policyValidation.ok) {
            throw new Error(policyValidation.error);
        }

        const wasDisposed = String(currentAsset.status || '').toLowerCase() === 'disposed';
        const willBeDisposed = String(status || '').toLowerCase() === 'disposed';
        if (!wasDisposed && willBeDisposed) {
            const disposalValidation = validateDisposalByPolicy(policy, {
                actorRole: userRole,
                actorName: userName,
                secondaryApprover: secondary_approver,
                reason: disposal_reason || description,
            });
            if (!disposalValidation.ok) {
                throw new Error(disposalValidation.error);
            }
        }

        const oldLocation = (currentAsset.location || '').trim();
        const newLocation = (location || '').trim();
        const oldRoomSection = (currentAsset.room_section || '').trim();
        const newRoomSection = room_section;
        const locationChanged = oldLocation !== newLocation;
        const roomSectionChanged = oldRoomSection !== newRoomSection;
        if (locationChanged) {
            const transferApproval = await getTransferApprovalByRef(transfer_approval_ref);
            const transferValidation = validateTransferByPolicy(policy, {
                assetId: asset_id,
                approvalRef: transfer_approval_ref,
                approvalStatus: transferApproval?.status,
                approvalRequestType: transferApproval?.request_type,
                approvalReferenceJob: transferApproval?.reference_job,
                approvalApprovedAt: transferApproval?.approved_at ?? null,
            });
            if (!transferValidation.ok) {
                throw new Error(transferValidation.error);
            }
        }

        await prisma.tbl_assets.update({
            where: { asset_id },
            data,
        });

        // Build detailed change log
        const changes: string[] = [];
        if (currentAsset) {
            const fieldLabels: Record<string, string> = {
                asset_name: 'ชื่อทรัพย์สิน',
                description: 'รายละเอียด',
                category: 'หมวดหมู่',
                purchase_date: 'วันที่ซื้อ',
                location: 'สถานที่',
                room_section: 'Room Section',
                status: 'สถานะ',
                purchase_price: 'ราคาซื้อ',
                useful_life_years: 'อายุใช้งาน',
                salvage_value: 'ราคาซาก',
                vendor: 'ร้านค้า',
                brand: 'ยี่ห้อ',
                model: 'รุ่น',
                serial_number: 'S/N',
            };
            const currentAssetRecord = currentAsset as Record<string, unknown>;
            const dataRecord = data as Record<string, unknown>;

            for (const [key, label] of Object.entries(fieldLabels)) {
                const oldVal = currentAssetRecord[key];
                const newVal = dataRecord[key];

                // Compare (handle number vs string, null vs empty)
                const oldStr = oldVal === null || oldVal === undefined ? '' : String(oldVal);
                const newStr = newVal === null || newVal === undefined ? '' : String(newVal);

                if (oldStr !== newStr) {
                    const oldDisplay = formatAssetFieldValueForHistory(key, oldVal);
                    const newDisplay = formatAssetFieldValueForHistory(key, newVal);
                    changes.push(`${label}: จาก ${oldDisplay} เป็น ${newDisplay}`);
                }
            }

            // Check image change
            if (data.image_url) {
                changes.push('อัปโหลดรูปภาพใหม่');
            }

            if (!wasDisposed && willBeDisposed) {
                if (disposal_reason) {
                    changes.push(`เหตุผลจำหน่าย: "${disposal_reason}"`);
                }
                if (secondary_approver) {
                    changes.push(`ผู้อนุมัติคนที่ 2: "${secondary_approver}"`);
                }
            }

            if (locationChanged && transfer_approval_ref) {
                changes.push(`เอกสารอนุมัติย้าย: "${transfer_approval_ref}"`);
            }
        }

        const changeDescription = changes.length > 0
            ? `แก้ไข: ${changes.join(', ')}`
            : 'อัปเดตข้อมูล (ไม่มีการเปลี่ยนแปลง)';

        // Log Update with details
        await prisma.tbl_asset_history.create({
            data: {
                asset_id,
                action_type: 'Update',
                description: changeDescription,
                performed_by: userName,
            }
        });

        // Check and Log Location Move separately
        if (currentAsset && (locationChanged || roomSectionChanged)) {
            const previousPlacement = formatAssetPlacement(currentAsset.location, currentAsset.room_section);
            const newPlacement = formatAssetPlacement(location, room_section);
            await prisma.tbl_asset_history.create({
                data: {
                    asset_id,
                    action_type: 'Move',
                    description: `ย้ายจาก "${previousPlacement || '-'}" ไป "${newPlacement || '-'}"${transfer_approval_ref ? ` | Approval: ${transfer_approval_ref}` : ''}`,
                    performed_by: userName,
                }
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update asset';
        throw new Error(message);
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${asset_id}`);
    revalidatePath(`/assets/${asset_id}/edit`);
    revalidatePath('/assets/depreciation');
    // Redirect handled by client to avoid NEXT_REDIRECT error
}

export async function addAssetHistory(formData: FormData) {
    const session = await auth();
    await assertAssetWriteAccess(session);

    const sessionUser = getSessionUser(session);
    const userName = resolveSessionUserName(sessionUser);
    const userRole = resolveSessionUserRole(sessionUser);

    const asset_id = parseInt(formData.get('asset_id') as string);
    const action_type = formData.get('action_type') as string;
    const description = formData.get('description') as string;
    const cost = parseFloat(formData.get('cost') as string) || 0;
    const disposal_reason = ((formData.get('disposal_reason') as string) || description || '').trim();
    const secondary_approver = ((formData.get('secondary_approver') as string) || '').trim();
    const new_location = ((formData.get('new_location') as string) || '').trim();
    const new_room_section = ((formData.get('new_room_section') as string) || '').trim();
    const transfer_approval_ref = ((formData.get('transfer_approval_ref') as string) || '').trim();
    const work_date = ((formData.get('work_date') as string) || '').trim();
    const sale_date = ((formData.get('sale_date') as string) || '').trim();
    const sale_price = parseFloat((formData.get('sale_price') as string) || '0') || 0;
    const buyer_name = ((formData.get('buyer_name') as string) || '').trim();
    const sale_reference = ((formData.get('sale_reference') as string) || '').trim();
    const next_maintenance_date = ((formData.get('next_maintenance_date') as string) || '').trim();
    const work_order_ref = ((formData.get('work_order_ref') as string) || '').trim();
    const service_provider = ((formData.get('service_provider') as string) || '').trim();
    const parts_replaced = ((formData.get('parts_replaced') as string) || '').trim();
    const downtime_hours = parseFloat((formData.get('downtime_hours') as string) || '0') || 0;
    const performed_by_override = ((formData.get('performed_by_override') as string) || '').trim();
    const maintenance_state = ((formData.get('maintenance_state') as string) || '').trim();

    const parseDateOrNull = (raw: string) => {
        if (!raw) return null;
        const parsed = new Date(raw);
        if (!Number.isFinite(parsed.getTime())) return null;
        return parsed;
    };

    try {
        const policy = await getAssetPolicyFromDb();
        const currentAsset = await prisma.tbl_assets.findUnique({
            where: { asset_id },
            select: { asset_id: true, location: true, room_section: true, status: true },
        });
        if (!currentAsset) {
            throw new Error('Asset not found');
        }

        if (action_type === 'Dispose') {
            const disposalValidation = validateDisposalByPolicy(policy, {
                actorRole: userRole,
                actorName: userName,
                secondaryApprover: secondary_approver,
                reason: disposal_reason,
            });
            if (!disposalValidation.ok) {
                throw new Error(disposalValidation.error);
            }
        }

        if (action_type === 'Move') {
            const previousLocation = (currentAsset.location || '').trim();
            const previousRoomSection = (currentAsset.room_section || '').trim();
            const targetLocation = new_location || previousLocation;
            const targetRoomSection = new_room_section || previousRoomSection;

            if (previousLocation === targetLocation && previousRoomSection === targetRoomSection) {
                throw new Error('New location or room section must be different from current location');
            }

            if (previousLocation !== targetLocation) {
                const transferApproval = await getTransferApprovalByRef(transfer_approval_ref);
                const transferValidation = validateTransferByPolicy(policy, {
                    assetId: asset_id,
                    approvalRef: transfer_approval_ref,
                    approvalStatus: transferApproval?.status,
                    approvalRequestType: transferApproval?.request_type,
                    approvalReferenceJob: transferApproval?.reference_job,
                    approvalApprovedAt: transferApproval?.approved_at ?? null,
                });
                if (!transferValidation.ok) {
                    throw new Error(transferValidation.error);
                }
            }
        }

        if (action_type === 'Sell') {
            if (currentAsset.status === 'Disposed' || currentAsset.status === 'Sold') {
                throw new Error('Asset already disposed/sold');
            }
            if (sale_price <= 0) {
                throw new Error('Sale price must be greater than 0');
            }
        }

        if (action_type === 'DepreciationPause') {
            if (currentAsset.status === 'DepreciationPaused') {
                throw new Error('Depreciation is already paused');
            }
            if (currentAsset.status === 'Disposed' || currentAsset.status === 'Sold') {
                throw new Error('Cannot pause depreciation for disposed/sold asset');
            }
        }

        if (action_type === 'DepreciationResume' && currentAsset.status !== 'DepreciationPaused') {
            throw new Error('Depreciation is not paused');
        }

        const workDate = parseDateOrNull(work_date);
        const saleDate = parseDateOrNull(sale_date);
        const nextMaintenanceDate = parseDateOrNull(next_maintenance_date);
        if (workDate && nextMaintenanceDate && nextMaintenanceDate < workDate) {
            throw new Error('Next maintenance date must be later than or equal to work date');
        }

        const metadataParts: string[] = [];
        if (workDate) {
            metadataParts.push(`วันที่ดำเนินการ: ${workDate.toLocaleDateString('th-TH')}`);
        }
        if (work_order_ref) {
            metadataParts.push(`เลขที่ใบงาน: ${work_order_ref}`);
        }
        if (service_provider) {
            metadataParts.push(`ผู้ให้บริการ: ${service_provider}`);
        }
        if (parts_replaced) {
            metadataParts.push(`อะไหล่ที่เปลี่ยน: ${parts_replaced}`);
        }
        if (downtime_hours > 0) {
            metadataParts.push(`Downtime: ${downtime_hours} ชั่วโมง`);
        }
        if (nextMaintenanceDate) {
            metadataParts.push(`รอบบำรุงครั้งถัดไป: ${nextMaintenanceDate.toLocaleDateString('th-TH')}`);
        }
        if (maintenance_state) {
            metadataParts.push(`สถานะหลังงาน: ${maintenance_state}`);
        }

        const normalizedDescription = (description || '').trim();
        const actorName = performed_by_override || userName;

        const historyDescription = action_type === 'Dispose'
            ? [
                `เหตุผลจำหน่าย: ${disposal_reason}`,
                secondary_approver ? `ผู้อนุมัติคนที่ 2: ${secondary_approver}` : '',
            ].filter(Boolean).join(' | ')
            : action_type === 'Sell'
                ? [
                    normalizedDescription || 'ขายทรัพย์สิน',
                    `ราคาขาย: ${formatCurrency(sale_price)} บาท`,
                    buyer_name ? `ผู้ซื้อ: ${buyer_name}` : '',
                    sale_reference ? `เอกสารอ้างอิง: ${sale_reference}` : '',
                ].filter(Boolean).join(' | ')
            : action_type === 'Move'
                ? `ย้ายจาก "${formatAssetPlacement(currentAsset.location, currentAsset.room_section) || '-'}" ไป "${formatAssetPlacement(new_location || currentAsset.location, new_room_section || currentAsset.room_section) || '-'}"${transfer_approval_ref ? ` | ใบอนุมัติ: ${transfer_approval_ref}` : ''}`
                : action_type === 'DepreciationPause'
                    ? `หยุดคิดค่าเสื่อมราคา${workDate ? ` ตั้งแต่วันที่ ${workDate.toLocaleDateString('th-TH')}` : ''}${normalizedDescription ? ` | ${normalizedDescription}` : ''}`
                    : action_type === 'DepreciationResume'
                        ? `เริ่มคิดค่าเสื่อมราคาอีกครั้ง${workDate ? ` ตั้งแต่วันที่ ${workDate.toLocaleDateString('th-TH')}` : ''}${normalizedDescription ? ` | ${normalizedDescription}` : ''}`
                : [normalizedDescription, ...metadataParts].filter(Boolean).join(' | ');

        const explicitStatus = maintenance_state === 'Active' || maintenance_state === 'InRepair'
            ? maintenance_state
            : null;
        const statusAfterAction = action_type === 'Dispose'
            ? 'Disposed'
            : action_type === 'Sell'
                ? 'Sold'
                : action_type === 'DepreciationPause'
                    ? 'DepreciationPaused'
                    : action_type === 'DepreciationResume'
                        ? 'Active'
                        : explicitStatus || (action_type === 'Repair' ? 'InRepair' : null);

        const actionDate = saleDate ?? workDate ?? new Date();
        const effectiveCost = action_type === 'Sell' ? sale_price : cost;

        await prisma.tbl_asset_history.create({
            data: {
                asset_id,
                action_type,
                description: historyDescription,
                cost: effectiveCost,
                performed_by: actorName,
                action_date: actionDate,
            }
        });

        if (action_type === 'Move') {
            const targetLocation = new_location || currentAsset.location || null;
            const targetRoomSection = new_room_section || currentAsset.room_section || null;
            await prisma.tbl_assets.update({
                where: { asset_id },
                data: {
                    location: targetLocation,
                    room_section: targetRoomSection,
                    ...(statusAfterAction ? { status: statusAfterAction } : {}),
                },
            });
        } else if (statusAfterAction) {
            await prisma.tbl_assets.update({
                where: { asset_id },
                data: { status: statusAfterAction }
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add history';
        throw new Error(message);
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${asset_id}`);
}

export async function deleteAsset(asset_id: number) {
    const session = await auth();
    await assertAssetWriteAccess(session);

    try {
        // Delete history first (foreign key constraint)
        await prisma.tbl_asset_history.deleteMany({
            where: { asset_id }
        });

        // Then delete the asset
        await prisma.tbl_assets.delete({
            where: { asset_id }
        });
    } catch (error) {
        console.error("Delete error", error);
        throw new Error('Failed to delete asset');
    }
    revalidatePath('/assets');
    // Note: redirect is handled by client component to avoid NEXT_REDIRECT error
}

export async function searchAssets(query: string) {
    try {
        const assets = await prisma.tbl_assets.findMany({
            where: {
                OR: [
                    { asset_code: { contains: query } },
                    { asset_name: { contains: query } },
                    { serial_number: { contains: query } },
                    { location: { contains: query } },
                    { room_section: { contains: query } },
                ],
                status: { notIn: ['Disposed', 'Sold'] } // Only show active assets
            },
            select: {
                asset_id: true,
                asset_code: true,
                asset_name: true,
                serial_number: true,
                category: true,
                location: true,
                room_section: true,
            },
            take: 10, // Limit results for performance
            orderBy: { asset_code: 'asc' }
        });

        return {
            success: true,
            data: assets
        };
    } catch (error) {
        console.error('Failed to search assets:', error);
        return {
            success: false,
            error: 'Failed to search assets',
            data: []
        };
    }
}

export async function getSuggestedAssetCode() {
    const session = await auth();
    await assertAssetWriteAccess(session);
    return generateNextAssetCodeByPolicy();
}

export async function getAssetFinancialSummary() {
    try {
        const assets = await prisma.tbl_assets.findMany({
            where: {
                status: {
                    in: ['Active', 'DepreciationPaused'],
                },
            },
            select: {
                asset_id: true,
                status: true,
                purchase_price: true,
                salvage_value: true,
                useful_life_years: true,
                purchase_date: true
            }
        });

        const pausedAssetIds = assets
            .filter((asset) => asset.status === 'DepreciationPaused')
            .map((asset) => asset.asset_id);

        const pauseHistories = pausedAssetIds.length > 0
            ? await prisma.tbl_asset_history.findMany({
                where: {
                    asset_id: { in: pausedAssetIds },
                    action_type: 'DepreciationPause',
                },
                orderBy: [{ asset_id: 'asc' }, { action_date: 'desc' }],
                select: {
                    asset_id: true,
                    action_date: true,
                },
            })
            : [];

        const pauseDateByAsset = new Map<number, Date>();
        for (const row of pauseHistories) {
            if (!pauseDateByAsset.has(row.asset_id)) {
                pauseDateByAsset.set(row.asset_id, new Date(row.action_date));
            }
        }

        let totalValue = 0;
        let totalAccumulatedDepreciation = 0;
        const now = new Date();

        // Exact same calculation logic as the detail page
        const msPerDay = 1000 * 60 * 60 * 24;

        assets.forEach(asset => {
            const cost = Number(asset.purchase_price);
            const salvage = Number(asset.salvage_value);
            const life = asset.useful_life_years;
            const purchaseDate = new Date(asset.purchase_date);
            const purchaseYear = purchaseDate.getFullYear();
            const depreciationCutoffDate = asset.status === 'DepreciationPaused'
                ? (pauseDateByAsset.get(asset.asset_id) || now)
                : now;

            totalValue += cost;

            if (life > 0 && cost > salvage && depreciationCutoffDate.getTime() >= purchaseDate.getTime()) {
                const totalDepreciable = cost - salvage;
                const annualDepreciation = totalDepreciable / life;

                const endOfLifeDate = new Date(purchaseDate);
                endOfLifeDate.setFullYear(purchaseDate.getFullYear() + life);

                let accumulatedDep = 0;

                // If we are past end of life, it's fully depreciated
                if (depreciationCutoffDate.getTime() >= endOfLifeDate.getTime()) {
                    totalAccumulatedDepreciation += totalDepreciable;
                } else {
                    const currentYear = depreciationCutoffDate.getFullYear();

                    // Loop through years since purchase up to current year
                    for (let i = 0; i <= (currentYear - purchaseYear); i++) {
                        const year = purchaseYear + i;

                        let expense = 0;
                        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                        const daysInThisYear = isLeapYear ? 366 : 365;
                        let daysUsed = daysInThisYear;

                        if (i === 0 && year === currentYear) {
                            // Bought this year -> run up to today
                            daysUsed = Math.floor((depreciationCutoffDate.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else if (i === 0) {
                            // Year 1: from purchase date to Dec 31
                            const endOfYear = new Date(year, 11, 31);
                            daysUsed = Math.floor((endOfYear.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else if (year === currentYear) {
                            // Current year: from Jan 1 to today
                            const startOfYear = new Date(year, 0, 1);
                            daysUsed = Math.floor((depreciationCutoffDate.getTime() - startOfYear.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else {
                            // Full years in between
                            expense = annualDepreciation;
                        }

                        accumulatedDep += expense;
                    }

                    if (accumulatedDep > totalDepreciable) {
                        accumulatedDep = totalDepreciable;
                    }

                    totalAccumulatedDepreciation += accumulatedDep;
                }
            }
        });

        return {
            success: true,
            totalValue,
            totalAccumulatedDepreciation,
            netValue: totalValue - totalAccumulatedDepreciation
        };
    } catch (error) {
        console.error('Failed to get asset financial summary:', error);
        return {
            success: false,
            totalValue: 0,
            totalAccumulatedDepreciation: 0,
            netValue: 0
        };
    }
}




