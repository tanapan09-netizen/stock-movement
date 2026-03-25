'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
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

const AUDIT_ACTION_COPY = {
    systemUser: 'System',
    unknownSource: 'unknown',
    logError: 'Audit log error:',
    fetchError: 'Error fetching audit logs:',
    createError: 'Create audit error:',
    updateItemError: 'Update audit item error:',
} as const;

export async function logAudit(data: AuditLogData) {
    try {
        const session = await auth();
        const userId = session?.user?.id ? (parseInt(session.user.id as string) || 0) : null;
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

        const mappedLogs = logs.map(log => {
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

        return {
            logs: mappedLogs,
            total,
        };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.fetchError, error);
        return { logs: [], total: 0 };
    }
}

export async function createAudit(formData: FormData) {
    'use server';
    try {
        const warehouseId = parseInt(formData.get('warehouse_id') as string);
        const auditDate = formData.get('audit_date') as string;
        const notes = (formData.get('notes') as string) || '';

        void warehouseId;
        void auditDate;
        void notes;

        return { success: true, audit_id: 1 };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.createError, error);
        return { success: false, error: String(error) };
    }
}

export async function startAudit(auditId: number): Promise<void> {
    'use server';
    void auditId;
}

export async function completeAudit(auditId: number): Promise<void> {
    'use server';
    void auditId;
}

export async function cancelAudit(auditId: number): Promise<void> {
    'use server';
    void auditId;
}

export async function updateAuditItem(itemId: number, countedQty: number) {
    'use server';
    try {
        void itemId;
        void countedQty;
        return { success: true };
    } catch (error) {
        console.error(AUDIT_ACTION_COPY.updateItemError, error);
        return { success: false, error: String(error) };
    }
}
