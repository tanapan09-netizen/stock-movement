import { auth } from '@/auth';
import { canAccessDashboardPage, canCreateMaintenanceRequest } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import RoomClient from './RoomClient';

export default async function RoomsPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    const quickActionPermissions = {
        canCreateMaintenance: canCreateMaintenanceRequest(
            permissionContext.role,
            permissionContext.permissions,
            permissionContext.isApprover,
        ),
        canViewRoomAssets: canAccessDashboardPage(
            permissionContext.role,
            permissionContext.permissions,
            '/assets/rooms',
            { isApprover: permissionContext.isApprover },
        ),
        canCreateAsset: canAccessDashboardPage(
            permissionContext.role,
            permissionContext.permissions,
            '/assets/new',
            { isApprover: permissionContext.isApprover, level: 'edit' },
        ),
    };

    return <RoomClient quickActionPermissions={quickActionPermissions} />;
}
