import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getUserPermissionContext } from '@/lib/server/permission-service';
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

export async function GET(request: Request) {
    try {
        const requestedModule = new URL(request.url).searchParams.get('module') as NotificationModule | 'all' | null;
        const session = await auth();
        const permissionContext = await getUserPermissionContext(session?.user);
        const role = permissionContext.role || 'employee';
        const isApprover = permissionContext.isApprover;
        const permissions = permissionContext.permissions;
        const userName = session?.user?.name || '';

        const notifications: NotificationItem[] = [];

        // ===================================================
        // Admin / Manager / Owner — see everything
        // ===================================================

        // ===================================================
        // LOW STOCK — Admin, Manager, Operation, Purchasing
        // ===================================================
        if (canViewLowStockNotifications(role, permissions)) {
            // Since Prisma doesn't support column comparison in where,
            // we fetch all active products and filter in JS (assuming count is manageable)
            // or fetch a larger batch to improve chances of finding low stock items.
            const products = await prisma.tbl_products.findMany({
                where: { active: true },
                select: { p_id: true, p_name: true, p_count: true, safety_stock: true },
            });

            products.forEach(product => {
                const stock = product.p_count ?? 0;
                const safety = product.safety_stock ?? 0;
                if (stock <= safety) {
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

        // ===================================================
        // PO UPDATES — Admin, Manager, Purchasing, Accounting
        // ===================================================
        if (canViewPurchaseOrderNotifications(role, permissions)) {
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

        // ===================================================
        // BORROW RETURNS — Admin, Manager, Operation, Employee (own)
        // ===================================================
        if (canViewBorrowNotifications(role)) {
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

        // Employee — show their own borrow status only
        if (canViewOwnBorrowNotifications(role) && userName) {
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
                    message: `คุณยังไม่ได้คืนสินค้าที่ยืมไป`,
                    time: borrow.borrow_date,
                    read: false,
                });
            });
        }

        // ===================================================
        // MAINTENANCE / PART REQUESTS — Technician, Head Tech, Approver
        // ===================================================
        if (canViewMaintenanceNotifications(role, permissions, isApprover)) {
            const maintenanceWhere: any = {
                status: 'pending',
                category: { not: 'general' },
            };

            // Technician: show only unassigned or assigned-to-me (avoid mixing other tech jobs)
            if (!isApprover && isMaintenanceTechnician(role)) {
                maintenanceWhere.OR = userName
                    ? [{ assigned_to: null }, { assigned_to: userName }]
                    : [{ assigned_to: null }];
            }

            const pendingMaintenance = await prisma.tbl_maintenance_requests.findMany({
                where: {
                    ...maintenanceWhere,
                },
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
                        }
                    }
                }
            });

            pendingMaintenance.forEach(request => {
                notifications.push({
                    id: `maintenance_request_${request.request_id}`,
                    type: 'maintenance',
                    module: 'maintenance',
                    title: `งานแจ้งซ่อม ${request.request_number}`,
                    message: `${request.title} - ${request.tbl_rooms?.room_code || '-'} ${request.tbl_rooms?.room_name || ''} โดย ${request.reported_by}`,
                    time: request.created_at || new Date(),
                    read: false,
                });
            });

            if (pendingMaintenance.length > 0) {
                notifications.push({
                    id: `maintenance_pending`,
                    type: 'maintenance',
                    module: 'maintenance',
                    title: 'งานซ่อมรอดำเนินการ',
                    message: `มี ${pendingMaintenance.length} งานที่รอรับมอบหมาย`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        // Part requests — Approvers only
        if (canViewGeneralMaintenanceNotifications(role)) {
            const generalRequests = await prisma.tbl_maintenance_requests.findMany({
                where: { category: 'general', status: 'pending' },
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
                        }
                    }
                }
            });

            generalRequests.forEach(request => {
                notifications.push({
                    id: `general_request_${request.request_id}`,
                    type: 'maintenance',
                    module: 'maintenance',
                    title: `งานแจ้งซ่อมทั่วไป ${request.request_number}`,
                    message: `${request.title} - ${request.tbl_rooms?.room_code || '-'} ${request.tbl_rooms?.room_name || ''} โดย ${request.reported_by}`,
                    time: request.created_at || new Date(),
                    read: false,
                });
            });
        }

        if (canViewPurchaseApprovalNotifications(role, permissions, isApprover)) {
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

        if (canViewPartRequestNotifications(role, permissions, isApprover)) {
            const pendingParts = await prisma.tbl_part_requests.count({
                where: { status: 'pending' },
            });

            if (pendingParts > 0) {
                notifications.push({
                    id: `part_requests_pending`,
                    type: 'part_request',
                    module: 'part_requests',
                    title: 'ใบขออนุมัติซื้ออะไหล่',
                    message: `มี ${pendingParts} รายการรออนุมัติ`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        // ===================================================
        // PETTY CASH — Accounting only
        // ===================================================
        if (canViewPettyCashNotifications(role, permissions)) {
            const pendingPettyCash = await prisma.tbl_petty_cash.count({
                where: { status: 'pending' },
            }).catch(() => 0);

            if (pendingPettyCash > 0) {
                notifications.push({
                    id: `petty_cash_pending`,
                    type: 'petty_cash',
                    module: 'petty_cash',
                    title: 'เบิกเงินสดย่อยรอดำเนินการ',
                    message: `มี ${pendingPettyCash} รายการรออนุมัติ`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        const allowedModules: Set<string> = new Set([
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

        const filtered = requestedModule && requestedModule !== 'all' && requestedModule !== 'dashboard' && allowedModules.has(requestedModule)
            ? notifications.filter(n => n.module === requestedModule)
            : notifications;

        // Sort by time descending
        filtered.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return NextResponse.json(filtered);
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json([]);
    }
}
