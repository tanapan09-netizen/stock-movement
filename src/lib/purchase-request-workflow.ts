export interface ApprovalWorkflowStepLike {
    step_order: number;
    approver_role?: string | null;
    approver_id?: number | null;
}

export const PURCHASE_REQUEST_APPROVAL_STEPS = [
    { step_order: 1, approver_role: 'purchasing', approver_id: null },
    { step_order: 2, approver_role: 'manager', approver_id: null },
    { step_order: 3, approver_role: 'accounting', approver_id: null },
    { step_order: 4, approver_role: 'purchasing', approver_id: null },
    { step_order: 5, approver_role: 'store', approver_id: null },
] as const;

export const PURCHASE_REQUEST_WORKFLOW_LABELS = [
    'ช่าง',
    'จัดซื้อ',
    'ผู้จัดการ',
    'บัญชี',
    'จัดซื้อออก PO',
    'Store',
] as const;

function normalizeWorkflowRole(role?: string | null) {
    return (role || '').trim().toLowerCase();
}

function matchesCanonicalPurchaseWorkflow(steps: ApprovalWorkflowStepLike[]) {
    if (steps.length !== PURCHASE_REQUEST_APPROVAL_STEPS.length) {
        return false;
    }

    return steps.every((step, index) => (
        step.step_order === PURCHASE_REQUEST_APPROVAL_STEPS[index].step_order &&
        normalizeWorkflowRole(step.approver_role) === PURCHASE_REQUEST_APPROVAL_STEPS[index].approver_role
    ));
}

export function getEffectiveApprovalWorkflowSteps(
    requestType?: string | null,
    workflowSteps: ApprovalWorkflowStepLike[] = [],
) {
    if (requestType !== 'purchase') {
        return workflowSteps;
    }

    if (matchesCanonicalPurchaseWorkflow(workflowSteps)) {
        return workflowSteps;
    }

    return PURCHASE_REQUEST_APPROVAL_STEPS.map((step) => ({ ...step }));
}

export function getEffectiveApprovalTotalSteps(
    requestType?: string | null,
    totalSteps?: number | null,
    workflowSteps: ApprovalWorkflowStepLike[] = [],
) {
    const effectiveSteps = getEffectiveApprovalWorkflowSteps(requestType, workflowSteps);
    const minimumSteps = requestType === 'purchase' ? PURCHASE_REQUEST_APPROVAL_STEPS.length : 1;

    return Math.max(
        Number(totalSteps || 0),
        effectiveSteps.length,
        minimumSteps,
    );
}

export function getCurrentApprovalWorkflowStep(
    requestType?: string | null,
    currentStep?: number | null,
    workflowSteps: ApprovalWorkflowStepLike[] = [],
) {
    if (!currentStep) {
        return null;
    }

    return getEffectiveApprovalWorkflowSteps(requestType, workflowSteps)
        .find((step) => step.step_order === currentStep) || null;
}

export function getPurchaseRequestDisplayStep(
    status?: string | null,
    currentStep?: number | null,
) {
    if (status === 'draft') {
        return 1;
    }

    if (status === 'returned') {
        return 1;
    }

    if (status === 'approved') {
        return PURCHASE_REQUEST_WORKFLOW_LABELS.length;
    }

    const approvalStep = Number(currentStep || 1);
    return Math.min(
        Math.max(approvalStep + 1, 1),
        PURCHASE_REQUEST_WORKFLOW_LABELS.length,
    );
}

export function getPurchaseRequestStageLabel(
    status?: string | null,
    currentStep?: number | null,
) {
    return PURCHASE_REQUEST_WORKFLOW_LABELS[getPurchaseRequestDisplayStep(status, currentStep) - 1] || '-';
}

export function isPurchaseRequestPurchasingStep(currentStep?: number | null) {
    return currentStep === 1 || currentStep === 4;
}
