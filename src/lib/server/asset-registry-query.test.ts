import { describe, expect, it } from 'vitest';

import {
    buildAssetRegistryOrderBy,
    buildAssetRegistryWhere,
    normalizeAssetRegistryFilters,
} from '@/lib/server/asset-registry-query';

describe('normalizeAssetRegistryFilters', () => {
    it('returns defaults for empty input', () => {
        const filters = normalizeAssetRegistryFilters({});

        expect(filters).toEqual({
            q: '',
            status: 'all',
            category: 'all',
            location: '',
            fromDate: '',
            toDate: '',
            sort: 'created_desc',
            page: 1,
        });
    });

    it('normalizes values and rejects invalid sort/page/date', () => {
        const filters = normalizeAssetRegistryFilters({
            q: ['  laptop  ', 'ignored'],
            status: ' Active ',
            category: ' Electronics ',
            location: ' HQ ',
            fromDate: 'invalid-date',
            toDate: '2026-03-01',
            sort: 'unsupported',
            page: '-5',
        });

        expect(filters).toEqual({
            q: 'laptop',
            status: 'Active',
            category: 'Electronics',
            location: 'HQ',
            fromDate: '',
            toDate: '2026-03-01',
            sort: 'created_desc',
            page: 1,
        });
    });
});

describe('buildAssetRegistryWhere', () => {
    it('builds query predicates for keyword/status/category/location/date range', () => {
        const where = buildAssetRegistryWhere({
            q: 'printer',
            status: 'Active',
            category: 'Electronics',
            location: 'Building A',
            fromDate: '2026-01-01',
            toDate: '2026-01-31',
        });

        expect(where.OR).toHaveLength(8);
        expect(where.status).toBe('Active');
        expect(where.category).toBe('Electronics');
        expect(where.location).toEqual({ contains: 'Building A' });

        const purchaseDate = where.purchase_date as { gte?: Date; lte?: Date };
        expect(purchaseDate.gte).toEqual(new Date('2026-01-01'));
        expect(purchaseDate.lte).toBeInstanceOf(Date);
        expect(purchaseDate.lte?.getHours()).toBe(23);
        expect(purchaseDate.lte?.getMinutes()).toBe(59);
        expect(purchaseDate.lte?.getSeconds()).toBe(59);
        expect(purchaseDate.lte?.getMilliseconds()).toBe(999);
    });
});

describe('buildAssetRegistryOrderBy', () => {
    it('maps supported sort modes to prisma orderBy', () => {
        expect(buildAssetRegistryOrderBy('created_desc')).toEqual({ created_at: 'desc' });
        expect(buildAssetRegistryOrderBy('created_asc')).toEqual({ created_at: 'asc' });
        expect(buildAssetRegistryOrderBy('code_asc')).toEqual({ asset_code: 'asc' });
        expect(buildAssetRegistryOrderBy('code_desc')).toEqual({ asset_code: 'desc' });
        expect(buildAssetRegistryOrderBy('name_asc')).toEqual({ asset_name: 'asc' });
        expect(buildAssetRegistryOrderBy('name_desc')).toEqual({ asset_name: 'desc' });
        expect(buildAssetRegistryOrderBy('value_desc')).toEqual({ purchase_price: 'desc' });
        expect(buildAssetRegistryOrderBy('value_asc')).toEqual({ purchase_price: 'asc' });
    });
});
