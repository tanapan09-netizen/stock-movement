'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logSystemAction } from '@/lib/logger';

type BorrowItemInput = {
    p_id: string;
    qty: number;
};

export async function createBorrowRequest(formData: FormData) {
    const session = await auth();
    if (!session || !session.user) {
        return { error: 'Unauthorized' };
    }

    const borrower_name = formData.get('borrower_name') as string;
    const note = formData.get('note') as string;

    // Parse items from JSON string (hack for complex form data) or use numbered fields if needed.
    // Better approach: Since we will build a dynamic form, we can submit a JSON string for items.
    const itemsJson = formData.get('items') as string;
    let items: BorrowItemInput[] = [];
    try {
        items = JSON.parse(itemsJson);
    } catch (e) {
        return { error: 'Invalid items data' };
    }

    if (!borrower_name || items.length === 0) {
        return { error: 'กรุณากรอกชื่อผู้ยืมและเลือกสินค้า' };
    }

    try {
        // Transaction
        const request = await prisma.$transaction(async (tx: any) => {
            // 1. Create Request
            const request = await tx.borrow_requests.create({
                data: {
                    borrower_name,
                    note,
                    status: 'pending', // Default status
                    // created_at automatically handled
                },
            });

            // 2. Process Items
            for (const item of items) {
                if (item.qty <= 0) throw new Error(`จำนวนต้องมากกว่า 0 (${item.p_id})`);

                // Check stock
                const product = await tx.tbl_products.findUnique({
                    where: { p_id: item.p_id },
                });

                if (!product) throw new Error(`ไม่พบสินค้า ${item.p_id}`);
                if (product.p_count < item.qty) throw new Error(`สินค้า ${product.p_name} มีไม่พอ (เหลือ ${product.p_count})`);

                // Create Borrow Item
                await tx.borrow_items.create({
                    data: {
                        borrow_request_id: request.id,
                        p_id: item.p_id,
                        qty: item.qty,
                        unit: product.p_unit || 'ชิ้น',
                    },
                });

                // Update Stock
                await tx.tbl_products.update({
                    where: { p_id: product.p_id },
                    data: { p_count: product.p_count - item.qty },
                });

                // Log movement? Legacy doesn't seem to log to tbl_product_movements, but maybe it should?
                // Legacy logs to 'audit_logs'. For now, we mirror legacy: just update stock. 
                // Ideally we should add a movement record too for consistency in stock history.
                // Let's add a movement record for better tracking than legacy!
                await tx.tbl_product_movements.create({
                    data: {
                        p_id: product.p_id,
                        movement_type: 'ออก', // Out
                        quantity: item.qty,
                        remarks: `ยืมโดย ${borrower_name} (Req #${request.id})`,
                        username: session.user?.name || 'System',
                        movement_time: new Date(),
                    }
                });
            }
            return request;
        });

        await logSystemAction(
            'BORROW',
            'BorrowRequest',
            request.id,
            `Created borrow request #${request.id}: ${items.length} items by ${borrower_name}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

    } catch (error: any) {
        console.error('Borrow request failed:', error);
        return { error: error.message || 'สร้างรายการยืมล้มเหลว' };
    }

    revalidatePath('/borrow');
    // redirect('/borrow'); // Redirect handled by client to show toast
    return { success: true };
}

export async function returnBorrowRequest(requestId: number) {
    const session = await auth();
    if (!session || !session.user) {
        return { error: 'Unauthorized' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get Request with Items
            const request = await tx.borrow_requests.findUnique({
                where: { id: requestId },
                include: { borrow_items: true }
            });

            if (!request) throw new Error('ไม่พบรายการยืม');
            if (request.status === 'returned') throw new Error('รายการนี้ถูกคืนแล้ว');

            // 2. Return Items to Stock
            for (const item of request.borrow_items) {
                // Update Product Stock
                await tx.tbl_products.update({
                    where: { p_id: item.p_id },
                    data: { p_count: { increment: item.qty } }
                });

                // Log Movement
                await tx.tbl_product_movements.create({
                    data: {
                        p_id: item.p_id,
                        movement_type: 'รับเข้า', // In (Return)
                        quantity: item.qty,
                        remarks: `คืนสินค้าจาก ${request.borrower_name} (Req #${request.id})`,
                        username: session.user?.name || 'System',
                        movement_time: new Date(),
                    }
                });
            }

            // 3. Update Request Status
            await tx.borrow_requests.update({
                where: { id: requestId },
                data: {
                    status: 'returned',
                    updated_at: new Date()
                }
            });
        });

        await logSystemAction(
            'RETURN',
            'BorrowRequest',
            requestId,
            `Returned borrow request #${requestId}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error: any) {
        console.error('Return failed:', error);
        return { error: error.message || 'คืนสินค้าล้มเหลว' };
    }

    revalidatePath('/borrow');
    return { success: true };
}
