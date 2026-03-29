import type { Prisma } from '@prisma/client';

export const ASSET_REGISTRY_PAGE_SIZE = 20;

export type AssetRegistrySort =
    | 'created_desc'
    | 'created_asc'
    | 'code_asc'
    | 'code_desc'
    | 'name_asc'
    | 'name_desc'
    | 'value_desc'
    | 'value_asc';

export type AssetRegistryFilters = {
    q: string;
    status: string;
    category: string;
    location: string;
    fromDate: string;
    toDate: string;
    sort: AssetRegistrySort;
    page: number;
};

const ALLOWED_SORTS: AssetRegistrySort[] = [
    'created_desc',
    'created_asc',
    'code_asc',
    'code_desc',
    'name_asc',
    'name_desc',
    'value_desc',
    'value_asc',
];

function normalizeSingleParam(
    value: string | string[] | undefined,
) {
    if (Array.isArray(value)) {
        return (value[0] || '').trim();
    }
    return (value || '').trim();
}

function normalizePositivePage(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normalizeDateParam(value: string) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? value : '';
}

export function normalizeAssetRegistryFilters(
    raw: Record<string, string | string[] | undefined>,
): AssetRegistryFilters {
    const sortCandidate = normalizeSingleParam(raw.sort) as AssetRegistrySort;

    return {
        q: normalizeSingleParam(raw.q),
        status: normalizeSingleParam(raw.status) || 'all',
        category: normalizeSingleParam(raw.category) || 'all',
        location: normalizeSingleParam(raw.location),
        fromDate: normalizeDateParam(normalizeSingleParam(raw.fromDate)),
        toDate: normalizeDateParam(normalizeSingleParam(raw.toDate)),
        sort: ALLOWED_SORTS.includes(sortCandidate) ? sortCandidate : 'created_desc',
        page: normalizePositivePage(normalizeSingleParam(raw.page)),
    };
}

export function buildAssetRegistryWhere(
    filters: Pick<AssetRegistryFilters, 'q' | 'status' | 'category' | 'location' | 'fromDate' | 'toDate'>,
): Prisma.tbl_assetsWhereInput {
    const where: Prisma.tbl_assetsWhereInput = {};

    if (filters.q) {
        where.OR = [
            { asset_code: { contains: filters.q } },
            { asset_name: { contains: filters.q } },
            { serial_number: { contains: filters.q } },
            { location: { contains: filters.q } },
            { room_section: { contains: filters.q } },
            { vendor: { contains: filters.q } },
            { brand: { contains: filters.q } },
            { model: { contains: filters.q } },
        ];
    }

    if (filters.status && filters.status !== 'all') {
        where.status = filters.status;
    }

    if (filters.category && filters.category !== 'all') {
        where.category = filters.category;
    }

    if (filters.location) {
        where.location = { contains: filters.location };
    }

    if (filters.fromDate || filters.toDate) {
        const purchaseDate: { gte?: Date; lte?: Date } = {};
        if (filters.fromDate) {
            purchaseDate.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
            const end = new Date(filters.toDate);
            end.setHours(23, 59, 59, 999);
            purchaseDate.lte = end;
        }
        where.purchase_date = purchaseDate;
    }

    return where;
}

export function buildAssetRegistryOrderBy(
    sort: AssetRegistrySort,
): Prisma.tbl_assetsOrderByWithRelationInput {
    switch (sort) {
        case 'created_asc':
            return { created_at: 'asc' };
        case 'code_asc':
            return { asset_code: 'asc' };
        case 'code_desc':
            return { asset_code: 'desc' };
        case 'name_asc':
            return { asset_name: 'asc' };
        case 'name_desc':
            return { asset_name: 'desc' };
        case 'value_desc':
            return { purchase_price: 'desc' };
        case 'value_asc':
            return { purchase_price: 'asc' };
        case 'created_desc':
        default:
            return { created_at: 'desc' };
    }
}

