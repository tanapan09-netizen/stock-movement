'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

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
}

export async function saveInventoryAudit(data: {
    audit_date: string;
    auditor: string;
    notes?: string;
    items: AuditItemInput[];
}) {
    try {
        const session = await auth();
        if (!session) return { success: false, error: 'Unauthorized' };

        const username = session.user?.name || 'Unknown';

        // Only save items that were actually counted
        const countedItems = data.items.filter(i => i.counted_qty !== null);
        if (countedItems.length === 0) {
            return { success: false, error: 'ไม่มีรายการที่ตรวจนับ' };
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
                status: 'completed',
                notes: data.notes || `ผู้ตรวจนับ: ${data.auditor}`,
                total_items: countedItems.length,
                total_discrepancy: totalDiscrepancy,
                created_by: username,
                completed_by: data.auditor || username,
                completed_at: new Date(),
                tbl_audit_items: {
                    create: countedItems.map(item => ({
                        p_id: item.p_id,
                        system_qty: item.system_qty,
                        counted_qty: item.counted_qty ?? 0,
                        discrepancy: (item.counted_qty ?? 0) - item.system_qty,
                        counted_at: new Date(),
                    }))
                }
            }
        });

        revalidatePath('/inventory-audit');
        return { success: true, auditId: audit.audit_id, auditNumber };
    } catch (error) {
        console.error('saveInventoryAudit error:', error);
        return { success: false, error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' };
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
        return { success: true, data: audits };
    } catch (error) {
        console.error('getInventoryAuditHistory error:', error);
        return { success: false, data: [] };
    }
}
