export const MAINTENANCE_WORKFLOW_LABELS = [
    'รอเรื่อง',
    'แจ้งเรื่องต่อ',
    'ดำเนินการ',
    'รอหัวหน้าช่างตรวจรับ',
    'ปิดงานแล้ว',
] as const;

export type MaintenanceWorkflowStatus =
    | 'pending'
    | 'approved'
    | 'in_progress'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'verified';

export type MaintenanceWorkflowTransitionContext = {
    canApproveCompletion?: boolean;
};

const DEFAULT_MAINTENANCE_TRANSITIONS: Record<MaintenanceWorkflowStatus, MaintenanceWorkflowStatus[]> = {
    pending: ['approved'],
    approved: ['in_progress'],
    in_progress: ['confirmed'],
    confirmed: [],
    completed: [],
    cancelled: [],
    verified: [],
};

export function normalizeMaintenanceWorkflowStatus(status?: string | null): MaintenanceWorkflowStatus | null {
    const normalized = (status || '').trim().toLowerCase();

    switch (normalized) {
        case 'pending':
        case 'approved':
        case 'in_progress':
        case 'confirmed':
        case 'completed':
        case 'cancelled':
        case 'verified':
            return normalized;
        default:
            return null;
    }
}

export function getAllowedMaintenanceTransitions(
    status?: string | null,
    context: MaintenanceWorkflowTransitionContext = {},
): MaintenanceWorkflowStatus[] {
    const normalizedStatus = normalizeMaintenanceWorkflowStatus(status);
    if (!normalizedStatus) {
        return [];
    }

    if (normalizedStatus === 'confirmed' && context.canApproveCompletion) {
        return ['completed'];
    }

    return [...DEFAULT_MAINTENANCE_TRANSITIONS[normalizedStatus]];
}

export function canTransitionMaintenanceStatus(
    fromStatus?: string | null,
    toStatus?: string | null,
    context: MaintenanceWorkflowTransitionContext = {},
): boolean {
    const normalizedTarget = normalizeMaintenanceWorkflowStatus(toStatus);
    if (!normalizedTarget) {
        return false;
    }

    return getAllowedMaintenanceTransitions(fromStatus, context).includes(normalizedTarget);
}

export function isMaintenanceWorkflowLocked(status?: string | null): boolean {
    const normalizedStatus = normalizeMaintenanceWorkflowStatus(status);
    return normalizedStatus === 'confirmed' || normalizedStatus === 'completed';
}

export function isMaintenanceWorkflowClosed(status?: string | null): boolean {
    const normalizedStatus = normalizeMaintenanceWorkflowStatus(status);
    return normalizedStatus === 'completed' || normalizedStatus === 'cancelled' || normalizedStatus === 'verified';
}

export function getMaintenanceWorkflowStep(status?: string | null): number {
    switch (normalizeMaintenanceWorkflowStatus(status)) {
        case 'pending':
            return 1;
        case 'approved':
            return 2;
        case 'in_progress':
            return 3;
        case 'confirmed':
            return 4;
        case 'completed':
            return 5;
        default:
            return 1;
    }
}
