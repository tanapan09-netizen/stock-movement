import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { requestId, returnDate, items } = body;

        if (!requestId || !items || items.length === 0) {
            return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
        }

        // Process each item return
        for (const item of items) {
            const { itemId, qty } = item;

            // Get the borrow item
            const borrowItem = await prisma.borrow_items.findUnique({
                where: { id: itemId }
            });

            if (!borrowItem) continue;

            const currentReturnedQty = borrowItem.returned_qty || 0;
            const newReturnedQty = currentReturnedQty + qty;

            // Update borrow item with returned quantity
            await prisma.borrow_items.update({
                where: { id: itemId },
                data: {
                    returned_qty: newReturnedQty,
                    returned_at: new Date(returnDate)
                }
            });

            // Return stock to product
            await prisma.tbl_products.update({
                where: { p_id: borrowItem.p_id },
                data: {
                    p_count: { increment: qty }
                }
            });

            // Create movement record for the return
            await prisma.tbl_stock_movements.create({
                data: {
                    p_id: borrowItem.p_id,
                    username: 'system',
                    movement_type: 'in',
                    quantity: qty,
                    remarks: `คืนสินค้าจากการยืม #${requestId} (${new Date(returnDate).toLocaleDateString('th-TH')})`,
                    movement_time: new Date()
                }
            });
        }

        // Check if all items are fully returned
        const borrowRequest = await prisma.borrow_requests.findUnique({
            where: { id: requestId },
            include: { borrow_items: true }
        });

        if (borrowRequest) {
            const allReturned = borrowRequest.borrow_items.every(
                item => (item.returned_qty || 0) >= item.qty
            );

            if (allReturned) {
                await prisma.borrow_requests.update({
                    where: { id: requestId },
                    data: {
                        status: 'returned',
                        returned_at: new Date(returnDate)
                    }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Return error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการคืนสินค้า' }, { status: 500 });
    }
}
