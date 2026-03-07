'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// ... imports
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
    | 'Product' // Case sensitivity matching
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

// Log an action
export async function logAudit(data: AuditLogData) {
    try {
        const session = await auth();
        const userId = session?.user?.id ? (parseInt(session.user.id as string) || 0) : null;
        const username = session?.user?.name || 'System';

        // Use the centralized logger
        await logSystemAction(
            data.action,
            data.entity,
            data.entityId || null,
            {
                ...data.details,
                oldValue: data.oldValue,
                newValue: data.newValue,
                entityName: data.entityName
            },
            userId,
            username,
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Audit log error:', error);
        return { success: false, error: String(error) };
    }
}

// Get audit logs (for admin view)
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
        const where: any = {};

        if (options?.entity) {
            where.entity = options.entity;
        }

        if (options?.action) {
            where.action = options.action;
        }

        if (options?.userId) {
            where.user_id = options.userId;
        }

        if (options?.dateFrom || options?.dateTo) {
            where.created_at = {};
            if (options.dateFrom) where.created_at.gte = options.dateFrom;
            if (options.dateTo) {
                const end = new Date(options.dateTo);
                end.setHours(23, 59, 59);
                where.created_at.lte = end;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.tbl_system_logs.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0
            }),
            prisma.tbl_system_logs.count({ where })
        ]);

        const mappedLogs = logs.map(log => {
            let detailsObj: any = {};
            try {
                detailsObj = log.details ? JSON.parse(log.details) : {};
            } catch (e) {
                detailsObj = { message: log.details };
            }

            return {
                id: log.id,
                timestamp: log.created_at,
                username: log.username || 'System',
                action: log.action as AuditAction,
                entity: log.entity as AuditEntity,
                entityId: log.entity_id,
                entityName: detailsObj.entityName || log.entity_id, // Fallback
                details: detailsObj
            };
        });

        return {
            logs: mappedLogs,
            total
        };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { logs: [], total: 0 };
    }
}

// Create new inventory audit
export async function createAudit(formData: FormData) {
    'use server';
    try {
        const warehouseId = parseInt(formData.get('warehouse_id') as string);
        const auditDate = formData.get('audit_date') as string;
        const notes = formData.get('notes') as string || '';

        // console.log('[AUDIT] Creating new audit:', { warehouseId, auditDate, notes });

        // Mock implementation - in production use prisma
        /*
        const audit = await prisma.tbl_inventory_audits.create({
            data: {
                warehouse_id: warehouseId,
                audit_date: new Date(auditDate),
                audit_number: `AUD-${Date.now()}`,
                status: 'draft',
                notes,
                created_at: new Date()
            }
        });
        return { success: true, audit_id: audit.audit_id };
        */

        // Mock return
        return { success: true, audit_id: 1 };
    } catch (error) {
        console.error('Create audit error:', error);
        return { success: false, error: String(error) };
    }
}

// Inventory Audit Functions
export async function startAudit(auditId: number): Promise<void> {
    'use server';
    // console.log('[AUDIT] Starting audit:', auditId);
    // Mock implementation - in production use prisma and revalidatePath
}

export async function completeAudit(auditId: number): Promise<void> {
    'use server';
    // console.log('[AUDIT] Completing audit:', auditId);
}

export async function cancelAudit(auditId: number): Promise<void> {
    'use server';
    // console.log('[AUDIT] Cancelling audit:', auditId);
}

export async function updateAuditItem(itemId: number, countedQty: number) {
    'use server';
    try {
        // console.log('[AUDIT] Updating item:', itemId, 'count:', countedQty);

        /*
        await prisma.tbl_audit_items.update({
            where: { item_id: itemId },
            data: { counted_qty: countedQty }
        });
        */

        return { success: true };
    } catch (error) {
        console.error('Update audit item error:', error);
        return { success: false, error: String(error) };
    }
}
