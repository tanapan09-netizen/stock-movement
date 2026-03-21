import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import AccountingDashboard from '@/components/dashboards/AccountingDashboard';
import PurchasingDashboard from '@/components/dashboards/PurchasingDashboard';
import TechnicianDashboard from '@/components/dashboards/TechnicianDashboard';
import StoreDashboard from '@/components/dashboards/StoreDashboard';
import GeneralDashboard from '@/components/dashboards/GeneralDashboard';
import { isDepartmentRole, isManagerRole, isOwnerRole } from '@/lib/roles';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as { role?: string }).role || 'user';

  // Route to appropriate dashboard based on user role
  if (isOwnerRole(role) || role === 'admin') {
    return <AdminDashboard />;
  }

  switch (role) {
    case 'manager':
      return <ManagerDashboard />;
    case 'accounting':
    case 'leader_accounting':
      return <AccountingDashboard />;
    case 'purchasing':
    case 'leader_purchasing':
      return <PurchasingDashboard />;
    case 'technician':
    case 'leader_technician':
      return <TechnicianDashboard />;
    case 'store':
    case 'leader_store':
    case 'operation':
    case 'leader_operation':
      return <StoreDashboard />;
    case 'employee':
    case 'leader_employee':
    case 'general':
    case 'leader_general':
    case 'maid':
    case 'leader_maid':
    case 'driver':
    case 'leader_driver':
      return <GeneralDashboard />;
    default:
      if (isManagerRole(role) || isDepartmentRole(role, 'purchasing')) {
        return <PurchasingDashboard />;
      }
      return <GeneralDashboard />;
  }
}
