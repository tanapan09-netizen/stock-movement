'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';

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
    building?: string;
    floor?: string;
}) {
    try {
        const room = await prisma.tbl_rooms.create({
            data: {
                room_code: data.room_code,
                room_name: data.room_name,
                building: data.building || null,
                floor: data.floor || null
            }
        });
        const session = await auth();
        await logSystemAction(
            'CREATE',
            'Room',
            room.room_id,
            `Created room: ${room.room_code} - ${room.room_name}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true, data: room };
    } catch (error) {
        console.error('Error creating room:', error);
        return { success: false, error: 'Failed to create room' };
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
    building?: string | null;
    floor?: string | null;
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
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true, data: room };
    } catch (error) {
        console.error('Error updating room:', error);
        return { success: false, error: 'Failed to update room' };
    }
}

// Soft delete room (set active to false)
export async function deleteRoom(room_id: number) {
    try {
        await prisma.tbl_rooms.update({
            where: { room_id },
            data: { active: false }
        });
        const session = await auth();
        await logSystemAction(
            'DELETE',
            'Room',
            room_id,
            `Soft deleted room ID: ${room_id}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/admin/rooms');
        return { success: true };
    } catch (error) {
        console.error('Error deleting room:', error);
        return { success: false, error: 'Failed to delete room' };
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
            session?.user?.id ? parseInt(session.user.id) : 0,
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
    status?: string;
    room_id?: number;
    priority?: string;
}) {
    try {
        const where: Record<string, unknown> = {};

        if (filters?.status && filters.status !== 'all') {
            where.status = filters.status;
        }
        if (filters?.room_id) {
            where.room_id = filters.room_id;
        }
        if (filters?.priority && filters.priority !== 'all') {
            where.priority = filters.priority;
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
        const room_id = parseInt(formData.get('room_id') as string);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const priority = formData.get('priority') as string;
        const reported_by = formData.get('reported_by') as string;
        const assigned_to = formData.get('assigned_to') as string;
        const scheduled_date = formData.get('scheduled_date') as string;
        const estimated_cost = parseFloat(formData.get('estimated_cost') as string) || 0;
        const department = formData.get('department') as string;
        const contact_info = formData.get('contact_info') as string;
        const tags = formData.get('tags') as string;
        const imageFiles = formData.getAll('images') as File[];
        const uploadedImageUrls: string[] = [];

        if (imageFiles && imageFiles.length > 0) {
            const uploadDir = path.join(process.cwd(), 'public/uploads/maintenance');
            // Ensure directory exists
            await fs.mkdir(uploadDir, { recursive: true });

            for (const file of imageFiles) {
                if (file.size > 0) {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                    await fs.writeFile(path.join(uploadDir, filename), buffer);
                    uploadedImageUrls.push(`/uploads/maintenance/${filename}`);
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
                room_id,
                title,
                description: description || null,
                image_url: image_url || null,
                priority: priority || 'normal',
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
                new_value: `สร้างรายการแจ้งซ่อม: ${title}`,
                changed_by: reported_by
            }
        });

        // Send LINE notification to technicians
        try {
            const { notifyTechniciansViaLine } = await import('@/lib/lineNotify');
            await notifyTechniciansViaLine(
                title,
                request.tbl_rooms?.room_code || '',
                request.tbl_rooms?.room_name || '',
                priority || 'normal',
                reported_by
            );
        } catch (notifyError) {
            console.error('LINE notification failed:', notifyError);
            // Don't fail the request if notification fails
        }


        const session = await auth();
        await logSystemAction(
            'CREATE',
            'MaintenanceRequest',
            request.request_id,
            `Created maintenance request: ${title}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
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
            where: { request_id }
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

            // Notify Reporter
            if (current?.reported_by) {
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
            session?.user?.id ? parseInt(session.user.id) : 0,
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
            session?.user?.id ? parseInt(session.user.id) : 0,
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
                    status: { in: ['withdrawn', 'used'] }
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
                        unit: p.unit
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
        const [total, pending, inProgress, completed] = await Promise.all([
            prisma.tbl_maintenance_requests.count(),
            prisma.tbl_maintenance_requests.count({ where: { status: 'pending' } }),
            prisma.tbl_maintenance_requests.count({ where: { status: 'in_progress' } }),
            prisma.tbl_maintenance_requests.count({ where: { status: 'completed' } })
        ]);

        // Get total costs
        const allRequests = await prisma.tbl_maintenance_requests.findMany({
            select: { actual_cost: true }
        });
        const totalCost = allRequests.reduce((sum, r) =>
            sum + (r.actual_cost ? Number(r.actual_cost) : 0), 0
        );

        return {
            success: true,
            data: { total, pending, in_progress: inProgress, completed, total_cost: totalCost }
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

        // Calculate reserved stock for each product
        const reservedCounts = await prisma.tbl_maintenance_parts.groupBy({
            by: ['p_id'],
            where: { status: 'withdrawn' },
            _sum: { quantity: true }
        });

        const reservedMap = new Map<string, number>();
        reservedCounts.forEach(item => {
            reservedMap.set(item.p_id, item._sum.quantity || 0);
        });

        const productsWithAvailability = products.map(p => {
            const reserved = reservedMap.get(p.p_id) || 0;
            return {
                ...p,
                reserved,
                available: Math.max(0, p.p_count - reserved)
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

        // Get product details
        const partsWithProducts = await Promise.all(parts.map(async (part) => {
            const product = await prisma.tbl_products.findUnique({
                where: { p_id: part.p_id },
                select: { p_name: true, p_unit: true }
            });
            return { ...part, product };
        }));

        return { success: true, data: partsWithProducts };
    } catch (error) {
        console.error('Error fetching withdrawn parts:', error);
        return { success: false, error: 'Failed to fetch withdrawn parts' };
    }
}

// Withdraw part from stock (reserving for maintenance)
export async function withdrawPartForMaintenance(data: {
    request_id: number;
    p_id: string;
    quantity: number;
    withdrawn_by: string;
    notes?: string;
}) {
    try {
        // Check stock availability
        const product = await prisma.tbl_products.findUnique({
            where: { p_id: data.p_id }
        });

        if (!product) {
            return { success: false, error: 'ไม่พบสินค้านี้' };
        }

        // Calculate available stock
        const reserved = await prisma.tbl_maintenance_parts.aggregate({
            where: { p_id: data.p_id, status: 'withdrawn' },
            _sum: { quantity: true }
        });
        const reservedQty = reserved._sum.quantity || 0;
        const availableQty = product.p_count - reservedQty;

        if (availableQty < data.quantity) {
            return { success: false, error: `สินค้าไม่เพียงพอ (คงเหลือ ${product.p_count} ${product.p_unit || 'ชิ้น'}, จองแล้ว ${reservedQty})` };
        }

        // Create part record (Reserve)
        const part = await prisma.tbl_maintenance_parts.create({
            data: {
                request_id: data.request_id,
                p_id: data.p_id,
                quantity: data.quantity,
                unit: product.p_unit,
                status: 'withdrawn', // Acts as 'reserved'
                withdrawn_by: data.withdrawn_by,
                notes: data.notes || null
            }
        });

        // NOTE: We DO NOT decrement stock here anymore. We just reserve it via the 'withdrawn' status.
        // Real stock deduction happens when status changes to 'used'.

        // Log history
        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: data.request_id,
                action: 'เบิกอะไหล่ (จอง)',
                new_value: `${product.p_name} x ${data.quantity} ${product.p_unit || 'ชิ้น'} (ย้ายไปคลังรอใช้)`,
                changed_by: data.withdrawn_by
            }
        });

        revalidatePath('/maintenance');
        revalidatePath('/products');

        const session = await auth();
        await logSystemAction(
            'WITHDRAW',
            'MaintenancePart',
            data.request_id,
            `Withdrew part: ${product.p_name} x ${data.quantity} for Request #${data.request_id}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || data.withdrawn_by,
            'unknown'
        );

        return { success: true, data: part };
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
            session?.user?.id ? parseInt(session.user.id) : 0,
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

        // Update part record
        const updatedPart = await prisma.tbl_maintenance_parts.update({
            where: { part_id: data.part_id },
            data: {
                returned_qty: newReturnedQty,
                returned_at: new Date(),
                status: isFullyReturned ? 'returned' : 'withdrawn'
            }
        });

        // NO stock increment here because we never decremented it on withdraw.
        // We just release the reservation (by changing status from 'withdrawn' to 'returned').

        // Log history (No stock movement log needed as stock count didn't change)
        /*
        await prisma.tbl_stock_movements.create({
            data: {
                p_id: part.p_id,
                username: data.returned_by,
                movement_type: 'maintenance_return',
                quantity: data.returned_qty, // Maybe 0 or omit?
                remarks: `คืนจากการซ่อม (Lift Reservation): Request #${part.request_id}`
            }
        });
        */

        // Log history
        const product = await prisma.tbl_products.findUnique({
            where: { p_id: part.p_id },
            select: { p_name: true, p_unit: true }
        });

        await prisma.tbl_maintenance_history.create({
            data: {
                request_id: part.request_id,
                action: 'คืนอะไหล่',
                new_value: `${product?.p_name || part.p_id} x ${data.returned_qty} ${product?.p_unit || 'ชิ้น'}`,
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
            `Returned part: ${part.p_id} x ${data.returned_qty}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || data.returned_by,
            'unknown'
        );

        return { success: true, data: updatedPart };
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
            where: { request_id, status: 'withdrawn' }
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
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || changed_by,
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error completing maintenance:', error);
        return { success: false, error: 'Failed to complete maintenance' };
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
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || performed_by,
            'unknown'
        );

        return { success: true, count: reservedParts.length };

    } catch (error) {
        console.error('Error clearing reserved parts:', error);
        return { success: false, error: 'Failed to clear reserved parts' };
    }
}
