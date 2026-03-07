'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { notifyApprovalEvent } from '@/lib/notifications/notificationManager';

export async function createApprovalRequest(data: any) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const userId = parseInt(session.user.id as string) || 0;

        // Ensure request number is unique
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.tbl_approval_requests.count({
            where: { request_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        });

        let prefix = 'REQ';
        if (data.request_type === 'ot') prefix = 'OT';
        if (data.request_type === 'leave') prefix = 'LV';
        if (data.request_type === 'expense') prefix = 'EX';

        const request_number = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        const newRequest = await prisma.tbl_approval_requests.create({
            data: {
                request_number,
                request_type: data.request_type,
                requested_by: userId,
                request_date: data.request_date ? new Date(data.request_date) : null,
                start_time: data.start_time ? new Date(data.start_time) : null,
                end_time: data.end_time ? new Date(data.end_time) : null,
                amount: data.amount ? parseFloat(data.amount) : null,
                reason: data.reason,
                reference_job: data.reference_job || null,
            },
            include: {
                tbl_users: true // To get requester details for line notification
            }
        });

        // Send line notification to approvers/managers
        await sendLineNotification(newRequest, 'pending');

        revalidatePath('/approvals');
        return { success: true, data: newRequest };
    } catch (error: any) {
        console.error('Error creating approval request:', error);
        return { success: false, error: error.message };
    }
}

export async function getApprovalRequests() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const userId = parseInt(session.user.id as string) || 0;
        const role = session.user.role?.toLowerCase() || '';
        const isApprover = session.user.is_approver;

        let whereClause = {};

        // If not manager, admin, or approver -> only see own requests
        if (role !== 'admin' && role !== 'manager' && !isApprover) {
            whereClause = { requested_by: userId };
        }

        const requests = await prisma.tbl_approval_requests.findMany({
            where: whereClause,
            include: {
                tbl_users: {
                    select: { username: true, p_id: true }
                },
                tbl_approver: {
                    select: { username: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return { success: true, data: requests };
    } catch (error: any) {
        console.error('Error fetching approval requests:', error);
        return { success: false, error: error.message };
    }
}

export async function updateApprovalStatus(requestId: number, status: 'approved' | 'rejected', rejectionReason?: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const userId = parseInt(session.user.id as string) || 0;
        const role = session.user.role?.toLowerCase() || '';
        const isApprover = session.user.is_approver;

        if (role !== 'admin' && role !== 'manager' && !isApprover) {
            return { success: false, error: 'Permission denied' };
        }

        const updated = await prisma.tbl_approval_requests.update({
            where: { request_id: requestId },
            data: {
                status,
                supervisor_id: userId,
                approved_at: new Date(),
                rejection_reason: rejectionReason || null
            },
            include: {
                tbl_users: true
            }
        });

        // Send line notification back to requester
        await sendLineNotification(updated, status);

        revalidatePath('/approvals');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Error updating approval status:', error);
        return { success: false, error: error.message };
    }
}

async function sendLineNotification(request: any, action: 'pending' | 'approved' | 'rejected') {
    try {
        const requesterName = request.tbl_users?.username || 'พนักงาน';

        await notifyApprovalEvent({
            eventType: action,
            request_number: request.request_number,
            request_type: request.request_type,
            requested_by: requesterName,
            requester_line_id: request.tbl_users?.line_user_id || null,
            reason: request.reason || '',
            amount: request.amount,
            start_time: request.start_time,
            end_time: request.end_time,
            reference_job: request.reference_job,
            rejection_reason: request.rejection_reason,
        });
    } catch (e) {
        console.error('Failed to send line notification for approval', e);
    }
}
