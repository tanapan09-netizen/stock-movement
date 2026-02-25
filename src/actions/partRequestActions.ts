'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';
import { logSystemAction } from '@/lib/logger';
import { generatePurchaseRequestNumber } from '@/lib/requestUtils';

// ...

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

        // Phase 1: New Fields
        const request_type = formData.get('request_type') as string || 'standard';
        const category = formData.get('category') as string || null;

        // Generate Request Number if category is provided
        let request_number: string | null = null;
        if (category) {
            request_number = await generatePurchaseRequestNumber(category);
        }

        let quotation_file_path: string | null = null;

        // Handle file upload if provided
        if (quotation_file && quotation_file.size > 0) {
            try {
                quotation_file_path = await uploadFile(quotation_file, 'quotations');
            } catch (uploadError) {
                console.error('File upload error:', uploadError);
                // maintain behavior: if upload fails, just don't set the path? or fail?
                // Old code returned error.
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
                approval_notes: null,
                // Phase 1 Fields
                request_type,
                category,
                request_number,
                current_stage: 0 // Default to Supervisor/Purchasing approval
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

export async function approvePartRequest(
    request_id: number,
    action: 'approve' | 'reject',
    notes?: string
) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const user_name = session.user.name || 'Unknown';

        // Get current request
        const request = await prisma.tbl_part_requests.findUnique({
            where: { request_id }
        });

        if (!request) {
            return { success: false, error: 'Request not found' };
        }

        const currentStage = request.current_stage || 0;
        const data: any = {};

        if (action === 'reject') {
            data.status = 'rejected';
            data.rejected_by = user_name;
            data.rejected_at = new Date();
            data.rejection_reason = notes;
            data.approval_notes = notes ? (request.approval_notes ? `${request.approval_notes}\nRejected: ${notes}` : `Rejected: ${notes}`) : request.approval_notes;
        } else {
            // Approve Logic based on Stage
            // Stage 0: Supervisor -> 1
            // Stage 1: Accounting -> 2 (or 3 if under limit)
            // Stage 2: Manager -> 3 (Approved)

            if (currentStage === 0) {
                data.current_stage = 1;
                data.supervisor_approved_by = user_name;
                data.supervisor_approved_at = new Date();
                data.approval_notes = notes ? (request.approval_notes ? `${request.approval_notes}\nSupervisor: ${notes}` : `Supervisor: ${notes}`) : request.approval_notes;
            } else if (currentStage === 1) {
                data.accounting_approved_by = user_name;
                data.accounting_approved_at = new Date();
                data.approval_notes = notes ? (request.approval_notes ? `${request.approval_notes}\nAccounting: ${notes}` : `Accounting: ${notes}`) : request.approval_notes;

                // Check limit to see if we can bypass Manager
                const { getSystemSettings } = await import('@/actions/settingActions');
                const settingsRes = await getSystemSettings();
                const limit = settingsRes.success && settingsRes.data?.manager_approval_limit
                    ? parseFloat(settingsRes.data.manager_approval_limit)
                    : 5000;

                const price = request.estimated_price ? Number(request.estimated_price) : 0;

                if (price < limit) {
                    // Bypass Manager
                    data.current_stage = 3;
                    data.status = 'approved';
                    data.manager_approved_by = 'System (Under limit)';
                    data.manager_approved_at = new Date();
                    data.approval_notes = data.approval_notes
                        ? `${data.approval_notes}\nSystem: Auto-approved (Amount < ${limit})`
                        : `System: Auto-approved (Amount < ${limit})`;
                } else {
                    data.current_stage = 2;
                }
            } else if (currentStage === 2) {
                data.current_stage = 3;
                data.status = 'approved';
                data.manager_approved_by = user_name;
                data.manager_approved_at = new Date();
                data.approval_notes = notes ? (request.approval_notes ? `${request.approval_notes}\nManager: ${notes}` : `Manager: ${notes}`) : request.approval_notes;
            } else {
                return { success: false, error: 'Request is already completed' };
            }
        }

        const updatedRequest = await prisma.tbl_part_requests.update({
            where: { request_id },
            data
        });

        await logSystemAction(
            'UPDATE',
            'PartRequest',
            request_id,
            `${action === 'approve' ? 'Approved' : 'Rejected'} part request (Stage ${currentStage})`,
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        revalidatePath('/maintenance/part-requests');
        return { success: true, data: updatedRequest };

    } catch (error) {
        console.error('Error approving part request:', error);
        return { success: false, error: 'Failed to approve part request' };
    }
}
