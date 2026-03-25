import { auth } from '@/auth';
import { canManageMaintenanceParts, canUpdatePartRequestStatus } from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import PartsManagementClient from './PartsManagementClient';

export const metadata = {
    title: 'จัดการอะไหล่ซ่อม | Stock Movement',
    description: 'เบิก/คืนอะไหล่สำหรับงานซ่อม'
};

export default async function PartsManagementPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user);

    return (
        <PartsManagementClient
            canManageParts={canManageMaintenanceParts(
                permissionContext.role,
                permissionContext.permissions,
            )}
            canRespondPartAvailability={canUpdatePartRequestStatus(
                permissionContext.role,
                permissionContext.permissions,
                permissionContext.isApprover,
            )}
        />
    );
}
