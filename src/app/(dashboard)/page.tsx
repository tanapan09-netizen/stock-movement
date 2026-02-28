import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import AccountingDashboard from '@/components/dashboards/AccountingDashboard';
import PurchasingDashboard from '@/components/dashboards/PurchasingDashboard';
import TechnicianDashboard from '@/components/dashboards/TechnicianDashboard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as any).role || 'user';

  // Route to appropriate dashboard based on user role
  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'accounting':
      return <AccountingDashboard />;
    case 'purchasing':
      return <PurchasingDashboard />;
    case 'technician':
      return <TechnicianDashboard />;
    default:
      // Fallback to a basic or operation dashboard
      return <AdminDashboard />;
  }
}

