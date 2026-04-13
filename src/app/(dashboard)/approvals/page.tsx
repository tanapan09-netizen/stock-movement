import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ApprovalClient from './ApprovalClient';
import { getApprovalRequests } from '@/actions/approvalActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';
import { getApprovalsEntryRedirect } from '@/lib/approval-page-access';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

interface MaintenanceRequestStatusLike {
    status?: string | null;
}

export const metadata = {
    title: 'อนุมัติคำขอต่างๆ (OT/เบิก/ลา) | Stock Movement',
};

export default async function ApprovalsPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    const redirectTarget = getApprovalsEntryRedirect({
        role: permissionContext.role,
        permissions: permissionContext.permissions,
        isApprover: permissionContext.isApprover,
    });

    if (redirectTarget) {
        redirect(redirectTarget);
    }

    const requestsRes = await getApprovalRequests();
    const maintenanceRes = await getMaintenanceRequests();

    return (
        <ApprovalClient
            initialRequests={(requestsRes.success && requestsRes.data) ? requestsRes.data : []}
            activeJobs={(maintenanceRes.success && maintenanceRes.data)
                ? maintenanceRes.data.filter((r: MaintenanceRequestStatusLike) => r.status !== 'completed' && r.status !== 'cancelled')
                : []}
            canApprove={false}
            currentUserId={parseInt(session.user.id as string) || 0}
            initialRequestType="all"
            variant="report"
            allowCreate={false}
        />
    );
}
