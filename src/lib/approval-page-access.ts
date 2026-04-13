import { canAccessDashboardPage, canAccessPurchaseWorkflowQueue, canManageGeneralApprovals, type PagePermissionMap } from '@/lib/rbac';
import { isDepartmentRole } from '@/lib/roles';

export interface ApprovalPagePermissionContext {
    role: string | null | undefined;
    permissions?: PagePermissionMap;
    isApprover?: boolean;
}

export function getApprovalsEntryRedirect(context: ApprovalPagePermissionContext): string | null {
    const permissions = context.permissions || {};
    const isApprover = Boolean(context.isApprover);
    const canAccessManagePage = canAccessDashboardPage(
        context.role,
        permissions,
        '/approvals/manage',
        { isApprover },
    );
    const canApprove = canManageGeneralApprovals(
        context.role,
        permissions,
        isApprover,
    );
    const canAccessPurchaseWorkflow = canAccessPurchaseWorkflowQueue(
        context.role,
        permissions,
        isApprover,
    );

    if (canAccessPurchaseWorkflow && !canApprove) {
        return '/purchase-request/manage';
    }

    if (canAccessManagePage) {
        return '/approvals/manage';
    }

    return null;
}

export function resolveApprovalsManagePageAccess(context: ApprovalPagePermissionContext) {
    const permissions = context.permissions || {};
    const isApprover = Boolean(context.isApprover);
    const canAccessManagePage = canAccessDashboardPage(
        context.role,
        permissions,
        '/approvals/manage',
        { isApprover },
    );
    const canApprove = canManageGeneralApprovals(
        context.role,
        permissions,
        isApprover,
    );
    const canAccessPurchaseWorkflow = canAccessPurchaseWorkflowQueue(
        context.role,
        permissions,
        isApprover,
    );

    const redirectTo = isDepartmentRole(context.role, 'purchasing')
        && !canAccessManagePage
        && canAccessPurchaseWorkflow
        ? '/purchase-request/manage'
        : (!canAccessManagePage ? '/approvals' : null);

    return {
        canAccessManagePage,
        canApprove,
        allowCreate: canAccessManagePage,
        redirectTo,
    };
}
