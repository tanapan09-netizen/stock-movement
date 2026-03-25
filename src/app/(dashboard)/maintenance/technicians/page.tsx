import { auth } from '@/auth';
import { canManageMaintenanceTechnicians } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import TechniciansClient from './TechniciansClient';

export const metadata = {
    title: 'จัดการช่าง | Stock Movement',
    description: 'จัดการข้อมูลช่างซ่อม'
};

export default async function TechniciansPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEdit = canManageMaintenanceTechnicians(permissionContext.role, permissionContext.permissions);

    return <TechniciansClient canEdit={canEdit} />;
}
