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

export async function createAsset(formData: FormData) {
    const session = await auth();
    await assertAssetWriteAccess(session);

    const sessionUser = getSessionUser(session);
    const userName = resolveSessionUserName(sessionUser);

    const providedAssetCode = ((formData.get('asset_code') as string) || '').trim();
    let asset_code = providedAssetCode || await generateNextAssetCodeByPolicy();
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
            // Add initial history
            await prisma.tbl_asset_history.create({
                data: {
                    asset_id: asset.asset_id,
                    action_type: 'Create',
                    description: `ลงทะเบียนทรัพย์สินใหม่: ${asset_name} (${asset_code})${placement ? ` | Location: ${placement}` : ''}`,
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

    const data: Prisma.tbl_assetsUpdateInput = {
        asset_name,
        description,
        category,
        location,
        room_section: room_section || null,
        status,
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
                    changes.push(`${label}: "${oldStr || '-'}" -> "${newStr || '-'}"`);
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

    try {
        const policy = await getAssetPolicyFromDb();
        const currentAsset = await prisma.tbl_assets.findUnique({
            where: { asset_id },
            select: { asset_id: true, location: true, room_section: true },
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

        const historyDescription = action_type === 'Dispose'
            ? [
                `เหตุผลจำหน่าย: ${disposal_reason}`,
                secondary_approver ? `ผู้อนุมัติคนที่ 2: ${secondary_approver}` : '',
            ].filter(Boolean).join(' | ')
            : action_type === 'Move'
                ? `ย้ายจาก "${formatAssetPlacement(currentAsset.location, currentAsset.room_section) || '-'}" ไป "${formatAssetPlacement(new_location || currentAsset.location, new_room_section || currentAsset.room_section) || '-'}"${transfer_approval_ref ? ` | ใบอนุมัติ: ${transfer_approval_ref}` : ''}`
                : description;

        await prisma.tbl_asset_history.create({
            data: {
                asset_id,
                action_type,
                description: historyDescription,
                cost,
                performed_by: userName
            }
        });

        // If status changes (e.g. disposed), update asset status
        if (action_type === 'Dispose') {
            await prisma.tbl_assets.update({
                where: { asset_id },
                data: { status: 'Disposed' }
            });
        } else if (action_type === 'Move') {
            const targetLocation = new_location || currentAsset.location || null;
            const targetRoomSection = new_room_section || currentAsset.room_section || null;
            await prisma.tbl_assets.update({
                where: { asset_id },
                data: {
                    location: targetLocation,
                    room_section: targetRoomSection,
                },
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add history';
        throw new Error(message);
    }

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
                status: { not: 'Disposed' } // Only show active assets
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
            where: { status: 'Active' },
            select: {
                purchase_price: true,
                salvage_value: true,
                useful_life_years: true,
                purchase_date: true
            }
        });

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

            totalValue += cost;

            if (life > 0 && cost > salvage) {
                const totalDepreciable = cost - salvage;
                const annualDepreciation = totalDepreciable / life;

                const endOfLifeDate = new Date(purchaseDate);
                endOfLifeDate.setFullYear(purchaseDate.getFullYear() + life);

                let accumulatedDep = 0;

                // If we are past end of life, it's fully depreciated
                if (now.getTime() >= endOfLifeDate.getTime()) {
                    totalAccumulatedDepreciation += totalDepreciable;
                } else {
                    const currentYear = now.getFullYear();

                    // Loop through years since purchase up to current year
                    for (let i = 0; i <= (currentYear - purchaseYear); i++) {
                        const year = purchaseYear + i;

                        let expense = 0;
                        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                        const daysInThisYear = isLeapYear ? 366 : 365;
                        let daysUsed = daysInThisYear;

                        if (i === 0 && year === currentYear) {
                            // Bought this year -> run up to today
                            daysUsed = Math.floor((now.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else if (i === 0) {
                            // Year 1: from purchase date to Dec 31
                            const endOfYear = new Date(year, 11, 31);
                            daysUsed = Math.floor((endOfYear.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else if (year === currentYear) {
                            // Current year: from Jan 1 to today
                            const startOfYear = new Date(year, 0, 1);
                            daysUsed = Math.floor((now.getTime() - startOfYear.getTime()) / msPerDay) + 1;
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




