'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canEditPurchaseOrders, canReceivePurchaseOrders } from '@/lib/rbac';
import { buildPurchaseOrderItemNote, isNonStockPurchaseOrderItem, type PurchaseOrderItemKind } from '@/lib/purchase-order-item';
import { tbl_purchase_orders_status } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { resolveAuthenticatedUserId } from '@/lib/server/auth-user';

type POItemInput = {
    p_id: string;
    p_name?: string;
    quantity: number;
    unit_price: number;
    item_type?: PurchaseOrderItemKind;
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

function toIntOrNull(value: FormDataEntryValue | null) {
    if (typeof value !== 'string') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(value: FormDataEntryValue | null) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
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

    const resolvedUserId = await resolveAuthenticatedUserId(session.user);
    const fallbackUserId = Number.parseInt(user.id || '', 10);
    const createdByUserId = resolvedUserId ?? (Number.isNaN(fallbackUserId) ? null : fallbackUserId);
    const supplier_id = parseOptionalInt(formData.get('supplier_id'));
    const po_number = formData.get('po_number') as string;
    const order_date = formData.get('order_date') as string;
    const notes = (formData.get('notes') as string) || '';
    const expected_date = formData.get('expected_date') as string;
    const status = (formData.get('status') as tbl_purchase_orders_status) || 'draft';
    const requestId = toIntOrNull(formData.get('request_id'));
    const requestNumber = (formData.get('request_number') as string | null)?.trim() || null;
    const items = parseItems((formData.get('items') as string) || '');

    if (!po_number || !items?.length) {
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
        let linkedPurchaseRequest: { request_id: number; request_number: string; request_type: string; status: string; current_step: number } | null = null;
        let persistedNotes = notes;

        if (requestId) {
            linkedPurchaseRequest = await prisma.tbl_approval_requests.findUnique({
                where: { request_id: requestId },
                select: {
                    request_id: true,
                    request_number: true,
                    request_type: true,
                    status: true,
                    current_step: true,
                },
            });

            if (!linkedPurchaseRequest || linkedPurchaseRequest.request_type !== 'purchase') {
                return { error: 'ไม่พบคำขอซื้อที่อ้างอิง' };
            }

            if (requestNumber && linkedPurchaseRequest.request_number !== requestNumber) {
                return { error: 'ข้อมูล PR ไม่ตรงกัน กรุณาเปิดฟอร์มออก PO ใหม่' };
            }

            const existingPO = await prisma.tbl_purchase_orders.findFirst({
                where: {
                    OR: [
                        {
                            notes: {
                                contains: `PR Request ID: ${requestId}`,
                            },
                        },
                        {
                            notes: {
                                contains: `อ้างอิงคำขอซื้อ: ${linkedPurchaseRequest.request_number}`,
                            },
                        },
                    ],
                    status: {
                        not: 'cancelled',
                    },
                },
                select: {
                    po_number: true,
                },
            });

            if (existingPO) {
                return { error: `คำขอซื้อมี PO แล้ว (${existingPO.po_number})` };
            }

            if (status === 'ordered' && (linkedPurchaseRequest.status !== 'pending' || linkedPurchaseRequest.current_step !== 4)) {
                return { error: 'คำขอซื้อยังไม่อยู่ขั้นออก PO' };
            }

            const canonicalLinkLines = [
                `อ้างอิงคำขอซื้อ: ${linkedPurchaseRequest.request_number}`,
                `PR Request ID: ${linkedPurchaseRequest.request_id}`,
            ];
            const existingLines = persistedNotes.split('\n').map((line) => line.trim()).filter(Boolean);
            for (const line of canonicalLinkLines) {
                if (!existingLines.includes(line)) {
                    existingLines.push(line);
                }
            }
            persistedNotes = existingLines.join('\n');
        }

        await prisma.$transaction(async (tx) => {
            const po = await tx.tbl_purchase_orders.create({
                data: {
                    po_number,
                    supplier_id: supplier_id ?? null,
                    created_by_user_id: createdByUserId,
                    order_date: new Date(order_date),
                    expected_date: expected_date ? new Date(expected_date) : null,
                    status,
                    subtotal,
                    tax_amount,
                    total_amount,
                    notes: persistedNotes,
                    created_by: user.name,
                },
            });
            createdPOId = po.po_id;

            await tx.tbl_po_approval_logs.create({
                data: {
                    po_id: po.po_id,
                    step_key: status,
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
                        notes: buildPurchaseOrderItemNote(item),
                    },
                });
            }

            if (linkedPurchaseRequest && status === 'ordered') {
                if (createdByUserId === null) {
                    throw new Error('ไม่สามารถระบุผู้ใช้งานสำหรับอัปเดต workflow ได้');
                }

                await tx.tbl_approval_requests.update({
                    where: { request_id: linkedPurchaseRequest.request_id },
                    data: {
                        current_step: 5,
                        status: 'pending',
                        rejection_reason: null,
                    },
                });

                await tx.tbl_approval_step_logs.create({
                    data: {
                        request_id: linkedPurchaseRequest.request_id,
                        step_order: 4,
                        action: 'approved',
                        acted_by: createdByUserId,
                        comment: `Auto-forward to Store after PO issued (${po.po_number})`,
                    },
                });
            }
        });
        revalidatePath('/purchase-orders');
        revalidatePath('/purchase-request/manage');
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

                if (isNonStockPurchaseOrderItem(item.notes, item.p_id)) {
                    continue;
                }

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
    const supplier_id = parseOptionalInt(formData.get('supplier_id'));
    const po_number = formData.get('po_number') as string;
    const order_date = formData.get('order_date') as string;
    const expected_date = formData.get('expected_date') as string;
    const status = formData.get('status') as tbl_purchase_orders_status;
    const notes = formData.get('notes') as string;
    const subtotal = parseFloat(formData.get('subtotal') as string) || 0;
    const tax_amount = parseFloat(formData.get('tax_amount') as string) || 0;
    const total_amount = parseFloat(formData.get('total_amount') as string) || 0;
    const items = parseItems((formData.get('items') as string) || '');

    if (!po_id || !po_number || !items?.length) {
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
                    supplier_id: supplier_id ?? null,
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
                        notes: buildPurchaseOrderItemNote(item),
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

    const _user = session.user as SessionUserLike;
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
