import Sidebar from '@/components/Sidebar';
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper';
import AutoBackup from '@/components/AutoBackup';
import LoginNotificationPopup from '@/components/LoginNotificationPopup';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SidebarProvider } from '@/contexts/SidebarContext';
import DashboardLayoutContent from './DashboardLayoutContent';

import { getRolePermissions } from '@/actions/roleActions';
import { prisma } from '@/lib/prisma';
import { OfflineQueueProvider } from '@/contexts/OfflineQueueProvider';
import { getPagePermissionKeyForPathname, getRequiredPageAccessLevelForPathname, RolePermissions } from '@/lib/permissions';
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
    const sessionUser = session.user as { role?: string; is_linked?: boolean; id?: string };
    const role = sessionUser.role || 'user';
    const defaultPermissions = await getRolePermissions(role);

    // Fetch user's custom permissions
    let customPermissions: RolePermissions = {};
    const isLinked = !!sessionUser.is_linked;

    if (sessionUser.id && isLinked) {
        const user = await prisma.tbl_users.findUnique({
            where: { p_id: parseInt(sessionUser.id) },
            select: { custom_permissions: true }
        });
        if (user?.custom_permissions) {
            try {
                customPermissions = JSON.parse(user.custom_permissions) as RolePermissions;
            } catch (e) {
                console.error("Failed to parse custom permissions", e);
            }
        }
    }

    // Merge custom permissions (custom overrides default)
    const permissions: RolePermissions = { ...defaultPermissions, ...customPermissions };
    const requestHeaders = await headers();
    const pathname = requestHeaders.get('x-pathname') || '/';
    const requiredAccessLevel = getRequiredPageAccessLevelForPathname(pathname);
    const readPermissionKey = getPagePermissionKeyForPathname(pathname, 'read');
    const editPermissionKey = getPagePermissionKeyForPathname(pathname, 'edit');
    const canReadPage = readPermissionKey ? !!permissions[readPermissionKey] : true;
    const canEditPage = editPermissionKey ? !!permissions[editPermissionKey] : true;
    const hasPageAccess = requiredAccessLevel === 'edit' ? canEditPage : (canReadPage || canEditPage);

    if (requiredAccessLevel && !hasPageAccess) {
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
            </OfflineQueueProvider>
        </SidebarProvider>
    );
}
