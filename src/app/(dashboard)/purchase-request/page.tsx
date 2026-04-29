import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getApprovalRequests } from '@/actions/approvalActions';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';
import { resolveAuthenticatedUserId } from '@/lib/server/auth-user';
import { prisma } from '@/lib/prisma';
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

    const [approvalsRes, maintenanceRes, stockProducts] = await Promise.all([
        getApprovalRequests(),
        getMaintenanceRequests(),
        prisma.tbl_products.findMany({
            where: { active: true },
            select: {
                p_id: true,
                p_name: true,
                p_count: true,
                p_unit: true,
                price_unit: true,
            },
            orderBy: { p_name: 'asc' },
        }),
    ]);
    const currentUserId = await resolveAuthenticatedUserId(session.user);
    const searchParams = await props.searchParams;
    const initialEditRequestId = searchParams?.edit ? Number(searchParams.edit) : null;

    const allPurchaseRequests = (approvalsRes.success && approvalsRes.data)
        ? approvalsRes.data.filter((item: { request_type?: string | null }) => item.request_type === 'purchase')
        : [];

    const ownPurchaseRequests = allPurchaseRequests.filter((item: { requested_by?: number | null; tbl_users?: { p_id?: number | null } | null }) => {
        const ownerId = item.requested_by || item.tbl_users?.p_id || 0;
        return ownerId === (currentUserId ?? 0);
    });

    const purchaseRequests = (() => {
        if (!Number.isFinite(initialEditRequestId)) {
            return ownPurchaseRequests;
        }

        const targetRequest = allPurchaseRequests.find((item: { request_id?: number | null }) => item.request_id === initialEditRequestId);
        if (!targetRequest) {
            return ownPurchaseRequests;
        }

        const alreadyIncluded = ownPurchaseRequests.some((item: { request_id?: number | null }) => item.request_id === initialEditRequestId);
        return alreadyIncluded ? ownPurchaseRequests : [targetRequest, ...ownPurchaseRequests];
    })();

    const activeJobs = (maintenanceRes.success && maintenanceRes.data)
        ? maintenanceRes.data.filter((r: MaintenanceRequestStatusLike) => r.status !== 'completed' && r.status !== 'cancelled')
        : [];

    return (
        <PurchaseRequestClient
            initialRequests={purchaseRequests}
            activeJobs={activeJobs}
            stockProducts={stockProducts.map((product) => ({
                p_id: product.p_id,
                p_name: product.p_name,
                p_count: product.p_count,
                p_unit: product.p_unit || null,
                price_unit: product.price_unit !== null && product.price_unit !== undefined
                    ? Number(product.price_unit)
                    : null,
            }))}
            initialEditRequestId={Number.isFinite(initialEditRequestId) ? initialEditRequestId : null}
        />
    );
}
