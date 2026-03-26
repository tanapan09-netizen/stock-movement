import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canApproveApprovalRequest, canManagePurchaseRequests } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { resolveAuthenticatedUserId } from '@/lib/server/auth-user';
import { getCurrentApprovalWorkflowStep } from '@/lib/purchase-request-workflow';
import PurchaseRequestManagementClient from './PurchaseRequestManagementClient';

export const metadata = {
    title: 'จัดการระบบคำขอซื้อ | Stock Movement',
};

export default async function PurchaseRequestManagementPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canManagePurchaseRequests(permissionContext.role, permissionContext.permissions)) {
        redirect('/');
    }
    const currentUserId = await resolveAuthenticatedUserId(session.user);

    const requests = await prisma.tbl_approval_requests.findMany({
        where: {
            request_type: 'purchase',
        },
        include: {
            tbl_users: {
                select: {
                    username: true,
                    p_id: true,
                },
            },
            tbl_approver: {
                select: {
                    username: true,
                },
            },
            workflow: {
                include: {
                    steps: true,
                },
            },
        },
        orderBy: {
            created_at: 'desc',
        },
    });

    return (
        <PurchaseRequestManagementClient
            initialRequests={requests.map((request) => ({
                ...request,
                amount: request.amount ? Number(request.amount) : null,
                can_approve: canApproveApprovalRequest(
                    permissionContext.role,
                    permissionContext.permissions,
                    {
                        currentUserId: currentUserId ?? -1,
                        requestType: request.request_type,
                        workflowStep: getCurrentApprovalWorkflowStep(
                            request.request_type,
                            request.current_step,
                            request.workflow?.steps || [],
                        ),
                        isApprover: permissionContext.isApprover,
                    },
                ),
            }))}
            currentRole={permissionContext.role || null}
        />
    );
}
