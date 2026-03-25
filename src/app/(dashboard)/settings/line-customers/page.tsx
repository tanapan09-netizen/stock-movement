import { auth } from '@/auth';
import { canManageLineCustomers } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import LineCustomersClient from './LineCustomersClient';

export const metadata = {
    title: 'จัดการลูกค้า LINE | Stock Movement',
    description: 'จัดการการลงทะเบียนลูกค้าผ่าน LINE',
};

export default async function LineCustomersPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEdit = canManageLineCustomers(permissionContext.role, permissionContext.permissions);

    return <LineCustomersClient canEdit={canEdit} />;
}
