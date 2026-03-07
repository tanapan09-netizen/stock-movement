import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ApprovalClient from './ApprovalClient';
import { getApprovalRequests } from '@/actions/approvalActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';

export const metadata = {
    title: 'อนุมัติคำขอต่างๆ (OT/เบิก/ลา) | Stock Movement',
};

export default async function ApprovalsPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const requestsRes = await getApprovalRequests();
    const maintenanceRes = await getMaintenanceRequests();

    const role = session.user.role?.toLowerCase() || '';
    const isApprover = session.user.is_approver || false;
    const canApprove = role === 'admin' || role === 'manager' || isApprover;

    return (
        <ApprovalClient
            initialRequests={(requestsRes.success && requestsRes.data) ? requestsRes.data : []}
            activeJobs={(maintenanceRes.success && maintenanceRes.data) ? maintenanceRes.data.filter((r: any) => r.status !== 'completed' && r.status !== 'cancelled') : []}
            canApprove={canApprove}
            currentUserId={parseInt(session.user.id as string) || 0}
        />
    );
}
