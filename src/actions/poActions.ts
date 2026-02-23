'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { tbl_purchase_orders_status } from '@prisma/client';

type POItemInput = {
    p_id: string;
    quantity: number;
    unit_price: number;
};

export async function createPO(formData: FormData) {
    const session = await auth();
    if (!session || !session.user) {
        return { error: 'Unauthorized' };
    }

    const supplier_id = parseInt(formData.get('supplier_id') as string);
    const po_number = formData.get('po_number') as string;
    const order_date = formData.get('order_date') as string;
    const notes = formData.get('notes') as string;

    const itemsJson = formData.get('items') as string;
    let items: POItemInput[] = [];
    try {
        items = JSON.parse(itemsJson);
    } catch (e) {
        return { error: 'Invalid items data' };
    }

    if (!supplier_id || !po_number || items.length === 0) {
        return { error: 'Missing required fields' };
    }

    try {
        // Check if PO Number exists
        const existing = await prisma.tbl_purchase_orders.findUnique({
            where: { po_number }
        });
        if (existing) return { error: 'เลขที่ใบสั่งซื้อซ้ำ' };

        let total_amount = 0;
        items.forEach(i => {
            total_amount += (i.quantity * i.unit_price);
        });

        await prisma.$transaction(async (tx) => {
            const po = await tx.tbl_purchase_orders.create({
                data: {
                    po_number,
                    supplier_id,
                    order_date: new Date(order_date),
                    status: 'draft',
                    total_amount,
                    notes,
                    created_by: session.user?.name,
                }
            });

            for (const item of items) {
                await tx.tbl_po_items.create({
                    data: {
                        po_id: po.po_id,
                        p_id: item.p_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        line_total: item.quantity * item.unit_price,
                        received_qty: 0
                    }
                });
            }
        });

    } catch (error: any) {
        console.error('Create PO failed:', error);
        return { error: 'สร้างใบสั่งซื้อล้มเหลว' };
    }

    revalidatePath('/purchase-orders');
    return { success: true };
}

export async function receivePO(po_id: number) {
    const session = await auth();
    const username = session?.user?.name || 'System';

    try {
        await prisma.$transaction(async (tx) => {
            const po = await tx.tbl_purchase_orders.findUnique({
                where: { po_id },
            });

            if (!po) throw new Error('PO Not Found');
            if (po.status === 'received') throw new Error('PO Already Received');

            // Fetch items separately to avoid TS include error
            const items = await tx.tbl_po_items.findMany({
                where: { po_id }
            });

            // Update Items and Stock
            for (const item of items) {
                // Assuming full receive for simplicity
                await tx.tbl_po_items.update({
                    where: { item_id: item.item_id },
                    data: { received_qty: item.quantity }
                });

                // Update Stock
                await tx.tbl_products.update({
                    where: { p_id: item.p_id },
                    data: { p_count: { increment: item.quantity } }
                });

                // Force create log (even though type might string mismatch, using 'รับเข้า')
                await tx.tbl_product_movements.create({
                    data: {
                        p_id: item.p_id,
                        movement_type: 'รับเข้า',
                        quantity: item.quantity,
                        remarks: `รับสินค้าจาก PO #${po.po_number}`,
                        username,
                        movement_time: new Date()
                    }
                });
            }

            // Update PO Status
            await tx.tbl_purchase_orders.update({
                where: { po_id },
                data: {
                    status: 'received',
                    received_date: new Date(),
                    approved_by: username // Using approved_by as receiver for now
                }
            });
        });
    } catch (error: any) {
        return { error: error.message || 'Receive Failed' };
    }
    revalidatePath('/purchase-orders');
    return { success: true };
}

export async function updatePO(formData: FormData) {
    const session = await auth();
    if (!session || !session.user) {
        return { error: 'Unauthorized' };
    }

    const po_id = parseInt(formData.get('po_id') as string);
    const supplier_id = parseInt(formData.get('supplier_id') as string);
    const po_number = formData.get('po_number') as string;
    const order_date = formData.get('order_date') as string;
    const expected_date = formData.get('expected_date') as string;
    const status = formData.get('status') as tbl_purchase_orders_status;
    const notes = formData.get('notes') as string;
    const total_amount = parseFloat(formData.get('total_amount') as string);

    const itemsJson = formData.get('items') as string;
    let items: POItemInput[] = [];
    try {
        items = JSON.parse(itemsJson);
    } catch (e) {
        return { error: 'Invalid items data' };
    }

    if (!po_id || !supplier_id || !po_number || items.length === 0) {
        return { error: 'Missing required fields' };
    }

    try {
        const existing = await prisma.tbl_purchase_orders.findUnique({ where: { po_id } });
        if (!existing) return { error: 'PO Not Found' };

        // Prevent editing if already received or partially received (logic varies, but safety first)
        if (existing.status === 'received') {
            return { error: 'Cannot edit received PO' };
        }

        await prisma.$transaction(async (tx) => {
            // Update PO Header
            await tx.tbl_purchase_orders.update({
                where: { po_id },
                data: {
                    po_number,
                    supplier_id,
                    order_date: new Date(order_date),
                    expected_date: expected_date ? new Date(expected_date) : null,
                    status,
                    total_amount,
                    notes,
                    updated_at: new Date()
                }
            });

            // Update Items: Delete all and Re-create (Simplest for full form submission)
            // Note: This resets received_qty to 0, which is fine since we blocked editing if status is received.
            await tx.tbl_po_items.deleteMany({ where: { po_id } });

            for (const item of items) {
                await tx.tbl_po_items.create({
                    data: {
                        po_id: po_id,
                        p_id: item.p_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        line_total: item.quantity * item.unit_price,
                        received_qty: 0
                    }
                });
            }
        });

    } catch (error: any) {
        console.error('Update PO failed:', error);
        return { error: 'แก้ไขใบสั่งซื้อล้มเหลว' };
    }

    revalidatePath('/purchase-orders');
    revalidatePath(`/purchase-orders/${po_id}`);
    return { success: true };
}

export async function deletePO(po_id: number) {
    const session = await auth();
    if (!session || !session.user) {
        return { error: 'Unauthorized' };
    }

    try {
        const po = await prisma.tbl_purchase_orders.findUnique({ where: { po_id } });
        if (!po) return { error: 'PO Not Found' };

        if (po.status === 'received') {
            return { error: 'Cannot delete received PO' };
        }

        await prisma.$transaction(async (tx) => {
            await tx.tbl_po_items.deleteMany({ where: { po_id } });
            await tx.tbl_purchase_orders.delete({ where: { po_id } });
        });

    } catch (error: any) {
        console.error('Delete PO failed:', error);
        return { error: 'ลบใบสั่งซื้อล้มเหลว' };
    }

    revalidatePath('/purchase-orders');
    return { success: true };
}
