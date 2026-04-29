'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { uploadFile } from '@/lib/gcs';
import { logSystemAction } from '@/lib/logger';
import { generatePurchaseRequestNumber } from '@/lib/requestUtils';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import type { Prisma } from '@prisma/client';
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

function parsePurchaseReasonItems(reason: string | null | undefined) {
    const raw = reason || '';
    const items: Array<{ item_name: string; quantity: number; description: string | null }> = [];

    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!/^\d+\./.test(trimmed)) continue;

        const cleaned = trimmed
            .replace(/^\d+\.\s*/, '')
            .replace(/^\[(?:NON[-_\s]?STOCK|STOCK)\]\s*/i, '')
            .trim();
        const match = cleaned.match(/^(.*)\s-\s([\d.]+)\s+(.+?)\s@\s[^\d]*([\d,]+(?:\.\d+)?)/);

        if (match) {
            items.push({
                item_name: match[1].trim(),
                quantity: Math.max(1, Math.trunc(Number(match[2]) || 1)),
                description: cleaned,
            });
            continue;
        }

        items.push({
            item_name: cleaned,
            quantity: 1,
            description: cleaned,
        });
    }

    return items;
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

        const purchaseRequestWhere: Prisma.tbl_approval_requestsWhereInput = {
            request_type: 'purchase',
            reference_job: {
                not: null,
            },
            NOT: {
                reference_job: '',
            },
        };

        if (filters?.status && filters.status !== 'all') {
            purchaseRequestWhere.status = filters.status;
        }

        if (filters?.maintenance_id) {
            const linkedMaintenance = await prisma.tbl_maintenance_requests.findUnique({
                where: { request_id: filters.maintenance_id },
                select: { request_number: true },
            });

            if (!linkedMaintenance?.request_number) {
                return { success: true, data: requests };
            }

            purchaseRequestWhere.reference_job = linkedMaintenance.request_number;
        }

        const purchaseRequests = await prisma.tbl_approval_requests.findMany({
            where: purchaseRequestWhere,
            include: {
                tbl_users: {
                    select: {
                        username: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        const referenceJobs = purchaseRequests
            .map((request) => (request.reference_job || '').trim())
            .filter(Boolean);

        const maintenanceRequests = referenceJobs.length > 0
            ? await prisma.tbl_maintenance_requests.findMany({
                where: { request_number: { in: referenceJobs } },
                include: {
                    tbl_rooms: { select: { room_code: true, room_name: true } },
                },
            })
            : [];

        const maintenanceByRequestNumber = new Map(
            maintenanceRequests.map((maintenance) => [maintenance.request_number, maintenance]),
        );

        const purchaseRows = purchaseRequests.flatMap((request) => {
            const parsedItems = parsePurchaseReasonItems(request.reason);
            const items = parsedItems.length > 0
                ? parsedItems
                : [{
                    item_name: request.request_number || 'Purchase Request',
                    quantity: 1,
                    description: request.reason || null,
                }];
            const linkedMaintenance = request.reference_job
                ? maintenanceByRequestNumber.get(request.reference_job.trim())
                : null;

            return items.map((item, index) => ({
                // Keep synthetic IDs negative so they never collide with tbl_part_requests primary keys.
                request_id: -1 * (request.request_id * 1000 + index + 1),
                purchase_request_id: request.request_id,
                maintenance_id: linkedMaintenance?.request_id || null,
                item_name: item.item_name,
                description: item.description,
                quantity: item.quantity,
                status: request.status || 'pending',
                requested_by: request.tbl_users?.username || 'Unknown',
                department: 'purchasing',
                date_needed: null,
                priority: 'normal',
                estimated_price: request.amount ? Number(request.amount) : null,
                supplier: null,
                quotation_file: null,
                quotation_link: null,
                approval_notes: null,
                created_at: request.created_at,
                request_type: 'purchase_reference',
                category: null,
                request_number: request.request_number,
                current_stage: request.current_step || 0,
                source_type: 'purchase_request',
                tbl_maintenance_requests: linkedMaintenance
                    ? {
                        request_number: linkedMaintenance.request_number,
                        title: linkedMaintenance.title,
                        tbl_rooms: linkedMaintenance.tbl_rooms
                            ? {
                                room_code: linkedMaintenance.tbl_rooms.room_code,
                                room_name: linkedMaintenance.tbl_rooms.room_name,
                            }
                            : null,
                    }
                    : null,
            }));
        });

        const merged = [...requests, ...purchaseRows].sort((a, b) => (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));

        return { success: true, data: merged };
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
                tbl_maintenance_requests: {
                    select: {
                        request_number: true,
                        assigned_to: true,
                        tbl_rooms: {
                            select: {
                                room_code: true,
                                room_name: true,
                            },
                        },
                    },
                },
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
                const {
                    notifyMaintenanceWithdrawalRequesterStatusChange,
                    notifyStatusChange,
                } = await import('@/lib/notifications/notificationManager');
                await notifyStatusChange(
                    {
                        item_name: currentRequest.item_name,
                        requested_by: currentRequest.requested_by,
                    },
                    oldStatus,
                    status
                );

                if (
                    currentRequest.request_type === 'maintenance_withdrawal' &&
                    (status === 'approved' || status === 'rejected')
                ) {
                    await notifyMaintenanceWithdrawalRequesterStatusChange({
                        item_name: currentRequest.item_name,
                        quantity: currentRequest.quantity,
                        requested_by: currentRequest.requested_by,
                        status,
                        decided_by: authContext.session.user.name || 'System',
                        maintenance_request_number: currentRequest.tbl_maintenance_requests?.request_number || null,
                        fallback_technician_name: currentRequest.tbl_maintenance_requests?.assigned_to || null,
                        room_code: currentRequest.tbl_maintenance_requests?.tbl_rooms?.room_code || null,
                        room_name: currentRequest.tbl_maintenance_requests?.tbl_rooms?.room_name || null,
                    });
                }
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

        const data: Prisma.tbl_part_requestsUpdateInput = {};

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
