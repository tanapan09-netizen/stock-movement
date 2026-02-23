'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
// import { redirect } from 'next/navigation'; // Unused

export async function adjustStock(formData: FormData) {
    const session = await auth();
    if (!session || !session.user) {
        return { error: 'Unauthorized' };
    }
    const username = session.user.name || 'Unknown';

    const p_id = formData.get('p_id') as string;
    const type = formData.get('type') as string; // 'in' or 'out'
    const quantity = parseInt(formData.get('quantity') as string);
    const remarks = formData.get('remarks') as string;

    if (!p_id || !type || !quantity || quantity <= 0) {
        return { error: 'Invalid input' };
    }

    // Map to Thai DB values
    const movementType = type === 'in' ? 'รับเข้า' : 'ออก';

    const transactionDateStr = formData.get('transaction_date') as string;
    let movementTime = new Date();
    if (transactionDateStr) {
        movementTime = new Date(transactionDateStr);
        // If the date is valid, we might want to set the time to current time or keep it 00:00 depending on requirement.
        // Usually for back-dated entries, keeping time as 00:00 or 12:00 is fine, or we can add current time component.
        // For simplicity and to match the user's intent of "that day", we can use the date as is (defaults to 00:00 UTC or local depending on parsing).
        // A safer bet for "transaction date" is to assume end of day or current time on that day? 
        // Let's just use the provided date. The input is YYYY-MM-DD.
        // new Date("2026-01-21") -> 2026-01-21T00:00:00.000Z (UTC).
        // If we want to capture the "day", this is fine.
    }

    try {
        // 1. Get current product to check stock and validate
        const product = await prisma.tbl_products.findUnique({
            where: { p_id },
        });

        if (!product) {
            return { error: 'Product not found' };
        }

        let newStock = product.p_count;
        if (type === 'out') {
            if (product.p_count < quantity) {
                return { error: `สินค้าคงเหลือไม่เพียงพอ (มี ${product.p_count})` };
            }
            newStock -= quantity;
        } else {
            newStock += quantity;
        }

        // 2. Transaction: Create Movement + Update Product
        await prisma.$transaction([
            prisma.tbl_product_movements.create({
                data: {
                    p_id,
                    movement_type: movementType,
                    quantity,
                    remarks,
                    username,
                    movement_time: movementTime,
                },
            }),
            prisma.tbl_products.update({
                where: { p_id },
                data: { p_count: newStock },
            }),
        ]);

    } catch (error) {
        console.error('Stock adjustment failed:', error);
        return { error: 'Failed to adjust stock' };
    }

    revalidatePath('/movements');
    revalidatePath('/products');
    return { success: true };
}

// Delete movement (Admin only) - reverses the stock change
export async function deleteMovement(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }

    // Check admin role from session
    const userRole = (session.user as any).role;

    if (userRole !== 'admin') {
        return { error: 'Permission denied: Admin only' };
    }

    const movementId = parseInt(formData.get('movement_id') as string);

    if (!movementId) {
        return { error: 'Invalid movement ID' };
    }

    try {
        // Get the movement to reverse
        const movement = await prisma.tbl_product_movements.findUnique({
            where: { movement_id: movementId }
        });

        if (!movement) {
            return { error: 'Movement not found' };
        }

        // Reverse the stock change
        const product = await prisma.tbl_products.findUnique({
            where: { p_id: movement.p_id }
        });

        if (product) {
            const isIn = movement.movement_type === 'รับเข้า' || movement.movement_type === 'in' || movement.movement_type === 'add';
            const newStock = isIn
                ? product.p_count - movement.quantity
                : product.p_count + movement.quantity;

            await prisma.$transaction([
                prisma.tbl_product_movements.delete({
                    where: { movement_id: movementId }
                }),
                prisma.tbl_products.update({
                    where: { p_id: movement.p_id },
                    data: { p_count: Math.max(0, newStock) }
                })
            ]);
        } else {
            // Just delete if product doesn't exist
            await prisma.tbl_product_movements.delete({
                where: { movement_id: movementId }
            });
        }

    } catch (error) {
        console.error('Delete movement failed:', error);
        return { error: 'Failed to delete movement' };
    }

    revalidatePath('/movements');
    revalidatePath('/products');
    return { success: true };
}

// Update movement (Admin only)
export async function updateMovement(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Unauthorized' };
    }

    // Check admin role from session
    const userRole = (session.user as any).role;

    if (userRole !== 'admin') {
        return { error: 'Permission denied: Admin only' };
    }

    const movementId = parseInt(formData.get('movement_id') as string);
    const newQuantity = parseInt(formData.get('quantity') as string);
    const newRemarks = formData.get('remarks') as string;

    if (!movementId) {
        return { error: 'Invalid movement ID' };
    }

    try {
        // Get current movement
        const movement = await prisma.tbl_product_movements.findUnique({
            where: { movement_id: movementId }
        });

        if (!movement) {
            return { error: 'Movement not found' };
        }

        // Calculate stock difference if quantity changed
        if (newQuantity && newQuantity !== movement.quantity) {
            const product = await prisma.tbl_products.findUnique({
                where: { p_id: movement.p_id }
            });

            if (product) {
                const isIn = movement.movement_type === 'รับเข้า' || movement.movement_type === 'in' || movement.movement_type === 'add';
                const diff = newQuantity - movement.quantity;
                const newStock = isIn
                    ? product.p_count + diff
                    : product.p_count - diff;

                await prisma.$transaction([
                    prisma.tbl_product_movements.update({
                        where: { movement_id: movementId },
                        data: {
                            quantity: newQuantity,
                            remarks: newRemarks !== undefined ? newRemarks : movement.remarks
                        }
                    }),
                    prisma.tbl_products.update({
                        where: { p_id: movement.p_id },
                        data: { p_count: Math.max(0, newStock) }
                    })
                ]);
            }
        } else {
            // Just update remarks
            await prisma.tbl_product_movements.update({
                where: { movement_id: movementId },
                data: {
                    remarks: newRemarks !== undefined ? newRemarks : movement.remarks
                }
            });
        }

    } catch (error) {
        console.error('Update movement failed:', error);
        return { error: 'Failed to update movement' };
    }

    revalidatePath('/movements');
    revalidatePath('/products');
    return { success: true };
}

// Get filtered movements for pagination and export
export async function getFilteredMovements({
    page = 1,
    limit = 50,
    search = '',
    startDate,
    endDate,
    all = false
}: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    all?: boolean;
}) {
    const session = await auth();
    if (!session?.user) return { error: 'Unauthorized', movements: [], total: 0 };

    // Search condition
    const where: any = {};

    if (search) {
        where.OR = [
            { p_id: { contains: search } },
            { username: { contains: search } },
            { remarks: { contains: search } },
        ];
    }

    // Date range condition
    if (startDate || endDate) {
        where.movement_time = {};
        if (startDate) {
            where.movement_time.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.movement_time.lte = end;
        }
    }

    try {
        const total = await prisma.tbl_product_movements.count({ where });

        const movements = await prisma.tbl_product_movements.findMany({
            where,
            orderBy: { movement_time: 'desc' },
            take: all ? undefined : limit,
            skip: all ? undefined : (page - 1) * limit,
        });

        // Get product details for these movements
        const pIds = Array.from(new Set(movements.map(m => m.p_id)));
        const products = await prisma.tbl_products.findMany({
            where: { p_id: { in: pIds } },
            select: { p_id: true, p_name: true, p_image: true }
        });

        const productMap = new Map(products.map(p => [p.p_id, p]));

        // Enrich data
        const enrichedMovements = movements.map(m => {
            const product = productMap.get(m.p_id);
            return {
                ...m,
                p_name: product?.p_name || m.p_id,
                p_image: product?.p_image || null,
            };
        });

        return { movements: enrichedMovements, total };

    } catch (error) {
        console.error('Failed to fetch movements:', error);
        return { error: 'Failed to fetch data', movements: [], total: 0 };
    }
}
