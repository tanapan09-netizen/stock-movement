'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logSystemAction } from '@/lib/logger';

function normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '').trim();
}

export async function registerLineCustomer(input: {
    line_user_id: string;
    full_name: string;
    phone_number: string;
    display_name?: string | null;
    picture_url?: string | null;
    notes?: string | null;
}) {
    try {
        const lineUserId = input.line_user_id.trim();
        const fullName = input.full_name.trim();
        const phone = normalizePhone(input.phone_number);

        if (!lineUserId) return { success: false, error: 'กรุณาระบุ LINE User ID' };
        if (!fullName) return { success: false, error: 'กรุณาระบุชื่อ-นามสกุล' };
        if (!phone) return { success: false, error: 'กรุณาระบุเบอร์โทร' };

        const customer = await prisma.tbl_line_customers.upsert({
            where: { line_user_id: lineUserId },
            update: {
                full_name: fullName,
                phone_number: phone,
                display_name: input.display_name ?? undefined,
                picture_url: input.picture_url ?? undefined,
                notes: input.notes ?? undefined,
                is_active: true,
                last_interaction: new Date(),
            },
            create: {
                line_user_id: lineUserId,
                full_name: fullName,
                phone_number: phone,
                display_name: input.display_name ?? null,
                picture_url: input.picture_url ?? null,
                notes: input.notes ?? null,
                is_active: true,
                registered_at: new Date(),
                last_interaction: new Date(),
            }
        });

        revalidatePath('/settings/line-customers');
        return { success: true, data: customer };
    } catch (error) {
        console.error('registerLineCustomer error:', error);
        return { success: false, error: 'ไม่สามารถบันทึกข้อมูลลูกค้าได้' };
    }
}

export async function getLineCustomerByLineId(line_user_id: string) {
    try {
        if (!line_user_id?.trim()) return { success: true, data: null };

        const customer = await prisma.tbl_line_customers.findUnique({
            where: { line_user_id: line_user_id.trim() }
        });
        return { success: true, data: customer };
    } catch (error) {
        console.error('getLineCustomerByLineId error:', error);
        return { success: false, error: 'ไม่สามารถโหลดข้อมูลลูกค้าได้' };
    }
}

export async function getLineCustomers() {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: 'Unauthorized' };

        const customers = await prisma.tbl_line_customers.findMany({
            orderBy: [
                { is_active: 'desc' },
                { updated_at: 'desc' }
            ]
        });

        return { success: true, data: customers };
    } catch (error) {
        console.error('getLineCustomers error:', error);
        return { success: false, error: 'ไม่สามารถโหลดรายการลูกค้า LINE ได้' };
    }
}

export async function updateLineCustomer(data: {
    id: number;
    full_name: string;
    phone_number: string;
    notes?: string | null;
}) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: 'Unauthorized' };

        const fullName = data.full_name.trim();
        const phone = normalizePhone(data.phone_number);

        if (!fullName) return { success: false, error: 'กรุณาระบุชื่อ-นามสกุล' };
        if (!phone) return { success: false, error: 'กรุณาระบุเบอร์โทร' };

        const updated = await prisma.tbl_line_customers.update({
            where: { id: data.id },
            data: {
                full_name: fullName,
                phone_number: phone,
                notes: data.notes ?? null
            }
        });

        await logSystemAction(
            'UPDATE',
            'LineCustomer',
            data.id,
            `Updated LINE customer: ${fullName}`,
            (parseInt(session.user.id as string) || 0),
            session.user.name || 'System',
            'unknown'
        );

        revalidatePath('/settings/line-customers');
        return { success: true, data: updated };
    } catch (error) {
        console.error('updateLineCustomer error:', error);
        return { success: false, error: 'ไม่สามารถแก้ไขข้อมูลลูกค้าได้' };
    }
}

export async function toggleLineCustomerActive(id: number, isActive: boolean) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: 'Unauthorized' };

        const updated = await prisma.tbl_line_customers.update({
            where: { id },
            data: { is_active: isActive }
        });

        await logSystemAction(
            'UPDATE',
            'LineCustomer',
            id,
            `Toggled LINE customer status to ${isActive ? 'active' : 'inactive'}`,
            (parseInt(session.user.id as string) || 0),
            session.user.name || 'System',
            'unknown'
        );

        revalidatePath('/settings/line-customers');
        return { success: true, data: updated };
    } catch (error) {
        console.error('toggleLineCustomerActive error:', error);
        return { success: false, error: 'ไม่สามารถเปลี่ยนสถานะลูกค้าได้' };
    }
}

export async function deleteLineCustomer(id: number) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: 'Unauthorized' };

        await prisma.tbl_line_customers.delete({ where: { id } });

        await logSystemAction(
            'DELETE',
            'LineCustomer',
            id,
            'Deleted LINE customer',
            (parseInt(session.user.id as string) || 0),
            session.user.name || 'System',
            'unknown'
        );

        revalidatePath('/settings/line-customers');
        return { success: true };
    } catch (error) {
        console.error('deleteLineCustomer error:', error);
        return { success: false, error: 'ไม่สามารถลบลูกค้าได้' };
    }
}
