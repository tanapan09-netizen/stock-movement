import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ApprovalClient from '../ApprovalClient';
import { getApprovalRequests } from '@/actions/approvalActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';
import { canManageGeneralApprovals } from '@/lib/rbac';
import { isDepartmentRole } from '@/lib/roles';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

interface MaintenanceRequestStatusLike {
    status?: string | null;
}

export const metadata = {
    title: 'จัดการคำขออนุมัติ (OT/เบิก/ลา) | Stock Movement',
};

export default async function ApprovalsManagePage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

    if (
        isDepartmentRole(permissionContext.role, 'purchasing') &&
        !canManageGeneralApprovals(
            permissionContext.role,
            permissionContext.permissions,
            permissionContext.isApprover,
        )
    ) {
        redirect('/purchase-request/manage');
    }

    const canApprove = canManageGeneralApprovals(
        permissionContext.role,
        permissionContext.permissions,
        permissionContext.isApprover,
    );
    if (!canApprove) {
        redirect('/approvals');
    }

    const requestsRes = await getApprovalRequests();
    const maintenanceRes = await getMaintenanceRequests();

    return (
        <ApprovalClient
            initialRequests={(requestsRes.success && requestsRes.data) ? requestsRes.data : []}
            activeJobs={(maintenanceRes.success && maintenanceRes.data)
                ? maintenanceRes.data.filter((r: MaintenanceRequestStatusLike) => r.status !== 'completed' && r.status !== 'cancelled')
                : []}
            canApprove={canApprove}
            currentUserId={parseInt(session.user.id as string) || 0}
            initialRequestType="all"
            variant="manage"
        />
    );
}
