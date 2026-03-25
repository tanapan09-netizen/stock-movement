import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import PettyCashClient from './PettyCashClient';
import { canAccessPettyCashModule } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function PettyCashPage() {
    const session = await auth();
    if (!session) redirect('/login');

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);

    if (!canAccessPettyCashModule(permissionContext.permissions)) {
        redirect('/dashboard');
    }

    return (
        <PettyCashClient
            currentUserName={session.user.name || ''}
            role={permissionContext.role}
            permissions={permissionContext.permissions}
            isApprover={permissionContext.isApprover}
        />
    );
}
