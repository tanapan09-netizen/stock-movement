'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { COMMON_ACTION_MESSAGES, MOVEMENT_ACTION_MESSAGES } from '@/lib/action-messages';
import { prisma } from '@/lib/prisma';

type MovementQuery = {
    OR?: Array<
        | { p_id: { contains: string } }
        | { username: { contains: string } }
        | { remarks: { contains: string } }
    >;
    movement_time?: {
        gte?: Date;
        lte?: Date;
    };
};

export async function adjustStock(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: COMMON_ACTION_MESSAGES.unauthorized };
    }

    const username = session.user.name || COMMON_ACTION_MESSAGES.unknownUser;
    const p_id = formData.get('p_id') as string;
    const type = formData.get('type') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const remarks = formData.get('remarks') as string;

    if (!p_id || !type || !quantity || quantity <= 0) {
        return { error: MOVEMENT_ACTION_MESSAGES.invalidInput };
    }

    const movementType = type === 'in' ? 'รับเข้า' : 'ออก';

    const transactionDateStr = formData.get('transaction_date') as string;
    let movementTime = new Date();
    if (transactionDateStr) {
        movementTime = new Date(transactionDateStr);
    }

    try {
        const product = await prisma.tbl_products.findUnique({
            where: { p_id },
        });

        if (!product) {
            return { error: MOVEMENT_ACTION_MESSAGES.productNotFound };
        }

        let newStock = product.p_count;
        if (type === 'out') {
            if (product.p_count < quantity) {
                return { error: MOVEMENT_ACTION_MESSAGES.insufficientStock(product.p_count) };
            }
            newStock -= quantity;
        } else {
            newStock += quantity;
        }

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
        return { error: MOVEMENT_ACTION_MESSAGES.adjustFailed };
    }

    revalidatePath('/movements');
    revalidatePath('/products');
    return { success: true };
}

export async function deleteMovement(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: COMMON_ACTION_MESSAGES.unauthorized };
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'admin') {
        return { error: COMMON_ACTION_MESSAGES.adminOnly };
    }

    const movementId = parseInt(formData.get('movement_id') as string, 10);
    if (!movementId) {
        return { error: MOVEMENT_ACTION_MESSAGES.invalidMovementId };
    }

    try {
        const movement = await prisma.tbl_product_movements.findUnique({
            where: { movement_id: movementId },
        });

        if (!movement) {
            return { error: MOVEMENT_ACTION_MESSAGES.movementNotFound };
        }

        const product = await prisma.tbl_products.findUnique({
            where: { p_id: movement.p_id },
        });

        if (product) {
            const isIn =
                movement.movement_type === 'รับเข้า'
                || movement.movement_type === 'in'
                || movement.movement_type === 'add';
            const newStock = isIn
                ? product.p_count - movement.quantity
                : product.p_count + movement.quantity;

            await prisma.$transaction([
                prisma.tbl_product_movements.delete({
                    where: { movement_id: movementId },
                }),
                prisma.tbl_products.update({
                    where: { p_id: movement.p_id },
                    data: { p_count: Math.max(0, newStock) },
                }),
            ]);
        } else {
            await prisma.tbl_product_movements.delete({
                where: { movement_id: movementId },
            });
        }
    } catch (error) {
        console.error('Delete movement failed:', error);
        return { error: MOVEMENT_ACTION_MESSAGES.deleteFailed };
    }

    revalidatePath('/movements');
    revalidatePath('/products');
    return { success: true };
}

export async function updateMovement(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        return { error: COMMON_ACTION_MESSAGES.unauthorized };
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'admin') {
        return { error: COMMON_ACTION_MESSAGES.adminOnly };
    }

    const movementId = parseInt(formData.get('movement_id') as string, 10);
    const newQuantity = parseInt(formData.get('quantity') as string, 10);
    const newRemarks = formData.get('remarks') as string;

    if (!movementId) {
        return { error: MOVEMENT_ACTION_MESSAGES.invalidMovementId };
    }

    try {
        const movement = await prisma.tbl_product_movements.findUnique({
            where: { movement_id: movementId },
        });

        if (!movement) {
            return { error: MOVEMENT_ACTION_MESSAGES.movementNotFound };
        }

        if (newQuantity && newQuantity !== movement.quantity) {
            const product = await prisma.tbl_products.findUnique({
                where: { p_id: movement.p_id },
            });

            if (product) {
                const isIn =
                    movement.movement_type === 'รับเข้า'
                    || movement.movement_type === 'in'
                    || movement.movement_type === 'add';
                const diff = newQuantity - movement.quantity;
                const newStock = isIn
                    ? product.p_count + diff
                    : product.p_count - diff;

                await prisma.$transaction([
                    prisma.tbl_product_movements.update({
                        where: { movement_id: movementId },
                        data: {
                            quantity: newQuantity,
                            remarks: newRemarks !== undefined ? newRemarks : movement.remarks,
                        },
                    }),
                    prisma.tbl_products.update({
                        where: { p_id: movement.p_id },
                        data: { p_count: Math.max(0, newStock) },
                    }),
                ]);
            }
        } else {
            await prisma.tbl_product_movements.update({
                where: { movement_id: movementId },
                data: {
                    remarks: newRemarks !== undefined ? newRemarks : movement.remarks,
                },
            });
        }
    } catch (error) {
        console.error('Update movement failed:', error);
        return { error: MOVEMENT_ACTION_MESSAGES.updateFailed };
    }

    revalidatePath('/movements');
    revalidatePath('/products');
    return { success: true };
}

export async function getFilteredMovements({
    page = 1,
    limit = 50,
    search = '',
    startDate,
    endDate,
    all = false,
}: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    all?: boolean;
}) {
    const session = await auth();
    if (!session?.user) return { error: COMMON_ACTION_MESSAGES.unauthorized, movements: [], total: 0 };

    const where: MovementQuery = {};

    if (search) {
        where.OR = [
            { p_id: { contains: search } },
            { username: { contains: search } },
            { remarks: { contains: search } },
        ];
    }

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

        const pIds = Array.from(new Set(movements.map((movement) => movement.p_id)));
        const products = await prisma.tbl_products.findMany({
            where: { p_id: { in: pIds } },
            select: { p_id: true, p_name: true, p_image: true },
        });

        const productMap = new Map(products.map((product) => [product.p_id, product]));

        const enrichedMovements = movements.map((movement) => {
            const product = productMap.get(movement.p_id);
            return {
                ...movement,
                p_name: product?.p_name || movement.p_id,
                p_image: product?.p_image || null,
            };
        });

        return { movements: enrichedMovements, total };
    } catch (error) {
        console.error('Failed to fetch movements:', error);
        return { error: MOVEMENT_ACTION_MESSAGES.loadFailed, movements: [], total: 0 };
    }
}
