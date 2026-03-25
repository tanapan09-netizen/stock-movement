import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import NewPettyCashClient from './NewPettyCashClient';
import { canCreatePettyCashRequest } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export const metadata = {
    title: 'New Petty Cash Payment | Stock Movement',
};

export default async function NewPettyCashPage() {
    const session = await auth();
    if (!session) redirect('/login');

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canCreatePettyCashRequest(
        permissionContext.role,
        permissionContext.permissions,
        permissionContext.isApprover,
    )) {
        redirect('/petty-cash');
    }

    return <NewPettyCashClient />;
}
