'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';
import { notifyRoleViaLine, sendLineMessage, sendLineNotify } from '@/lib/lineNotify';
import { validateData, createMaintenanceRequestSchema } from '@/lib/validation';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import {
    canCreateMaintenanceRequest,
    canManageMaintenanceEdit,
    canManageMaintenanceParts,
    canReopenMaintenanceRequest,
    canSubmitMaintenanceCompletion,
    canVerifyMaintenanceParts,
} from '@/lib/rbac';

// ==================== ROOMS ====================

export async function getRooms() {
    try {
        const rooms = await prisma.tbl_rooms.findMany({
            where: { active: true },
            orderBy: { room_code: 'asc' }
        });
        return { success: true, data: rooms };
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return { success: false, error: 'Failed to fetch rooms' };
    }
}

export async function createRoom(data: {
    room_code: string;
    room_name: string;
    room_type?: string;
    building?: string;
    floor?: string;
    zone?: string;
}) {
    try {
        const room = await prisma.tbl_rooms.create({
            data: {
                room_code: data.room_code,
                room_name: data.room_name,
                room_type: data.room_type || null,
                building: data.building || null,
                floor: data.floor || null,
                zone: data.zone || null
            }
        });
        const session = await auth();
        await logSystemAction(
            'CREATE',
            'Room',
            room.room_id,
            `Created room: ${room.room_code} - ${room.room_name}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true, data: room };
    } catch (error: unknown) {
        console.error('Error creating room:', error);
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
            const field = 'meta' in error
                ? ((error.meta as { target?: string[] })?.target?.[0] || 'room_code')
                : 'room_code';
            return { success: false, error: `รหัส "${data.room_code}" ซ้ำกับที่มีอยู่แล้ว (${field})` };
        }
        return { success: false, error: `สร้างห้องไม่สำเร็จ: ${getErrorMessage(error, 'ข้อผิดพลาดไม่ทราบสาเหตุ')}` };
    }
}

export async function createRoomsBulk(roomsData: Array<{
    room_code: string;
    room_name: string;
    room_type?: string | null;
    building?: string | null;
    floor?: string | null;
    zone?: string | null;
}>) {
    try {
        const session = await auth();
        if (!session) return { success: false, error: 'Unauthorized' };

        const created = await prisma.tbl_rooms.createMany({
            data: roomsData.map(r => ({
                room_code: r.room_code,
                room_name: r.room_name,
                room_type: r.room_type || null,
                building: r.building || null,
                floor: r.floor || null,
                zone: r.zone || null,
                active: true
            })),
            skipDuplicates: false,
        });

        await logSystemAction(
            'CREATE',
            'Room',
            0,
            `Bulk created ${created.count} rooms/zones`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true, count: created.count };
    } catch (error: unknown) {
        console.error('Error bulk creating rooms:', error);
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: 'พบรหัสซ้ำในรายการที่กำลังเพิ่ม หรือมีรหัสนี้อยู่ในระบบแล้ว' };
        }
        return { success: false, error: `เพิ่มข้อมูลไม่สำเร็จ: ${getErrorMessage(error, 'ข้อผิดพลาดไม่ทราบสาเหตุ')}` };
    }
}

export async function getAllRooms() {
    try {
        const rooms = await prisma.tbl_rooms.findMany({
            orderBy: { room_code: 'asc' }
        });
        return { success: true, data: rooms };
    } catch (error) {
        console.error('Error fetching all rooms:', error);
        return { success: false, error: 'Failed to fetch rooms' };
    }
}

export async function updateRoom(room_id: number, data: {
    room_code?: string;
    room_name?: string;
    room_type?: string | null;
    building?: string | null;
    floor?: string | null;
    zone?: string | null;
}) {
    try {
        const room = await prisma.tbl_rooms.update({
            where: { room_id },
            data
        });
        const session = await auth();
        await logSystemAction(
            'UPDATE',
            'Room',
            room_id,
            `Updated room: ${room.room_code}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true, data: room };
    } catch (error: unknown) {
        console.error('Error updateRoom:', error);
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: `รหัสห้องซ้ำกับที่มีอยู่แล้ว` };
        }
        return { success: false, error: `แก้ไขห้องไม่สำเร็จ: ${getErrorMessage(error, 'ข้อผิดพลาดไม่ทราบสาเหตุ')}` };
    }
}

export async function deleteRoom(room_id: number) {
    try {
        await prisma.tbl_rooms.delete({ where: { room_id } });
        const session = await auth();
        await logSystemAction(
            'DELETE',
            'Room',
            room_id,
            `Deleted room ID: ${room_id}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true };
    } catch (error: unknown) {
        console.error('Error deleting room:', error);
        return { success: false, error: `ลบห้องไม่สำเร็จ: ${getErrorMessage(error, 'Unknown error')}` };
    }
}

export async function toggleRoomActive(room_id: number) {
    try {
        const room = await prisma.tbl_rooms.findUnique({ where: { room_id } });
        if (!room) return { success: false, error: 'Room not found' };

        const updated = await prisma.tbl_rooms.update({
            where: { room_id },
            data: { active: !room.active }
        });
        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true, data: updated };
    } catch (error) {
        console.error('Error toggling room status:', error);
        return { success: false, error: 'Failed to toggle room status' };
    }
}

// ==================== MAINTENANCE REQUESTS ====================

function generateRequestNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MR${year}${month}${day}-${random}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

async function getMaintenanceAuthContext() {
    const session = await auth();
    if (!session?.user) {
        return null;
    }

    const permissionContext = await getUserPermissionContext(session.user);

    return {
        session,
        ...permissionContext,
    };
}

export async function getMaintenanceRequests(filters?: {
    status?: string | string[];
    room_id?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    category?: string;
}) {
    try {
        const where: {
            status?: string | { in: string[] };
            room_id?: number;
            category?: string;
            created_at?: {
                gte?: Date;
                lte?: Date;
            };
        } = {};
        if (Array.isArray(filters?.status) && filters.status.length > 0) {
            where.status = { in: filters.status };
        } else if (typeof filters?.status === 'string' && filters.status !== 'all') {
            where.status = filters.status;
        }
        if (filters?.room_id) {
            where.room_id = filters.room_id;
        }
        if (filters?.category) {
            where.category = filters.category;
        }
        if (filters?.startDate || filters?.endDate) {
            where.created_at = {};
            if (filters.startDate) {
                where.created_at.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                where.created_at.lte = end;
            }
        }

        const requests = await prisma.tbl_maintenance_requests.findMany({
            where,
            include: {
                tbl_rooms: true,
                tbl_maintenance_history: { orderBy: { changed_at: 'desc' }, take: 5 }
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: requests };
    } catch (error: unknown) {
        console.error('Error getMaintenanceRequests:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to fetch maintenance requests') };
    }
}

export async function getMaintenanceRequestById(request_id: number) {
    try {
        const request = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id },
            include: {
                tbl_rooms: true,
                tbl_maintenance_history: { orderBy: { changed_at: 'desc' } },
                tbl_maintenance_parts: { include: { tbl_products: true } }
            }
        });
        return { success: true, data: request };
    } catch (error) {
        return { success: false, error: 'Failed' };
    }
}

export async function createMaintenanceRequest(formData: FormData) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canCreateMaintenanceRequest(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied: role cannot create maintenance request' };
        }

        const rawData = {
            room_id: parseInt(formData.get('room_id') as string),
            title: formData.get('title') as string,
            description: (formData.get('description') as string) || "",
            priority: (formData.get('priority') as string)?.toLowerCase() || 'low',
        };

        const validData = validateData(createMaintenanceRequestSchema, rawData, 'Maintenance');

        const category = formData.get('category') as string;
        const reported_by = formData.get('reported_by') as string;
        const assigned_to = formData.get('assigned_to') as string;
        const scheduled_date = formData.get('scheduled_date') as string;
        const estimated_cost = parseFloat(formData.get('estimated_cost') as string) || 0;
        const department = formData.get('department') as string;
        const contact_info = formData.get('contact_info') as string;
        const tags = formData.get('tags') as string;
        const target_role = ((formData.get('target_role') as string) || 'technician').trim();

        const imageFiles = [
            ...(formData.getAll('images') as File[]),
            ...(formData.getAll('image_file') as File[])
        ].filter(file => file && file.size > 0);
        const uploadedImageUrls: string[] = [];

        if (imageFiles.length > 0) {
            for (const file of imageFiles) {
                try {
                    const url = await uploadFile(file, 'maintenance');
                    uploadedImageUrls.push(url);
                } catch (error) {
                    console.error('Failed upload:', error);
                }
            }
        }

        const request = await prisma.tbl_maintenance_requests.create({
            data: {
                request_number: generateRequestNumber(),
                room_id: validData.room_id,
                title: validData.title,
                description: validData.description || null,
                image_url: uploadedImageUrls.length > 0 ? JSON.stringify(uploadedImageUrls) : null,
                priority: validData.priority,
                status: 'pending',
                reported_by,
                assigned_to: assigned_to || null,
                scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
                estimated_cost: new Decimal(estimated_cost),
                category: category || 'general',
                department: department || null,
                contact_info: contact_info || null,
                tags: tags || null
            }
        });

        try {
            const room = await prisma.tbl_rooms.findUnique({
                where: { room_id: validData.room_id },
                select: { room_code: true, room_name: true }
            });

            if (room) {
                console.log(
                    `[Maintenance] notifying LINE target_role=${target_role} title="${validData.title}" room=${room.room_code}`
                );
                await notifyRoleViaLine(
                    target_role,
                    validData.title,
                    room.room_code,
                    room.room_name,
                    validData.priority,
                    reported_by
                );
            } else {
                console.warn(`[Maintenance] room not found for LINE notification room_id=${validData.room_id}`);
            }
        } catch (notifyError) {
            console.error('Failed to send maintenance LINE notification:', notifyError);
        }

        revalidatePath('/maintenance');
        return { success: true, data: request };
    } catch (error: unknown) {
        console.error('Error createMaintenanceRequest:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to create maintenance request') };
    }
}

export async function submitCustomerRepairRequest(formData: FormData) {
    try {
        const line_user_id = formData.get('line_user_id') as string;
        if (!line_user_id) {
            return { success: false, error: 'Unauthorized: Missing LINE ID' };
        }

        const customer = await prisma.tbl_line_customers.findUnique({
             where: { line_user_id }
        });

        if (!customer) {
             return { success: false, error: 'Unauthorized: User not registered' };
        }

        const rawData = {
            room_id: parseInt(formData.get('room_id') as string),
            title: formData.get('title') as string,
            description: (formData.get('description') as string) || "",
            priority: (formData.get('priority') as string)?.toLowerCase() || 'low',
        };

        const validData = validateData(createMaintenanceRequestSchema, rawData, 'Maintenance');

        const category = formData.get('category') as string;
        const department = formData.get('department') as string;
        const contact_info = (formData.get('contact_info') as string) || customer.phone_number;
        const target_role = 'general';
        const reported_by = customer.full_name;
        
        let tagsArray = formData.get('tags') ? (formData.get('tags') as string).split(',').map(t=>t.trim()).filter(Boolean) : [];
        if (!tagsArray.includes('ลูกค้า')) {
           tagsArray.push('ลูกค้า');
        }
        const tags = tagsArray.join(',');

        const imageFiles = [
            ...(formData.getAll('images') as File[]),
            ...(formData.getAll('image_file') as File[])
        ].filter(file => file && file.size > 0);
        const uploadedImageUrls: string[] = [];

        if (imageFiles.length > 0) {
            for (const file of imageFiles) {
                try {
                    const url = await uploadFile(file, 'maintenance');
                    uploadedImageUrls.push(url);
                } catch (error) {
                    console.error('Failed upload:', error);
                }
            }
        }

        const request = await prisma.tbl_maintenance_requests.create({
            data: {
                request_number: generateRequestNumber(),
                room_id: validData.room_id,
                title: validData.title,
                description: validData.description || null,
                image_url: uploadedImageUrls.length > 0 ? JSON.stringify(uploadedImageUrls) : null,
                priority: validData.priority,
                status: 'pending',
                reported_by,
                category: category || 'general',
                department: department || null,
                contact_info: contact_info || null,
                tags: tags
            }
        });

        try {
            const room = await prisma.tbl_rooms.findUnique({
                where: { room_id: validData.room_id },
                select: { room_code: true, room_name: true }
            });

            if (room) {
                console.log(`[Maintenance] notifying LINE target_role=${target_role} title="${validData.title}" room=${room.room_code}`);
                await notifyRoleViaLine(
                    target_role,
                    validData.title,
                    room.room_code,
                    room.room_name,
                    validData.priority,
                    reported_by
                );
            }
        } catch (notifyError) {
            console.error('Failed to send customer maintenance LINE notification:', notifyError);
        }

        revalidatePath('/general-request');
        revalidatePath('/maintenance');
        return { success: true, data: request };
    } catch (error: unknown) {
        console.error('Error submitCustomerRepairRequest:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to create customer maintenance request') };
    }
}

export async function updateMaintenanceRequestStatus(request_id: number, new_status: string, changed_by: string, notes?: string) {
    try {
        const request = await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: { status: new_status }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id,
                action: `Status change to ${new_status}`,
                new_value: new_status,
                changed_by
            }
        });

        revalidatePath('/maintenance');
        return { success: true, data: request };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to update maintenance request status') };
    }
}

// ==================== INVENTORY & PARTS ACTIONS (NEW) ====================

export async function withdrawPartForMaintenance(data: {
    request_id: number;
    p_id: string;
    quantity: number;
    withdrawn_by: string;
    notes?: string;
}) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canManageMaintenanceParts(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const wh01 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });
        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });

        if (!wh01 || !wh03) return { success: false, error: 'Warehouses not configured' };

        const stockWh01 = await prisma.tbl_warehouse_stock.findUnique({
            where: { warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: data.p_id } }
        });

        const product = await prisma.tbl_products.findUnique({
            where: { p_id: data.p_id },
            select: { p_count: true }
        });

        let availableWh01 = stockWh01?.quantity ?? 0;
        const productStock = product?.p_count ?? 0;

        // Fallback to tbl_products stock when WH-01 stock row is missing/stale.
        if (availableWh01 < data.quantity && productStock >= data.quantity) {
            availableWh01 = productStock;
        }

        if (availableWh01 < data.quantity) {
            return { success: false, error: 'Insufficient stock in WH-01' };
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.tbl_warehouse_stock.upsert({
                where: { warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: data.p_id } },
                create: {
                    warehouse_id: wh01.warehouse_id,
                    p_id: data.p_id,
                    quantity: availableWh01 - data.quantity,
                    min_stock: 0
                },
                update: { quantity: availableWh01 - data.quantity }
            });

            await tx.tbl_warehouse_stock.upsert({
                where: { warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: data.p_id } },
                create: { warehouse_id: wh03.warehouse_id, p_id: data.p_id, quantity: data.quantity, min_stock: 0 },
                update: { quantity: { increment: data.quantity } }
            });

            return await tx.tbl_maintenance_parts.create({
                data: {
                    request_id: data.request_id,
                    p_id: data.p_id,
                    quantity: data.quantity,
                    status: 'withdrawn',
                    withdrawn_at: new Date(),
                    withdrawn_by: data.withdrawn_by,
                    notes: data.notes
                }
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');
        return { success: true, data: result };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to withdraw part for maintenance') };
    }
}

export async function confirmPartsUsed(data: {
    part_id: number;
    actual_used: number;
    is_defective: boolean;
    changed_by: string;
}) {
    try {
        const part = await prisma.tbl_maintenance_parts.findUnique({ where: { part_id: data.part_id } });
        if (!part) return { success: false, error: 'Part record not found' };

        const request = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id: part.request_id },
            select: { actual_cost: true }
        });

        const result = await prisma.$transaction(async (tx) => {
            const updatedPart = await tx.tbl_maintenance_parts.update({
                where: { part_id: data.part_id },
                data: {
                    actual_used: data.actual_used,
                    status: 'used',
                    used_at: new Date(),
                    notes: data.is_defective ? 'MARKED AS DEFECTIVE' : undefined
                }
            });

            const costParts = await tx.tbl_maintenance_parts.findMany({
                where: {
                    request_id: part.request_id,
                    actual_used: { not: null },
                    status: {
                        in: ['used', 'pending_verification', 'verified', 'verification_failed', 'completed', 'defective']
                    }
                },
                include: {
                    tbl_products: {
                        select: { price_unit: true }
                    }
                }
            });

            const calculatedActualCost = costParts.reduce((sum, item) => {
                const qty = Number(item.actual_used ?? 0);
                const unitPrice = Number(item.tbl_products?.price_unit ?? 0);
                return sum + (qty * unitPrice);
            }, 0);

            await tx.tbl_maintenance_requests.update({
                where: { request_id: part.request_id },
                data: { actual_cost: new Decimal(calculatedActualCost) }
            });

            await tx.tbl_maintenance_history.create({
                data: {
                    request_id: part.request_id,
                    action: 'PART_USED',
                    new_value: `Used ${data.actual_used} units${data.is_defective ? ' (Defective)' : ''}`,
                    changed_by: data.changed_by
                }
            });

            const previousCost = Number(request?.actual_cost ?? 0);
            if (previousCost !== calculatedActualCost) {
                await tx.tbl_maintenance_history.create({
                    data: {
                        request_id: part.request_id,
                        action: 'actual_cost_change',
                        old_value: String(previousCost),
                        new_value: String(calculatedActualCost),
                        changed_by: data.changed_by
                    }
                });
            }

            return {
                part: updatedPart,
                actual_cost: calculatedActualCost
            };
        });

        revalidatePath('/maintenance');
        return { success: true, data: result, message: 'Confirmed successfully' };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to confirm parts used') };
    }
}

export async function returnPartToStock(data: { part_id: number; returned_qty: number; returned_by: string }) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canManageMaintenanceParts(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const part = await prisma.tbl_maintenance_parts.findUnique({ where: { part_id: data.part_id } });
        if (!part) return { success: false, error: 'Part record not found' };

        const wh01 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });
        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });

        if (!wh01 || !wh03) return { success: false, error: 'Warehouses not configured' };

        await prisma.$transaction(async (tx) => {
            await tx.tbl_warehouse_stock.update({
                where: { warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id } },
                data: { quantity: { decrement: data.returned_qty } }
            });

            await tx.tbl_warehouse_stock.update({
                where: { warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: part.p_id } },
                data: { quantity: { increment: data.returned_qty } }
            });

            await tx.tbl_maintenance_parts.update({
                where: { part_id: data.part_id },
                data: {
                    status: 'returned',
                    returned_qty: { increment: data.returned_qty },
                    returned_at: new Date()
                }
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to return part to stock') };
    }
}

export async function completeMaintenanceWithParts(request_id: number, changed_by: string) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canManageMaintenanceParts(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const parts = await prisma.tbl_maintenance_parts.findMany({
            where: { request_id, status: 'used' }
        });

        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });
        const wh02 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-02' } });

        if (!wh03 || !wh02) return { success: false, error: 'Warehouses not configured' };

        await prisma.$transaction(async (tx) => {
            for (const part of parts) {
                const qty = part.actual_used || part.quantity;
                await tx.tbl_warehouse_stock.update({
                    where: { warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id } },
                    data: { quantity: { decrement: qty } }
                });

                await tx.tbl_warehouse_stock.upsert({
                    where: { warehouse_id_p_id: { warehouse_id: wh02.warehouse_id, p_id: part.p_id } },
                    create: { warehouse_id: wh02.warehouse_id, p_id: part.p_id, quantity: qty, min_stock: 0 },
                    update: { quantity: { increment: qty } }
                });

                await tx.tbl_maintenance_parts.update({
                    where: { part_id: part.part_id },
                    data: { status: 'completed' }
                });
            }

            await tx.tbl_maintenance_requests.update({
                where: { request_id },
                data: { status: 'completed' }
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to complete maintenance with parts') };
    }
}

export async function submitRepairCompletion(formData: FormData) {
    try {
        const request_id = parseInt(formData.get('request_id') as string);
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canSubmitMaintenanceCompletion(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

        const changed_by = (formData.get('changed_by') as string) || authContext.session.user.name || 'System';
        const completionNotes = (formData.get('completionNotes') as string) || (formData.get('notes') as string) || '';
        const technician_signature = formData.get('technician_signature') as string;
        const customer_signature = formData.get('customer_signature') as string;

        const request = await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: {
                status: 'confirmed',
                completed_at: null,
                notes: completionNotes,
                technician_signature,
                customer_signature
            },
            include: {
                tbl_rooms: {
                    select: { room_code: true, room_name: true }
                }
            }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id,
                action: 'SUBMITTED_FOR_HEAD_TECH_APPROVAL',
                new_value: 'confirmed',
                changed_by
            }
        });

        try {
            await notifyRoleViaLine(
                'head_technician',
                request.title,
                request.tbl_rooms.room_code,
                request.tbl_rooms.room_name,
                request.priority,
                changed_by
            );
        } catch (notifyError) {
            console.error('Failed to notify head technician for approval:', notifyError);
        }

        revalidatePath('/maintenance');
        return { success: true, data: request };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to submit repair completion') };
    }
}

// ==================== ANALYTICS & STATS ====================

export async function getMaintenanceStats() {
    try {
        const total = await prisma.tbl_maintenance_requests.count();
        const pending = await prisma.tbl_maintenance_requests.count({ where: { status: 'pending' } });
        const inProgress = await prisma.tbl_maintenance_requests.count({ where: { status: 'in_progress' } });
        const completed = await prisma.tbl_maintenance_requests.count({ where: { status: 'completed' } });
        const recentActivities = await prisma.tbl_maintenance_history.findMany({
            take: 5,
            orderBy: { changed_at: 'desc' },
            select: {
                history_id: true,
                action: true,
                new_value: true,
                changed_at: true,
                changed_by: true
            }
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

        const recentRequests = await prisma.tbl_maintenance_requests.findMany({
            where: { created_at: { gte: sixMonthsAgo } },
            select: { created_at: true }
        });

        const monthlyData: Record<string, number> = {};
        recentRequests.forEach(req => {
            const month = new Date(req.created_at).toLocaleString('th-TH', { month: 'short', year: '2-digit' });
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        });

        const chartData = Object.entries(monthlyData).map(([name, value]) => ({ name, value }));
        const costAgg = await prisma.tbl_maintenance_requests.aggregate({
            where: { status: 'completed', actual_cost: { not: null } },
            _sum: { actual_cost: true }
        });

        return {
            success: true,
            data: {
                counts: { total, pending, processing: inProgress, completed },
                totalCost: Number(costAgg._sum.actual_cost || 0),
                recentActivities,
                chartData
            }
        };
    } catch (error) {
        return { success: false, error: 'Failed to fetch stats' };
    }
}

export async function getProducts() {
    try {
        const wh01 = await prisma.tbl_warehouses.findFirst({
            where: { warehouse_code: 'WH-01' },
            select: { warehouse_id: true }
        });

        const products = await prisma.tbl_products.findMany({
            where: { active: true },
            orderBy: { p_name: 'asc' }
        });

        const warehouseStock = wh01
            ? await prisma.tbl_warehouse_stock.findMany({
                where: { warehouse_id: wh01.warehouse_id },
                select: { p_id: true, quantity: true }
            })
            : [];

        const stockByProduct = new Map(
            warehouseStock.map((stock) => [stock.p_id, stock.quantity ?? 0])
        );

        const data = products.map(p => ({
            ...p,
            available_stock: (() => {
                const whStock = stockByProduct.get(p.p_id);
                if (whStock === undefined || whStock <= 0) return p.p_count;
                return whStock;
            })()
        }));

        return { success: true, data };
    } catch (error) {
        return { success: false, error: 'Failed to fetch products' };
    }
}

export async function getWithdrawnPartsForMaintenance() {
    try {
        const parts = await prisma.tbl_maintenance_parts.findMany({
            include: {
                tbl_products: true,
                tbl_maintenance_requests: {
                    include: {
                        tbl_rooms: true
                    }
                }
            },
            orderBy: { withdrawn_at: 'desc' }
        });
        
        const mappedData = parts.map(p => ({
            part_id: p.part_id,
            request_id: p.request_id,
            p_id: p.p_id,
            quantity: p.quantity,
            unit: p.unit,
            status: p.status,
            withdrawn_at: p.withdrawn_at,
            returned_qty: p.returned_qty,
            withdrawn_by: p.withdrawn_by,
            product: {
                p_name: p.tbl_products.p_name,
                p_unit: p.tbl_products.p_unit,
                p_count: p.tbl_products.p_count
            },
            request: {
                request_number: p.tbl_maintenance_requests.request_number,
                title: p.tbl_maintenance_requests.title,
                tbl_rooms: {
                    room_code: p.tbl_maintenance_requests.tbl_rooms.room_code,
                    room_name: p.tbl_maintenance_requests.tbl_rooms.room_name
                }
            }
        }));

        return { success: true, data: mappedData };
    } catch (error) {
        console.error('Error fetching withdrawn parts:', error);
        return { success: false, error: 'Failed to fetch withdrawn parts' };
    }
}

export async function clearAllReservedParts(adminName: string) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canManageMaintenanceParts(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const pendingParts = await prisma.tbl_maintenance_parts.findMany({
            where: { status: 'withdrawn' }
        });
        
        if (pendingParts.length === 0) return { success: true, count: 0 };

        const wh01 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });
        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });

        if (!wh01 || !wh03) return { success: false, error: 'Warehouses WH-01 or WH-03 not found' };

        await prisma.$transaction(async (tx) => {
            for (const part of pendingParts) {
                const qtyToReturn = part.quantity - part.returned_qty;
                if (qtyToReturn <= 0) continue;

                await tx.tbl_warehouse_stock.update({
                    where: { warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id } },
                    data: { quantity: { decrement: qtyToReturn } }
                });

                await tx.tbl_warehouse_stock.update({
                    where: { warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: part.p_id } },
                    data: { quantity: { increment: qtyToReturn } }
                });

                await tx.tbl_maintenance_parts.update({
                    where: { part_id: part.part_id },
                    data: { status: 'returned', returned_qty: part.quantity, returned_at: new Date() }
                });
            }
        });

        revalidatePath('/maintenance');
        return { success: true, count: pendingParts.length };
    } catch (error: unknown) {
        console.error('Error clearing reserved parts:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to clear reserved parts') };
    }
}

export async function getGeneralRequests() {
    try {
        const requests = await prisma.tbl_maintenance_requests.findMany({
            where: { category: 'general', status: 'pending' },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: requests };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Failed to fetch general requests') };
    }
}

export async function updateMaintenanceRequest(
    request_id: number,
    data: {
        status?: string;
        priority?: string;
        category?: string;
        assigned_to?: string;
        scheduled_date?: string;
        estimated_cost?: number;
        actual_cost?: number;
        notes?: string;
        completed_at?: Date;
    },
    changed_by: string
) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canManageMaintenanceEdit(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

        const current = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id }
        });

        if (!current) {
            return { success: false, error: 'Maintenance request not found' };
        }

        const updateData: Record<string, unknown> = {};
        const historyActions: Array<{ action: string; old_value: string; new_value: string }> = [];

        if (data.status && data.status !== current.status) {
            updateData.status = data.status;
            const isHeadTechApproval = current.status === 'confirmed' && data.status === 'completed';
            historyActions.push({
                action: isHeadTechApproval ? 'HEAD_TECH_APPROVED' : 'status_change',
                old_value: current.status || '',
                new_value: data.status
            });

            if (data.status === 'completed') {
                updateData.completed_at = data.completed_at || new Date();
            } else if (current.completed_at) {
                updateData.completed_at = null;
            }
        }

        if (data.priority && data.priority !== current.priority) {
            updateData.priority = data.priority;
            historyActions.push({
                action: 'priority_change',
                old_value: current.priority || '',
                new_value: data.priority
            });
        }

        if (data.category && data.category !== current.category) {
            updateData.category = data.category;
            historyActions.push({
                action: 'category_change',
                old_value: current.category || '',
                new_value: data.category
            });
        }

        if (data.assigned_to !== undefined && data.assigned_to !== current.assigned_to) {
            updateData.assigned_to = data.assigned_to || null;
            historyActions.push({
                action: 'assignment_change',
                old_value: current.assigned_to || '',
                new_value: data.assigned_to || ''
            });
        }

        if (data.scheduled_date !== undefined) {
            const nextScheduled = data.scheduled_date ? new Date(data.scheduled_date) : null;
            const currentScheduled = current.scheduled_date?.toISOString() || '';
            const nextScheduledIso = nextScheduled?.toISOString() || '';

            if (currentScheduled !== nextScheduledIso) {
                updateData.scheduled_date = nextScheduled;
                historyActions.push({
                    action: 'schedule_change',
                    old_value: current.scheduled_date?.toISOString().split('T')[0] || '',
                    new_value: data.scheduled_date || ''
                });
            }
        }

        if (data.estimated_cost !== undefined) {
            updateData.estimated_cost = new Decimal(data.estimated_cost);
        }

        if (data.actual_cost !== undefined) {
            updateData.actual_cost = new Decimal(data.actual_cost);
            historyActions.push({
                action: 'actual_cost_change',
                old_value: current.actual_cost?.toString() || '0',
                new_value: data.actual_cost.toString()
            });
        }

        if (data.notes !== undefined) {
            updateData.notes = data.notes || null;
        }

        const request = await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: updateData,
            include: { tbl_rooms: true }
        });

        for (const history of historyActions) {
            await prisma.tbl_maintenance_history.create({
                data: {
                    request_id,
                    action: history.action,
                    old_value: history.old_value,
                    new_value: history.new_value,
                    changed_by
                }
            });
        }

        revalidatePath('/maintenance');
        revalidatePath('/maintenance/dashboard');
        return { success: true, data: request };
    } catch (error: unknown) {
        console.error('Error updating maintenance request:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to update request') };
    }
}

export async function deleteMaintenanceRequest(request_id: number) {
    try {
        await prisma.tbl_maintenance_requests.delete({
            where: { request_id }
        });

        revalidatePath('/maintenance');
        revalidatePath('/maintenance/dashboard');
        return { success: true };
    } catch (error: unknown) {
        console.error('Error deleting maintenance request:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to delete request') };
    }
}

export async function getMaintenanceReportByRoom(filters?: {
    roomId?: number;
    technician?: string;
    partId?: string;
    startDate?: Date;
    endDate?: Date;
}) {
    try {
        const where: {
            active: boolean;
            room_id?: number;
        } = { active: true };
        if (filters?.roomId) {
            where.room_id = filters.roomId;
        }

        const requestWhere: {
            assigned_to?: { contains: string };
            created_at?: {
                gte?: Date;
                lte?: Date;
            };
            tbl_maintenance_parts?: {
                some: { p_id: string };
            };
        } = {};
        if (filters?.technician) {
            requestWhere.assigned_to = { contains: filters.technician };
        }
        if (filters?.startDate || filters?.endDate) {
            requestWhere.created_at = {};
            if (filters.startDate) requestWhere.created_at.gte = filters.startDate;
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                requestWhere.created_at.lte = end;
            }
        }
        if (filters?.partId) {
            requestWhere.tbl_maintenance_parts = {
                some: { p_id: filters.partId }
            };
        }

        const rooms = await prisma.tbl_rooms.findMany({
            where,
            include: {
                tbl_maintenance_requests: {
                    where: requestWhere,
                    orderBy: { created_at: 'desc' },
                    include: {
                        tbl_maintenance_parts: {
                            include: {
                                tbl_products: {
                                    select: { p_name: true, p_unit: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { room_code: 'asc' }
        });

        const hasRequestFilters = !!(filters?.technician || filters?.partId || filters?.startDate || filters?.endDate);
        const filteredRooms = hasRequestFilters
            ? rooms.filter(room => room.tbl_maintenance_requests.length > 0)
            : rooms;

        const report = filteredRooms.map(room => {
            const pending = room.tbl_maintenance_requests.filter(r => r.status === 'pending').length;
            const inProgress = room.tbl_maintenance_requests.filter(r => r.status === 'in_progress').length;
            const completed = room.tbl_maintenance_requests.filter(r => r.status === 'completed').length;
            const cancelled = room.tbl_maintenance_requests.filter(r => r.status === 'cancelled').length;

            return {
                room_id: room.room_id,
                room_code: room.room_code,
                room_name: room.room_name,
                building: room.building,
                floor: room.floor,
                total: room.tbl_maintenance_requests.length,
                pending,
                in_progress: inProgress,
                completed,
                cancelled,
                requests: room.tbl_maintenance_requests.map(req => ({
                    ...req,
                    parts: req.tbl_maintenance_parts.map(part => ({
                        part_id: part.part_id,
                        p_name: part.tbl_products?.p_name || part.p_id,
                        quantity: part.quantity,
                        unit: part.tbl_products?.p_unit || part.unit,
                        status: part.status
                    }))
                }))
            };
        });

        return { success: true, data: report };
    } catch (error: unknown) {
        console.error('Error generating maintenance report:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to generate report') };
    }
}

export async function getMaintenanceSummary() {
    try {
        const [total, pending, inProgress, completed, pendingVerification, costAgg] = await Promise.all([
            prisma.tbl_maintenance_requests.count(),
            prisma.tbl_maintenance_requests.count({ where: { status: 'pending' } }),
            prisma.tbl_maintenance_requests.count({ where: { status: 'in_progress' } }),
            prisma.tbl_maintenance_requests.count({ where: { status: 'completed' } }),
            prisma.tbl_maintenance_parts.count({ where: { status: 'pending_verification' } }),
            prisma.tbl_maintenance_requests.aggregate({ _sum: { actual_cost: true } })
        ]);

        return {
            success: true,
            data: {
                total,
                pending,
                in_progress: inProgress,
                completed,
                total_cost: Number(costAgg._sum.actual_cost || 0),
                pending_verification: pendingVerification
            }
        };
    } catch (error: unknown) {
        console.error('Error fetching maintenance summary:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to fetch summary') };
    }
}

export async function getMaintenanceHistory(request_id: number) {
    try {
        const history = await prisma.tbl_maintenance_history.findMany({
            where: { request_id },
            orderBy: { changed_at: 'desc' }
        });
        return { success: true, data: history };
    } catch (error: unknown) {
        console.error('Error fetching maintenance history:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to fetch history') };
    }
}

export async function getMaintenanceParts(request_id: number) {
    try {
        const parts = await prisma.tbl_maintenance_parts.findMany({
            where: { request_id },
            orderBy: { withdrawn_at: 'desc' },
            include: {
                tbl_products: {
                    select: { p_name: true, p_unit: true, p_count: true }
                }
            }
        });

        const data = parts.map(part => ({
            ...part,
            product: part.tbl_products
        }));

        return { success: true, data };
    } catch (error: unknown) {
        console.error('Error fetching maintenance parts:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to fetch parts') };
    }
}

export async function storeVerifyParts(data: {
    part_id: number;
    verified_quantity: number;
    verified_by: string;
    notes?: string;
}) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canVerifyMaintenanceParts(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const part = await prisma.tbl_maintenance_parts.findUnique({
            where: { part_id: data.part_id }
        });

        if (!part) {
            return { success: false, error: 'Part record not found' };
        }

        const expectedQty = part.actual_used ?? part.quantity;
        const nextStatus = data.verified_quantity === expectedQty ? 'verified' : 'verification_failed';

        const updated = await prisma.tbl_maintenance_parts.update({
            where: { part_id: data.part_id },
            data: {
                verified_quantity: data.verified_quantity,
                verified_at: new Date(),
                verification_notes: data.notes || null,
                status: nextStatus
            }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: part.request_id,
                action: 'parts_verification',
                old_value: String(part.verified_quantity ?? ''),
                new_value: `${data.verified_quantity} (${nextStatus})`,
                changed_by: data.verified_by
            }
        });

        revalidatePath('/maintenance');
        return {
            success: true,
            data: updated,
            message: nextStatus === 'verified' ? 'Verification successful' : 'Verification mismatch recorded'
        };
    } catch (error: unknown) {
        console.error('Error verifying maintenance parts:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to verify parts') };
    }
}

export async function reopenMaintenanceRequest(request_id: number, reason: string, password: string) {
    try {
        const authContext = await getMaintenanceAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canReopenMaintenanceRequest(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Permission denied' };
        }

        const overridePassword =
            process.env.MAINTENANCE_REOPEN_PASSWORD ||
            process.env.MANAGER_OVERRIDE_PASSWORD ||
            process.env.MASTER_PASSWORD;

        if (!overridePassword) {
            return { success: false, error: 'Reopen password is not configured' };
        }

        if (password !== overridePassword) {
            return { success: false, error: 'Invalid master password' };
        }

        const current = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id }
        });

        if (!current) {
            return { success: false, error: 'Maintenance request not found' };
        }

        const reopenedStatus = current.assigned_to ? 'in_progress' : 'pending';
        const updated = await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: {
                status: reopenedStatus,
                completed_at: null
            }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id,
                action: 'reopen_request',
                old_value: current.status,
                new_value: reopenedStatus,
                changed_by: 'manager_override'
            }
        });

        if (reason) {
            await prisma.tbl_maintenance_history.create({
                data: {
                    request_id,
                    action: 'reopen_reason',
                    old_value: null,
                    new_value: reason,
                    changed_by: 'manager_override'
                }
            });
        }

        revalidatePath('/maintenance');
        return { success: true, data: updated };
    } catch (error: unknown) {
        console.error('Error reopening maintenance request:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to reopen maintenance request') };
    }
}

export async function resendMaintenanceNotification(request_id: number) {
    try {
        const request = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id },
            include: { tbl_rooms: true }
        });

        if (!request) {
            return { success: false, error: 'Maintenance request not found' };
        }

        let sentCount = 0;
        const repeatMessage = [
            '[แจ้งเตือนซ้ำ]',
            'รายการนี้เป็นการแจ้งเตือนซ้ำ',
            `เลขที่: ${request.request_number}`,
            `ห้อง: ${request.tbl_rooms.room_code} - ${request.tbl_rooms.room_name}`,
            `เรื่อง: ${request.title}`,
            `สถานะ: ${request.status}`
        ].join('\n');

        if (request.assigned_to) {
            const [user, technician] = await Promise.all([
                prisma.tbl_users.findUnique({
                    where: { username: request.assigned_to },
                    select: { line_user_id: true }
                }),
                prisma.tbl_technicians.findFirst({
                    where: { name: request.assigned_to },
                    select: { line_user_id: true }
                })
            ]);

            const lineId = user?.line_user_id || technician?.line_user_id;
            if (lineId) {
                const ok = await sendLineMessage(lineId, repeatMessage);
                if (ok) sentCount++;
            }
        }

        if (request.reported_by) {
            const reporter = await prisma.tbl_users.findUnique({
                where: { username: request.reported_by },
                select: { line_user_id: true }
            });

            if (reporter?.line_user_id) {
                const ok = await sendLineMessage(reporter.line_user_id, repeatMessage);
                if (ok) sentCount++;
            }
        }

        if (sentCount === 0) {
            const [lineUsers, users, technicians] = await Promise.all([
                prisma.tbl_line_users.findMany({
                    where: {
                        role: 'technician',
                        is_active: true,
                        line_user_id: { not: '' }
                    },
                    select: { line_user_id: true }
                }),
                prisma.tbl_users.findMany({
                    where: {
                        role: 'technician',
                        deleted_at: null,
                        line_user_id: { not: null }
                    },
                    select: { line_user_id: true }
                }),
                prisma.tbl_technicians.findMany({
                    where: {
                        status: 'active',
                        line_user_id: { not: null }
                    },
                    select: { line_user_id: true }
                })
            ]);

            const technicianLineIds = new Set<string>();
            lineUsers.forEach((user) => user.line_user_id && technicianLineIds.add(user.line_user_id));
            users.forEach((user) => user.line_user_id && technicianLineIds.add(user.line_user_id));
            technicians.forEach((tech) => tech.line_user_id && technicianLineIds.add(tech.line_user_id));

            for (const lineId of technicianLineIds) {
                const ok = await sendLineMessage(lineId, repeatMessage);
                if (ok) sentCount++;
            }

            await sendLineNotify(repeatMessage);
        }

        return { success: true, message: 'Notification resent', sentCount };
    } catch (error: unknown) {
        console.error('Error resending maintenance notification:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to resend notification'
        };
    }
}
