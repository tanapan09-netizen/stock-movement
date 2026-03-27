'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditPurchaseOrders, canReceivePurchaseOrders } from '@/lib/rbac';
import { tbl_purchase_orders_status } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

type POItemInput = {
    p_id: string;
    quantity: number;
    unit_price: number;
};

type SessionUserLike = {
    id?: string;
    role?: string;
    name?: string | null;
};

function parseItems(itemsJson: string): POItemInput[] | null {
    try {
        return JSON.parse(itemsJson) as POItemInput[];
    } catch {
        return null;
    }
}

export async function createPO(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }

    const user = session.user as SessionUserLike;
    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canEditPurchaseOrders(permissionContext.permissions)) {
        return { error: 'Permission denied' };
    }

    const createdByUserId = Number.parseInt(user.id || '', 10);
    const supplier_id = parseInt(formData.get('supplier_id') as string, 10);
    const po_number = formData.get('po_number') as string;
    const order_date = formData.get('order_date') as string;
    const notes = formData.get('notes') as string;
    const items = parseItems((formData.get('items') as string) || '');

    if (!supplier_id || !po_number || !items?.length) {
        return { error: 'Missing required fields' };
    }

    try {
        const existing = await prisma.tbl_purchase_orders.findUnique({
            where: { po_number },
        });
        if (existing) return { error: 'เลขที่ใบสั่งซื้อซ้ำ' };

        const subtotal = parseFloat(formData.get('subtotal') as string) || 0;
        const tax_amount = parseFloat(formData.get('tax_amount') as string) || 0;
        const total_amount = parseFloat(formData.get('total_amount') as string) || 0;
        let createdPOId: number | null = null;

        await prisma.$transaction(async (tx) => {
            const po = await tx.tbl_purchase_orders.create({
                data: {
                    po_number,
                    supplier_id,
                    created_by_user_id: Number.isNaN(createdByUserId) ? null : createdByUserId,
                    order_date: new Date(order_date),
                    status: 'draft',
                    subtotal,
                    tax_amount,
                    total_amount,
                    notes,
                    created_by: user.name,
                },
            });
            createdPOId = po.po_id;

            await tx.tbl_po_approval_logs.create({
                data: {
                    po_id: po.po_id,
                    step_key: 'draft',
                    action: 'created',
                    actor_name: user.name || null,
                    actor_role: user.role || null,
                    note: 'PO created',
                },
            });

            for (const item of items ?? []) {
                await tx.tbl_po_items.create({
                    data: {
                        po_id: po.po_id,
                        p_id: item.p_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        line_total: item.quantity * item.unit_price,
                        received_qty: 0,
                    },
                });
            }
        });
        revalidatePath('/purchase-orders');
        return { success: true, poId: createdPOId };
    } catch (error) {
        console.error('Create PO failed:', error);
        return { error: 'สร้างใบสั่งซื้อล้มเหลว' };
    }

    revalidatePath('/purchase-orders');
    return { success: true };
}

export async function receivePO(po_id: number) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }

    const user = session.user as SessionUserLike;
    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canReceivePurchaseOrders(permissionContext.permissions)) {
        return { error: 'Permission denied' };
    }

    const username = user.name || 'System';

    try {
        await prisma.$transaction(async (tx) => {
            const po = await tx.tbl_purchase_orders.findUnique({
                where: { po_id },
            });

            if (!po) throw new Error('PO Not Found');
            if (po.status === 'received') throw new Error('PO Already Received');

            const items = await tx.tbl_po_items.findMany({
                where: { po_id },
            });

            for (const item of items) {
                await tx.tbl_po_items.update({
                    where: { item_id: item.item_id },
                    data: { received_qty: item.quantity },
                });

                await tx.tbl_products.update({
                    where: { p_id: item.p_id },
                    data: { p_count: { increment: item.quantity } },
                });

                await tx.tbl_product_movements.create({
                    data: {
                        p_id: item.p_id,
                        movement_type: 'รับเข้า',
                        quantity: item.quantity,
                        remarks: `รับสินค้าจาก PO #${po.po_number}`,
                        username,
                        movement_time: new Date(),
                    },
                });
            }

            await tx.tbl_purchase_orders.update({
                where: { po_id },
                data: {
                    status: 'received',
                    received_date: new Date(),
                    approved_by: username,
                },
            });

            await tx.tbl_po_approval_logs.create({
                data: {
                    po_id,
                    step_key: 'received',
                    action: 'received',
                    actor_name: username,
                    actor_role: user.role || null,
                    note: 'Goods received',
                },
            });
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Receive Failed' };
    }

    revalidatePath('/purchase-orders');
    return { success: true };
}

export async function updatePO(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }

    const user = session.user as SessionUserLike;
    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canEditPurchaseOrders(permissionContext.permissions)) {
        return { error: 'Permission denied' };
    }

    const po_id = parseInt(formData.get('po_id') as string, 10);
    const supplier_id = parseInt(formData.get('supplier_id') as string, 10);
    const po_number = formData.get('po_number') as string;
    const order_date = formData.get('order_date') as string;
    const expected_date = formData.get('expected_date') as string;
    const status = formData.get('status') as tbl_purchase_orders_status;
    const notes = formData.get('notes') as string;
    const subtotal = parseFloat(formData.get('subtotal') as string) || 0;
    const tax_amount = parseFloat(formData.get('tax_amount') as string) || 0;
    const total_amount = parseFloat(formData.get('total_amount') as string) || 0;
    const items = parseItems((formData.get('items') as string) || '');

    if (!po_id || !supplier_id || !po_number || !items?.length) {
        return { error: 'Missing required fields' };
    }

    try {
        const existing = await prisma.tbl_purchase_orders.findUnique({ where: { po_id } });
        if (!existing) return { error: 'PO Not Found' };
        if (existing.status === 'received') return { error: 'Cannot edit received PO' };

        await prisma.$transaction(async (tx) => {
            await tx.tbl_purchase_orders.update({
                where: { po_id },
                data: {
                    po_number,
                    supplier_id,
                    order_date: new Date(order_date),
                    expected_date: expected_date ? new Date(expected_date) : null,
                    status,
                    subtotal,
                    tax_amount,
                    total_amount,
                    notes,
                    updated_at: new Date(),
                },
            });

            const nextStatus = String(status || existing.status || 'draft');
            if (existing.status !== nextStatus) {
                await tx.tbl_po_approval_logs.create({
                    data: {
                        po_id,
                        step_key: nextStatus,
                        action: 'status_changed',
                        actor_name: user.name || null,
                        actor_role: user.role || null,
                        note: `Status changed from ${existing.status} to ${nextStatus}`,
                    },
                });
            }

            await tx.tbl_po_items.deleteMany({ where: { po_id } });

            for (const item of items) {
                await tx.tbl_po_items.create({
                    data: {
                        po_id,
                        p_id: item.p_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        line_total: item.quantity * item.unit_price,
                        received_qty: 0,
                    },
                });
            }
        });
    } catch (error) {
        console.error('Update PO failed:', error);
        return { error: 'แก้ไขใบสั่งซื้อล้มเหลว' };
    }

    revalidatePath('/purchase-orders');
    revalidatePath(`/purchase-orders/${po_id}`);
    return { success: true };
}

export async function deletePO(po_id: number) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }

    const user = session.user as SessionUserLike;
    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canEditPurchaseOrders(permissionContext.permissions)) {
        return { error: 'Permission denied' };
    }

    try {
        const po = await prisma.tbl_purchase_orders.findUnique({ where: { po_id } });
        if (!po) return { error: 'PO Not Found' };
        if (po.status === 'received') return { error: 'Cannot delete received PO' };

        await prisma.$transaction(async (tx) => {
            await tx.tbl_po_items.deleteMany({ where: { po_id } });
            await tx.tbl_purchase_orders.delete({ where: { po_id } });
        });
    } catch (error) {
        console.error('Delete PO failed:', error);
        return { error: 'ลบใบสั่งซื้อล้มเหลว' };
    }

    revalidatePath('/purchase-orders');
    return { success: true };
}
