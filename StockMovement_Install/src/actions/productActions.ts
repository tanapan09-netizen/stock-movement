'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { writeFile } from 'fs/promises';
import path from 'path';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function createProduct(formData: FormData) {
    const p_id = formData.get('p_id') as string; // Wait, createProduct uses p_id from form? 
    // Yes, users manually enter p_id like "A001".
    const p_name = formData.get('p_name') as string;
    const p_desc = formData.get('p_desc') as string;
    const p_price = parseFloat(formData.get('price_unit') as string) || 0;
    const p_unit = formData.get('p_unit') as string;
    const cat_id = parseInt(formData.get('cat_id') as string) || null;
    const safety_stock = parseInt(formData.get('safety_stock') as string) || 0;
    const supplier = formData.get('supplier') as string;
    const is_luxury = formData.get('is_luxury') === 'true';
    const imageFile = formData.get('p_image') as File;

    let imageName = '';

    if (imageFile && imageFile.size > 0) {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const ext = path.extname(imageFile.name);
        imageName = `${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
        await writeFile(path.join(UPLOAD_DIR, imageName), buffer);
    }

    try {
        await prisma.tbl_products.create({
            data: {
                p_id,
                p_name,
                p_desc,
                price_unit: p_price,
                p_unit,
                cat_id,
                safety_stock,
                supplier,
                p_image: imageName,
                p_count: 0, // Initial stock is 0
                active: true,
                is_luxury,
            },
        });

        const session = await auth();
        await logSystemAction(
            'CREATE',
            'Product',
            p_id,
            `Created product: ${p_name}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        console.error('Failed to create product:', error);
        return { error: 'Failed to create product. ID might already exist.' };
    }

    revalidatePath('/products');
    redirect('/products');
}

export async function updateProduct(formData: FormData) {
    const p_id = formData.get('p_id') as string; // Original ID to identify record
    const p_name = formData.get('p_name') as string;
    const p_desc = formData.get('p_desc') as string;
    const p_price = parseFloat(formData.get('price_unit') as string) || 0;
    const p_unit = formData.get('p_unit') as string;
    const cat_id = parseInt(formData.get('cat_id') as string) || null;
    const safety_stock = parseInt(formData.get('safety_stock') as string) || 0;
    const supplier = formData.get('supplier') as string;
    const is_luxury = formData.get('is_luxury') === 'true';
    const imageFile = formData.get('p_image') as File;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
        p_name,
        p_desc,
        price_unit: p_price,
        p_unit,
        cat_id,
        safety_stock,
        supplier,
        is_luxury,
    };

    if (imageFile && imageFile.size > 0) {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const ext = path.extname(imageFile.name);
        const imageName = `${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
        await writeFile(path.join(UPLOAD_DIR, imageName), buffer);
        data.p_image = imageName;
    }

    try {
        await prisma.tbl_products.update({
            where: { p_id },
            data,
        });

        const session = await auth();
        await logSystemAction(
            'UPDATE',
            'Product',
            p_id,
            `Updated product: ${p_name}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        console.error('Failed to update product:', error);
        return { error: 'Failed to update product.' };
    }

    revalidatePath('/products');
    redirect('/products');
}

export async function deleteProduct(p_id: string) {
    try {
        await prisma.tbl_products.delete({
            where: { p_id },
        });

        const session = await auth();
        await logSystemAction(
            'DELETE',
            'Product',
            p_id, // p_id is string, but log expects int ID usually, but schema allows string entity_id
            `Deleted product: ${p_id}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        console.error('Failed to delete product:', error);
        return { error: 'Failed to delete product.' };
    }

    revalidatePath('/products');
}
