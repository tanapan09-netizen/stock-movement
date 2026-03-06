import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper';
import AutoBackup from '@/components/AutoBackup';
import LoginNotificationPopup from '@/components/LoginNotificationPopup';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SidebarProvider } from '@/contexts/SidebarContext';
import DashboardLayoutContent from './DashboardLayoutContent';

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
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
                {/* Auto backup on dashboard load */}
                <AutoBackup />

                {/* Login Notification Popup (shown once per session) */}
                <LoginNotificationPopup />

                {/* Sidebar with mobile wrapper */}
                <MobileSidebarWrapper>
                    <Sidebar permissions={permissions} />
                </MobileSidebarWrapper>

                {/* Main content - responsive margin via Context */}
                <DashboardLayoutContent>
                    {children}
                </DashboardLayoutContent>
            </div>
        </SidebarProvider>
    );
}
