import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export const getCategories = cache(async () => {
    return prisma.tbl_categories.findMany({
        orderBy: { cat_name: 'asc' },
        include: {
            _count: { select: { tbl_products: true } }
        }
    });
});

export const getCategoryById = cache(async (cat_id: number) => {
    return prisma.tbl_categories.findUnique({
        where: { cat_id },
        include: {
            _count: { select: { tbl_products: true } }
        }
    });
});
