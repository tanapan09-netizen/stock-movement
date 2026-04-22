import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import { resolveAuthenticatedUserId } from '@/lib/server/auth-user';
import { normalizeRole } from '@/lib/roles';
import type { Prisma } from '@prisma/client';
import { GENERAL_REQUEST_ONLY_TAG } from '@/lib/maintenance-request-scope';
import {
    canViewBorrowNotifications,
    canViewGeneralMaintenanceNotifications,
    canViewLowStockNotifications,
    canViewMaintenanceNotifications,
    canViewOwnBorrowNotifications,
    canViewPartRequestNotifications,
    canViewPettyCashNotifications,
    canViewPurchaseApprovalNotifications,
    canViewPurchaseOrderNotifications,
    isMaintenanceTechnician,
} from '@/lib/rbac';

type NotificationModule =
    | 'products'
    | 'purchase_orders'
    | 'borrow'
    | 'maintenance'
    | 'part_requests'
    | 'petty_cash'
    | 'approvals'
    | 'dashboard';

type NotificationItem = {
    id: string;
    type: 'low_stock' | 'po_update' | 'borrow' | 'info' | 'maintenance' | 'part_request' | 'petty_cash';
    module: NotificationModule;
    title: string;
    message: string;
    time: Date;
    read: boolean;
};

type NotificationsResponse = {
    items: NotificationItem[];
    unreadCount: number;
};

const ALLOWED_REQUESTED_MODULES = new Set<NotificationModule | 'all'>([
    'products',
    'purchase_orders',
    'borrow',
    'maintenance',
    'part_requests',
    'petty_cash',
    'approvals',
    'dashboard',
    'all',
]);

function normalizeRequestedModule(rawValue: string | null): NotificationModule | 'all' {
    if (!rawValue) return 'all';
    return ALLOWED_REQUESTED_MODULES.has(rawValue as NotificationModule | 'all')
        ? (rawValue as NotificationModule | 'all')
        : 'all';
}

function shouldLoadModule(requestedModule: NotificationModule | 'all', currentModule: NotificationModule): boolean {
    return requestedModule === 'all' || requestedModule === 'dashboard' || requestedModule === currentModule;
}

export async function GET(request: Request) {
    try {
        const requestedModule = normalizeRequestedModule(new URL(request.url).searchParams.get('module'));
        const session = await auth();
        const permissionContext = await getUserPermissionContext(session?.user);
        const role = permissionContext.role || 'employee';
        const normalizedRole = normalizeRole(role);
        const isApprover = permissionContext.isApprover;
        const permissions = permissionContext.permissions;
        const userName = session?.user?.name || '';
        const sessionUserId = await resolveAuthenticatedUserId(session?.user);

        const isManagerView = ['owner', 'admin', 'manager'].includes(normalizedRole);
        const isTechnicianView = isMaintenanceTechnician(normalizedRole) || normalizedRole === 'leader_technician';
        const isStoreView = ['store', 'leader_store'].includes(normalizedRole);
        const isPurchasingView = ['purchasing', 'leader_purchasing'].includes(normalizedRole);
        const isGeneralRequesterView = ['general', 'leader_general', 'employee', 'leader_employee', 'gardener', 'leader_gardener'].includes(normalizedRole);
        const isEmployeeReceiverView = ['employee', 'leader_employee'].includes(normalizedRole);

        const notifications: NotificationItem[] = [];

        if (shouldLoadModule(requestedModule, 'products') && canViewLowStockNotifications(role, permissions)) {
            const products = await prisma.tbl_products.findMany({
                where: { active: true },
                select: { p_id: true, p_name: true, p_count: true, safety_stock: true },
            });

            products.forEach(product => {
                const stock = product.p_count ?? 0;
                const safety = product.safety_stock ?? 0;
                if (stock < safety) {
                    notifications.push({
                        id: `low_stock_${product.p_id}`,
                        type: 'low_stock',
                        module: 'products',
                        title: 'สต็อกต่ำ',
                        message: `${product.p_name} เหลือ ${stock} ชิ้น (เกณฑ์ ${safety})`,
                        time: new Date(),
                        read: false,
                    });
                }
            });
        }

        if (shouldLoadModule(requestedModule, 'purchase_orders') && canViewPurchaseOrderNotifications(role, permissions)) {
            const recentPOs = await prisma.tbl_purchase_orders.findMany({
                where: { status: { in: ['approved', 'ordered', 'received'] } },
                orderBy: { updated_at: 'desc' },
                take: 3,
                select: { po_id: true, po_number: true, status: true, updated_at: true },
            });

            const statusMap: Record<string, string> = {
                approved: 'ได้รับการอนุมัติ',
                ordered: 'สั่งซื้อแล้ว',
                received: 'รับสินค้าแล้ว',
            };

            recentPOs.forEach(po => {
                const statusKey = po.status || 'pending';
                notifications.push({
                    id: `po_${po.po_id}`,
                    type: 'po_update',
                    module: 'purchase_orders',
                    title: `PO ${po.po_number}`,
                    message: `สถานะ: ${statusMap[statusKey] || statusKey}`,
                    time: po.updated_at || new Date(),
                    read: false,
                });
            });
        }

        if (shouldLoadModule(requestedModule, 'borrow') && canViewBorrowNotifications(role)) {
            const pendingReturns = await prisma.tbl_borrow_requests.findMany({
                where: { status: 'borrowed' },
                orderBy: { borrow_date: 'desc' },
                take: 3,
                select: { borrow_id: true, borrower_name: true, borrow_date: true },
            });

            pendingReturns.forEach(borrow => {
                notifications.push({
                    id: `borrow_${borrow.borrow_id}`,
                    type: 'borrow',
                    module: 'borrow',
                    title: 'รอคืนสินค้า',
                    message: `${borrow.borrower_name} ยังไม่คืนสินค้า`,
                    time: borrow.borrow_date,
                    read: false,
                });
            });
        }

        if (shouldLoadModule(requestedModule, 'borrow') && canViewOwnBorrowNotifications(role) && userName) {
            const myBorrows = await prisma.tbl_borrow_requests.findMany({
                where: { status: 'borrowed', borrower_name: userName },
                orderBy: { borrow_date: 'desc' },
                take: 3,
                select: { borrow_id: true, borrower_name: true, borrow_date: true },
            });

            myBorrows.forEach(borrow => {
                notifications.push({
                    id: `borrow_my_${borrow.borrow_id}`,
                    type: 'borrow',
                    module: 'borrow',
                    title: 'รอคืนสินค้า',
                    message: 'คุณยังไม่ได้คืนสินค้าที่ยืมไป',
                    time: borrow.borrow_date,
                    read: false,
                });
            });
        }

        if (
            shouldLoadModule(requestedModule, 'maintenance')
            && canViewMaintenanceNotifications(role, permissions, isApprover)
            && (isManagerView || isTechnicianView || isApprover)
        ) {
            const maintenanceWhere: Prisma.tbl_maintenance_requestsWhereInput = {
                status: 'pending',
                category: { not: 'general' },
                AND: [{
                    OR: [
                        { tags: null },
                        { NOT: { tags: { contains: GENERAL_REQUEST_ONLY_TAG } } },
                    ],
                }],
            };

            if (!isManagerView && !isApprover && isTechnicianView) {
                maintenanceWhere.OR = userName
                    ? [{ assigned_to: null }, { assigned_to: userName }]
                    : [{ assigned_to: null }];
            }

            const pendingMaintenance = await prisma.tbl_maintenance_requests.findMany({
                where: maintenanceWhere,
                orderBy: { created_at: 'desc' },
                take: 10,
                select: {
                    request_id: true,
                    request_number: true,
                    title: true,
                    reported_by: true,
                    created_at: true,
                    tbl_rooms: {
                        select: {
                            room_code: true,
                            room_name: true,
                        },
                    },
                },
            });

            pendingMaintenance.forEach(item => {
                notifications.push({
                    id: `maintenance_request_${item.request_id}`,
                    type: 'maintenance',
                    module: 'maintenance',
                    title: `งานแจ้งซ่อม ${item.request_number}`,
                    message: `${item.title} - ${item.tbl_rooms?.room_code || '-'} ${item.tbl_rooms?.room_name || ''} โดย ${item.reported_by}`,
                    time: item.created_at || new Date(),
                    read: false,
                });
            });

            if (pendingMaintenance.length > 0) {
                notifications.push({
                    id: 'maintenance_pending',
                    type: 'maintenance',
                    module: 'maintenance',
                    title: 'งานซ่อมรอดำเนินการ',
                    message: `มี ${pendingMaintenance.length} งานที่รอรับมอบหมาย`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        if (shouldLoadModule(requestedModule, 'maintenance') && canViewGeneralMaintenanceNotifications(role) && (isManagerView || isGeneralRequesterView)) {
            const generalWhere: Prisma.tbl_maintenance_requestsWhereInput = {
                status: 'pending',
                OR: [
                    { tags: { contains: GENERAL_REQUEST_ONLY_TAG } },
                    { category: 'general' },
                ],
            };

            if (!isManagerView && !isEmployeeReceiverView) {
                generalWhere.reported_by = userName || '__UNKNOWN_USER__';
            }

            const generalRequests = await prisma.tbl_maintenance_requests.findMany({
                where: generalWhere,
                orderBy: { created_at: 'desc' },
                take: 10,
                select: {
                    request_id: true,
                    request_number: true,
                    title: true,
                    reported_by: true,
                    created_at: true,
                    tbl_rooms: {
                        select: {
                            room_code: true,
                            room_name: true,
                        },
                    },
                },
            });

            generalRequests.forEach(item => {
                notifications.push({
                    id: `general_request_${item.request_id}`,
                    type: 'maintenance',
                    module: 'maintenance',
                    title: `งานแจ้งซ่อมทั่วไป ${item.request_number}`,
                    message: `${item.title} - ${item.tbl_rooms?.room_code || '-'} ${item.tbl_rooms?.room_name || ''} โดย ${item.reported_by}`,
                    time: item.created_at || new Date(),
                    read: false,
                });
            });
        }

        if (shouldLoadModule(requestedModule, 'approvals') && canViewPurchaseApprovalNotifications(role, permissions, isApprover)) {
            const pendingPurchaseRequests = await prisma.tbl_approval_requests.count({
                where: {
                    request_type: 'purchase',
                    status: 'pending',
                },
            });

            if (pendingPurchaseRequests > 0) {
                notifications.push({
                    id: 'purchase_requests_pending',
                    type: 'info',
                    module: 'approvals',
                    title: 'คำขอซื้อรอพิจารณา',
                    message: `มี ${pendingPurchaseRequests} รายการรอฝ่ายจัดซื้อดำเนินการ`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        if (shouldLoadModule(requestedModule, 'part_requests') && canViewPartRequestNotifications(role, permissions, isApprover)) {
            const canSeeMaintenanceWithdrawalNotifications = isManagerView || isStoreView || isTechnicianView || isApprover;
            const canSeePurchasePartNotifications = isManagerView || isPurchasingView || isApprover;

            const maintenanceWithdrawalWhere: {
                status: string;
                request_type: string;
                requested_by?: string;
            } = {
                status: 'pending',
                request_type: 'maintenance_withdrawal',
            };

            if (isTechnicianView && !isManagerView && !isApprover) {
                maintenanceWithdrawalWhere.requested_by = userName || '__UNKNOWN_USER__';
            }

            const maintenanceDecisionWhere = (isTechnicianView && userName)
                ? {
                    request_type: 'maintenance_withdrawal',
                    requested_by: userName,
                    status: { in: ['approved', 'rejected'] as string[] },
                    updated_at: {
                        gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
                    },
                }
                : null;

            const [pendingMaintenanceWithdrawals, pendingPurchaseParts, maintenanceWithdrawalDecisions] = await Promise.all([
                canSeeMaintenanceWithdrawalNotifications
                    ? prisma.tbl_part_requests.count({ where: maintenanceWithdrawalWhere })
                    : Promise.resolve(0),
                canSeePurchasePartNotifications
                    ? prisma.tbl_part_requests.count({
                        where: {
                            status: 'pending',
                            OR: [
                                { request_type: null },
                                { request_type: { not: 'maintenance_withdrawal' } },
                            ],
                        },
                    })
                    : Promise.resolve(0),
                maintenanceDecisionWhere
                    ? prisma.tbl_part_requests.findMany({
                        where: maintenanceDecisionWhere,
                        orderBy: { updated_at: 'desc' },
                        take: 8,
                        select: {
                            request_id: true,
                            item_name: true,
                            quantity: true,
                            status: true,
                            updated_at: true,
                            tbl_maintenance_requests: {
                                select: {
                                    request_number: true,
                                    tbl_rooms: {
                                        select: {
                                            room_code: true,
                                            room_name: true,
                                        },
                                    },
                                },
                            },
                        },
                    })
                    : Promise.resolve([]),
            ]);

            if (pendingMaintenanceWithdrawals > 0) {
                notifications.push({
                    id: 'part_requests_maintenance_pending',
                    type: 'part_request',
                    module: 'part_requests',
                    title: 'คำขอเบิกอะไหล่งานซ่อม',
                    message: `มี ${pendingMaintenanceWithdrawals} รายการรอคลังยืนยัน`,
                    time: new Date(),
                    read: false,
                });
            }

            if (pendingPurchaseParts > 0) {
                notifications.push({
                    id: 'part_requests_purchase_pending',
                    type: 'part_request',
                    module: 'part_requests',
                    title: 'ใบขออนุมัติซื้ออะไหล่',
                    message: `มี ${pendingPurchaseParts} รายการรออนุมัติ`,
                    time: new Date(),
                    read: false,
                });
            }

            maintenanceWithdrawalDecisions.forEach((item) => {
                const statusLabel = item.status === 'approved' ? 'พร้อมจ่ายแล้ว' : 'ไม่พร้อมจ่าย';
                const maintenanceRequestNumber = item.tbl_maintenance_requests?.request_number || '-';
                const roomCode = item.tbl_maintenance_requests?.tbl_rooms?.room_code || '-';
                const roomName = item.tbl_maintenance_requests?.tbl_rooms?.room_name || '';

                notifications.push({
                    id: `part_requests_maintenance_decision_${item.request_id}_${item.status}_${new Date(item.updated_at || new Date()).getTime()}`,
                    type: 'part_request',
                    module: 'part_requests',
                    title: `คลังตอบกลับคำขอเบิกอะไหล่ (${statusLabel})`,
                    message: `${item.item_name} x${item.quantity} | ใบงาน ${maintenanceRequestNumber} | ห้อง ${roomCode}${roomName ? ` - ${roomName}` : ''}`,
                    time: item.updated_at || new Date(),
                    read: false,
                });
            });
        }

        if (shouldLoadModule(requestedModule, 'petty_cash') && canViewPettyCashNotifications(role, permissions)) {
            const pendingPettyCash = await prisma.tbl_petty_cash.count({
                where: { status: 'pending' },
            }).catch(() => 0);

            if (pendingPettyCash > 0) {
                notifications.push({
                    id: 'petty_cash_pending',
                    type: 'petty_cash',
                    module: 'petty_cash',
                    title: 'เบิกเงินสดย่อยรอดำเนินการ',
                    message: `มี ${pendingPettyCash} รายการรออนุมัติ`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        const readIdSet = new Set<string>();
        if (sessionUserId && notifications.length > 0) {
            const readRows = await prisma.tbl_notification_reads.findMany({
                where: {
                    user_id: sessionUserId,
                    notification_id: { in: notifications.map(notification => notification.id) },
                },
                select: { notification_id: true },
            });

            readRows.forEach(row => {
                readIdSet.add(row.notification_id);
            });
        }

        const items = notifications
            .map(notification => ({
                ...notification,
                read: readIdSet.has(notification.id),
            }))
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        const unreadCount = items.reduce((count, notification) => count + (notification.read ? 0 : 1), 0);

        const response: NotificationsResponse = {
            items,
            unreadCount,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json<NotificationsResponse>({ items: [], unreadCount: 0 });
    }
}

