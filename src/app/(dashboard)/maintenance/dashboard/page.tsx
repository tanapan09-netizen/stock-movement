import { auth } from '@/auth';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import { canReviewMaintenancePartRequests } from '@/lib/rbac';
import MaintenanceDashboardClient from './MaintenanceDashboardClient';

export const metadata = {
    title: 'Dashboard แจ้งซ่อม | Stock Movement',
    description: 'ภาพรวมและจัดการงานซ่อม'
};

export default async function MaintenanceDashboardPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user);

    return (
        <MaintenanceDashboardClient
            canReviewPartRequests={canReviewMaintenancePartRequests(
                permissionContext.role,
                permissionContext.permissions,
                permissionContext.isApprover,
            )}
        />
    );
}
