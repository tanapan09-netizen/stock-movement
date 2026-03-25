'use server';

import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessInventoryAudit, canApproveInventoryAudit } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import {
    INVENTORY_AUDIT_COPY,
    INVENTORY_AUDIT_HIGH_VARIANCE_ABS,
    INVENTORY_AUDIT_HIGH_VARIANCE_PCT,
} from '@/lib/inventory-audit';
import { logSystemAction } from '@/lib/logger';

export type AuditAction =
    | 'create'
    | 'CREATE'
    | 'update'
    | 'UPDATE'
    | 'delete'
    | 'DELETE'
    | 'login'
    | 'logout'
    | 'stock_in'
    | 'stock_out'
    | 'borrow'
    | 'BORROW'
    | 'return'
    | 'RETURN'
    | 'approve'
    | 'reject'
    | 'withdraw'
    | 'WITHDRAW'
    | 'use'
    | 'USE'
    | 'complete'
    | 'COMPLETE';

export type AuditEntity =
    | 'product'
    | 'Product'
    | 'asset'
    | 'user'
    | 'User'
    | 'Role'
    | 'purchase_order'
    | 'borrow_request'
    | 'BorrowRequest'
    | 'movement'
    | 'category'
    | 'supplier'
    | 'warehouse'
    | 'Room'
    | 'MaintenanceRequest'
    | 'MaintenancePart';

interface AuditLogData {
    action: AuditAction | string;
    entity: AuditEntity | string;
    entityId?: number | string;
    entityName?: string;
    details?: Record<string, unknown>;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
}

type AuditSessionState = 'draft' | 'counting' | 'review' | 'approved' | 'posted' | 'cancelled';

type UpdateAuditItemInput = number | {
    countedQty?: number | null;
    reasonCode?: string | null;
    reasonNote?: string | null;
};

type WarehouseSnapshotItem = {
    p_id: string;
    p_name: string;
    p_unit: string | null;
    snapshotQty: number;
    priceUnit: number;
};

const AUDIT_ACTION_COPY = {
    systemUser: 'System',
    unknownSource: 'unknown',
    logError: 'Audit log error:',
    fetchError: 'Error fetching audit logs:',
    createError: 'Create audit error:',
    updateItemError: 'Update audit item error:',
} as const;

function toNumber(value: unknown) {
    return Number(value || 0);
}

function parseOptionalInt(value: string | null | undefined) {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function isHighVariance(snapshotQty: number, finalCount: number) {
    const variance = Math.abs(finalCount - snapshotQty);
    const pct = snapshotQty > 0 ? (variance / snapshotQty) * 100 : 0;
    return variance >= INVENTORY_AUDIT_HIGH_VARIANCE_ABS || pct >= INVENTORY_AUDIT_HIGH_VARIANCE_PCT;
}

function buildItemStatus(options: {
    finalCount: number | null;
    varianceQty: number;
    reasonCode?: string | null;
    requiresRecount: boolean;
    auditStatus: AuditSessionState;
}) {
    if (options.auditStatus === 'approved') return 'approved';
    if (options.auditStatus === 'posted') return 'posted';
    if (options.finalCount === null) return 'pending';
    if (options.requiresRecount) return 'recount_required';
    if (options.varianceQty !== 0 && !options.reasonCode) return 'reason_required';
    if (options.auditStatus === 'review') return options.varianceQty === 0 ? 'matched' : 'review';
    return options.varianceQty === 0 ? 'matched' : 'variance';
}

async function getRequestIp() {
    try {
        const head = await headers();
        return head.get('x-forwarded-for') || head.get('x-real-ip') || INVENTORY_AUDIT_COPY.unknownIp;
    } catch {
        return INVENTORY_AUDIT_COPY.unknownIp;
    }
}

async function ensureInventoryAuditAccess(level: 'read' | 'edit' = 'edit') {
    const session = await auth();
    if (!session?.user) {
        throw new Error(INVENTORY_AUDIT_COPY.unauthorized);
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canAccessInventoryAudit(permissionContext.role, permissionContext.permissions, level)) {
        throw new Error(INVENTORY_AUDIT_COPY.unauthorized);
    }

    return {
        session,
        permissionContext,
        username: session.user.name || INVENTORY_AUDIT_COPY.unknownUser,
        userId: Number.parseInt(session.user.id || '0', 10) || 0,
    };
}

async function ensureInventoryAuditApproval() {
    const access = await ensureInventoryAuditAccess('edit');
    const { permissionContext } = access;

    if (!canApproveInventoryAudit(permissionContext.role, permissionContext.permissions, permissionContext.isApprover)) {
        throw new Error(INVENTORY_AUDIT_COPY.approverNotAllowed);
    }

    return access;
}

async function recordAuditEvent(
    tx: Prisma.TransactionClient,
    data: {
        auditId: number;
        itemId?: number | null;
        eventType: string;
        eventLabel: string;
        fromStatus?: string | null;
        toStatus?: string | null;
        oldValue?: number | null;
        newValue?: number | null;
        note?: string | null;
        reasonCode?: string | null;
        metadata?: Record<string, unknown> | null;
        performedBy: string;
        ipAddress?: string | null;
    },
) {
    await tx.tbl_inventory_audit_events.create({
        data: {
            audit_id: data.auditId,
            item_id: data.itemId ?? null,
            event_type: data.eventType,
            event_label: data.eventLabel,
            from_status: data.fromStatus ?? null,
            to_status: data.toStatus ?? null,
            old_value: data.oldValue ?? null,
            new_value: data.newValue ?? null,
            note: data.note ?? null,
            reason_code: data.reasonCode ?? null,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            performed_by: data.performedBy,
            ip_address: data.ipAddress ?? null,
        },
    });
}

async function getWarehouseSnapshot(warehouseId: number): Promise<WarehouseSnapshotItem[]> {
    const warehouseStock = await prisma.tbl_warehouse_stock.findMany({
        where: { warehouse_id: warehouseId },
        orderBy: { p_id: 'asc' },
        select: { p_id: true, quantity: true },
    });

    if (warehouseStock.length === 0) {
        return [];
    }

    const products = await prisma.tbl_products.findMany({
        where: {
            p_id: { in: warehouseStock.map((item) => item.p_id) },
            active: true,
        },
        select: {
            p_id: true,
            p_name: true,
            p_unit: true,
            price_unit: true,
        },
    });

    const productMap = new Map(products.map((product) => [product.p_id, product]));

    return warehouseStock.map((item) => {
        const product = productMap.get(item.p_id);
        return {
            p_id: item.p_id,
            p_name: product?.p_name || item.p_id,
            p_unit: product?.p_unit || null,
            snapshotQty: Number(item.quantity || 0),
            priceUnit: toNumber(product?.price_unit),
        };
    });
}

async function getWarehouseLiveQtyMap(
    tx: Prisma.TransactionClient,
    warehouseId: number,
    productIds: string[],
) {
    const rows = await tx.tbl_warehouse_stock.findMany({
        where: {
            warehouse_id: warehouseId,
            p_id: { in: productIds },
        },
        select: { p_id: true, quantity: true },
    });

    return new Map(rows.map((row) => [row.p_id, Number(row.quantity || 0)]));
}

async function recalculateAuditTotals(tx: Prisma.TransactionClient, auditId: number) {
    const items = await tx.tbl_audit_items.findMany({
        where: { audit_id: auditId },
        select: {
            variance_qty: true,
            variance_value: true,
            recount_qty: true,
            reason_code: true,
        },
    });

    const totalItems = items.length;
    const totalVarianceQty = items.reduce((sum, item) => sum + Number(item.variance_qty || 0), 0);
    const totalVarianceAbs = items.reduce((sum, item) => sum + Math.abs(Number(item.variance_qty || 0)), 0);
    const totalVarianceValue = items.reduce((sum, item) => sum + Math.abs(toNumber(item.variance_value)), 0);
    const recountedItems = items.filter((item) => item.recount_qty !== null).length;
    const reasonPendingItems = items.filter((item) => Number(item.variance_qty || 0) !== 0 && !item.reason_code).length;

    await tx.tbl_inventory_audits.update({
        where: { audit_id: auditId },
        data: {
            total_items: totalItems,
            total_discrepancy: totalVarianceAbs,
            total_variance_qty: totalVarianceQty,
            total_variance_abs: totalVarianceAbs,
            total_variance_value: totalVarianceValue,
            recounted_items: recountedItems,
            reason_pending_items: reasonPendingItems,
        },
    });
}

async function syncWarehouseProductTotal(tx: Prisma.TransactionClient, p_id: string) {
    const aggregate = await tx.tbl_warehouse_stock.aggregate({
        where: { p_id },
        _sum: { quantity: true },
    });

    await tx.tbl_products.update({
        where: { p_id },
        data: { p_count: Number(aggregate._sum.quantity || 0) },
    });
}

export async function logAudit(data: AuditLogData) {
    try {
        const session = await auth();
        const userId = session?.user?.id ? (Number.parseInt(session.user.id as string, 10) || 0) : null;
        const username = session?.user?.name || AUDIT_ACTION_COPY.systemUser;

        await logSystemAction(
            data.action,
            data.entity,
            data.entityId || null,
            {
                ...data.details,
                oldValue: data.oldValue,
                newValue: data.newValue,
                entityName: data.entityName,
            },
            userId,
            username,
            AUDIT_ACTION_COPY.unknownSource,
        );

        return { success: true };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.logError, error);
        return { success: false, error: String(error) };
    }
}

export async function getAuditLogs(options?: {
    entity?: AuditEntity | string;
    action?: AuditAction | string;
    userId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}) {
    try {
        const where: Record<string, unknown> = {};

        if (options?.entity) where.entity = options.entity;
        if (options?.action) where.action = options.action;
        if (options?.userId) where.user_id = options.userId;

        if (options?.dateFrom || options?.dateTo) {
            const createdAt: { gte?: Date; lte?: Date } = {};
            if (options.dateFrom) createdAt.gte = options.dateFrom;
            if (options.dateTo) {
                const end = new Date(options.dateTo);
                end.setHours(23, 59, 59);
                createdAt.lte = end;
            }
            where.created_at = createdAt;
        }

        const [logs, total] = await Promise.all([
            prisma.tbl_system_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            }),
            prisma.tbl_system_logs.count({ where }),
        ]);

        const mappedLogs = logs.map((log) => {
            let detailsObj: Record<string, unknown> = {};
            try {
                detailsObj = log.details ? JSON.parse(log.details) : {};
            } catch {
                detailsObj = { message: log.details };
            }

            const entityName = typeof detailsObj.entityName === 'string' || typeof detailsObj.entityName === 'number'
                ? detailsObj.entityName
                : log.entity_id;

            return {
                id: log.id,
                timestamp: log.created_at,
                username: log.username || AUDIT_ACTION_COPY.systemUser,
                action: log.action as AuditAction,
                entity: log.entity as AuditEntity,
                entityId: log.entity_id,
                entityName,
                details: detailsObj,
            };
        });

        return { logs: mappedLogs, total };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.fetchError, error);
        return { logs: [], total: 0 };
    }
}

export async function createAudit(formData: FormData) {
    try {
        const { username } = await ensureInventoryAuditAccess('edit');
        const ipAddress = await getRequestIp();

        const warehouseId = parseOptionalInt(formData.get('warehouse_id') as string);
        const auditDate = (formData.get('audit_date') as string) || new Date().toISOString().split('T')[0];
        const notes = ((formData.get('notes') as string) || '').trim();

        if (!warehouseId) {
            return { success: false, error: 'กรุณาเลือกคลังสินค้า' };
        }

        const warehouse = await prisma.tbl_warehouses.findUnique({
            where: { warehouse_id: warehouseId },
            select: { warehouse_id: true, warehouse_name: true },
        });

        if (!warehouse) {
            return { success: false, error: 'ไม่พบคลังสินค้าที่เลือก' };
        }

        const ymd = auditDate.replace(/-/g, '');
        const count = await prisma.tbl_inventory_audits.count({
            where: {
                audit_date: {
                    gte: new Date(`${auditDate}T00:00:00`),
                    lt: new Date(`${auditDate}T23:59:59`),
                },
            },
        });
        const auditNumber = `INV-${ymd}-${String(count + 1).padStart(3, '0')}`;

        const audit = await prisma.$transaction(async (tx) => {
            const created = await tx.tbl_inventory_audits.create({
                data: {
                    audit_number: auditNumber,
                    warehouse_id: warehouseId,
                    audit_date: new Date(auditDate),
                    status: 'draft',
                    notes: notes || null,
                    created_by: username,
                },
            });

            await recordAuditEvent(tx, {
                auditId: created.audit_id,
                eventType: 'create',
                eventLabel: 'สร้างเซสชันตรวจนับ',
                toStatus: 'draft',
                note: notes || null,
                metadata: {
                    warehouse_id: warehouseId,
                    warehouse_name: warehouse.warehouse_name,
                    audit_number: auditNumber,
                },
                performedBy: username,
                ipAddress,
            });

            return created;
        });

        revalidatePath('/inventory-audit');
        return { success: true, audit_id: audit.audit_id, audit_number: audit.audit_number };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.createError, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function startAudit(auditId: number) {
    try {
        const { username } = await ensureInventoryAuditAccess('edit');
        const ipAddress = await getRequestIp();

        const audit = await prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            select: {
                audit_id: true,
                audit_number: true,
                warehouse_id: true,
                status: true,
            },
        });

        if (!audit) return { success: false, error: 'ไม่พบเซสชันตรวจนับ' };
        if (!audit.warehouse_id) return { success: false, error: 'เซสชันนี้ยังไม่ระบุคลังสินค้า' };
        if (audit.status !== 'draft') return { success: false, error: 'เริ่มตรวจนับได้เฉพาะฉบับร่าง' };

        const snapshot = await getWarehouseSnapshot(audit.warehouse_id);
        if (snapshot.length === 0) {
            return { success: false, error: INVENTORY_AUDIT_COPY.noProductsInWarehouse };
        }

        await prisma.$transaction(async (tx) => {
            await tx.tbl_audit_items.deleteMany({ where: { audit_id: auditId } });

            await tx.tbl_audit_items.createMany({
                data: snapshot.map((item) => ({
                    audit_id: auditId,
                    p_id: item.p_id,
                    snapshot_qty: item.snapshotQty,
                    system_qty: item.snapshotQty,
                    counted_qty: null,
                    first_count_qty: null,
                    recount_qty: null,
                    final_count_qty: null,
                    discrepancy: null,
                    variance_qty: null,
                    variance_value: 0,
                    reason_code: null,
                    reason_note: null,
                    movement_delta_qty: 0,
                    approved_adjustment_qty: 0,
                    item_status: 'pending',
                    requires_recount: false,
                })),
            });

            await tx.tbl_inventory_audits.update({
                where: { audit_id: auditId },
                data: {
                    status: 'counting',
                    started_by: username,
                    started_at: new Date(),
                    frozen_at: new Date(),
                    total_items: snapshot.length,
                    total_discrepancy: 0,
                    total_variance_qty: 0,
                    total_variance_abs: 0,
                    total_variance_value: 0,
                    recounted_items: 0,
                    reason_pending_items: 0,
                },
            });

            await recordAuditEvent(tx, {
                auditId,
                eventType: 'snapshot',
                eventLabel: 'Freeze snapshot และเริ่มนับ',
                fromStatus: 'draft',
                toStatus: 'counting',
                note: `สร้าง snapshot ${snapshot.length} รายการ`,
                metadata: {
                    audit_number: audit.audit_number,
                    item_count: snapshot.length,
                },
                performedBy: username,
                ipAddress,
            });
        });

        revalidatePath('/inventory-audit');
        revalidatePath(`/inventory-audit/${auditId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function submitAuditForReview(auditId: number) {
    try {
        const { username } = await ensureInventoryAuditAccess('edit');
        const ipAddress = await getRequestIp();

        const audit = await prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            include: { tbl_audit_items: true },
        });

        if (!audit) return { success: false, error: 'ไม่พบเซสชันตรวจนับ' };
        if (!audit.warehouse_id) return { success: false, error: 'เซสชันนี้ยังไม่ระบุคลังสินค้า' };
        if (audit.status !== 'counting') return { success: false, error: 'ส่งตรวจทานได้เฉพาะเซสชันที่กำลังนับ' };
        if (audit.tbl_audit_items.length === 0) return { success: false, error: INVENTORY_AUDIT_COPY.noAuditItems };

        const missingCounts = audit.tbl_audit_items.filter((item) => item.final_count_qty === null && item.counted_qty === null);
        if (missingCounts.length > 0) {
            return { success: false, error: `ยังมี ${missingCounts.length} รายการที่ยังไม่นับ` };
        }

        const missingReasons = audit.tbl_audit_items.filter((item) => {
            const varianceQty = Number(item.variance_qty ?? item.discrepancy ?? 0);
            return varianceQty !== 0 && !item.reason_code;
        });
        if (missingReasons.length > 0) {
            return { success: false, error: `ยังมี ${missingReasons.length} รายการที่ยังไม่ระบุสาเหตุของผลต่าง` };
        }

        await prisma.$transaction(async (tx) => {
            const liveQtyMap = await getWarehouseLiveQtyMap(
                tx,
                audit.warehouse_id!,
                audit.tbl_audit_items.map((item) => item.p_id),
            );

            for (const item of audit.tbl_audit_items) {
                const finalCount = item.final_count_qty ?? item.counted_qty;
                const liveQty = liveQtyMap.get(item.p_id) ?? 0;
                const movementDeltaQty = liveQty - Number(item.snapshot_qty || item.system_qty || 0);
                const varianceQty = Number(item.variance_qty ?? item.discrepancy ?? 0);
                const itemStatus = buildItemStatus({
                    finalCount,
                    varianceQty,
                    reasonCode: item.reason_code,
                    requiresRecount: Boolean(item.requires_recount && item.recount_qty === null),
                    auditStatus: 'review',
                });

                await tx.tbl_audit_items.update({
                    where: { item_id: item.item_id },
                    data: {
                        movement_delta_qty: movementDeltaQty,
                        item_status: itemStatus,
                        reviewed_at: new Date(),
                    },
                });
            }

            await tx.tbl_inventory_audits.update({
                where: { audit_id: auditId },
                data: {
                    status: 'review',
                    completed_by: username,
                    completed_at: new Date(),
                },
            });

            await recalculateAuditTotals(tx, auditId);

            await recordAuditEvent(tx, {
                auditId,
                eventType: 'submit_review',
                eventLabel: 'ส่งตรวจทาน',
                fromStatus: 'counting',
                toStatus: 'review',
                note: 'ส่งผลตรวจนับทั้งหมดให้ผู้อนุมัติตรวจทาน',
                performedBy: username,
                ipAddress,
            });
        });

        revalidatePath('/inventory-audit');
        revalidatePath(`/inventory-audit/${auditId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function reopenAuditForCounting(auditId: number) {
    try {
        const { username } = await ensureInventoryAuditApproval();
        const ipAddress = await getRequestIp();

        const audit = await prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            include: { tbl_audit_items: true },
        });

        if (!audit) return { success: false, error: 'ไม่พบเซสชันตรวจนับ' };
        if (!['review', 'approved'].includes(audit.status || '')) {
            return { success: false, error: 'ส่งกลับไปนับต่อได้เฉพาะเซสชันที่อยู่ระหว่างตรวจทานหรืออนุมัติแล้ว' };
        }

        await prisma.$transaction(async (tx) => {
            for (const item of audit.tbl_audit_items) {
                const finalCount = item.final_count_qty ?? item.counted_qty;
                const varianceQty = Number(item.variance_qty ?? item.discrepancy ?? 0);
                const itemStatus = buildItemStatus({
                    finalCount,
                    varianceQty,
                    reasonCode: item.reason_code,
                    requiresRecount: Boolean(item.requires_recount && item.recount_qty === null),
                    auditStatus: 'counting',
                });

                await tx.tbl_audit_items.update({
                    where: { item_id: item.item_id },
                    data: { item_status: itemStatus },
                });
            }

            await tx.tbl_inventory_audits.update({
                where: { audit_id: auditId },
                data: {
                    status: 'counting',
                    reviewed_by: null,
                    reviewed_at: null,
                    approved_by: null,
                    approved_at: null,
                    posted_by: null,
                    posted_at: null,
                },
            });

            await recalculateAuditTotals(tx, auditId);

            await recordAuditEvent(tx, {
                auditId,
                eventType: 'reopen',
                eventLabel: 'ส่งกลับไปนับต่อ',
                fromStatus: audit.status,
                toStatus: 'counting',
                note: 'เปิดให้ผู้ตรวจนับกลับไปแก้ไขรายการอีกครั้ง',
                performedBy: username,
                ipAddress,
            });
        });

        revalidatePath('/inventory-audit');
        revalidatePath(`/inventory-audit/${auditId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function approveAudit(auditId: number) {
    try {
        const { username } = await ensureInventoryAuditApproval();
        const ipAddress = await getRequestIp();

        const audit = await prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            include: { tbl_audit_items: true },
        });

        if (!audit) return { success: false, error: 'ไม่พบเซสชันตรวจนับ' };
        if (!audit.warehouse_id) return { success: false, error: 'เซสชันนี้ยังไม่ระบุคลังสินค้า' };
        if (audit.status !== 'review') return { success: false, error: 'อนุมัติได้เฉพาะเซสชันที่รอตรวจทาน' };

        await prisma.$transaction(async (tx) => {
            const liveQtyMap = await getWarehouseLiveQtyMap(
                tx,
                audit.warehouse_id!,
                audit.tbl_audit_items.map((item) => item.p_id),
            );

            for (const item of audit.tbl_audit_items) {
                const finalCount = item.final_count_qty ?? item.counted_qty ?? 0;
                const liveQty = liveQtyMap.get(item.p_id) ?? 0;
                const movementDeltaQty = liveQty - Number(item.snapshot_qty || item.system_qty || 0);
                const approvedAdjustmentQty = finalCount - liveQty;

                await tx.tbl_audit_items.update({
                    where: { item_id: item.item_id },
                    data: {
                        movement_delta_qty: movementDeltaQty,
                        approved_adjustment_qty: approvedAdjustmentQty,
                        item_status: 'approved',
                        reviewed_at: new Date(),
                    },
                });
            }

            await tx.tbl_inventory_audits.update({
                where: { audit_id: auditId },
                data: {
                    status: 'approved',
                    reviewed_by: username,
                    reviewed_at: new Date(),
                    approved_by: username,
                    approved_at: new Date(),
                },
            });

            await recalculateAuditTotals(tx, auditId);

            await recordAuditEvent(tx, {
                auditId,
                eventType: 'approve',
                eventLabel: 'อนุมัติผลตรวจนับ',
                fromStatus: 'review',
                toStatus: 'approved',
                note: 'ยืนยันผลตรวจนับและเตรียมโพสต์ปรับยอด',
                performedBy: username,
                ipAddress,
            });
        });

        revalidatePath('/inventory-audit');
        revalidatePath(`/inventory-audit/${auditId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function postAuditAdjustments(auditId: number) {
    try {
        const { username } = await ensureInventoryAuditApproval();
        const ipAddress = await getRequestIp();

        const audit = await prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            include: {
                tbl_audit_items: true,
                tbl_warehouses: true,
            },
        });

        if (!audit) return { success: false, error: 'ไม่พบเซสชันตรวจนับ' };
        if (!audit.warehouse_id) return { success: false, error: 'เซสชันนี้ยังไม่ระบุคลังสินค้า' };
        if (audit.status !== 'approved') return { success: false, error: 'โพสต์ปรับยอดได้เฉพาะเซสชันที่อนุมัติแล้ว' };

        await prisma.$transaction(async (tx) => {
            const touchedProducts = new Set<string>();

            for (const item of audit.tbl_audit_items) {
                const finalCount = item.final_count_qty ?? item.counted_qty;
                if (finalCount === null) continue;

                const currentStock = await tx.tbl_warehouse_stock.findUnique({
                    where: {
                        warehouse_id_p_id: {
                            warehouse_id: audit.warehouse_id!,
                            p_id: item.p_id,
                        },
                    },
                    select: { quantity: true },
                });

                const currentQty = Number(currentStock?.quantity || 0);
                const adjustmentQty = finalCount - currentQty;

                await tx.tbl_warehouse_stock.upsert({
                    where: {
                        warehouse_id_p_id: {
                            warehouse_id: audit.warehouse_id!,
                            p_id: item.p_id,
                        },
                    },
                    update: {
                        quantity: finalCount,
                        last_updated: new Date(),
                    },
                    create: {
                        warehouse_id: audit.warehouse_id!,
                        p_id: item.p_id,
                        quantity: finalCount,
                        min_stock: 0,
                    },
                });

                if (adjustmentQty !== 0) {
                    await tx.tbl_stock_movements.create({
                        data: {
                            p_id: item.p_id,
                            username,
                            movement_type: adjustmentQty > 0 ? 'inventory_audit_in' : 'inventory_audit_out',
                            quantity: Math.abs(adjustmentQty),
                            remarks: `[${audit.audit_number}] ปรับยอดจากตรวจนับคลัง ${audit.tbl_warehouses?.warehouse_name || audit.warehouse_id} snapshot=${item.snapshot_qty} counted=${finalCount} live=${currentQty}`,
                            movement_time: new Date(),
                        },
                    });
                }

                await tx.tbl_audit_items.update({
                    where: { item_id: item.item_id },
                    data: {
                        movement_delta_qty: currentQty - Number(item.snapshot_qty || 0),
                        approved_adjustment_qty: adjustmentQty,
                        item_status: 'posted',
                        posted_at: new Date(),
                    },
                });

                touchedProducts.add(item.p_id);
            }

            for (const productId of touchedProducts) {
                await syncWarehouseProductTotal(tx, productId);
            }

            await tx.tbl_inventory_audits.update({
                where: { audit_id: auditId },
                data: {
                    status: 'posted',
                    posted_by: username,
                    posted_at: new Date(),
                    completed_by: username,
                    completed_at: new Date(),
                },
            });

            await recalculateAuditTotals(tx, auditId);

            await recordAuditEvent(tx, {
                auditId,
                eventType: 'post',
                eventLabel: 'โพสต์ปรับยอดเข้าสต็อก',
                fromStatus: 'approved',
                toStatus: 'posted',
                note: 'โพสต์ผลตรวจนับเข้าสต็อกและ movement แล้ว',
                metadata: {
                    warehouse_id: audit.warehouse_id,
                    warehouse_name: audit.tbl_warehouses?.warehouse_name || null,
                },
                performedBy: username,
                ipAddress,
            });
        });

        revalidatePath('/inventory-audit');
        revalidatePath(`/inventory-audit/${auditId}`);
        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function cancelAudit(auditId: number) {
    try {
        const { username } = await ensureInventoryAuditAccess('edit');
        const ipAddress = await getRequestIp();

        const audit = await prisma.tbl_inventory_audits.findUnique({
            where: { audit_id: auditId },
            select: { audit_id: true, status: true },
        });

        if (!audit) return { success: false, error: 'ไม่พบเซสชันตรวจนับ' };
        if (audit.status === 'posted') return { success: false, error: 'ไม่สามารถยกเลิกเซสชันที่โพสต์ปรับยอดแล้วได้' };

        await prisma.$transaction(async (tx) => {
            await tx.tbl_inventory_audits.update({
                where: { audit_id: auditId },
                data: { status: 'cancelled' },
            });

            await recordAuditEvent(tx, {
                auditId,
                eventType: 'cancel',
                eventLabel: 'ยกเลิกเซสชันตรวจนับ',
                fromStatus: audit.status,
                toStatus: 'cancelled',
                performedBy: username,
                ipAddress,
            });
        });

        revalidatePath('/inventory-audit');
        revalidatePath(`/inventory-audit/${auditId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function completeAudit(auditId: number) {
    return submitAuditForReview(auditId);
}

export async function updateAuditItem(itemId: number, input: UpdateAuditItemInput) {
    try {
        const { username } = await ensureInventoryAuditAccess('edit');
        const ipAddress = await getRequestIp();
        const payload = typeof input === 'number'
            ? { countedQty: input, reasonCode: undefined, reasonNote: undefined }
            : input;

        const item = await prisma.tbl_audit_items.findUnique({
            where: { item_id: itemId },
            include: {
                tbl_inventory_audits: {
                    select: { audit_id: true, status: true, warehouse_id: true },
                },
            },
        });

        if (!item) return { success: false, error: 'ไม่พบรายการตรวจนับ' };
        if (!item.tbl_inventory_audits?.warehouse_id) return { success: false, error: 'เซสชันนี้ยังไม่ระบุคลังสินค้า' };
        if (item.tbl_inventory_audits.status !== 'counting') {
            return { success: false, error: INVENTORY_AUDIT_COPY.saveDenied };
        }

        const countedQty = payload.countedQty ?? item.final_count_qty ?? item.counted_qty;
        if (countedQty === null || !Number.isFinite(Number(countedQty))) {
            return { success: false, error: 'กรุณาระบุจำนวนที่นับได้' };
        }

        const product = await prisma.tbl_products.findUnique({
            where: { p_id: item.p_id },
            select: { price_unit: true },
        });

        const result = await prisma.$transaction(async (tx) => {
            const liveQtyMap = await getWarehouseLiveQtyMap(tx, item.tbl_inventory_audits.warehouse_id!, [item.p_id]);
            const liveQty = liveQtyMap.get(item.p_id) ?? 0;
            const previousFinal = item.final_count_qty ?? item.counted_qty;
            const firstCountQty = item.first_count_qty ?? countedQty;
            const recountQty =
                item.first_count_qty !== null && countedQty !== item.first_count_qty
                    ? countedQty
                    : item.recount_qty;

            const varianceQty = countedQty - Number(item.snapshot_qty || item.system_qty || 0);
            const varianceValue = varianceQty * toNumber(product?.price_unit);
            const reasonCode = payload.reasonCode === undefined ? item.reason_code : payload.reasonCode;
            const reasonNote = payload.reasonNote === undefined ? item.reason_note : payload.reasonNote;
            const requiresRecount = isHighVariance(Number(item.snapshot_qty || item.system_qty || 0), countedQty) && recountQty === null && varianceQty !== 0;
            const itemStatus = buildItemStatus({
                finalCount: countedQty,
                varianceQty,
                reasonCode,
                requiresRecount,
                auditStatus: 'counting',
            });

            const updated = await tx.tbl_audit_items.update({
                where: { item_id: itemId },
                data: {
                    counted_qty: countedQty,
                    first_count_qty: firstCountQty,
                    recount_qty: recountQty,
                    final_count_qty: countedQty,
                    discrepancy: varianceQty,
                    variance_qty: varianceQty,
                    variance_value: varianceValue,
                    reason_code: reasonCode || null,
                    reason_note: reasonNote || null,
                    movement_delta_qty: liveQty - Number(item.snapshot_qty || item.system_qty || 0),
                    requires_recount: requiresRecount,
                    item_status: itemStatus,
                    counted_by: item.counted_by || username,
                    recounted_by: recountQty !== null ? username : item.recounted_by,
                    counted_at: new Date(),
                },
            });

            await recalculateAuditTotals(tx, item.audit_id);

            const countChanged = previousFinal !== countedQty;
            await recordAuditEvent(tx, {
                auditId: item.audit_id,
                itemId,
                eventType: countChanged ? (item.first_count_qty === null ? 'count' : 'recount') : 'reason',
                eventLabel: countChanged
                    ? (item.first_count_qty === null ? 'บันทึกการนับ' : 'บันทึกการนับซ้ำ')
                    : 'อัปเดตสาเหตุ',
                oldValue: previousFinal,
                newValue: countedQty,
                note: reasonNote || null,
                reasonCode: reasonCode || null,
                performedBy: username,
                ipAddress,
            });

            return updated;
        });

        revalidatePath(`/inventory-audit/${item.audit_id}`);
        revalidatePath('/inventory-audit');
        return { success: true, item: result };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.updateItemError, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
