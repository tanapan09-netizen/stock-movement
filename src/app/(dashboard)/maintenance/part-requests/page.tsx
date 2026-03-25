
import { auth } from '@/auth';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import {
    canCreatePartRequest,
    canDeletePartRequest,
    canUpdatePartRequestStatus,
} from '@/lib/rbac';
import PartRequestClient from './PartRequestClient';

export default async function PartRequestsPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser);

    return (
        <PartRequestClient
            role={permissionContext.role}
            permissions={permissionContext.permissions}
            isApprover={permissionContext.isApprover}
            canCreateRequest={canCreatePartRequest(
                permissionContext.role,
                permissionContext.permissions,
                permissionContext.isApprover,
            )}
            canUpdateStatus={canUpdatePartRequestStatus(
                permissionContext.role,
                permissionContext.permissions,
                permissionContext.isApprover,
            )}
            canDeleteRequest={canDeletePartRequest(
                permissionContext.role,
                permissionContext.permissions,
                permissionContext.isApprover,
            )}
        />
    );
}
