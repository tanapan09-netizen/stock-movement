import { prisma } from '@/lib/prisma';
import ManagerDashboardClient, { type DashboardDataProps } from './ManagerDashboardClient';

const getApprovalTypeLabel = (type?: string | null) => {
    switch ((type || '').toLowerCase()) {
        case 'purchase': return 'คำขอซื้อ';
        case 'expense': return 'เบิกค่าใช้จ่าย';
        case 'leave': return 'ลางาน';
        case 'ot': return 'โอที';
        default: return 'คำขอทั่วไป';
    }
};

const getMaintenanceStatusLabel = (status?: string | null) => {
    switch ((status || '').toLowerCase()) {
        case 'pending': return 'รอรับงาน';
        case 'confirmed': return 'ยืนยันแล้ว';
        case 'in_progress': return 'กำลังดำเนินการ';
        case 'wait_for_parts': return 'รออะไหล่';
        case 'wait_for_order': return 'รอสั่งซื้อ';
        default: return status || '-';
    }
};

export default async function ManagerDashboard() {
    const [
        pendingGeneralApprovals,
        pendingPurchaseApprovals,
        pendingPettyCash,
        pendingPartRequests,
        activeMaintenance,
        unassignedMaintenance,
        recentGeneralApprovals,
        recentPurchaseApprovals,
        recentPettyCashRows,
        recentMaintenanceRows,
    ] = await Promise.all([
        prisma.tbl_approval_requests.count({ where: { status: 'pending', request_type: { not: 'purchase' } } }),
        prisma.tbl_approval_requests.count({
            where: {
                status: 'pending',
                request_type: 'purchase',
                current_step: 2,
            },
        }),
        prisma.tbl_petty_cash.count({ where: { status: 'pending' } }),
        prisma.tbl_part_requests.count({ where: { status: 'pending' } }),
        prisma.tbl_maintenance_requests.count({ where: { status: { notIn: ['completed', 'cancelled'] } } }),
        prisma.tbl_maintenance_requests.count({
            where: {
                status: { notIn: ['completed', 'cancelled'] },
                OR: [{ assigned_to: null }, { assigned_to: '' }],
            },
        }),
        prisma.tbl_approval_requests.findMany({
            where: { status: 'pending', request_type: { not: 'purchase' } },
            include: { tbl_users: { select: { username: true } }, tbl_approver: { select: { username: true } } },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
        prisma.tbl_approval_requests.findMany({
            where: {
                status: 'pending',
                request_type: 'purchase',
                current_step: 2,
            },
            include: { tbl_users: { select: { username: true } }, tbl_approver: { select: { username: true } } },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
        prisma.tbl_petty_cash.findMany({
            where: { status: 'pending' },
            orderBy: { created_at: 'desc' },
            take: 6,
        }),
        prisma.tbl_maintenance_requests.findMany({
            where: { status: { notIn: ['completed', 'cancelled'] } },
            orderBy: { updated_at: 'desc' },
            take: 8,
        }),
    ]);

    const decisionQueue: DashboardDataProps['decisionQueue'] = [
        ...recentGeneralApprovals.map((item) => ({
            id: `general-${item.request_id}`,
            originalId: item.request_id,
            type: 'general' as const,
            module: getApprovalTypeLabel(item.request_type),
            number: item.request_number,
            title: item.reason,
            requester: item.tbl_users?.username || `User #${item.requested_by}`,
            owner: item.tbl_approver?.username || 'Manager/Approver',
            status: item.status,
            amount: item.amount ? Number(item.amount) : null,
            href: '/approvals/manage',
            createdAt: item.created_at,
        })),
        ...recentPurchaseApprovals.map((item) => ({
            id: `purchase-${item.request_id}`,
            originalId: item.request_id,
            type: 'purchase' as const,
            module: 'คำขอซื้อ',
            number: item.request_number,
            title: item.reason,
            requester: item.tbl_users?.username || `User #${item.requested_by}`,
            owner: item.tbl_approver?.username || 'Purchasing',
            status: item.status,
            amount: item.amount ? Number(item.amount) : null,
            href: '/purchase-request/manage',
            createdAt: item.created_at,
        })),
        ...recentPettyCashRows.map((item) => ({
            id: `petty-${item.id}`,
            originalId: item.id,
            type: 'petty' as const,
            module: 'เงินสดย่อย',
            number: item.request_number,
            title: item.purpose,
            requester: item.requested_by,
            owner: 'Accounting / Manager',
            status: item.status,
            amount: Number(item.requested_amount),
            href: '/petty-cash',
            createdAt: item.created_at,
        })),
    ].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)).slice(0, 10);

    const workMonitor = [
        ...recentMaintenanceRows.map((item) => ({
            id: `maint-${item.request_id}`,
            module: 'งานซ่อม',
            number: item.request_number,
            title: item.title,
            owner: item.assigned_to || 'ยังไม่มอบหมาย',
            status: getMaintenanceStatusLabel(item.status),
            approval: item.status === 'wait_for_order' ? 'รออนุมัติ/สั่งซื้อ' : 'ติดตามงาน',
            updatedAt: item.updated_at,
            href: '/maintenance',
        })),
        ...recentPurchaseApprovals.map((item) => ({
            id: `monitor-${item.request_id}`,
            module: 'คำขอซื้อ',
            number: item.request_number,
            title: item.reason,
            owner: item.tbl_approver?.username || 'Purchasing',
            status: item.status,
            approval: 'ต้องอนุมัติ/ไม่อนุมัติ',
            updatedAt: item.updated_at,
            href: '/purchase-request/manage',
        })),
    ].sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)).slice(0, 10);

    return (
        <ManagerDashboardClient 
            data={{
                pendingGeneralApprovals,
                pendingPurchaseApprovals,
                pendingPettyCash,
                pendingPartRequests,
                activeMaintenance,
                unassignedMaintenance,
                decisionQueue,
                workMonitor,
            }}
        />
    );
}
