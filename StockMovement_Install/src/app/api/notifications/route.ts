import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type NotificationItem = {
    id: string;
    type: 'low_stock' | 'po_update' | 'borrow' | 'info';
    title: string;
    message: string;
    time: Date;
    read: boolean;
};

export async function GET() {
    try {
        // Get low stock products
        const lowStockProducts = await prisma.tbl_products.findMany({
            where: {
                active: true,
            },
            select: {
                p_id: true,
                p_name: true,
                p_count: true,
                safety_stock: true
            },
            take: 10
        });

        // Get recent PO updates
        const recentPOs = await prisma.tbl_purchase_orders.findMany({
            where: {
                status: {
                    in: ['approved', 'ordered', 'received']
                }
            },
            orderBy: {
                updated_at: 'desc'
            },
            take: 3,
            select: {
                po_id: true,
                po_number: true,
                status: true,
                updated_at: true
            }
        });

        // Get pending borrows
        const pendingReturns = await prisma.tbl_borrow_requests.findMany({
            where: {
                status: 'borrowed'
            },
            orderBy: {
                borrow_date: 'desc'
            },
            take: 3,
            select: {
                borrow_id: true,
                borrower_name: true,
                borrow_date: true
            }
        });

        // Build notifications
        const notifications: NotificationItem[] = [];

        // Low stock notifications
        lowStockProducts.forEach(product => {
            if (product.p_count <= (product.safety_stock || 0)) {
                notifications.push({
                    id: `low_stock_${product.p_id}`,
                    type: 'low_stock',
                    title: 'สต็อกต่ำ',
                    message: `${product.p_name} เหลือ ${product.p_count} ชิ้น`,
                    time: new Date(),
                    read: false
                });
            }
        });

        // PO notifications
        const statusMap: Record<string, string> = {
            approved: 'ได้รับการอนุมัติ',
            ordered: 'สั่งซื้อแล้ว',
            received: 'รับสินค้าแล้ว'
        };

        recentPOs.forEach(po => {
            const statusKey = po.status || 'pending';
            notifications.push({
                id: `po_${po.po_id}`,
                type: 'po_update',
                title: `PO ${po.po_number}`,
                message: `สถานะ: ${statusMap[statusKey] || statusKey}`,
                time: po.updated_at || new Date(),
                read: false
            });
        });

        // Borrow notifications
        pendingReturns.forEach(borrow => {
            notifications.push({
                id: `borrow_${borrow.borrow_id}`,
                type: 'borrow',
                title: 'รอคืนสินค้า',
                message: `${borrow.borrower_name} ยังไม่คืนสินค้า`,
                time: borrow.borrow_date,
                read: false
            });
        });

        // Sort by time
        notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Notifications error:', error);
        return NextResponse.json([]);
    }
}
