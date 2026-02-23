'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { logSystemAction } from '@/lib/logger';

export async function getPartRequests(filters?: {
    status?: string;
    maintenance_id?: number;
}) {
    try {
        const where: Record<string, unknown> = {};
        if (filters?.status && filters.status !== 'all') {
            where.status = filters.status;
        }
        if (filters?.maintenance_id) {
            where.maintenance_id = filters.maintenance_id;
        }

        const requests = await prisma.tbl_part_requests.findMany({
            where,
            include: {
                tbl_maintenance_requests: {
                    select: {
                        request_number: true,
                        title: true,
                        tbl_rooms: { select: { room_code: true, room_name: true } }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return { success: true, data: requests };
    } catch (error) {
        console.error('Error fetching part requests:', error);
        return { success: false, error: 'Failed to fetch part requests' };
    }
}

export async function createPartRequest(formData: FormData) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Extract form data
        const maintenance_id = Number(formData.get('maintenance_id')) || null;
        const item_name = formData.get('item_name') as string;
        const description = formData.get('description') as string || null;
        const quantity = Number(formData.get('quantity'));
        const department = formData.get('department') as string || null;
        const date_needed = formData.get('date_needed') as string || null;
        const priority = formData.get('priority') as string || 'normal';
        const estimated_price = Number(formData.get('estimated_price')) || null;
        const supplier = formData.get('supplier') as string || null;
        const quotation_link = formData.get('quotation_link') as string || null;
        const quotation_file = formData.get('quotation_file') as File | null;

        let quotation_file_path: string | null = null;

        // Handle file upload if provided
        if (quotation_file && quotation_file.size > 0) {
            try {
                const bytes = await quotation_file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                // Create upload directory if it doesn't exist
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'quotations');
                await mkdir(uploadDir, { recursive: true });

                // Generate unique filename
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                const fileExtension = quotation_file.name.split('.').pop();
                const filename = `quotation-${uniqueSuffix}.${fileExtension}`;
                const filepath = path.join(uploadDir, filename);

                // Write file
                await writeFile(filepath, buffer);
                quotation_file_path = `/uploads/quotations/${filename}`;
            } catch (uploadError) {
                console.error('File upload error:', uploadError);
                return { success: false, error: 'Failed to upload file' };
            }
        }

        // Create part request in database
        const request = await prisma.tbl_part_requests.create({
            data: {
                maintenance_id,
                item_name,
                description,
                quantity,
                department,
                date_needed: date_needed ? new Date(date_needed) : null,
                priority,
                estimated_price,
                supplier,
                quotation_file: quotation_file_path,
                quotation_link,
                status: 'pending',
                requested_by: session.user.name || 'Unknown',
                approval_notes: null
            }
        });

        // Send notifications (non-blocking)
        try {
            const { notifyNewPartRequest } = await import('@/lib/notifications/notificationManager');
            await notifyNewPartRequest({
                request_id: request.request_id,
                item_name: request.item_name,
                quantity: request.quantity,
                description: request.description,
                priority: request.priority,
                estimated_price: request.estimated_price ? Number(request.estimated_price) : null,
                requested_by: request.requested_by,
                department: request.department,
                supplier: request.supplier,
                date_needed: request.date_needed,
                quotation_link: request.quotation_link,
                quotation_file: request.quotation_file,
            });
        } catch (notificationError) {
            // Log but don't fail the request
            console.error('[Part Request] Notification failed:', notificationError);
        }

        revalidatePath('/maintenance');
        revalidatePath('/maintenance/part-requests');

        await logSystemAction(
            'CREATE',
            'PartRequest',
            request.request_id,
            `Created part request: ${request.item_name} (Qty: ${request.quantity})`,
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        return { success: true, data: request };
    } catch (error) {
        console.error('Error creating part request:', error);
        return { success: false, error: 'Failed to create part request' };
    }
}

export async function updatePartRequestStatus(
    request_id: number,
    status: string
) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Get current request for notification
        const currentRequest = await prisma.tbl_part_requests.findUnique({
            where: { request_id },
            select: {
                status: true,
                item_name: true,
                requested_by: true,
            },
        });

        const oldStatus = currentRequest?.status || 'unknown';

        const request = await prisma.tbl_part_requests.update({
            where: { request_id },
            data: { status }
        });

        //Send status change notification (non-blocking)
        if (currentRequest && oldStatus !== status) {
            try {
                const { notifyStatusChange } = await import('@/lib/notifications/notificationManager');
                await notifyStatusChange(
                    {
                        item_name: currentRequest.item_name,
                        requested_by: currentRequest.requested_by,
                    },
                    oldStatus,
                    status
                );
            } catch (notificationError) {
                console.error('[Part Request] Status change notification failed:', notificationError);
            }
        }

        revalidatePath('/maintenance');
        revalidatePath('/maintenance/part-requests');

        await logSystemAction(
            'UPDATE',
            'PartRequest',
            request_id,
            `Updated status to ${status} for item: ${currentRequest?.item_name}`,
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        return { success: true, data: request };
    } catch (error) {
        console.error('Error updating part request:', error);
        return { success: false, error: 'Failed to update part request' };
    }
}

export async function deletePartRequest(request_id: number) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Get details before delete for logging
        const request = await prisma.tbl_part_requests.findUnique({
            where: { request_id },
            select: { item_name: true }
        });

        await prisma.tbl_part_requests.delete({
            where: { request_id }
        });

        await logSystemAction(
            'DELETE',
            'PartRequest',
            request_id,
            `Deleted part request: ${request?.item_name}`,
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        revalidatePath('/maintenance');
        revalidatePath('/maintenance/part-requests');
        return { success: true };
    } catch (error) {
        console.error('Error deleting part request:', error);
        return { success: false, error: 'Failed to delete part request' };
    }
}
