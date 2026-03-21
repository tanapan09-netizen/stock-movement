import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ApprovalClient from '../ApprovalClient';
import { getApprovalRequests } from '@/actions/approvalActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';

interface MaintenanceRequestStatusLike {
    status?: string | null;
}

export const metadata = {
    title: 'คำขออนุมัติซื้อ | Stock Movement',
};

export default async function PurchasingApprovalsPage() {
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
            activeJobs={(maintenanceRes.success && maintenanceRes.data)
                ? maintenanceRes.data.filter((r: MaintenanceRequestStatusLike) => r.status !== 'completed' && r.status !== 'cancelled')
                : []}
            canApprove={canApprove}
            currentUserId={parseInt(session.user.id as string) || 0}
            initialRequestType="purchase"
            lockedRequestType="purchase"
            defaultCreateRequestType="purchase"
            title="คำขออนุมัติซื้อ"
            subtitle="มุมมองเฉพาะงานอนุมัติของฝ่ายจัดซื้อ"
        />
    );
}
