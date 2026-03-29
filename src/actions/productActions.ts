'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { uploadFile } from '@/lib/gcs';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';
import { validateData, createProductSchema } from '@/lib/validation';

const UPLOAD_DIR = 'products'; // Just folder name for GCS/Local util
const PRODUCT_ID_SEQUENCE_WIDTH = 4;
const MAX_PRODUCT_ID_RETRY = 5;

function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeCodePart(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, '').toUpperCase();
}

function isProductIdUniqueConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;

    const target = error.meta?.target;
    if (Array.isArray(target)) {
        return target.some((field) => {
            const normalized = String(field).toLowerCase();
            return normalized.includes('p_id') || normalized.includes('primary');
        });
    }

    if (typeof target === 'string') {
        const normalized = target.toLowerCase();
        return normalized.includes('p_id') || normalized.includes('primary');
    }

    const message = String(error.message || '').toLowerCase();
    return message.includes('p_id') || message.includes('primary');
}

async function buildNextProductId(mainCategoryCode: string, subCategoryCode: string): Promise<string> {
    const prefix = `${mainCategoryCode}${subCategoryCode}`;
    if (!prefix) throw new Error('Product code prefix is required');

    const matchedProducts = await prisma.tbl_products.findMany({
        where: {
            p_id: { startsWith: prefix },
        },
        select: { p_id: true },
    });

    let maxSequence = 0;
    for (const item of matchedProducts) {
        const suffix = item.p_id.slice(prefix.length);
        if (!/^\d+$/.test(suffix)) continue;

        const parsed = Number.parseInt(suffix, 10);
        if (Number.isFinite(parsed) && parsed > maxSequence) {
            maxSequence = parsed;
        }
    }

    const nextSequence = maxSequence + 1;
    return `${prefix}${String(nextSequence).padStart(PRODUCT_ID_SEQUENCE_WIDTH, '0')}`;
}

export async function generateNextProductId(mainCategoryCode: string, subCategoryCode: string) {
    const normalizedMainCategoryCode = normalizeCodePart(mainCategoryCode);
    const normalizedSubCategoryCode = normalizeCodePart(subCategoryCode);

    if (!normalizedMainCategoryCode || !normalizedSubCategoryCode) {
        return { productId: '' };
    }

    try {
        const productId = await buildNextProductId(
            normalizedMainCategoryCode,
            normalizedSubCategoryCode
        );
        return { productId };
    } catch (error) {
        console.error('Failed to generate next product id:', error);
        return { error: 'Failed to generate product id.' };
    }
}

export async function createProduct(formData: FormData) {
    const rawData = {
        p_name: formData.get('p_name') as string,
        p_desc: formData.get('p_desc') as string,
        price_unit: parseFloat(formData.get('price_unit') as string) || 0,
        p_unit: formData.get('p_unit') as string,
        safety_stock: parseInt(formData.get('safety_stock') as string) || 0,
        supplier: formData.get('supplier') as string,
        p_sku: formData.get('p_sku') as string,
        model_name: formData.get('model_name') as string,
        brand_name: formData.get('brand_name') as string,
        brand_code: formData.get('brand_code') as string,
        size: formData.get('size') as string,
        main_category_code: formData.get('main_category_code') as string,
        sub_category_code: formData.get('sub_category_code') as string,
        asset_current_location: formData.get('asset_current_location') as string,
        p_count: parseInt(formData.get('p_count') as string) || 0,
    };

    // validate
    let validData;
    try {
        validData = validateData(createProductSchema, rawData, 'Product');
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Invalid product data.' };
    }

    const cat_id = parseInt(formData.get('cat_id') as string) || null;
    const is_luxury = formData.get('is_luxury') === 'true';
    const is_asset = formData.get('is_asset') === 'true';
    const imageFile = formData.get('p_image') as File;
    const model_name = normalizeOptionalText(validData.model_name);
    const brand_name = normalizeOptionalText(validData.brand_name);
    const brand_code = normalizeOptionalText(validData.brand_code);
    const size = normalizeOptionalText(validData.size);
    const normalizedMainCategoryCode = normalizeCodePart(validData.main_category_code);
    const normalizedSubCategoryCode = normalizeCodePart(validData.sub_category_code);
    const main_category_code = normalizedMainCategoryCode || null;
    const sub_category_code = normalizedSubCategoryCode || null;
    const asset_current_location = is_asset
        ? normalizeOptionalText(validData.asset_current_location)
        : null;

    if (!normalizedMainCategoryCode || !normalizedSubCategoryCode) {
        return { error: 'กรุณากรอก Code หมวดหลัก และ Code หมวดรอง เพื่อสร้างรหัสสินค้าอัตโนมัติ' };
    }

    let imageName = '';

    if (imageFile && imageFile.size > 0) {
        try {
            imageName = await uploadFile(imageFile, UPLOAD_DIR);
        } catch (error) {
            console.error('Image upload failed:', error);
                return { error: 'Failed to upload product image.' };
        }
    }

    let createdProductId: string | null = null;
    let lastCreateError: unknown = null;

    try {
        for (let attempt = 0; attempt < MAX_PRODUCT_ID_RETRY; attempt++) {
            const nextProductId = await buildNextProductId(
                normalizedMainCategoryCode,
                normalizedSubCategoryCode
            );

            try {
                await prisma.$transaction(async (tx) => {
                    await tx.tbl_products.create({
                        data: {
                            p_id: nextProductId,
                            p_name: validData.p_name,
                            p_desc: validData.p_desc || null,
                            price_unit: validData.price_unit || 0,
                            p_unit: validData.p_unit || 'ชิ้น',
                            cat_id,
                            safety_stock: validData.safety_stock,
                            supplier: validData.supplier || null,
                            p_sku: validData.p_sku || null,
                            p_image: imageName,
                            p_count: validData.p_count,
                            active: true,
                            is_luxury,
                        },
                    });

                    
                    await tx.$executeRaw`
                        UPDATE tbl_products
                        SET model_name = ${model_name},
                            brand_name = ${brand_name},
                            brand_code = ${brand_code},
                            size = ${size},
                            main_category_code = ${main_category_code},
                            sub_category_code = ${sub_category_code},
                            is_asset = ${is_asset ? 1 : 0},
                            asset_current_location = ${asset_current_location}
                        WHERE p_id = ${nextProductId}
                    `;
                });

                createdProductId = nextProductId;
                break;
            } catch (error) {
                if (isProductIdUniqueConflict(error)) {
                    lastCreateError = error;
                    continue;
                }
                throw error;
            }
        }

        if (!createdProductId) {
            console.error('Failed to allocate product id after retries:', lastCreateError);
            return { error: 'ไม่สามารถสร้างรหัสสินค้าอัตโนมัติได้ กรุณาลองใหม่อีกครั้ง' };
        }

        const session = await auth();
        await logSystemAction(
            'CREATE',
            'Product',
            createdProductId,
            `Created product: ${validData.p_name}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        console.error('Failed to create product:', error);
        return { error: 'Failed to create product.' };
    }

    revalidatePath('/products');
    redirect('/products');
}

export async function updateProduct(formData: FormData) {
    const p_id = formData.get('p_id') as string;
    const p_name = formData.get('p_name') as string;
    const p_desc = formData.get('p_desc') as string;
    const p_price = parseFloat(formData.get('price_unit') as string) || 0;
    const p_unit = formData.get('p_unit') as string;
    const cat_id = parseInt(formData.get('cat_id') as string) || null;
    const safety_stock = parseInt(formData.get('safety_stock') as string) || 0;
    const supplier = formData.get('supplier') as string;
    const model_name = formData.get('model_name') as string;
    const brand_name = formData.get('brand_name') as string;
    const brand_code = formData.get('brand_code') as string;
    const size = formData.get('size') as string;
    const main_category_code = formData.get('main_category_code') as string;
    const sub_category_code = formData.get('sub_category_code') as string;
    const asset_current_location = formData.get('asset_current_location') as string;
    const is_luxury = formData.get('is_luxury') === 'true';
    const is_asset = formData.get('is_asset') === 'true';
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
        try {
            const imageName = await uploadFile(imageFile, UPLOAD_DIR);
            data.p_image = imageName;
        } catch (error) {
            console.error('Image upload failed:', error);
        }
    }

    try {
        await prisma.tbl_products.update({
            where: { p_id },
            data,
        });

        // Use raw SQL so this works even if Prisma Client wasn't regenerated yet
        await prisma.$executeRaw`
            UPDATE tbl_products
            SET model_name = ${normalizeOptionalText(model_name)},
                brand_name = ${normalizeOptionalText(brand_name)},
                brand_code = ${normalizeOptionalText(brand_code)},
                size = ${normalizeOptionalText(size)},
                main_category_code = ${normalizeOptionalText(main_category_code)},
                sub_category_code = ${normalizeOptionalText(sub_category_code)},
                is_asset = ${is_asset ? 1 : 0},
                asset_current_location = ${is_asset ? normalizeOptionalText(asset_current_location) : null}
            WHERE p_id = ${p_id}
        `;

        const session = await auth();
        await logSystemAction(
            'UPDATE',
            'Product',
            p_id,
            `Updated product: ${p_name}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
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
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        console.error('Failed to delete product:', error);
        return { error: 'Failed to delete product.' };
    }

    revalidatePath('/products');
}

export async function getLowStockItems() {
    try {
        const products = await prisma.tbl_products.findMany({
            where: { active: true },
            include: { tbl_categories: true },
            orderBy: { p_name: 'asc' }
        });

        const lowStockItems = products.filter(p => p.p_count <= p.safety_stock);

        return { success: true, data: lowStockItems };
    } catch (error) {
        console.error('Failed to get low stock items:', error);
        return { success: false, error: 'Failed to fetch low stock items' };
    }
}

