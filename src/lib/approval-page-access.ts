import { canAccessDashboardPage, canManageGeneralApprovals, type PagePermissionMap } from '@/lib/rbac';
import { isManagerRole } from '@/lib/roles';

export interface ApprovalPagePermissionContext {
    role: string | null | undefined;
    permissions?: PagePermissionMap;
    isApprover?: boolean;
}

export function getApprovalsEntryRedirect(context: ApprovalPagePermissionContext): string | null {
    const permissions = context.permissions || {};
    const isApprover = Boolean(context.isApprover);
    const managerApprovalRole = isManagerRole(context.role);
    const canAccessManagePage = canAccessDashboardPage(
        context.role,
        permissions,
        '/approvals/manage',
        { isApprover },
    );
    if (canAccessManagePage && managerApprovalRole) {
        return '/approvals/manage';
    }

    return null;
}

export function resolveApprovalsManagePageAccess(context: ApprovalPagePermissionContext) {
    const permissions = context.permissions || {};
    const isApprover = Boolean(context.isApprover);
    const managerApprovalRole = isManagerRole(context.role);
    const hasManagePagePermission = canAccessDashboardPage(
        context.role,
        permissions,
        '/approvals/manage',
        { isApprover },
    );
    const canAccessManagePage = hasManagePagePermission && managerApprovalRole;
    const canApprove = canManageGeneralApprovals(
        context.role,
        permissions,
        isApprover,
    ) && managerApprovalRole;
    const redirectTo = !canAccessManagePage ? '/approvals' : null;

    return {
        canAccessManagePage,
        canApprove,
        allowCreate: canAccessManagePage,
        redirectTo,
    };
}
