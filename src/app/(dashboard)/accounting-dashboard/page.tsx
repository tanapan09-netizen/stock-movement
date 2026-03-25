import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import AccountingDashboard from '@/components/dashboards/AccountingDashboard';
import { canAccessAccountingDashboard } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function AccountingDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

  if (!canAccessAccountingDashboard(permissionContext.role, permissionContext.permissions)) {
    redirect('/');
  }

  return (
    <AccountingDashboard
      role={permissionContext.role}
      permissions={permissionContext.permissions}
      isApprover={permissionContext.isApprover}
    />
  );
}
