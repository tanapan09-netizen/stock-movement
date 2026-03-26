'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
    canAccessDashboardPage,
    canApproveApprovalRequest,
    canEditPurchaseRequestRecord,
    canViewApprovalQueue,
} from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { notifyApprovalEventFlex } from '@/lib/notifications/notificationManager';
import {
    createApprovalDecisionFlexMessage,
    createApprovalNextStepFlexMessage,
    sendMulticastMessage,
} from '@/lib/notifications/lineMessaging';
import { COMMON_ACTION_MESSAGES } from '@/lib/action-messages';
import { validateData, createApprovalRequestSchema } from '@/lib/validation';
import { resolveAuthenticatedUserId } from '@/lib/server/auth-user';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

type ApprovalAction = 'pending' | 'approved' | 'rejected';

interface CreateApprovalRequestInput {
    request_type: string;
    request_date?: string | Date | null;
    start_time?: string | Date | null;
    end_time?: string | Date | null;
    amount?: string | number | null;
    reason: string;
    reference_job?: string | null;
}

interface UpdatePurchaseRequestInput {
    requestId: number;
    request_date?: string | Date | null;
    amount?: string | number | null;
    reason: string;
    reference_job?: string | null;
}

interface ApprovalNotificationRequest {
    request_number: string;
    request_type: string;
    reason?: string | null;
    amount?: unknown;
    start_time?: Date | string | null;
    end_time?: Date | string | null;
    reference_job?: string | null;
    rejection_reason?: string | null;
    tbl_users?: {
        username?: string | null;
        line_user_id?: string | null;
    } | null;
}

interface SaveWorkflowStepInput {
    approver_role: string;
    approver_id?: string | number | null;
}

interface SaveApprovalWorkflowInput {
    id?: number;
    workflow_name: string;
    request_type: string;
    condition_field?: string | null;
    condition_op?: string | null;
    condition_value?: string | null;
    active?: boolean;
    steps: SaveWorkflowStepInput[];
}

interface WorkflowStepNotificationInput {
    approver_role?: string | null;
    approver_id?: number | null;
}

type ApprovalRequestWorkflowLike = {
    request_type?: string | null;
    total_steps?: number | null;
    workflow?: {
        steps?: Array<{
            step_order: number;
            approver_role?: string | null;
            approver_id?: number | null;
        }>;
    } | null;
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return COMMON_ACTION_MESSAGES.unexpectedError;
}

function toIntOrNull(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isFinite(n) ? n : null;
}

function toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}

function toDateOrNull(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getApprovalTypeLabel(requestType: string): string {
    const typeMap: Record<string, string> = {
        ot: 'OT',
        leave: 'ลา',
        expense: 'เบิกค่าใช้จ่าย',
        purchase: 'จัดซื้อ',
        other: 'อื่นๆ',
    };
    return typeMap[requestType] || 'Approval';
}

function getAppBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

const APPROVAL_USER_LINK_ERROR = 'บัญชีผู้ใช้นี้ยังไม่ได้ผูกกับข้อมูลพนักงานในระบบ กรุณาติดต่อผู้ดูแลระบบ';
const DEFAULT_PURCHASE_APPROVAL_STEPS = [
    { step_order: 1, approver_role: 'purchasing', approver_id: null },
    { step_order: 2, approver_role: 'manager', approver_id: null },
];

function getEffectiveWorkflowSteps(request: ApprovalRequestWorkflowLike) {
    const workflowSteps = request.workflow?.steps || [];
    if (workflowSteps.length > 0) {
        return workflowSteps;
    }

    if (request.request_type === 'purchase') {
        return DEFAULT_PURCHASE_APPROVAL_STEPS;
    }

    return [];
}

function getEffectiveWorkflowStep(request: ApprovalRequestWorkflowLike, stepOrder: number) {
    return getEffectiveWorkflowSteps(request).find((step) => step.step_order === stepOrder) || null;
}

function getEffectiveTotalSteps(request: ApprovalRequestWorkflowLike) {
    return Math.max(
        Number(request.total_steps || 0),
        getEffectiveWorkflowSteps(request).length,
        request.request_type === 'purchase' ? 2 : 1,
    );
}

async function notifyPurchasingDecision(
    request: ApprovalNotificationRequest,
    status: 'approved' | 'rejected',
) {
    try {
        if (process.env.LINE_MESSAGING_ENABLED === 'false') return;

        const { getLineIdsByRoles } = await import('@/actions/lineUserActions');
        const recipientIds = await getLineIdsByRoles(['purchasing', 'leader_purchasing']);
        if (recipientIds.length === 0) return;

        const requesterName = request.tbl_users?.username || COMMON_ACTION_MESSAGES.unknownUser;
        await sendMulticastMessage(
            [...new Set(recipientIds)],
            createApprovalDecisionFlexMessage({
                requestNumber: request.request_number,
                requestType: getApprovalTypeLabel(request.request_type),
                requesterName,
                status,
                rejectionReason: request.rejection_reason,
                href: `${getAppBaseUrl()}/purchase-request/manage`,
            })
        );
    } catch (error) {
        console.error('Failed to notify purchasing team of approval result', error);
    }
}

async function sendApprovalRecipientsNotification(
    request: ApprovalNotificationRequest,
    status: 'approved' | 'rejected'
) {
    try {
        if (process.env.LINE_MESSAGING_ENABLED === 'false') return;

        const { getApprovalRecipientLineIds } = await import('@/actions/lineUserActions');
        const recipientIds = await getApprovalRecipientLineIds(request.request_type);

        if (recipientIds.length === 0) return;

        const requesterName = request.tbl_users?.username || COMMON_ACTION_MESSAGES.unknownUser;
        await sendMulticastMessage(
            recipientIds,
            createApprovalDecisionFlexMessage({
                requestNumber: request.request_number,
                requestType: getApprovalTypeLabel(request.request_type),
                requesterName,
                status,
                rejectionReason: request.rejection_reason,
                href: `${getAppBaseUrl()}/approvals`,
            })
        );
    } catch (error) {
        console.error('Failed to notify related approval recipients', error);
    }
}

async function sendNextApprovalStepNotification(
    request: ApprovalNotificationRequest & { total_steps?: number | null },
    nextStep: WorkflowStepNotificationInput,
    stepNumber: number
) {
    try {
        if (process.env.LINE_MESSAGING_ENABLED === 'false') return;

        const { getApprovalStepLineIds, getLineIdsByRoles } = await import('@/actions/lineUserActions');

        let recipientIds: string[] = [];

        if (nextStep.approver_id) {
            const approver = await prisma.tbl_users.findUnique({
                where: { p_id: nextStep.approver_id },
                select: { line_user_id: true },
            });
            if (approver?.line_user_id) {
                recipientIds.push(approver.line_user_id);
            }
        }

        if (recipientIds.length === 0 && nextStep.approver_role) {
            const normalizedRole = nextStep.approver_role.trim().toLowerCase();
            if (request.request_type === 'purchase' && (normalizedRole === 'manager' || normalizedRole === 'any_manager')) {
                recipientIds = await getLineIdsByRoles(['manager']);
            } else if (request.request_type === 'purchase' && normalizedRole === 'purchasing') {
                recipientIds = await getLineIdsByRoles(['purchasing', 'leader_purchasing']);
            } else {
                recipientIds = await getApprovalStepLineIds(nextStep.approver_role);
            }
        }

        recipientIds = [...new Set(recipientIds)];
        if (recipientIds.length === 0) return;

        const requesterName = request.tbl_users?.username || COMMON_ACTION_MESSAGES.unknownUser;
        await sendMulticastMessage(
            recipientIds,
            createApprovalNextStepFlexMessage({
                requestNumber: request.request_number,
                requestType: getApprovalTypeLabel(request.request_type),
                requesterName,
                stepNumber,
                totalSteps: Number(request.total_steps || stepNumber),
                detail: request.reason || null,
                amount: request.amount === null || request.amount === undefined ? null : Number(request.amount),
                href: `${getAppBaseUrl()}/approvals/manage`,
            })
        );
    } catch (error) {
        console.error('Failed to notify next approval step', error);
    }
}

export async function createApprovalRequest(data: CreateApprovalRequestInput) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const userId = await resolveAuthenticatedUserId(session.user);
        if (!userId) {
            return { success: false, error: APPROVAL_USER_LINK_ERROR };
        }

        // Ensure request number is unique
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.tbl_approval_requests.count({
            where: { request_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        });

        const rawData = {
            request_type: data.request_type,
            reason: data.reason,
            amount: toNumber(data.amount),
            reference_job: data.reference_job,
            start_time: data.start_time ? new Date(data.start_time) : null,
            end_time: data.end_time ? new Date(data.end_time) : null,
        };

        const validData = validateData(createApprovalRequestSchema, rawData, 'Approval');

        let prefix = 'REQ';
        if (validData.request_type === 'ot') prefix = 'OT';
        if (validData.request_type === 'leave') prefix = 'LV';
        if (validData.request_type === 'expense') prefix = 'EX';
        if (validData.request_type === 'purchase') prefix = 'PR';

        const request_number = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        // Find matching workflow
        const amountNum = toNumber(data.amount);
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

        const effectiveTotalSteps = getEffectiveTotalSteps({
            request_type: validData.request_type,
            total_steps: matchedWorkflow?.total_steps ?? null,
            workflow: matchedWorkflow ? { steps: matchedWorkflow.steps } : null,
        });

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
                total_steps: effectiveTotalSteps,
                workflow_id: matchedWorkflow ? matchedWorkflow.id : null
            },
            include: {
                tbl_users: true, // To get requester details for line notification
                tbl_approver: {
                    select: { username: true }
                }
            }
        });

        // Send line notification to approvers/managers
        await sendLineNotification(newRequest, 'pending');

        revalidatePath('/approvals');
        return { success: true, data: newRequest };
    } catch (error: unknown) {
        console.error('Error creating approval request:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function getApprovalRequests() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const userId = await resolveAuthenticatedUserId(session.user);
        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

        let whereClause: Prisma.tbl_approval_requestsWhereInput = {};

        if (!canViewApprovalQueue(
            permissionContext.role,
            permissionContext.permissions,
            permissionContext.isApprover,
        )) {
            if (!userId) {
                return { success: false, error: APPROVAL_USER_LINK_ERROR };
            }
            whereClause = { requested_by: userId };
        } else if (!canAccessDashboardPage(
            permissionContext.role,
            permissionContext.permissions,
            '/approvals/manage',
            { isApprover: permissionContext.isApprover },
        )) {
            if (!userId) {
                return { success: false, error: APPROVAL_USER_LINK_ERROR };
            }
            whereClause = {
                OR: [
                    { requested_by: userId },
                    { request_type: 'purchase' },
                ],
            };
        }

        const requests = await prisma.tbl_approval_requests.findMany({
            where: whereClause,
            include: {
                tbl_users: {
                    select: { username: true, p_id: true }
                },
                tbl_approver: {
                    select: { username: true }
                },
                workflow: {
                    include: { steps: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        const dataWithPermissions = requests.map(req => {
            const currentStep = getEffectiveWorkflowStep(req, req.current_step);
            const canApprove = canApproveApprovalRequest(
                permissionContext.role,
                permissionContext.permissions,
                {
                    currentUserId: userId ?? -1,
                    requestType: req.request_type,
                    workflowStep: currentStep,
                    isApprover: permissionContext.isApprover,
                },
            );

            return {
                ...req,
                can_approve: canApprove
            };
        });

        return { success: true, data: dataWithPermissions };
    } catch (error: unknown) {
        console.error('Error fetching approval requests:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updatePurchaseRequest(data: UpdatePurchaseRequestInput) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const userId = await resolveAuthenticatedUserId(session.user);
        if (!userId) {
            return { success: false, error: APPROVAL_USER_LINK_ERROR };
        }
        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

        const existing = await prisma.tbl_approval_requests.findUnique({
            where: { request_id: data.requestId },
        });

        if (!existing || existing.request_type !== 'purchase') {
            return { success: false, error: 'Purchase request not found' };
        }

        const canEdit = canEditPurchaseRequestRecord(
            permissionContext.role,
            permissionContext.permissions,
            {
                currentUserId: userId,
                requestedBy: existing.requested_by,
            },
        );
        if (!canEdit) {
            return { success: false, error: 'Permission denied' };
        }

        if (existing.status !== 'pending') {
            return { success: false, error: 'Only pending purchase requests can be edited' };
        }

        const rawData = {
            request_type: 'purchase',
            reason: data.reason,
            amount: toNumber(data.amount),
            reference_job: data.reference_job,
            start_time: null,
            end_time: null,
        };

        const validData = validateData(createApprovalRequestSchema, rawData, 'PurchaseRequestUpdate');

        const updated = await prisma.tbl_approval_requests.update({
            where: { request_id: data.requestId },
            data: {
                request_date: data.request_date ? new Date(data.request_date) : existing.request_date,
                amount: (validData.amount || 0) > 0 ? validData.amount : null,
                reason: validData.reason,
                reference_job: validData.reference_job || null,
            },
            include: {
                tbl_users: {
                    select: { username: true, p_id: true },
                },
                tbl_approver: {
                    select: { username: true },
                },
            },
        });

        revalidatePath('/purchase-request');
        revalidatePath('/purchase-request/manage');
        revalidatePath('/approvals');
        revalidatePath(`/print/purchase-request/${data.requestId}`);
        return { success: true, data: updated };
    } catch (error: unknown) {
        console.error('Error updating purchase request:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function updateApprovalStatus(requestId: number, status: 'approved' | 'rejected', rejectionReason?: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const userId = await resolveAuthenticatedUserId(session.user);
        if (!userId) {
            return { success: false, error: APPROVAL_USER_LINK_ERROR };
        }
        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

        const currentRequest = await prisma.tbl_approval_requests.findUnique({
            where: { request_id: requestId },
            include: { 
                tbl_users: true,
                workflow: {
                    include: { steps: true }
                }
            }
        });

        if (!currentRequest) {
            return { success: false, error: 'Request not found' };
        }

        const currentStep = getEffectiveWorkflowStep(currentRequest, currentRequest.current_step);
        const canApprove = canApproveApprovalRequest(
            permissionContext.role,
            permissionContext.permissions,
            {
                currentUserId: userId,
                requestType: currentRequest.request_type,
                workflowStep: currentStep,
                isApprover: permissionContext.isApprover,
            },
        );

        if (!canApprove) {
            return { success: false, error: 'Permission denied' };
        }

        let newStatus = currentRequest.status;
        let nextStep = currentRequest.current_step;
        let finalAction = false; // Whether this action completes the request
        const effectiveTotalSteps = getEffectiveTotalSteps(currentRequest);

        // Process step logic
        if (status === 'rejected') {
            newStatus = 'rejected';
            finalAction = true;
        } else if (status === 'approved') {
            if (currentRequest.current_step < effectiveTotalSteps) {
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
        const updateData: Prisma.tbl_approval_requestsUncheckedUpdateInput = {
            status: newStatus,
            current_step: nextStep,
            total_steps: effectiveTotalSteps,
            rejection_reason: rejectionReason || currentRequest.rejection_reason
        };

        if (finalAction) {
            updateData.supervisor_id = userId; // The person who finalized it (or could just use logs)
            updateData.approved_at = status === 'approved' ? new Date() : null;
        }

        const updated = await prisma.tbl_approval_requests.update({
            where: { request_id: requestId },
            data: updateData,
            include: {
                tbl_users: true,
                tbl_approver: {
                    select: { username: true }
                }
            }
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
            if (currentRequest.request_type === 'purchase' && currentStep?.approver_role?.trim().toLowerCase() === 'manager') {
                await notifyPurchasingDecision(updated, status);
            } else {
                await sendApprovalRecipientsNotification(updated, status);
            }
        } else if (status === 'approved') {
            const nextWorkflowStep = getEffectiveWorkflowStep(currentRequest, nextStep);
            if (nextWorkflowStep) {
                await sendNextApprovalStepNotification(currentRequest, nextWorkflowStep, nextStep);
            }
        }

        revalidatePath('/approvals');
        revalidatePath('/approvals/purchasing');
        revalidatePath('/purchase-request/manage');
        return { success: true, data: updated };
    } catch (error: unknown) {
        console.error('Error updating approval status:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

async function sendLineNotification(request: ApprovalNotificationRequest, action: ApprovalAction) {
    try {
        const requesterName = request.tbl_users?.username || 'พนักงาน';

        await notifyApprovalEventFlex({
            eventType: action,
            request_number: request.request_number,
            request_type: request.request_type,
            requested_by: requesterName,
            requester_line_id: request.tbl_users?.line_user_id || null,
            reason: request.reason || '',
            amount: request.amount === null || request.amount === undefined ? null : Number(request.amount),
            start_time: toDateOrNull(request.start_time),
            end_time: toDateOrNull(request.end_time),
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
        if (!session?.user) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
        if (!canAccessDashboardPage(
            permissionContext.role,
            permissionContext.permissions,
            '/approvals/workflows',
            { isApprover: permissionContext.isApprover, level: 'edit' },
        )) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
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
    } catch (error: unknown) {
        console.error('Error fetching workflows:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function saveApprovalWorkflow(data: SaveApprovalWorkflowInput) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
        if (!canAccessDashboardPage(
            permissionContext.role,
            permissionContext.permissions,
            '/approvals/workflows',
            { isApprover: permissionContext.isApprover, level: 'edit' },
        )) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
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

                const stepRecords = data.steps.map((s: SaveWorkflowStepInput, idx: number) => ({
                    workflow_id: wf.id,
                    step_order: idx + 1,
                    approver_role: s.approver_role,
                    approver_id: toIntOrNull(s.approver_id)
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
                        create: data.steps.map((s: SaveWorkflowStepInput, idx: number) => ({
                            step_order: idx + 1,
                            approver_role: s.approver_role,
                            approver_id: toIntOrNull(s.approver_id)
                        }))
                    }
                }
            });
        }

        revalidatePath('/approvals/workflows');
        return { success: true, data: result };
    } catch (error: unknown) {
        console.error('Error saving workflow:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function toggleWorkflowStatus(id: number, active: boolean) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
        if (!canAccessDashboardPage(
            permissionContext.role,
            permissionContext.permissions,
            '/approvals/workflows',
            { isApprover: permissionContext.isApprover, level: 'edit' },
        )) {
            return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        }

        const updated = await prisma.tbl_approval_workflows.update({
            where: { id },
            data: { active }
        });

        revalidatePath('/approvals/workflows');
        return { success: true, data: updated };
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) };
    }
}
