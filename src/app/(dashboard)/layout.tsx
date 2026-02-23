import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper';
import AutoBackup from '@/components/AutoBackup';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import { getRolePermissions } from '@/actions/roleActions';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    // Fetch permissions for the user's role
    // Cast to any because custom role property might not be in default types
    const role = (session.user as any).role || 'user';
    const permissions = await getRolePermissions(role);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
            {/* Auto backup on dashboard load */}
            <AutoBackup />

            {/* Sidebar with mobile wrapper */}
            <MobileSidebarWrapper>
                <Sidebar permissions={permissions} />
            </MobileSidebarWrapper>

            {/* Main content - responsive margin */}
            <div className="lg:ml-64 flex w-full flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
