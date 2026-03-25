import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import AccountingDashboard from '@/components/dashboards/AccountingDashboard';
import PurchasingDashboard from '@/components/dashboards/PurchasingDashboard';
import TechnicianDashboard from '@/components/dashboards/TechnicianDashboard';
import StoreDashboard from '@/components/dashboards/StoreDashboard';
import GeneralDashboard from '@/components/dashboards/GeneralDashboard';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import { resolveDashboardHomeView } from '@/lib/rbac';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const permissionContext = await getUserPermissionContext(session.user);

  switch (resolveDashboardHomeView(
    permissionContext.role,
    permissionContext.permissions,
    { isApprover: permissionContext.isApprover },
  )) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'accounting':
      return (
        <AccountingDashboard
          role={permissionContext.role}
          permissions={permissionContext.permissions}
          isApprover={permissionContext.isApprover}
        />
      );
    case 'purchasing':
      return <PurchasingDashboard />;
    case 'technician':
      return <TechnicianDashboard />;
    case 'store':
      return <StoreDashboard />;
    case 'general':
    default:
      return <GeneralDashboard />;
  }
}
