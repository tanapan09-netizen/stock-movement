import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import { canAccessManagerDashboard } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function ManagerDashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canAccessManagerDashboard(permissionContext.role, permissionContext.permissions)) {
        redirect('/');
    }

    return <ManagerDashboard />;
}
