import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getApprovalRequests } from '@/actions/approvalActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';
import { resolveAuthenticatedUserId } from '@/lib/server/auth-user';
import PurchaseRequestClient from './PurchaseRequestClient';

interface MaintenanceRequestStatusLike {
    status?: string | null;
    request_number?: string;
    title?: string | null;
    tbl_rooms?: {
        room_code?: string | null;
    } | null;
}

export const metadata = {
    title: 'ส่งคำขอซื้อ | Stock Movement',
};

export default async function PurchaseRequestPage(props: { searchParams?: Promise<{ edit?: string }> }) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const approvalsRes = await getApprovalRequests();
    const maintenanceRes = await getMaintenanceRequests();
    const currentUserId = await resolveAuthenticatedUserId(session.user);
    const searchParams = await props.searchParams;
    const initialEditRequestId = searchParams?.edit ? Number(searchParams.edit) : null;

    const purchaseRequests = (approvalsRes.success && approvalsRes.data)
        ? approvalsRes.data.filter((item: { request_type?: string | null; requested_by?: number | null; tbl_users?: { p_id?: number | null } | null }) => {
            const ownerId = item.requested_by || item.tbl_users?.p_id || 0;
            return item.request_type === 'purchase' && ownerId === (currentUserId ?? 0);
        })
        : [];

    const activeJobs = (maintenanceRes.success && maintenanceRes.data)
        ? maintenanceRes.data.filter((r: MaintenanceRequestStatusLike) => r.status !== 'completed' && r.status !== 'cancelled')
        : [];

    return (
        <PurchaseRequestClient
            initialRequests={purchaseRequests}
            activeJobs={activeJobs}
            initialEditRequestId={Number.isFinite(initialEditRequestId) ? initialEditRequestId : null}
        />
    );
}
