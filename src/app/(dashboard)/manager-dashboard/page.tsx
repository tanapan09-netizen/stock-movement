import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import ManagerDashboard from '@/components/dashboards/ManagerDashboard';
import { isManagerRole } from '@/lib/roles';

export default async function ManagerDashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const role = (session.user.role || '').toLowerCase();
    if (!isManagerRole(role)) {
        redirect('/');
    }

    return <ManagerDashboard />;
}
