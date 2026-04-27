import { auth } from '@/auth';
import { canManageLineCustomers } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import LineCustomersClient from './LineCustomersClient';

export const metadata = {
    title: 'ลูกค้า LINE (ลงทะเบียนผ่านลิงก์) | Stock Movement',
    description: 'จัดการรายชื่อลูกค้าที่สมัครผ่านหน้า customer register',
};

export default async function LineCustomersPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEdit = canManageLineCustomers(permissionContext.role, permissionContext.permissions);

    return <LineCustomersClient canEdit={canEdit} />;
}
