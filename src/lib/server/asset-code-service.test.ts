import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, getAssetPolicyFromDbMock } = vi.hoisted(() => ({
    prismaMock: {
        tbl_assets: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
        },
    },
    getAssetPolicyFromDbMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock,
}));

vi.mock('@/lib/server/asset-policy-service', () => ({
    getAssetPolicyFromDb: getAssetPolicyFromDbMock,
}));

import { generateNextAssetCodeByPolicy } from '@/lib/server/asset-code-service';

describe('generateNextAssetCodeByPolicy', () => {
    beforeEach(() => {
        prismaMock.tbl_assets.findMany.mockReset();
        prismaMock.tbl_assets.findFirst.mockReset();
        getAssetPolicyFromDbMock.mockReset();
    });

    it('generates next sequence code using policy format with {YYYY} and zero token', async () => {
        const year = String(new Date().getFullYear());

        getAssetPolicyFromDbMock.mockResolvedValue({
            asset_code_format: `AST-{YYYY}-{000}`,
        });
        prismaMock.tbl_assets.findMany.mockResolvedValue([
            { asset_code: `AST-${year}-001` },
            { asset_code: `AST-${year}-010` },
            { asset_code: 'AST-INVALID' },
            { asset_code: `AST-2020-999` },
        ]);

        const nextCode = await generateNextAssetCodeByPolicy();

        expect(nextCode).toBe(`AST-${year}-011`);
        expect(prismaMock.tbl_assets.findMany).toHaveBeenCalledWith({
            where: { asset_code: { startsWith: `AST-${year}-` } },
            select: { asset_code: true },
        });
    });

    it('returns static code directly when code does not exist yet', async () => {
        getAssetPolicyFromDbMock.mockResolvedValue({
            asset_code_format: 'FIXED-CODE',
        });
        prismaMock.tbl_assets.findFirst.mockResolvedValueOnce(null);

        const nextCode = await generateNextAssetCodeByPolicy();

        expect(nextCode).toBe('FIXED-CODE');
        expect(prismaMock.tbl_assets.findFirst).toHaveBeenCalledWith({
            where: { asset_code: 'FIXED-CODE' },
            select: { asset_id: true },
        });
    });

    it('appends incremental suffix for static code when base code already exists', async () => {
        getAssetPolicyFromDbMock.mockResolvedValue({
            asset_code_format: 'FIXED-CODE',
        });
        prismaMock.tbl_assets.findFirst
            .mockResolvedValueOnce({ asset_id: 1 })
            .mockResolvedValueOnce(null);

        const nextCode = await generateNextAssetCodeByPolicy();

        expect(nextCode).toBe('FIXED-CODE-02');
        expect(prismaMock.tbl_assets.findFirst).toHaveBeenNthCalledWith(2, {
            where: { asset_code: 'FIXED-CODE-02' },
            select: { asset_id: true },
        });
    });
});

