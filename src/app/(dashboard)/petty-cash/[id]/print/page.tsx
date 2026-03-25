import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canViewPettyCashRequest } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import PettyCashPrintClient from './PettyCashPrintClient';

export default async function PettyCashPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session) redirect('/login');

    const { id } = await params;
    const requestId = Number(id);

    if (!requestId || Number.isNaN(requestId)) {
        redirect('/petty-cash');
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    const request = await prisma.tbl_petty_cash.findUnique({
        where: { id: requestId },
        select: { requested_by: true },
    });

    if (!request) {
        redirect('/petty-cash');
    }

    if (!canViewPettyCashRequest(permissionContext.role, permissionContext.permissions, {
        currentUserName: session.user.name,
        ownerName: request.requested_by,
        isApprover: permissionContext.isApprover,
    })) {
        redirect('/petty-cash');
    }

    return <PettyCashPrintClient requestId={requestId} />;
}
