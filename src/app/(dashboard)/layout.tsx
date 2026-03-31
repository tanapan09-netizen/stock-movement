import Sidebar from '@/components/Sidebar';
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper';
import AutoBackup from '@/components/AutoBackup';
import LoginNotificationPopup from '@/components/LoginNotificationPopup';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SidebarProvider } from '@/contexts/SidebarContext';
import DashboardLayoutContent from './DashboardLayoutContent';

import { OfflineQueueProvider } from '@/contexts/OfflineQueueProvider';
import { resolveDashboardPageAccess } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { headers } from 'next/headers';
import { Lock } from 'lucide-react';

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
    const sessionUser = session.user as PermissionSessionUser;
    const { role, isApprover, permissions } = await getUserPermissionContext(sessionUser);
    const requestHeaders = await headers();
    const pathname = requestHeaders.get('x-pathname') || '/';
    const pageAccess = resolveDashboardPageAccess(role, permissions, pathname, { isApprover });
    const requiredAccessLevel = pageAccess.requiredAccessLevel;
    const roleScopedDashboardRoutes = new Set([
        '/manager-dashboard',
        '/accounting-dashboard',
        '/purchasing-dashboard',
        '/store-dashboard',
        '/maintenance/dashboard',
    ]);

    if (requiredAccessLevel && !pageAccess.hasPageAccess) {
        if (pageAccess.routePattern && roleScopedDashboardRoutes.has(pageAccess.routePattern)) {
            redirect('/');
        }

        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900">Access Denied</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        คุณไม่มีสิทธิ์เข้าถึงหน้านี้ ({pathname}) - ต้องการสิทธิ์ {requiredAccessLevel.toUpperCase()}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <OfflineQueueProvider>
                <div className="flex min-h-screen overflow-x-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
                    {/* Auto backup on dashboard load */}
                    <AutoBackup />

                    {/* Login Notification Popup (shown once per session) */}
                    <LoginNotificationPopup
                        user={{
                            id: session.user?.id ?? null,
                            name: session.user?.name ?? null,
                        }}
                    />

                    {/* Sidebar with mobile wrapper */}
                    <MobileSidebarWrapper>
                        <Sidebar permissions={permissions} />
                    </MobileSidebarWrapper>

                    {/* Main content - responsive margin via Context */}
                    <DashboardLayoutContent>
                        {children}
                    </DashboardLayoutContent>
                </div>
            </OfflineQueueProvider>
        </SidebarProvider>
    );
}
