'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createSupplier(formData: FormData) {
    const name = formData.get('name') as string;
    const contact_name = formData.get('contact_name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const address = formData.get('address') as string;

    try {
        await prisma.tbl_suppliers.create({
            data: {
                name,
                contact_name: contact_name || null,
                phone: phone || null,
                email: email || null,
                address: address || null,
            }
        });
    } catch (error) {
        console.error('Failed to create supplier:', error);
        return { error: 'Failed to create supplier' };
    }

    revalidatePath('/suppliers');
    return { success: true };
}

export async function updateSupplier(formData: FormData) {
    const id = parseInt(formData.get('id') as string);
    const name = formData.get('name') as string;
    const contact_name = formData.get('contact_name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const address = formData.get('address') as string;

    try {
        await prisma.tbl_suppliers.update({
            where: { id },
            data: {
                name,
                contact_name: contact_name || null,
                phone: phone || null,
                email: email || null,
                address: address || null,
            }
        });
    } catch (error) {
        console.error('Failed to update supplier:', error);
        return { error: 'Failed to update supplier' };
    }

    revalidatePath('/suppliers');
    return { success: true };
}

export async function deleteSupplier(id: number) {
    try {
        await prisma.tbl_suppliers.delete({
            where: { id }
        });
    } catch (error) {
        console.error('Failed to delete supplier:', error);
        return { error: 'Failed to delete supplier' };
    }

    revalidatePath('/suppliers');
    return { success: true };
}
