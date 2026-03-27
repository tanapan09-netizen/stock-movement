import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { canAccessPurchaseWorkflowQueue } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export const metadata = {
    title: 'คิวคำขอซื้อ | Stock Movement',
};

export default async function PurchasingApprovalsPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    const canAccessPurchaseWorkflow = canAccessPurchaseWorkflowQueue(
        permissionContext.role,
        permissionContext.permissions,
        permissionContext.isApprover,
    );

    if (!canAccessPurchaseWorkflow) {
        redirect('/approvals');
    }

    redirect('/purchase-request/manage');
}
