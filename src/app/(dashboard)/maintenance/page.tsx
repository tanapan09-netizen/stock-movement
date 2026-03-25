import { Suspense } from 'react';
import MaintenanceClient from './MaintenanceClient';
import { auth } from '@/auth';
import { resolveDashboardPageAccess } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export const metadata = {
    title: 'แจ้งซ่อม | Stock Movement',
    description: 'ระบบแจ้งซ่อม'
};

export default async function MaintenancePage() {
    const session = await auth();
    let permissions = {};
    let canEditPage = false;

    if (session && session.user) {
        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
        permissions = permissionContext.permissions;
        canEditPage = resolveDashboardPageAccess(
            permissionContext.role,
            permissionContext.permissions,
            '/maintenance',
            { isApprover: permissionContext.isApprover },
        ).canEditPage;
    }

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>}>
            <MaintenanceClient userPermissions={permissions} canEditPage={canEditPage} />
        </Suspense>
    );
}
