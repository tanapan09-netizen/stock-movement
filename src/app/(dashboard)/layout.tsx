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

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({

    children,
}: {
    children: React.ReactNode;
}) {
    try {
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
                <div className="app-shell min-h-screen flex items-center justify-center p-6">
                    <div className="max-w-md w-full rounded-2xl border border-red-100 bg-white/95 p-8 text-center shadow-[0_30px_60px_-40px_rgba(239,68,68,0.55)] backdrop-blur">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                            <Lock className="w-7 h-7" />
                        </div>
                        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ ({pathname}) - ต้องการสิทธิ์ {requiredAccessLevel.toUpperCase()}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <SidebarProvider>
                <OfflineQueueProvider>
                    <div className="app-shell flex min-h-screen overflow-x-hidden transition-colors duration-300">
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
    } catch (error) {
        const digest = typeof error === 'object' && error !== null && 'digest' in error
            ? String((error as { digest?: unknown }).digest ?? '')
            : '';
        if (
            digest === 'NEXT_REDIRECT' ||
            digest === 'NEXT_NOT_FOUND' ||
            digest === 'DYNAMIC_SERVER_USAGE'
        ) {
            throw error;
        }

        console.error('Dashboard layout render error:', error);
        redirect('/login');
        return (
            <div className="app-shell min-h-screen flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-2xl border border-amber-100 bg-white/95 p-8 text-center shadow-[0_30px_60px_-40px_rgba(251,191,36,0.55)] backdrop-blur">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">เกิดข้อผิดพลาดในการโหลดหน้า</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        กรุณารีเฟรชหน้า หรือลองเข้าสู่ระบบใหม่อีกครั้ง
                    </p>
                </div>
            </div>
        );
    }
}
