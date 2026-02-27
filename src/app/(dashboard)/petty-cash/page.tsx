import { PERMISSIONS } from '@/lib/permissions';
import { auth } from '@/auth';
import { getRolePermissions } from '@/actions/roleActions';
import { redirect } from 'next/navigation';
import PettyCashClient from './PettyCashClient';

export default async function PettyCashPage() {
    const session = await auth();
    if (!session) redirect('/login');

    const role = (session.user as any).role || 'user';
    const permissions = await getRolePermissions(role);

    if (!permissions[PERMISSIONS.PETTY_CASH]) {
        redirect('/dashboard');
    }

    return <PettyCashClient />;
}
