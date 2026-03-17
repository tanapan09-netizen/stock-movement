'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createWarehouse(formData: FormData) {
    const warehouse_code = (formData.get('warehouse_code') as string | null)?.trim().toUpperCase() || '';
    const warehouse_name = (formData.get('warehouse_name') as string | null)?.trim() || '';
    const location = (formData.get('location') as string | null)?.trim() || null;

    if (!warehouse_code) return { error: 'Code Required' };
    if (!warehouse_name) return { error: 'Name Required' };

    try {
        await prisma.tbl_warehouses.create({
            data: {
                warehouse_code,
                warehouse_name,
                location,
                active: true
            }
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { error: 'Warehouse code already exists' };
        }
        return { error: 'Create Failed' };
    }
    revalidatePath('/warehouses');
    return { success: true };
}

export async function deleteWarehouse(id: number) {
    try {
        await prisma.tbl_warehouses.delete({ where: { warehouse_id: id } });
    } catch {
        return { error: 'Delete Failed' };
    }
    revalidatePath('/warehouses');
}
