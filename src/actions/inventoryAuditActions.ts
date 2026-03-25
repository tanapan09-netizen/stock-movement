'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { mergeRoleAndCustomPermissions, getUserPermissionContext } from '@/lib/server/permission-service';
import { canApproveInventoryAudit, resolveInventoryAuditUserRole } from '@/lib/rbac';
import { INVENTORY_AUDIT_COPY } from '@/lib/inventory-audit';

export async function getProductsForAudit() {
    try {
        const products = await prisma.tbl_products.findMany({
            where: { active: true },
            select: { p_id: true, p_name: true, p_count: true },
            orderBy: { p_name: 'asc' }
        });
        return { success: true, data: products };
    } catch (error) {
        console.error('getProductsForAudit error:', error);
        return { success: false, data: [] };
    }
}

interface AuditItemInput {
    p_id: string;
    system_qty: number;
    counted_qty: number | null;
    first_entered_at?: string | null;
    last_edited_at?: string | null;
    edit_count?: number;
    prev_count?: number | null;
}

type SaveInventoryAuditInput = {
    audit_date: string;
    auditor?: string;
    auditor_id?: string;
    auditor_name?: string;
    approver_name?: string;
    approver_id?: number | string | null;
    session_start?: string;
    notes?: string;
    items: AuditItemInput[];
};

export async function saveInventoryAudit(data: SaveInventoryAuditInput) {
    try {
        const session = await auth();
        if (!session) return { success: false, error: INVENTORY_AUDIT_COPY.unauthorized };

        const username = session.user?.name || INVENTORY_AUDIT_COPY.unknownUser;
        const auditBy = data.auditor_name || data.auditor || username;

        // Only save items that were actually counted
        const countedItems = data.items.filter(i => i.counted_qty !== null);
        if (countedItems.length === 0) {
            return { success: false, error: INVENTORY_AUDIT_COPY.noCheckedItems };
        }

        const totalDiscrepancy = countedItems.reduce((sum, i) => {
            return sum + Math.abs((i.counted_qty ?? 0) - i.system_qty);
        }, 0);

        // Generate audit number: INV-YYYYMMDD-XXX
        const today = new Date(data.audit_date);
        const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.tbl_inventory_audits.count({
            where: {
                audit_date: {
                    gte: new Date(data.audit_date + 'T00:00:00'),
                    lt: new Date(data.audit_date + 'T23:59:59')
                }
            }
        });
        const auditNumber = `INV-${ymd}-${String(count + 1).padStart(3, '0')}`;

        const audit = await prisma.tbl_inventory_audits.create({
            data: {
                audit_number: auditNumber,
                audit_date: new Date(data.audit_date),
                status: 'posted',
                notes: data.notes || `${INVENTORY_AUDIT_COPY.auditNotePrefix} ${data.auditor}`,
                total_items: countedItems.length,
                total_discrepancy: totalDiscrepancy,
                total_variance_abs: totalDiscrepancy,
                created_by: username,
                completed_by: auditBy,
                completed_at: new Date(),
                tbl_audit_items: {
                    create: countedItems.map(item => ({
                        p_id: item.p_id,
                        snapshot_qty: item.system_qty,
                        system_qty: item.system_qty,
                        counted_qty: item.counted_qty ?? 0,
                        final_count_qty: item.counted_qty ?? 0,
                        discrepancy: (item.counted_qty ?? 0) - item.system_qty,
                        variance_qty: (item.counted_qty ?? 0) - item.system_qty,
                        approved_adjustment_qty: (item.counted_qty ?? 0) - item.system_qty,
                        item_status: 'posted',
                        counted_at: new Date(),
                    }))
                }
            }
        });

        // Minimal audit trail log entry (save only)
        try {
            const head = await headers();
            const ip = head.get('x-forwarded-for') || head.get('x-real-ip') || INVENTORY_AUDIT_COPY.unknownIp;
            await prisma.tbl_action_log.create({
                data: {
                    username,
                    action: INVENTORY_AUDIT_COPY.auditTrailSaveAction,
                    p_id: null,
                    ip_address: ip,
                    description: `${INVENTORY_AUDIT_COPY.auditTrailSaveDescriptionPrefix} ${auditNumber}`,
                    quantity: countedItems.length,
                    remarks: data.approver_name ? `${INVENTORY_AUDIT_COPY.approverRemarkPrefix} ${data.approver_name}` : null,
                    details: JSON.stringify({
                        audit_id: audit.audit_id,
                        audit_number: auditNumber,
                        audit_date: data.audit_date,
                        auditor_id: data.auditor_id ?? null,
                        auditor_name: data.auditor_name ?? data.auditor ?? null,
                        approver_id: data.approver_id ?? null,
                        approver_name: data.approver_name ?? null,
                        session_start: data.session_start ?? null,
                        total_items: countedItems.length,
                        total_discrepancy: totalDiscrepancy,
                    }),
                }
            });
        } catch (e) {
            console.warn(`${INVENTORY_AUDIT_COPY.auditTrailLogSkipped}:`, e);
        }

        revalidatePath('/inventory-audit');
        return { success: true, auditId: audit.audit_id, auditNumber };
    } catch (error) {
        console.error('saveInventoryAudit error:', error);
        return { success: false, error: INVENTORY_AUDIT_COPY.saveFailed };
    }
}

export async function getInventoryAuditHistory(limit = 10) {
    try {
        const audits = await prisma.tbl_inventory_audits.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                audit_id: true,
                audit_number: true,
                audit_date: true,
                status: true,
                total_items: true,
                total_discrepancy: true,
                completed_by: true,
                created_at: true,
            }
        });
        const data = audits.map(a => ({
            ...a,
            approved_by: null as string | null,
            is_locked: a.status === 'posted',
        }));
        return { success: true, data };
    } catch (error) {
        console.error('getInventoryAuditHistory error:', error);
        return { success: false, data: [] };
    }
}

export async function getCurrentUserRole() {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false as const, user: null, error: INVENTORY_AUDIT_COPY.unauthorized };

        const permissionContext = await getUserPermissionContext(session.user);
        const role = resolveInventoryAuditUserRole(
            permissionContext.role,
            permissionContext.permissions,
            permissionContext.isApprover,
        );

        return {
            success: true as const,
            user: {
                user_id: String(session.user.id),
                name: session.user.name || INVENTORY_AUDIT_COPY.unknownUser,
                role,
                employee_id: String(session.user.id),
            }
        };
    } catch (error) {
        console.error('getCurrentUserRole error:', error);
        return { success: false as const, user: null, error: INVENTORY_AUDIT_COPY.failedToReadSession };
    }
}

export async function verifyApproverPin(input: { approver_name: string; pin: string }) {
    try {
        const session = await auth();
        if (!session) return { success: false as const, error: INVENTORY_AUDIT_COPY.unauthorized };

        const approverName = input.approver_name.trim();
        if (!approverName || !input.pin) {
            return { success: false as const, error: INVENTORY_AUDIT_COPY.missingApproverOrPin };
        }

        const approverId = Number.isFinite(Number(approverName)) ? Number(approverName) : null;

        const user = await prisma.tbl_users.findFirst({
            where: approverId
                ? { p_id: approverId }
                : { username: approverName },
            select: {
                p_id: true,
                username: true,
                role: true,
                password: true,
                is_approver: true,
                custom_permissions: true,
            }
        });

        if (!user) return { success: false as const, error: INVENTORY_AUDIT_COPY.approverNotFound };

        const userPermissions = await mergeRoleAndCustomPermissions(user.role, user.custom_permissions);
        const allowed = canApproveInventoryAudit(user.role, userPermissions, Boolean(user.is_approver));
        if (!allowed) return { success: false as const, error: INVENTORY_AUDIT_COPY.approverNotAllowed };

        const ok = await bcrypt.compare(input.pin, user.password);
        if (!ok) return { success: false as const, error: INVENTORY_AUDIT_COPY.invalidApproverPin };

        return { success: true as const, approver_id: user.p_id, approver_name: user.username };
    } catch (error) {
        console.error('verifyApproverPin error:', error);
        return { success: false as const, error: INVENTORY_AUDIT_COPY.pinVerificationFailed };
    }
}

export async function getAuditTrailLog(limit = 50) {
    try {
        const logs = await prisma.tbl_action_log.findMany({
            where: {
                OR: [
                    { action: { contains: 'Inventory Audit' } },
                    { action: { contains: 'ตรวจนับสต็อก' } },
                    { action: { contains: 'ตรวจนับ' } },
                ]
            },
            orderBy: { log_date: 'desc' },
            take: limit,
            include: { tbl_products: { select: { p_name: true } } }
        });

        const data = logs.map(l => ({
            trail_id: l.id,
            action: (
                l.action.includes('save')
                || l.action.includes('บันทึก')
                ? 'save'
                : 'view'
            ) as 'enter' | 'edit' | 'save' | 'approve' | 'view',
            p_id: l.p_id ?? null,
            p_name: l.tbl_products?.p_name ?? null,
            old_value: null as number | null,
            new_value: null as number | null,
            performed_by: l.username,
            performed_at: (l.log_date || l.created_at || l.log_time || new Date()).toISOString(),
            ip_address: l.ip_address ?? null,
        }));

        return { success: true as const, data };
    } catch (error) {
        console.error('getAuditTrailLog error:', error);
        return { success: false as const, data: [] };
    }
}
