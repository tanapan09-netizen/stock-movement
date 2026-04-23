import { prisma } from '@/lib/prisma';

const ASSET_GROUP_DESC_PREFIX = 'ASSET_GROUP:';

function normalizeCategoryName(value: string | null | undefined) {
    return (value || '').trim();
}

export async function listAssetPolicyCategoryNames() {
    const rows = await prisma.tbl_categories.findMany({
        where: { cat_desc: { startsWith: ASSET_GROUP_DESC_PREFIX } },
        select: { cat_name: true },
        orderBy: { cat_name: 'asc' },
    });

    return Array.from(
        new Set(
            rows
                .map((row) => normalizeCategoryName(row.cat_name))
                .filter((value): value is string => Boolean(value)),
        ),
    ).sort((left, right) => left.localeCompare(right));
}
