'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';
import { validateData, createMaintenanceRequestSchema } from '@/lib/validation';

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
    } catch (error: any) {
        console.error('Error creating room:', error);
        if (error?.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'room_code';
            return { success: false, error: `รหัส "${data.room_code}" ซ้ำกับที่มีอยู่แล้ว (${field})` };
        }
        return { success: false, error: `สร้างห้องไม่สำเร็จ: ${error?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'}` };
    }
}

export async function createRoomsBulk(roomsData: any[]) {
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
    } catch (error: any) {
        console.error('Error bulk creating rooms:', error);
        if (error?.code === 'P2002') {
            return { success: false, error: 'พบรหัสซ้ำในรายการที่กำลังเพิ่ม หรือมีรหัสนี้อยู่ในระบบแล้ว' };
        }
        return { success: false, error: `เพิ่มข้อมูลไม่สำเร็จ: ${error?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'}` };
    }
}

// Get ALL rooms (including inactive) for admin management
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

// Update room
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
    } catch (error: any) {
        console.error('Error updating room:', error);
        if (error?.code === 'P2002') {
            return { success: false, error: `รหัสห้องซ้ำกับที่มีอยู่แล้ว` };
        }
        if (error?.code === 'P2025') {
            return { success: false, error: `ไม่พบห้องที่ต้องการแก้ไข` };
        }
        return { success: false, error: `แก้ไขห้องไม่สำเร็จ: ${error?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'}` };
    }
}

// Hard delete room (permanently remove from database)
export async function deleteRoom(room_id: number) {
    try {
        await prisma.tbl_rooms.delete({
            where: { room_id },
        });
        const session = await auth();
        await logSystemAction(
            'DELETE',
            'Room',
            room_id,
            `Permanently deleted room ID: ${room_id}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting room:', error);
        if (error?.code === 'P2025') {
            return { success: false, error: `ไม่พบห้องที่ต้องการลบ (ID อาจถูกลบไปแล้ว)` };
        }
        return { success: false, error: `ลบห้องไม่สำเร็จ: ${error?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'}` };
    }
}

// Toggle room active status
export async function toggleRoomActive(room_id: number) {
    try {
        const room = await prisma.tbl_rooms.findUnique({ where: { room_id } });
        if (!room) return { success: false, error: 'Room not found' };

        const updated = await prisma.tbl_rooms.update({
            where: { room_id },
            data: { active: !room.active }
        });
        const session = await auth();
        await logSystemAction(
            'UPDATE',
            'Room',
            room_id,
            `${updated.active ? 'Activated' : 'Deactivated'} room: ${updated.room_name}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

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

// Debug function removed

export async function getMaintenanceRequests(filters?: {
    status?: string | string[];
    room_id?: number;
    priority?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        const where: Record<string, unknown> = {};

        if (filters?.status && filters.status !== 'all') {
            if (Array.isArray(filters.status)) {
                where.status = { in: filters.status };
            } else {
                where.status = filters.status;
            }
        }
        if (filters?.room_id) {
            where.room_id = filters.room_id;
        }
        if (filters?.priority && filters.priority !== 'all') {
            where.priority = filters.priority;
        }
        if (filters?.category && filters.category !== 'all') {
            where.category = filters.category;
        }

        // Handle Date Range Filtering
        if (filters?.startDate || filters?.endDate) {
            const dateFilter: { gte?: Date; lte?: Date } = {};

            if (filters.startDate) {
                const start = new Date(filters.startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.gte = start;
            }

            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.lte = end;
            }

            if (Object.keys(dateFilter).length > 0) {
                where.created_at = dateFilter;
            }
        }

        // Fetch requests WITHOUT strict relation include first
        // We use manual join to ensure we get requests even if room link is broken (orphan data)
        const requests = await prisma.tbl_maintenance_requests.findMany({
            where,
            include: {
                // tbl_rooms: true, // REMOVED strict include
                tbl_maintenance_history: {
                    orderBy: { changed_at: 'desc' },
                    take: 10
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // Manual Join for Rooms
        const roomIds = [...new Set(requests.map(r => r.room_id))];
        const rooms = await prisma.tbl_rooms.findMany({
            where: { room_id: { in: roomIds } }
        });

        const roomMap = new Map(rooms.map(r => [r.room_id, r]));

        // Attach room data manually, fallback to unknown if missing
        const requestsWithRooms = requests.map(req => {
            const room = roomMap.get(req.room_id) || {
                room_id: req.room_id,
                room_code: 'UNKNOWN',
                room_name: 'Unknown Room (Deleted?)',
                building: '-',
                floor: '-'
            };
            return {
                ...req,
                tbl_rooms: room
            };
        });

        return { success: true, data: requestsWithRooms };
    } catch (error: any) {
        console.error('Error fetching maintenance requests:', error);
        return { success: false, error: 'Failed to fetch requests: ' + error.message };
    }
}

export async function getMaintenanceRequestById(request_id: number) {
    try {
        const request = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id },
            include: {
                tbl_rooms: true,
                tbl_maintenance_history: {
                    orderBy: { changed_at: 'desc' }
                },
                tbl_maintenance_parts: {
                    include: {
                        tbl_products: true
                    }
                }
            }
        });
        return { success: true, data: request };
    } catch (error) {
        console.error('Error fetching maintenance request:', error);
        return { success: false, error: 'Failed to fetch request' };
    }
}

export async function createMaintenanceRequest(formData: FormData) {
    try {
        const rawData = {
            room_id: parseInt(formData.get('room_id') as string),
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            priority: (formData.get('priority') as string) || 'low',
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
        const target_role = formData.get('target_role') as string || 'technician';
        const imageFiles = formData.getAll('images') as File[];
        const uploadedImageUrls: string[] = [];

        if (imageFiles && imageFiles.length > 0) {
            for (const file of imageFiles) {
                if (file.size > 0) {
                    try {
                        const url = await uploadFile(file, 'maintenance');
                        uploadedImageUrls.push(url);
                    } catch (error) {
                        console.error('Failed to upload maintenance image:', error);
                    }
                }
            }
        }

        let image_url = '';
        if (uploadedImageUrls.length > 0) {
            image_url = JSON.stringify(uploadedImageUrls);
        } else {
            // Fallback to text input for image_url if no files uploaded
            image_url = (formData.get('image_url') as string) || '';
        }

        const request = await prisma.tbl_maintenance_requests.create({
            data: {
                request_number: generateRequestNumber(),
                room_id: validData.room_id,
                title: validData.title,
                description: validData.description || null,
                image_url: image_url || null,
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
            },
            include: { tbl_rooms: true }
        });

        // Log history
        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: request.request_id,
                action: 'สร้างรายการ',
                new_value: `สร้างรายการแจ้งซ่อม: ${validData.title} (ส่งแจ้งเตือนฝ่าย: ${target_role})`,
                changed_by: reported_by
            }
        });

        // Send Notifications
        try {
            if (target_role !== 'general') {
                const { notifyRoleViaLine } = await import('@/lib/lineNotify');
                await notifyRoleViaLine(
                    target_role,
                    validData.title,
                    request.tbl_rooms?.room_code || '',
                    request.tbl_rooms?.room_name || '',
                    validData.priority || 'normal',
                    reported_by
                );
            }

            // General role uses web notifications from /api/notifications instead of LINE.
            const { notifyNewMaintenanceRequest } = await import('@/lib/notifications/notificationManager');
            // Run in background
            notifyNewMaintenanceRequest({
                request_number: request.request_number,
                title: validData.title,
                description: validData.description,
                priority: validData.priority,
                room_code: request.tbl_rooms?.room_code || 'N/A',
                room_name: request.tbl_rooms?.room_name || 'N/A',
                reported_by: request.reported_by,
                created_at: request.created_at,
                image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null
            }, {
                disableLine: target_role === 'general'
            });

        } catch (notifyError) {
            console.error('Notification failed:', notifyError);
            // Don't fail the request if notification fails
        }


        const session = await auth();
        await logSystemAction(
            'CREATE',
            'MaintenanceRequest',
            request.request_id,
            `Created maintenance request: ${validData.title}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || reported_by,
            'unknown'
        );

        revalidatePath('/maintenance');
        return { success: true, data: request };
    } catch (error) {
        console.error('Error creating maintenance request:', error);
        return { success: false, error: 'Failed to create request' };
    }
}

export async function resendMaintenanceNotification(request_id: number) {
    try {
        const session = await auth();

        // Check settings
        const settings = await prisma.tbl_system_settings.findMany({
            where: {
                setting_key: {
                    in: ['overdue_alerts_enabled', 'overdue_alerts_cooldown_minutes']
                }
            }
        });

        const enabledSetting = settings.find((s: { setting_key: string; setting_value: string }) => s.setting_key === 'overdue_alerts_enabled');
        const cooldownSetting = settings.find((s: { setting_key: string; setting_value: string }) => s.setting_key === 'overdue_alerts_cooldown_minutes');

        if (enabledSetting?.setting_value !== 'true') {
            return { success: false, error: 'ระบบแจ้งเตือนซ้ำถูกปิดการใช้งาน กรุณาเปิดใช้งานในการตั้งค่า' };
        }

        const cooldownMinutes = parseInt(cooldownSetting?.setting_value || '30');

        // Get the latest resend action for this request
        const lastResend = await prisma.tbl_maintenance_history.findFirst({
            where: {
                request_id,
                action: 'ส่งแจ้งเตือนซ้ำ'
            },
            orderBy: {
                changed_at: 'desc'
            }
        });

        if (lastResend) {
            const now = new Date();
            const lastSent = new Date(lastResend.changed_at);
            const diffMinutes = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60));

            if (diffMinutes < cooldownMinutes) {
                const remaining = cooldownMinutes - diffMinutes;
                return { success: false, error: `ระบบตั้งเวลา Cooldown ไว้ โปรดรออีก ${remaining} นาทีก่อนกดแจ้งซ้ำอีกครั้ง` };
            }
        }

        const request = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id },
            include: { tbl_rooms: true }
        });

        if (!request) return { success: false, error: 'Request not found' };

        if (request.status !== 'pending') {
            return { success: false, error: 'สามารถส่งซ้ำได้เฉพาะรายการที่ "รอดำเนินการ" เท่านั้น' };
        }

        try {
            // 1. Notify Technicians via LINE (Broadcast)
            const { notifyTechniciansViaLine } = await import('@/lib/lineNotify');
            await notifyTechniciansViaLine(
                `[แจ้งเตือนซ้ำ] ${request.title}`,
                request.tbl_rooms?.room_code || '',
                request.tbl_rooms?.room_name || '',
                request.priority || 'normal',
                request.reported_by
            );

            // 2. Notify Admin/Approvers via Email
            const { notifyNewMaintenanceRequest } = await import('@/lib/notifications/notificationManager');
            notifyNewMaintenanceRequest({
                request_number: request.request_number,
                title: `[แจ้งเตือนซ้ำ] ${request.title}`,
                description: request.description,
                priority: request.priority,
                room_code: request.tbl_rooms?.room_code || 'N/A',
                room_name: request.tbl_rooms?.room_name || 'N/A',
                reported_by: request.reported_by,
                created_at: request.created_at,
                image_url: request.image_url ? JSON.parse(request.image_url)[0] : null
            });

        } catch (notifyError) {
            console.error('Notification failed:', notifyError);
            return { success: false, error: 'ส่งข้อความแจ้งเตือนไม่สำเร็จ' };
        }

        // Log history
        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: request.request_id,
                action: 'ส่งแจ้งเตือนซ้ำ',
                new_value: `กดแจ้งเตือนซ้ำ`,
                changed_by: session?.user?.name || 'System'
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Error resending notification:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการส่งแจ้งเตือนซ้ำ' };
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
    },
    changed_by: string
) {
    try {
        // Get current state for history
        const current = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id },
            include: { tbl_rooms: true }
        });

        const updateData: Record<string, unknown> = {};
        const historyActions: Array<{ action: string; old_value: string; new_value: string }> = [];

        if (data.status && data.status !== current?.status) {
            updateData.status = data.status;
            historyActions.push({
                action: 'เปลี่ยนสถานะ',
                old_value: current?.status || '',
                new_value: data.status
            });
            if (data.status === 'completed') {
                updateData.completed_at = new Date();
            }

            // Handle Cancellation: Return all withdrawn parts to stock
            if (data.status === 'cancelled') {
                const withdrawnParts = await prisma.tbl_maintenance_parts.findMany({
                    where: {
                        request_id,
                        status: { in: ['withdrawn', 'pending_verification'] }
                    }
                });

                if (withdrawnParts.length > 0) {
                    const wh01 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });
                    const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });

                    if (wh01 && wh03) {
                        for (const part of withdrawnParts) {
                            const qtyToReturn = part.quantity - (part.returned_qty || 0);
                            if (qtyToReturn > 0) {
                                // Move stock WH-03 -> WH-01
                                await prisma.$transaction(async (tx) => {
                                    // Decrement WH-03
                                    await tx.tbl_warehouse_stock.update({
                                        where: { warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id } },
                                        data: { quantity: { decrement: qtyToReturn }, last_updated: new Date() }
                                    });

                                    // Increment WH-01
                                    await tx.tbl_warehouse_stock.upsert({
                                        where: { warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: part.p_id } },
                                        create: { warehouse_id: wh01.warehouse_id, p_id: part.p_id, quantity: qtyToReturn },
                                        update: { quantity: { increment: qtyToReturn }, last_updated: new Date() }
                                    });

                                    // Update part status
                                    await tx.tbl_maintenance_parts.update({
                                        where: { part_id: part.part_id },
                                        data: {
                                            status: 'returned',
                                            returned_qty: { increment: qtyToReturn },
                                            returned_at: new Date(),
                                            notes: (part.notes || '') + ' [Auto-returned on Cancel]'
                                        }
                                    });
                                });

                                historyActions.push({
                                    action: 'คืนอะไหล่อัตโนมัติ',
                                    old_value: `${part.p_id} (WH-03)`,
                                    new_value: `${qtyToReturn} ชิ้น (WH-01)`
                                });
                            }
                        }
                    }
                }
            }

            // Notify Report (LINE) & Admin (Email)
            if (current?.reported_by) {
                // ... (Existing LINE Code for Reporter) ...
                const reporter = await prisma.tbl_users.findUnique({ where: { username: current.reported_by } });
                if (reporter?.line_user_id) {
                    const statusLabels: Record<string, string> = {
                        pending: 'รอดำเนินการ',
                        in_progress: 'กำลังซ่อม',
                        completed: 'เสร็จแล้ว',
                        cancelled: 'ยกเลิก'
                    };
                    const statusLabel = statusLabels[data.status] || data.status;

                    try {
                        const { sendLineMessage } = await import('@/lib/lineNotify');
                        await sendLineMessage(reporter.line_user_id, `🔔 สถานะแจ้งซ่อม ${current.request_number} เปลี่ยนเป็น: ${statusLabel}`);
                    } catch (err) {
                        console.error('Failed to notify reporter:', err);
                    }
                }
            }

            // Notify Admin via Email about Status Change
            try {
                const { notifyMaintenanceStatusChange } = await import('@/lib/notifications/notificationManager');
                notifyMaintenanceStatusChange({
                    request_number: current?.request_number || '',
                    title: current?.title || '',
                    room_code: current?.tbl_rooms?.room_code || '',
                    room_name: current?.tbl_rooms?.room_name || ''
                }, current?.status || '', data.status, data.notes);
            } catch (err) {
                console.error('Failed to notify admin status change:', err);
            }
        }

        if (data.priority && data.priority !== current?.priority) {
            updateData.priority = data.priority;
            historyActions.push({
                action: 'เปลี่ยนความเร่งด่วน',
                old_value: current?.priority || '',
                new_value: data.priority
            });
        }

        if (data.category && data.category !== current?.category) {
            updateData.category = data.category;
            historyActions.push({
                action: 'เปลี่ยนหมวดหมู่',
                old_value: current?.category || '',
                new_value: data.category
            });
        }

        if (data.assigned_to !== undefined && data.assigned_to !== current?.assigned_to) {
            updateData.assigned_to = data.assigned_to || null;
            historyActions.push({
                action: 'มอบหมายงาน',
                old_value: current?.assigned_to || 'ยังไม่มอบหมาย',
                new_value: data.assigned_to || 'ยกเลิกการมอบหมาย'
            });

            // Notify Technician
            if (data.assigned_to) {
                try {
                    const { notifyJobAssignment } = await import('@/lib/notifications/notificationManager');
                    // Run in background / non-blocking
                    notifyJobAssignment({
                        request_number: current?.request_number || '',
                        title: current?.title || '',
                        description: current?.description,
                        priority: data.priority || current?.priority || 'normal',
                        room_code: current?.tbl_rooms?.room_code || 'N/A',
                        room_name: current?.tbl_rooms?.room_name || 'N/A',
                        reported_by: current?.reported_by || 'Unknown'
                    }, data.assigned_to, changed_by);
                } catch (err) {
                    console.error('Failed to notify technician:', err);
                }
            }
        }

        if (data.scheduled_date) {
            updateData.scheduled_date = new Date(data.scheduled_date);
            historyActions.push({
                action: 'กำหนดวันซ่อม',
                old_value: current?.scheduled_date?.toISOString().split('T')[0] || 'ไม่มี',
                new_value: data.scheduled_date
            });
        }

        if (data.estimated_cost !== undefined) {
            updateData.estimated_cost = new Decimal(data.estimated_cost);
        }

        if (data.actual_cost !== undefined) {
            updateData.actual_cost = new Decimal(data.actual_cost);
            historyActions.push({
                action: 'บันทึกค่าใช้จ่ายจริง',
                old_value: current?.actual_cost?.toString() || '0',
                new_value: data.actual_cost.toString()
            });
        }

        if (data.notes) {
            updateData.notes = data.notes;
        }

        const request = await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: updateData,
            include: { tbl_rooms: true }
        });

        // Log all history entries
        for (const h of historyActions) {
            await prisma.tbl_maintenance_history.create({
                data: {
                    request_id,
                    action: h.action,
                    old_value: h.old_value,
                    new_value: h.new_value,
                    changed_by
                }
            });
        }


        const session = await auth();
        await logSystemAction(
            'UPDATE',
            'MaintenanceRequest',
            request_id,
            `Updated maintenance request for: ${request.title}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || changed_by,
            'unknown'
        );

        revalidatePath('/maintenance');
        return { success: true, data: request };
    } catch (error) {
        console.error('Error updating maintenance request:', error);
        return { success: false, error: 'Failed to update request' };
    }
}

export async function deleteMaintenanceRequest(request_id: number) {
    try {
        const session = await auth();

        if (!session?.user) return { success: false, error: 'Unauthorized' };

        // Only Admin or Approvers can delete
        if (session.user.role !== 'admin' && !session.user.is_approver) {
            return { success: false, error: 'Permission denied: Requires Approver status' };
        }

        // Get details before delete
        const request = await prisma.tbl_maintenance_requests.findUnique({
            where: { request_id },
            select: { title: true }
        });

        await prisma.tbl_maintenance_requests.delete({
            where: { request_id }
        });

        await logSystemAction(
            'DELETE',
            'MaintenanceRequest',
            request_id,
            `Deleted maintenance request: ${request?.title}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
        revalidatePath('/maintenance');
        return { success: true };
    } catch (error) {
        console.error('Error deleting maintenance request:', error);
        return { success: false, error: 'Failed to delete request' };
    }
}

export async function reopenMaintenanceRequest(
    request_id: number,
    reason: string,
    masterPassword: string
) {
    try {
        const session = await auth();
        // Check role (optional, but good for security)
        // if ((session?.user as any)?.role !== 'manager' && (session?.user as any)?.role !== 'admin') {
        //     return { success: false, error: 'Unauthorized' };
        // }

        // 1. Verify Master Password
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        const correctPassword = `sm${d}${m}${y}`;

        if (masterPassword !== correctPassword) {
            return { success: false, error: 'รหัสผ่าน Master Password ไม่ถูกต้อง' };
        }

        // 2. Update Status
        const request = await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: {
                status: 'in_progress',
                completed_at: null
            }
        });

        // 3. Log History
        await prisma.tbl_maintenance_history.create({
            data: {
                request_id,
                action: 'REOPEN (Manager Override)',
                old_value: 'Closed',
                new_value: 'In Progress',
                changed_by: session?.user?.name || 'Manager'
            }
        });

        // 4. System Log
        await logSystemAction(
            'UPDATE',
            'MaintenanceRequest',
            request_id,
            `Reopened Job (Override): ${reason}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Manager',
            'unknown'
        );

        revalidatePath('/maintenance');
        return { success: true };
    } catch (error) {
        console.error('Error reopening request:', error);
        return { success: false, error: 'Failed to reopen request' };
    }
}

// ==================== REPORTS ====================

export async function getMaintenanceReportByRoom(filters?: {
    roomId?: number;
    technician?: string;
    partId?: string;
    startDate?: Date;
    endDate?: Date;
}) {
    try {
        const where: any = { active: true };

        // If filtering by room assigned to a specific room ID
        if (filters?.roomId) {
            where.room_id = filters.roomId;
        }

        // Build request filters
        const requestWhere: any = {};

        if (filters?.technician) {
            requestWhere.assigned_to = { contains: filters.technician };
        }

        if (filters?.startDate || filters?.endDate) {
            requestWhere.created_at = {};
            if (filters.startDate) {
                requestWhere.created_at.gte = filters.startDate;
            }
            if (filters.endDate) {
                // Set end date to end of day if looking for a range inclusive
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                requestWhere.created_at.lte = end;
            }
        }

        if (filters?.partId) {
            requestWhere.tbl_maintenance_parts = {
                some: {
                    p_id: filters.partId,
                    status: {
                        in: [
                            'withdrawn',
                            'used',
                            'pending_verification',
                            'verified',
                            'defective',
                            'verification_failed'
                        ]
                    }
                }
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

        // Filter out rooms with empty requests if a filter is active (except when only filtering by room itself)
        // Actually, if we filter by technician/part/date, we probably only want to see rooms that HAVE matching requests.
        // If filtering by RoomId only, we show that room regardless (but that's handled by `where` above).
        // If filtering by Tech, `requestWhere` filters the requests. If a room has 0 requests matching, do we show it?
        // Usually reports show "matching data". If a room has no matching requests, it shouldn't be in the report OR should be shown with 0.
        // Let's filter out rooms with 0 requests IF any request-specific filter is applied.

        let filteredRooms = rooms;
        const hasRequestFilters = filters?.technician || filters?.partId || filters?.startDate || filters?.endDate;

        if (hasRequestFilters) {
            filteredRooms = rooms.filter(r => r.tbl_maintenance_requests.length > 0);
        }

        const report = filteredRooms.map(room => {
            const pending = room.tbl_maintenance_requests.filter(r => r.status === 'pending').length;
            const inProgress = room.tbl_maintenance_requests.filter(r => r.status === 'in_progress').length;
            const completed = room.tbl_maintenance_requests.filter(r => r.status === 'completed').length;
            const cancelled = room.tbl_maintenance_requests.filter(r => r.status === 'cancelled').length;
            const totalCost = room.tbl_maintenance_requests.reduce((sum, r) =>
                sum + (r.actual_cost ? Number(r.actual_cost) : 0), 0
            );

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
                total_cost: totalCost,
                requests: room.tbl_maintenance_requests.map(req => ({
                    ...req,
                    parts: req.tbl_maintenance_parts.map(p => ({
                        part_id: p.part_id,
                        p_name: p.tbl_products?.p_name || p.p_id,
                        quantity: p.quantity,
                        unit: p.unit,
                        status: p.status
                    }))
                }))
            };
        });

        return { success: true, data: report };
    } catch (error) {
        console.error('Error generating report:', error);
        return { success: false, error: 'Failed to generate report' };
    }
}

export async function getMaintenanceSummary() {
    try {
        const [total, pending, inProgress, completed, pendingVerification, categoryData] = await Promise.all([
            prisma.tbl_maintenance_requests.count(),
            prisma.tbl_maintenance_requests.count({ where: { status: 'pending' } }),
            prisma.tbl_maintenance_requests.count({ where: { status: 'in_progress' } }),
            prisma.tbl_maintenance_requests.count({ where: { status: 'completed' } }),
            prisma.tbl_maintenance_parts.count({ where: { status: 'pending_verification' } }),
            prisma.tbl_maintenance_requests.groupBy({
                by: ['category'],
                _count: { category: true }
            })
        ]);

        // Build category stats map
        const categoryStats: Record<string, number> = {};
        for (const item of categoryData) {
            if (item.category) {
                categoryStats[item.category] = item._count.category;
            }
        }

        // Get total costs
        const allRequests = await prisma.tbl_maintenance_requests.findMany({
            select: { actual_cost: true }
        });
        const totalCost = allRequests.reduce((sum, r) =>
            sum + (r.actual_cost ? Number(r.actual_cost) : 0), 0
        );

        return {
            success: true,
            data: {
                total,
                pending,
                in_progress: inProgress,
                completed,
                total_cost: totalCost,
                pending_verification: pendingVerification,
                categoryStats
            }
        };
    } catch (error) {
        console.error('Error fetching summary:', error);
        return { success: false, error: 'Failed to fetch summary' };
    }
}

export async function getMaintenanceHistory(request_id: number) {
    try {
        const history = await prisma.tbl_maintenance_history.findMany({
            where: { request_id },
            orderBy: { changed_at: 'desc' }
        });
        return { success: true, data: history };
    } catch (error) {
        console.error('Error fetching history:', error);
        return { success: false, error: 'Failed to fetch history' };
    }
}

// ==================== PARTS MANAGEMENT ====================

export async function getProducts() {
    try {
        const products = await prisma.tbl_products.findMany({
            where: { active: true },
            orderBy: { p_name: 'asc' },
            select: {
                p_id: true,
                p_name: true,
                p_unit: true,
                p_count: true
            }
        });

        // Get WH-01 stock for each product
        const mainWarehouse = await prisma.tbl_warehouses.findFirst({
            where: { warehouse_code: 'WH-01' }
        });

        const wh01StockMap = new Map<string, number>();
        if (mainWarehouse) {
            const stocks = await prisma.tbl_warehouse_stock.findMany({
                where: { warehouse_id: mainWarehouse.warehouse_id }
            });
            stocks.forEach(stock => {
                wh01StockMap.set(stock.p_id, stock.quantity || 0);
            });
        }

        // Calculate reserved stock for each product
        const reservedCounts = await prisma.tbl_maintenance_parts.groupBy({
            by: ['p_id'],
            where: { status: 'withdrawn' },
            _sum: { quantity: true }
        });

        const reservedMap = new Map<string, number>();
        reservedCounts.forEach(item => {
            // Only count currently withdrawn quantity minus any returned
            reservedMap.set(item.p_id, item._sum.quantity || 0);
        });

        const productsWithAvailability = products.map(p => {
            const reserved = reservedMap.get(p.p_id) || 0;
            const wh01Qty = wh01StockMap.get(p.p_id);
            const fallbackQty = Math.max(0, p.p_count - reserved);
            // Use the larger value to tolerate legacy products whose WH-01 rows were never initialized.
            const available_stock = wh01Qty !== undefined ? Math.max(wh01Qty, fallbackQty) : fallbackQty;

            return {
                ...p,
                reserved,
                available_stock
            };
        });

        return { success: true, data: productsWithAvailability };
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, error: 'Failed to fetch products' };
    }
}

export async function getMaintenanceParts(request_id: number) {
    try {
        const parts = await prisma.tbl_maintenance_parts.findMany({
            where: { request_id },
            orderBy: { withdrawn_at: 'desc' }
        });

        // Get product details for each part
        const partsWithProducts = await Promise.all(parts.map(async (part) => {
            const product = await prisma.tbl_products.findUnique({
                where: { p_id: part.p_id },
                select: { p_name: true, p_unit: true, p_count: true }
            });
            return { ...part, product };
        }));

        return { success: true, data: partsWithProducts };
    } catch (error) {
        console.error('Error fetching parts:', error);
        return { success: false, error: 'Failed to fetch parts' };
    }
}

// Get all withdrawn parts (for display in stock page)
export async function getWithdrawnPartsForMaintenance() {
    try {
        const parts = await prisma.tbl_maintenance_parts.findMany({
            where: { status: 'withdrawn' },
            include: {
                tbl_maintenance_requests: {
                    select: {
                        request_number: true,
                        title: true,
                        tbl_rooms: { select: { room_code: true, room_name: true } }
                    }
                }
            },
            orderBy: { withdrawn_at: 'desc' }
        });

        // Get product details and remap relation names to match component interface
        const partsWithProducts = await Promise.all(parts.map(async (part) => {
            const product = await prisma.tbl_products.findUnique({
                where: { p_id: part.p_id },
                select: { p_name: true, p_unit: true }
            });
            return {
                ...part,
                product,
                request: part.tbl_maintenance_requests  // remap for component compatibility
            };
        }));

        return { success: true, data: partsWithProducts };
    } catch (error) {
        console.error('Error fetching withdrawn parts:', error);
        return { success: false, error: 'Failed to fetch withdrawn parts' };
    }
}


// Withdraw part from stock (reserving for maintenance)
// Phase 2: Moves stock from WH-01 to WH-03 (Reserved Stock)
export async function withdrawPartForMaintenance(data: {
    request_id: number;
    p_id: string;
    quantity: number;
    withdrawn_by: string;
    notes?: string;
}) {
    try {
        const session = await auth();
        if (!session) return { success: false, error: 'Unauthorized' };

        // Get WH-01 (Main Stock) and WH-03 (Reserved Stock)
        const mainWarehouse = await prisma.tbl_warehouses.findFirst({
            where: { warehouse_code: 'WH-01' }
        });

        const reservedWarehouse = await prisma.tbl_warehouses.findFirst({
            where: { warehouse_code: 'WH-03' }
        });

        if (!mainWarehouse || !reservedWarehouse) {
            return { success: false, error: 'ยังไม่ได้กำหนดค่าคลังสินค้า' };
        }

        // Check product exists
        const product = await prisma.tbl_products.findUnique({
            where: { p_id: data.p_id }
        });

        if (!product) {
            return { success: false, error: 'ไม่พบสินค้านี้' };
        }

        // Check WH-01 stock availability
        const wh01Stock = await prisma.tbl_warehouse_stock.findUnique({
            where: {
                warehouse_id_p_id: {
                    warehouse_id: mainWarehouse.warehouse_id,
                    p_id: data.p_id
                }
            }
        });

        let availableQty: number | null | undefined = wh01Stock?.quantity;

        const reservedAgg = await prisma.tbl_maintenance_parts.aggregate({
            where: { p_id: data.p_id, status: 'withdrawn' },
            _sum: { quantity: true }
        });
        const reservedQty = reservedAgg._sum.quantity || 0;
        const fallbackQty = Math.max(0, product.p_count - reservedQty);

        // Auto-heal: if WH-01 stock is missing or stale, fall back to logical stock from product balance.
        if (availableQty === undefined || availableQty === null) {
            availableQty = fallbackQty;
        } else {
            availableQty = Math.max(availableQty, fallbackQty);
        }

        const resolvedQty = availableQty as number;

        if (resolvedQty < data.quantity) {
            return {
                success: false,
                error: `สต็อกใน WH-01 ไม่เพียงพอ (คงเหลือ ${availableQty} ${product.p_unit || 'ชิ้น'})`
            };
        }

        // Transaction: Move stock from WH-01 to WH-03
        await prisma.$transaction(async (tx) => {
            // 1. Deduct from WH-01 (Upsert for auto-healing if missing)
            await tx.tbl_warehouse_stock.upsert({
                where: {
                    warehouse_id_p_id: {
                        warehouse_id: mainWarehouse.warehouse_id,
                        p_id: data.p_id
                    }
                },
                update: {
                    quantity: { decrement: data.quantity },
                    last_updated: new Date()
                },
                create: {
                    warehouse_id: mainWarehouse.warehouse_id,
                    p_id: data.p_id,
                    // If creating, initialize with total expected minus this withdrawal
                    quantity: resolvedQty - data.quantity,
                    last_updated: new Date()
                }
            });

            // 2. Add to WH-03 (upsert in case it doesn't exist)
            await tx.tbl_warehouse_stock.upsert({
                where: {
                    warehouse_id_p_id: {
                        warehouse_id: reservedWarehouse.warehouse_id,
                        p_id: data.p_id
                    }
                },
                create: {
                    warehouse_id: reservedWarehouse.warehouse_id,
                    p_id: data.p_id,
                    quantity: data.quantity,
                    min_stock: 0
                },
                update: {
                    quantity: { increment: data.quantity },
                    last_updated: new Date()
                }
            });

            // 3. Create maintenance part record
            await tx.tbl_maintenance_parts.create({
                data: {
                    request_id: data.request_id,
                    p_id: data.p_id,
                    quantity: data.quantity,
                    unit: product.p_unit,
                    status: 'withdrawn', // In WH-03
                    withdrawn_by: data.withdrawn_by,
                    notes: data.notes || null
                }
            });

            // 4. Log history
            await tx.tbl_maintenance_history.create({
                data: {
                    request_id: data.request_id,
                    action: 'เบิกอะไหล่',
                    new_value: `${product.p_name} x ${data.quantity} ${product.p_unit || 'ชิ้น'} (WH-01 → WH-03)`,
                    changed_by: data.withdrawn_by
                }
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');

        // const session = await auth();
        await logSystemAction(
            'WITHDRAW',
            'MaintenancePart',
            data.request_id,
            `Withdrew part: ${product.p_name} x ${data.quantity} (WH-01 → WH-03) for Request #${data.request_id}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || data.withdrawn_by,
            'unknown'
        );

        // Notify Store about part withdrawal
        try {
            const { notifyStorePartsEvent } = await import('@/lib/notifications/notificationManager');
            const maintRequest = await prisma.tbl_maintenance_requests.findUnique({
                where: { request_id: data.request_id },
                select: { request_number: true }
            });
            if (maintRequest) {
                await notifyStorePartsEvent({
                    eventType: 'withdraw',
                    request_number: maintRequest.request_number,
                    item_name: product.p_name,
                    quantity: data.quantity,
                    withdrawn_by: data.withdrawn_by,
                    notes: data.notes
                });
            }
        } catch (notifyErr) {
            console.error('[Notification] Store notification failed on withdraw:', notifyErr);
        }

        return { success: true, message: `เบิกสำเร็จ: ${product.p_name} x ${data.quantity} (ย้ายไป WH-03 แล้ว)` };
    } catch (error) {
        console.error('Error withdrawing part:', error);
        return { success: false, error: 'Failed to withdraw part' };
    }
}

// Mark part as used (when maintenance completed)
export async function markPartAsUsed(part_id: number, changed_by: string) {
    try {
        const part = await prisma.tbl_maintenance_parts.update({
            where: { part_id },
            data: {
                status: 'used',
                used_at: new Date()
            }
        });

        // NOW we decrement the actual stock
        await prisma.tbl_products.update({
            where: { p_id: part.p_id },
            data: { p_count: { decrement: part.quantity } }
        });

        // Log stock movement
        await prisma.tbl_stock_movements.create({
            data: {
                p_id: part.p_id,
                username: changed_by,
                movement_type: 'maintenance_use',
                quantity: -part.quantity,
                remarks: `ใช้จริงในงานซ่อม: Request #${part.request_id}`
            }
        });

        // Log history
        const product = await prisma.tbl_products.findUnique({
            where: { p_id: part.p_id },
            select: { p_name: true, p_unit: true }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: part.request_id,
                action: 'อะไหล่ใช้จริง',
                new_value: `${product?.p_name || part.p_id} x ${part.quantity} ${product?.p_unit || 'ชิ้น'} (ตัดสต็อกจริง)`,
                changed_by
            }
        });

        revalidatePath('/maintenance');

        const session = await auth();
        await logSystemAction(
            'USE',
            'MaintenancePart',
            part.request_id,
            `Used part: ${part_id} (Deducted stock)`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || changed_by,
            'unknown'
        );

        return { success: true, data: part };
    } catch (error) {
        console.error('Error marking part as used:', error);
        return { success: false, error: 'Failed to mark part as used' };
    }
}

// Return part to stock
export async function returnPartToStock(data: {
    part_id: number;
    returned_qty: number;
    returned_by: string;
}) {
    try {
        const part = await prisma.tbl_maintenance_parts.findUnique({
            where: { part_id: data.part_id }
        });

        if (!part) {
            return { success: false, error: 'ไม่พบรายการเบิก' };
        }

        if (data.returned_qty > (part.quantity - part.returned_qty)) {
            return { success: false, error: 'จำนวนคืนมากกว่าที่เบิกไป' };
        }

        const newReturnedQty = part.returned_qty + data.returned_qty;
        const isFullyReturned = newReturnedQty >= part.quantity;

        // Get warehouses
        const wh01 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });
        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });

        if (!wh01 || !wh03) {
            return { success: false, error: 'Warehouse config missing' };
        }

        await prisma.$transaction(async (tx) => {
            // 1. Update part record
            await tx.tbl_maintenance_parts.update({
                where: { part_id: data.part_id },
                data: {
                    returned_qty: newReturnedQty,
                    returned_at: new Date(),
                    status: isFullyReturned ? 'returned' : 'withdrawn'
                }
            });

            // 2. Move stock back: Decrement WH-03, Increment WH-01
            await tx.tbl_warehouse_stock.update({
                where: {
                    warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id }
                },
                data: { quantity: { decrement: data.returned_qty }, last_updated: new Date() }
            });

            await tx.tbl_warehouse_stock.upsert({
                where: {
                    warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: part.p_id }
                },
                create: {
                    warehouse_id: wh01.warehouse_id,
                    p_id: part.p_id,
                    quantity: data.returned_qty,
                    min_stock: 0
                },
                update: {
                    quantity: { increment: data.returned_qty },
                    last_updated: new Date()
                }
            });
        });

        // Log history
        const product = await prisma.tbl_products.findUnique({
            where: { p_id: part.p_id },
            select: { p_name: true, p_unit: true }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: part.request_id,
                action: 'คืนอะไหล่',
                new_value: `${product?.p_name || part.p_id} x ${data.returned_qty} ${product?.p_unit || 'ชิ้น'} (WH-03 → WH-01)`,
                changed_by: data.returned_by
            }
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');

        const session = await auth();
        await logSystemAction(
            'RETURN',
            'MaintenancePart',
            part.request_id,
            `Returned part: ${part.p_id} x ${data.returned_qty} (WH-03 → WH-01)`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || data.returned_by,
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error returning part:', error);
        return { success: false, error: 'Failed to return part' };
    }
}

// Complete maintenance and finalize parts
export async function completeMaintenanceWithParts(request_id: number, changed_by: string) {
    try {
        // Find all parts that are withdrawn (pending use)
        const withdrawnParts = await prisma.tbl_maintenance_parts.findMany({
            where: { request_id, status: { in: ['withdrawn', 'verified'] } }
        });

        // Process each part: Mark as used and DEDUCT stock
        for (const part of withdrawnParts) {
            await prisma.tbl_maintenance_parts.update({
                where: { part_id: part.part_id },
                data: { status: 'used', used_at: new Date() }
            });

            // Deduct stock
            await prisma.tbl_products.update({
                where: { p_id: part.p_id },
                data: { p_count: { decrement: part.quantity } }
            });

            // Log stock movement
            await prisma.tbl_stock_movements.create({
                data: {
                    p_id: part.p_id,
                    username: changed_by,
                    movement_type: 'maintenance_use',
                    quantity: -part.quantity,
                    remarks: `ตัดสต็อกอัตโนมัติเมื่อจบงาน: Request #${request_id}`
                }
            });
        }

        // Update request status
        await prisma.tbl_maintenance_requests.update({
            where: { request_id },
            data: {
                status: 'completed',
                completed_at: new Date()
            }
        });

        // Log history
        await prisma.tbl_maintenance_history.create({
            data: {
                request_id,
                action: 'เสร็จสิ้น + ตัดสต็อก',
                new_value: 'ตัดสต็อกอะไหล่ที่เบิกไปทั้งหมด',
                changed_by
            }
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');

        const session = await auth();
        await logSystemAction(
            'COMPLETE',
            'MaintenanceRequest',
            request_id,
            `Completed maintenance request #${request_id} and finalized parts`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || changed_by,
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error completing maintenance:', error);
        return { success: false, error: 'Failed to complete maintenance' };
    }
}

// New action to support repair completion with signature, photo, and part selection
export async function submitRepairCompletion(formData: FormData) {
    try {
        const session = await auth();
        const request_id = parseInt(formData.get('request_id') as string);
        const completionNotes = formData.get('completionNotes') as string;
        const technician_signature = formData.get('technician_signature') as string;
        const customer_signature = formData.get('customer_signature') as string;
        const parts_used_json = formData.get('parts_used') as string;
        const changed_by = session?.user?.name || 'System';

        if (isNaN(request_id)) {
            return { success: false, error: 'Invalid request ID' };
        }

        // Image upload handling
        const imageFile = formData.get('completion_image') as File | null;
        let completion_image_url = null;

        if (imageFile && imageFile.size > 0) {
            try {
                const url = await uploadFile(imageFile, 'maintenance_completion');
                completion_image_url = url;
            } catch (err) {
                console.error('Upload failed', err);
            }
        }

        // Process parts
        const partsUsed: { p_id: string; quantity: number; notes?: string }[] = parts_used_json ? JSON.parse(parts_used_json) : [];

        await prisma.$transaction(async (tx) => {
            // 1. Finalize previously withdrawn or verified parts
            const withdrawnParts = await tx.tbl_maintenance_parts.findMany({
                where: { request_id, status: { in: ['withdrawn', 'verified'] } }
            });

            for (const part of withdrawnParts) {
                await tx.tbl_maintenance_parts.update({
                    where: { part_id: part.part_id },
                    data: { status: 'used', used_at: new Date() }
                });

                // Deduct stock (it was already in WH-03, but logical product stock needs decrementing)
                await tx.tbl_products.update({
                    where: { p_id: part.p_id },
                    data: { p_count: { decrement: part.quantity } }
                });

                // Log stock movement
                await tx.tbl_stock_movements.create({
                    data: {
                        p_id: part.p_id,
                        username: changed_by,
                        movement_type: 'maintenance_use',
                        quantity: -part.quantity,
                        remarks: `ตัดสต็อกเมื่อจบงาน (เบิกไว้แล้ว): Request #${request_id}`
                    }
                });
            }

            // 2. Handle newly selected parts at completion (direct deduct from WH-01)
            if (partsUsed.length > 0) {
                const wh01 = await tx.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });

                for (const part of partsUsed) {
                    await tx.tbl_maintenance_parts.create({
                        data: {
                            request_id,
                            p_id: part.p_id,
                            quantity: part.quantity,
                            actual_used: part.quantity,
                            status: 'used',
                            withdrawn_by: changed_by,
                            withdrawn_at: new Date(),
                            used_at: new Date(),
                            notes: part.notes || 'เพิ่มตอนจบงานซ่อม'
                        }
                    });

                    await tx.tbl_products.update({
                        where: { p_id: part.p_id },
                        data: { p_count: { decrement: part.quantity } }
                    });

                    if (wh01) {
                        await tx.tbl_warehouse_stock.update({
                            where: { warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: part.p_id } },
                            data: { quantity: { decrement: part.quantity } }
                        });
                    }

                    await tx.tbl_stock_movements.create({
                        data: {
                            p_id: part.p_id,
                            username: changed_by,
                            movement_type: 'maintenance_use',
                            quantity: -part.quantity,
                            remarks: `ตัดสต็อกเมื่อจบงาน (เพิ่มใหม่): Request #${request_id}`
                        }
                    });
                }
            }

            // 3. Update the Maintenance Request
            await tx.tbl_maintenance_requests.update({
                where: { request_id },
                data: {
                    status: 'completed',
                    completed_at: new Date(),
                    notes: completionNotes,
                    completion_image_url,
                    technician_signature,
                    customer_signature
                }
            });

            // 4. Log history
            await tx.tbl_maintenance_history.create({
                data: {
                    request_id,
                    action: 'ปิดงานซ่อม',
                    new_value: 'งานเสร็จสมบูรณ์ พร้อมรูปภาพ/ลายเซ็น',
                    changed_by
                }
            });
        });

        // 5. System log and notifications
        await logSystemAction(
            'COMPLETE',
            'MaintenanceRequest',
            request_id,
            `Completed maintenance #${request_id} with signatures`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            changed_by,
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/products');

        return { success: true };
    } catch (error: any) {
        console.error('Error submitting repair completion:', error);
        return { success: false, error: error.message || 'Failed to complete repair' };
    }
}

// --- Analytics ---

export async function getMaintenanceStats() {
    try {
        const totalRequests = await prisma.tbl_maintenance_requests.count();
        const pendingRequests = await prisma.tbl_maintenance_requests.count({ where: { status: 'pending' } });
        const inProgressRequests = await prisma.tbl_maintenance_requests.count({ where: { status: 'in_progress' } });
        const completedRequests = await prisma.tbl_maintenance_requests.count({ where: { status: 'completed' } });

        // Calculate total cost (actual_cost)
        const allCompleted = await prisma.tbl_maintenance_requests.findMany({
            where: { status: 'completed', actual_cost: { gt: 0 } },
            select: { actual_cost: true }
        });
        const totalCost = allCompleted.reduce((sum, req) => sum + Number(req.actual_cost || 0), 0);

        // Get recent 5 activities
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

        // Get monthly requests (last 6 months)
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

        return {
            success: true,
            data: {
                counts: { total: totalRequests, pending: pendingRequests, processing: inProgressRequests, completed: completedRequests },
                totalCost,
                recentActivities,
                chartData
            }
        };

    } catch (error) {
        console.error('Error fetching maintenance stats:', error);
        return { success: false, error: 'Failed to fetch stats' };
    }
}

// Clear ALL reserved parts (Daily Reset)
export async function clearAllReservedParts(performed_by: string) {
    try {
        // Find all 'withdrawn' parts
        const reservedParts = await prisma.tbl_maintenance_parts.findMany({
            where: { status: 'withdrawn' }
        });

        if (reservedParts.length === 0) {
            return { success: true, message: 'ไม่มีรายการค้างในระบบ' };
        }

        // Update all to 'returned'
        await prisma.tbl_maintenance_parts.updateMany({
            where: { status: 'withdrawn' },
            data: {
                status: 'returned',
                returned_at: new Date(),
                returned_qty: { set: 0 } // We can't really set returned_qty to quantity dynamically in updateMany easily without raw query or loop.
                // Actually, if we 'return' them, we should probably set returned_qty = quantity.
                // But updateMany doesn't support setting value to another column's value.
            }
        });

        // Since we can't set returned_qty = quantity in updateMany, let's loop (safer for data integrity)
        // Or better, use a transaction if possible, but loop is fine for this scale.
        // Actually, for "Daily Clear", we might just want to 'Cancel' them or 'Return' them.
        // Let's stick to updateMany for status, but we might have inconsistent returned_qty.
        // Let's iterate.

        for (const part of reservedParts) {
            await prisma.tbl_maintenance_parts.update({
                where: { part_id: part.part_id },
                data: {
                    status: 'returned',
                    returned_at: new Date(),
                    returned_qty: part.quantity, // Full return
                    notes: (part.notes || '') + ' [Auto-Clear Daily]'
                }
            });
            // Log history for each request ? Or just one big log?
            // Too many logs if we loop. Let's just log system action.
        }

        revalidatePath('/maintenance');
        revalidatePath('/products');

        const session = await auth();
        await logSystemAction(
            'CLEAR_RESERVE',
            'MaintenancePart',
            0,
            `Cleared ${reservedParts.length} reserved parts (Daily Reset)`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || performed_by,
            'unknown'
        );

        return { success: true, count: reservedParts.length };

    } catch (error) {
        console.error('Error clearing reserved parts:', error);
        return { success: false, error: 'Failed to clear reserved parts' };
    }
}

// ==================== PHASE 3: CONFIRMATION & VERIFICATION ====================

// Confirm parts used by technician (after job completion)
// Phase 3: Handles actual_used reporting and moves defective/unused parts
export async function confirmPartsUsed(data: {
    part_id: number;
    actual_used: number;
    is_defective?: boolean;
    changed_by: string;
}) {
    try {
        const part = await prisma.tbl_maintenance_parts.findUnique({
            where: { part_id: data.part_id },
            include: { tbl_products: true }
        });

        if (!part) {
            return { success: false, error: 'ไม่พบรายการเบิกนี้' };
        }

        if (part.status !== 'withdrawn') {
            return { success: false, error: 'รายการนี้ไม่อยู่ในสถานะที่สามารถรายงานการใช้ได้' };
        }

        if (data.actual_used > part.quantity) {
            return { success: false, error: 'จำนวนที่ใช้มากกว่าที่เบิกไป' };
        }

        // Get warehouses
        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });
        const wh01 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-01' } });
        const wh08 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-08' } });

        if (!wh03 || !wh01 || !wh08) {
            return { success: false, error: 'ยังไม่ได้กำหนดค่าคลังสินค้า' };
        }

        await prisma.$transaction(async (tx) => {
            // Case 1: Defective parts - move directly from WH-03 to WH-08
            if (data.is_defective) {
                await tx.tbl_warehouse_stock.update({
                    where: {
                        warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id }
                    },
                    data: { quantity: { decrement: data.actual_used }, last_updated: new Date() }
                });

                await tx.tbl_warehouse_stock.upsert({
                    where: {
                        warehouse_id_p_id: { warehouse_id: wh08.warehouse_id, p_id: part.p_id }
                    },
                    create: {
                        warehouse_id: wh08.warehouse_id,
                        p_id: part.p_id,
                        quantity: data.actual_used,
                        min_stock: 0
                    },
                    update: {
                        quantity: { increment: data.actual_used },
                        last_updated: new Date()
                    }
                });

                await tx.tbl_maintenance_parts.update({
                    where: { part_id: data.part_id },
                    data: {
                        actual_used: data.actual_used,
                        status: 'defective',
                        used_at: new Date()
                    }
                });

                await tx.tbl_maintenance_history.create({
                    data: {
                        request_id: part.request_id,
                        action: 'ช่างรายงาน: อะไหล่เสีย',
                        new_value: `${part.tbl_products.p_name} x ${data.actual_used} (WH-03 → WH-08)`,
                        changed_by: data.changed_by
                    }
                });

                return;
            }

            // Case 2: Normal parts - stay in WH-03 pending verification
            const unusedQty = part.quantity - data.actual_used;

            // Return unused parts to WH-01
            if (unusedQty > 0) {
                await tx.tbl_warehouse_stock.update({
                    where: {
                        warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id }
                    },
                    data: { quantity: { decrement: unusedQty }, last_updated: new Date() }
                });

                await tx.tbl_warehouse_stock.update({
                    where: {
                        warehouse_id_p_id: { warehouse_id: wh01.warehouse_id, p_id: part.p_id }
                    },
                    data: { quantity: { increment: unusedQty }, last_updated: new Date() }
                });
            }

            // Update part record - stays in WH-03 until verified
            await tx.tbl_maintenance_parts.update({
                where: { part_id: data.part_id },
                data: {
                    actual_used: data.actual_used,
                    status: 'pending_verification',
                    used_at: new Date()
                }
            });

            await tx.tbl_maintenance_history.create({
                data: {
                    request_id: part.request_id,
                    action: 'ช่างรายงานการใช้',
                    new_value: `${part.tbl_products.p_name}: ใช้จริง ${data.actual_used}, เหลือ ${unusedQty} (รอสโตร์ตรวจนับ)`,
                    changed_by: data.changed_by
                }
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');

        const session = await auth();
        await logSystemAction(
            'CONFIRM_USE',
            'MaintenancePart',
            part.request_id,
            `Confirmed usage: ${part.tbl_products.p_name} x ${data.actual_used} (${data.is_defective ? 'Defective' : 'Pending Verification'})`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || data.changed_by,
            'unknown'
        );

        // Notify Store about parts verification needed
        try {
            const { notifyStorePartsEvent } = await import('@/lib/notifications/notificationManager');
            const maintRequest = await prisma.tbl_maintenance_requests.findUnique({
                where: { request_id: part.request_id },
                select: { request_number: true }
            });
            if (maintRequest) {
                const calculatedUnusedQty = part.quantity - data.actual_used;
                await notifyStorePartsEvent({
                    eventType: 'pending_verification',
                    request_number: maintRequest.request_number,
                    item_name: part.tbl_products.p_name,
                    quantity: data.actual_used,
                    withdrawn_by: data.changed_by,
                    notes: `รายงานใช้จริง ${data.actual_used}, เหลือ ${calculatedUnusedQty} ชิ้น (แจ้งโดยช่าง)`
                });
            }
        } catch (notifyErr) {
            console.error('[Notification] Store notification failed on confirm used:', notifyErr);
        }

        return {
            success: true,
            message: data.is_defective
                ? `รายงานอะไหล่เสียแล้ว (ย้ายไป WH-08)`
                : `รายงานการใช้สำเร็จ รอสโตร์ตรวจนับ`
        };
    } catch (error) {
        console.error('Error confirming parts used:', error);
        return { success: false, error: 'Failed to confirm parts used' };
    }
}

// Store verification (after technician confirms usage)
// Phase 3: Verifies quantity and moves WH-03 → WH-02 if match
export async function storeVerifyParts(data: {
    part_id: number;
    verified_quantity: number;
    verified_by: string;
    notes?: string;
}) {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const role = (session?.user as any)?.role;
        if (!session || !['admin', 'manager', 'operation'].includes(role)) {
            return { success: false, error: 'Unauthorized: Store/Admin access required' };
        }

        const part = await prisma.tbl_maintenance_parts.findUnique({
            where: { part_id: data.part_id },
            include: { tbl_products: true }
        });

        if (!part) {
            return { success: false, error: 'ไม่พบรายการเบิกนี้' };
        }

        if (part.status !== 'pending_verification') {
            return { success: false, error: 'รายการนี้ไม่อยู่ในสถานะรอตรวจนับ' };
        }

        const expectedQty = part.actual_used || part.quantity;

        // Get warehouses
        const wh03 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-03' } });
        const wh02 = await prisma.tbl_warehouses.findFirst({ where: { warehouse_code: 'WH-02' } });

        if (!wh03 || !wh02) {
            return { success: false, error: 'ยังไม่ได้กำหนดค่าคลังสินค้า' };
        }

        // Check if quantity matches
        if (data.verified_quantity !== expectedQty) {
            // Mismatch - keep in WH-03
            await prisma.tbl_maintenance_parts.update({
                where: { part_id: data.part_id },
                data: {
                    verified_quantity: data.verified_quantity,
                    verified_at: new Date(),
                    status: 'verification_failed',
                    verification_notes: data.notes || `คาดหวัง: ${expectedQty}, พบจริง: ${data.verified_quantity}`
                }
            });

            await prisma.tbl_maintenance_history.create({
                data: {
                    request_id: part.request_id,
                    action: 'สโตร์ตรวจนับ: ไม่ตรง',
                    new_value: `${part.tbl_products.p_name}: คาดหวัง ${expectedQty}, พบ ${data.verified_quantity} (ค้างที่ WH-03)`,
                    changed_by: data.verified_by
                }
            });

            revalidatePath('/maintenance');

            return {
                success: false,
                message: `จำนวนไม่ตรงกัน! คาดหวัง ${expectedQty} แต่พบ ${data.verified_quantity}`,
                mismatch: true
            };
        }

        // Quantity matches - move from WH-03 to WH-02
        await prisma.$transaction(async (tx) => {
            // Deduct from WH-03
            await tx.tbl_warehouse_stock.update({
                where: {
                    warehouse_id_p_id: { warehouse_id: wh03.warehouse_id, p_id: part.p_id }
                },
                data: { quantity: { decrement: data.verified_quantity }, last_updated: new Date() }
            });

            // Add to WH-02
            await tx.tbl_warehouse_stock.upsert({
                where: {
                    warehouse_id_p_id: { warehouse_id: wh02.warehouse_id, p_id: part.p_id }
                },
                create: {
                    warehouse_id: wh02.warehouse_id,
                    p_id: part.p_id,
                    quantity: data.verified_quantity,
                    min_stock: 0
                },
                update: {
                    quantity: { increment: data.verified_quantity },
                    last_updated: new Date()
                }
            });

            // Update part record
            await tx.tbl_maintenance_parts.update({
                where: { part_id: data.part_id },
                data: {
                    verified_quantity: data.verified_quantity,
                    verified_at: new Date(),
                    status: 'verified',
                    verification_notes: data.notes
                }
            });

            await tx.tbl_maintenance_history.create({
                data: {
                    request_id: part.request_id,
                    action: 'สโตร์ตรวจนับ: ตรง',
                    new_value: `${part.tbl_products.p_name} x ${data.verified_quantity} (WH-03 → WH-02)`,
                    changed_by: data.verified_by
                }
            });
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');

        // const session = await auth();
        await logSystemAction(
            'VERIFY',
            'MaintenancePart',
            part.request_id,
            `Verified: ${part.tbl_products.p_name} x ${data.verified_quantity} (WH-03 → WH-02)`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || data.verified_by,
            'unknown'
        );

        return {
            success: true,
            message: `ตรวจนับเสร็จสมบูรณ์ ย้ายไป WH-02 แล้ว`
        };
    } catch (error) {
        console.error('Error verifying parts:', error);
        return { success: false, error: 'Failed to verify parts' };
    }
}

export async function getGeneralRequests() {
    try {
        const requests = await prisma.tbl_maintenance_requests.findMany({
            where: { category: 'general', status: 'pending' },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: requests };
    } catch (error: any) {
        console.error('Error getting general requests:', error);
        return { success: false, error: error.message };
    }
}

