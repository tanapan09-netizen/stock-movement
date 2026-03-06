import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type NotificationItem = {
    id: string;
    type: 'low_stock' | 'po_update' | 'borrow' | 'info' | 'maintenance' | 'part_request' | 'petty_cash';
    title: string;
    message: string;
    time: Date;
    read: boolean;
};

export async function GET() {
    try {
        const session = await auth();
        const role = (session?.user as any)?.role || 'employee';
        const isApprover = (session?.user as any)?.is_approver || false;
        const userName = session?.user?.name || '';

        const notifications: NotificationItem[] = [];

        // ===================================================
        // Admin / Manager — see everything
        // ===================================================
        const isAdminOrManager = role === 'admin' || role === 'manager';

        // ===================================================
        // LOW STOCK — Admin, Manager, Operation, Purchasing
        // ===================================================
        if (isAdminOrManager || role === 'operation' || role === 'purchasing') {
            const lowStockProducts = await prisma.tbl_products.findMany({
                where: { active: true },
                select: { p_id: true, p_name: true, p_count: true, safety_stock: true },
                take: 10,
            });

            lowStockProducts.forEach(product => {
                if (product.p_count <= (product.safety_stock || 0)) {
                    notifications.push({
                        id: `low_stock_${product.p_id}`,
                        type: 'low_stock',
                        title: 'สต็อกต่ำ',
                        message: `${product.p_name} เหลือ ${product.p_count} ชิ้น`,
                        time: new Date(),
                        read: false,
                    });
                }
            });
        }

        // ===================================================
        // PO UPDATES — Admin, Manager, Purchasing, Accounting
        // ===================================================
        if (isAdminOrManager || role === 'purchasing' || role === 'accounting') {
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
        if (isAdminOrManager || role === 'operation') {
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
                    title: 'รอคืนสินค้า',
                    message: `${borrow.borrower_name} ยังไม่คืนสินค้า`,
                    time: borrow.borrow_date,
                    read: false,
                });
            });
        }

        // Employee — show their own borrow status only
        if (role === 'employee' && userName) {
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
        if (isAdminOrManager || role === 'technician' || role === 'head_technician' || isApprover) {
            const pendingMaintenance = await prisma.tbl_maintenance_requests.count({
                where: { status: 'pending' },
            });

            if (pendingMaintenance > 0) {
                notifications.push({
                    id: `maintenance_pending`,
                    type: 'maintenance',
                    title: 'งานซ่อมรอดำเนินการ',
                    message: `มี ${pendingMaintenance} งานที่รอรับมอบหมาย`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        // Part requests — Approvers only
        if (isAdminOrManager || isApprover || role === 'head_technician' || role === 'purchasing') {
            const pendingParts = await prisma.tbl_part_requests.count({
                where: { status: 'pending' },
            });

            if (pendingParts > 0) {
                notifications.push({
                    id: `part_requests_pending`,
                    type: 'part_request',
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
        if (isAdminOrManager || role === 'accounting') {
            const pendingPettyCash = await prisma.tbl_petty_cash.count({
                where: { status: 'pending' },
            }).catch(() => 0);

            if (pendingPettyCash > 0) {
                notifications.push({
                    id: `petty_cash_pending`,
                    type: 'petty_cash',
                    title: 'เบิกเงินสดย่อยรอดำเนินการ',
                    message: `มี ${pendingPettyCash} รายการรออนุมัติ`,
                    time: new Date(),
                    read: false,
                });
            }
        }

        // Sort by time descending
        notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json([]);
    }
}
