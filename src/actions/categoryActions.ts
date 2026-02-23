'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
    const cat_name = formData.get('cat_name') as string;
    const cat_desc = formData.get('cat_desc') as string;

    try {
        await prisma.tbl_categories.create({
            data: {
                cat_name,
                cat_desc: cat_desc || null,
            }
        });
    } catch {
        return { error: 'ไม่สามารถสร้างหมวดหมู่ได้' };
    }

    revalidatePath('/categories');
    return { success: true };
}

export async function updateCategory(formData: FormData) {
    const cat_id = parseInt(formData.get('cat_id') as string);
    const cat_name = formData.get('cat_name') as string;
    const cat_desc = formData.get('cat_desc') as string;

    try {
        await prisma.tbl_categories.update({
            where: { cat_id },
            data: {
                cat_name,
                cat_desc: cat_desc || null,
            }
        });
    } catch {
        return { error: 'ไม่สามารถแก้ไขหมวดหมู่ได้' };
    }

    revalidatePath('/categories');
    return { success: true };
}

export async function deleteCategory(cat_id: number) {
    try {
        // Check if category has products
        const count = await prisma.tbl_products.count({ where: { cat_id } });
        if (count > 0) {
            return { error: `ไม่สามารถลบได้ มีสินค้า ${count} รายการในหมวดหมู่นี้` };
        }

        await prisma.tbl_categories.delete({
            where: { cat_id }
        });
    } catch {
        return { error: 'ไม่สามารถลบหมวดหมู่ได้' };
    }

    revalidatePath('/categories');
    return { success: true };
}
