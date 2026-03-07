'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { notifyApprovalEvent } from '@/lib/notifications/notificationManager';
import { validateData, createApprovalRequestSchema } from '@/lib/validation';

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

        const rawData = {
            request_type: data.request_type,
            reason: data.reason,
            amount: data.amount ? parseFloat(data.amount) : 0,
            reference_job: data.reference_job,
            start_time: data.start_time ? new Date(data.start_time) : null,
            end_time: data.end_time ? new Date(data.end_time) : null,
        };

        const validData = validateData(createApprovalRequestSchema, rawData, 'Approval');

        let prefix = 'REQ';
        if (validData.request_type === 'ot') prefix = 'OT';
        if (validData.request_type === 'leave') prefix = 'LV';
        if (validData.request_type === 'expense') prefix = 'EX';

        const request_number = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        // Find matching workflow
        const amountNum = data.amount ? parseFloat(data.amount) : 0;
        const matchingWorkflows = await prisma.tbl_approval_workflows.findMany({
            where: {
                request_type: data.request_type,
                active: true
            },
            include: { steps: true }
        });

        let matchedWorkflow = null;
        for (const wf of matchingWorkflows) {
            // Very simple condition matching
            if (!wf.condition_field) {
                // Default fallback if no better match is found later
                if (!matchedWorkflow) matchedWorkflow = wf;
            } else if (wf.condition_field === 'amount' && wf.condition_value) {
                const cv = parseFloat(wf.condition_value);
                if (wf.condition_op === '>' && amountNum > cv) matchedWorkflow = wf;
                else if (wf.condition_op === '<' && amountNum < cv) matchedWorkflow = wf;
                else if (wf.condition_op === '>=' && amountNum >= cv) matchedWorkflow = wf;
                else if (wf.condition_op === '<=' && amountNum <= cv) matchedWorkflow = wf;
            }
        }

        const newRequest = await prisma.tbl_approval_requests.create({
            data: {
                request_number,
                request_type: validData.request_type,
                requested_by: userId,
                request_date: data.request_date ? new Date(data.request_date) : null,
                start_time: validData.start_time,
                end_time: validData.end_time,
                amount: (validData.amount || 0) > 0 ? validData.amount : null,
                reason: validData.reason,
                reference_job: validData.reference_job || null,
                current_step: 1,
                total_steps: matchedWorkflow ? matchedWorkflow.total_steps : 1,
                workflow_id: matchedWorkflow ? matchedWorkflow.id : null
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

        const currentRequest = await prisma.tbl_approval_requests.findUnique({
            where: { request_id: requestId },
            include: { tbl_users: true }
        });

        if (!currentRequest) {
            return { success: false, error: 'Request not found' };
        }

        let newStatus = currentRequest.status;
        let nextStep = currentRequest.current_step;
        let finalAction = false; // Whether this action completes the request

        // Process step logic
        if (status === 'rejected') {
            newStatus = 'rejected';
            finalAction = true;
        } else if (status === 'approved') {
            if (currentRequest.current_step < currentRequest.total_steps) {
                // Advance step
                nextStep += 1;
                newStatus = 'pending'; // Still pending overall
            } else {
                // Final step
                newStatus = 'approved';
                finalAction = true;
            }
        }

        // Update the request
        const updateData: any = {
            status: newStatus,
            current_step: nextStep,
            rejection_reason: rejectionReason || currentRequest.rejection_reason
        };

        if (finalAction) {
            updateData.supervisor_id = userId; // The person who finalized it (or could just use logs)
            updateData.approved_at = status === 'approved' ? new Date() : null;
        }

        const updated = await prisma.tbl_approval_requests.update({
            where: { request_id: requestId },
            data: updateData,
            include: { tbl_users: true }
        });

        // Insert step log
        await prisma.tbl_approval_step_logs.create({
            data: {
                request_id: requestId,
                step_order: currentRequest.current_step,
                action: status,
                acted_by: userId,
                comment: rejectionReason || null
            }
        });

        // Notify
        if (finalAction) {
            // Notify requester of completion
            await sendLineNotification(updated, status);
        } else if (status === 'approved') {
            // Provide context that it advanced to next step (optional notification could go here)
            // await sendLineNotificationToNextApprover(updated);
        }

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
// ------------------------------------------------------------------
// Workflow Management Actions
// ------------------------------------------------------------------

export async function getApprovalWorkflows() {
    try {
        const session = await auth();
        if (session?.user?.role !== 'admin' && session?.user?.role !== 'manager') {
            return { success: false, error: 'Unauthorized' };
        }

        const workflows = await prisma.tbl_approval_workflows.findMany({
            include: {
                steps: {
                    orderBy: { step_order: 'asc' }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return { success: true, data: workflows };
    } catch (error: any) {
        console.error('Error fetching workflows:', error);
        return { success: false, error: error.message };
    }
}

export async function saveApprovalWorkflow(data: any) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'admin') {
            return { success: false, error: 'Unauthorized. Admin only.' };
        }

        // Validate basic payload
        if (!data.workflow_name || !data.request_type || !data.steps || data.steps.length === 0) {
            return { success: false, error: 'Invalid workflow data' };
        }

        const workflowData = {
            workflow_name: data.workflow_name,
            request_type: data.request_type,
            condition_field: data.condition_field || null,
            condition_op: data.condition_op || null,
            condition_value: data.condition_value || null,
            total_steps: data.steps.length,
            active: data.active !== undefined ? data.active : true,
        };

        let result;
        if (data.id) {
            // Update existing: update main table, delete old steps, insert new steps
            result = await prisma.$transaction(async (tx) => {
                const wf = await tx.tbl_approval_workflows.update({
                    where: { id: data.id },
                    data: workflowData
                });

                await tx.tbl_approval_workflow_steps.deleteMany({
                    where: { workflow_id: data.id }
                });

                const stepRecords = data.steps.map((s: any, idx: number) => ({
                    workflow_id: wf.id,
                    step_order: idx + 1,
                    approver_role: s.approver_role,
                    approver_id: s.approver_id ? parseInt(s.approver_id) : null
                }));

                await tx.tbl_approval_workflow_steps.createMany({
                    data: stepRecords
                });

                return wf;
            });
        } else {
            // Create new
            result = await prisma.tbl_approval_workflows.create({
                data: {
                    ...workflowData,
                    steps: {
                        create: data.steps.map((s: any, idx: number) => ({
                            step_order: idx + 1,
                            approver_role: s.approver_role,
                            approver_id: s.approver_id ? parseInt(s.approver_id) : null
                        }))
                    }
                }
            });
        }

        revalidatePath('/approvals/workflows');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error saving workflow:', error);
        return { success: false, error: error.message };
    }
}

export async function toggleWorkflowStatus(id: number, active: boolean) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        const updated = await prisma.tbl_approval_workflows.update({
            where: { id },
            data: { active }
        });

        revalidatePath('/approvals/workflows');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
