'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';
import { logSystemAction } from '@/lib/logger';
import { generatePurchaseRequestNumber } from '@/lib/requestUtils';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import {
    canApprovePartRequestStage,
    canCreatePartRequest,
    canDeletePartRequest,
    canDirectManageMaintenanceStock,
    canUpdatePartRequestStatus,
} from '@/lib/rbac';

// ...

async function getPartRequestAuthContext() {
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

export async function getPartRequests(filters?: {
    status?: string;
    maintenance_id?: number;
    request_type?: string;
    exclude_request_types?: string[];
}) {
    try {
        const where: Record<string, unknown> = {};
        if (filters?.status && filters.status !== 'all') {
            where.status = filters.status;
        }
        if (filters?.maintenance_id) {
            where.maintenance_id = filters.maintenance_id;
        }
        if (filters?.request_type) {
            where.request_type = filters.request_type;
        }
        if (filters?.exclude_request_types?.length) {
            where.request_type = {
                notIn: filters.exclude_request_types,
            };
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
        const authContext = await getPartRequestAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canCreatePartRequest(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
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
                requested_by: authContext.session.user.name || 'Unknown',
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
        revalidatePath('/maintenance/parts');
        revalidatePath('/maintenance/part-requests');

        await logSystemAction(
            'CREATE',
            'PartRequest',
            request.request_id,
            `Created part request: ${request.item_name} (Qty: ${request.quantity})`,
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
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
        const authContext = await getPartRequestAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canUpdatePartRequestStatus(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

        // Get current request for notification
        const currentRequest = await prisma.tbl_part_requests.findUnique({
            where: { request_id },
            select: {
                status: true,
                item_name: true,
                requested_by: true,
                quantity: true,
                maintenance_id: true,
                request_type: true,
                quotation_link: true,
            },
        });

        const oldStatus = currentRequest?.status || 'unknown';

        if (
            currentRequest?.request_type === 'maintenance_withdrawal' &&
            oldStatus !== status &&
            ['approved', 'rejected'].includes(status) &&
            !canDirectManageMaintenanceStock(
                authContext.role,
                authContext.permissions,
            )
        ) {
            return { success: false, error: 'Only store can confirm maintenance part availability' };
        }

        if (
            currentRequest
            && oldStatus !== status
            && status === 'approved'
            && currentRequest.request_type === 'maintenance_withdrawal'
        ) {
            const maintenanceProductId = (currentRequest.quotation_link || '').startsWith('maintenance-withdraw://')
                ? decodeURIComponent((currentRequest.quotation_link || '').replace('maintenance-withdraw://', ''))
                : '';

            if (!currentRequest.maintenance_id || !maintenanceProductId) {
                return { success: false, error: 'Maintenance withdrawal request metadata is incomplete' };
            }

            const { withdrawPartForMaintenance } = await import('@/actions/maintenanceActions');
            const withdrawResult = await withdrawPartForMaintenance({
                request_id: currentRequest.maintenance_id,
                p_id: maintenanceProductId,
                quantity: currentRequest.quantity,
                withdrawn_by: authContext.session.user.name || 'System',
                notes: `Confirmed by store: ${authContext.session.user.name || 'System'}`
            });

            if (!withdrawResult.success) {
                return { success: false, error: withdrawResult.error || 'Failed to confirm maintenance part withdrawal' };
            }
        }

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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
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
        const authContext = await getPartRequestAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        if (!canDeletePartRequest(
            authContext.role,
            authContext.permissions,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
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
        const authContext = await getPartRequestAuthContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const user_name = authContext.session.user.name || 'Unknown';

        // Get current request
        const request = await prisma.tbl_part_requests.findUnique({
            where: { request_id }
        });

        if (!request) {
            return { success: false, error: 'Request not found' };
        }

        const currentStage = request.current_stage || 0;
        if (!canApprovePartRequestStage(
            authContext.role,
            authContext.permissions,
            currentStage,
            authContext.isApprover,
        )) {
            return { success: false, error: 'Permission denied' };
        }

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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
            'unknown'
        );

        revalidatePath('/maintenance/part-requests');
        return { success: true, data: updatedRequest };

    } catch (error) {
        console.error('Error approving part request:', error);
        return { success: false, error: 'Failed to approve part request' };
    }
}
