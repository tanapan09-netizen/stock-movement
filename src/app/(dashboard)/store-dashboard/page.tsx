import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import StoreDashboard from '@/components/dashboards/StoreDashboard';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export const metadata = {
    title: 'Store Dashboard | Stock Movement',
};

export default async function StoreDashboardPage() {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canAccessDashboardPage(permissionContext.role, permissionContext.permissions, '/store-dashboard', {
        isApprover: permissionContext.isApprover,
    })) {
        redirect('/');
    }

    return <StoreDashboard />;
}
