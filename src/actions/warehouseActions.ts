'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createWarehouse(formData: FormData) {
    const warehouse_name = formData.get('warehouse_name') as string;
    const location = formData.get('location') as string;

    if (!warehouse_name) return { error: 'Name Required' };

    try {
        await prisma.tbl_warehouses.create({
            data: {
                warehouse_name,
                location,
                active: true
            }
        });
    } catch (e) {
        return { error: 'Creat Failed' };
    }
    revalidatePath('/warehouses');
    return { success: true };
}

export async function deleteWarehouse(id: number) {
    try {
        await prisma.tbl_warehouses.delete({ where: { warehouse_id: id } });
    } catch (e) {
        return { error: 'Delete Failed' };
    }
    revalidatePath('/warehouses');
}
