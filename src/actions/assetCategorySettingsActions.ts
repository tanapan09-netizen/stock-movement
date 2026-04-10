'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';
import { revalidatePath } from 'next/cache';

const ASSET_POLICY_ROUTE = '/settings/asset-policy';
const ASSET_GROUP_DESC_PREFIX = 'ASSET_GROUP:';

type AssetCategoryRow = {
    cat_id: number;
    cat_name: string;
    description: string;
    asset_count: number;
    product_count: number;
};

function toTaggedDescription(description: string, fallbackName: string) {
    const normalized = description.trim();
    return `${ASSET_GROUP_DESC_PREFIX}${normalized || fallbackName}`;
}

function extractDescription(catDesc: string | null, fallbackName: string) {
    const raw = catDesc || '';
    if (!raw.startsWith(ASSET_GROUP_DESC_PREFIX)) return fallbackName;
    const value = raw.slice(ASSET_GROUP_DESC_PREFIX.length).trim();
    return value || fallbackName;
}

async function getAssetCategoryAuthContext() {
    const session = await auth();
    if (!session?.user) return null;

    const permissionContext = await getUserPermissionContext(session.user);
    return {
        session,
        ...permissionContext,
    };
}

async function assertReadAccess() {
    const authContext = await getAssetCategoryAuthContext();
    if (!authContext) {
        throw new Error('Unauthorized');
    }

    const canRead = canAccessDashboardPage(
        authContext.role,
        authContext.permissions,
        ASSET_POLICY_ROUTE,
        { isApprover: authContext.isApprover, level: 'read' },
    );

    if (!canRead) {
        throw new Error('Unauthorized');
    }

    return authContext;
}

async function assertEditAccess() {
    const authContext = await assertReadAccess();
    const canEdit = canAccessDashboardPage(
        authContext.role,
        authContext.permissions,
        ASSET_POLICY_ROUTE,
        { isApprover: authContext.isApprover, level: 'edit' },
    );

    if (!canEdit) {
        throw new Error('Unauthorized');
    }

    return authContext;
}

function revalidateAssetCategoryPages() {
    revalidatePath('/settings');
    revalidatePath('/settings/asset-policy');
    revalidatePath('/assets');
    revalidatePath('/assets/new');
}

export async function listAssetCategoriesForSettings() {
    try {
        await assertReadAccess();

        const [categories, groupedAssets] = await Promise.all([
            prisma.tbl_categories.findMany({
                where: { cat_desc: { startsWith: ASSET_GROUP_DESC_PREFIX } },
                select: {
                    cat_id: true,
                    cat_name: true,
                    cat_desc: true,
                    _count: {
                        select: {
                            tbl_products: true,
                        },
                    },
                },
                orderBy: { cat_name: 'asc' },
            }),
            prisma.tbl_assets.groupBy({
                by: ['category'],
                _count: {
                    _all: true,
                },
            }),
        ]);

        const assetCountMap = groupedAssets.reduce<Record<string, number>>((acc, row) => {
            const category = (row.category || '').trim();
            if (!category) return acc;
            acc[category] = row._count._all;
            return acc;
        }, {});

        const rows: AssetCategoryRow[] = categories.map((row) => ({
            cat_id: row.cat_id,
            cat_name: row.cat_name,
            description: extractDescription(row.cat_desc, row.cat_name),
            asset_count: assetCountMap[row.cat_name] || 0,
            product_count: row._count.tbl_products,
        }));

        return { success: true as const, data: rows };
    } catch (error) {
        console.error('Failed to list asset categories:', error);
        return { success: false as const, error: 'ไม่สามารถโหลดหมวดหมู่สินทรัพย์ได้' };
    }
}

export async function createAssetCategoryForSettings(payload: { name: string; description?: string }) {
    try {
        await assertEditAccess();

        const name = payload.name.trim();
        const description = (payload.description || '').trim();

        if (name.length < 2) {
            return { success: false as const, error: 'ชื่อหมวดหมู่ต้องมีอย่างน้อย 2 ตัวอักษร' };
        }

        const existing = await prisma.tbl_categories.findFirst({
            where: { cat_name: name },
            select: { cat_id: true, cat_desc: true },
        });

        if (existing) {
            const alreadyAssetGroup = (existing.cat_desc || '').startsWith(ASSET_GROUP_DESC_PREFIX);
            if (alreadyAssetGroup) {
                return { success: false as const, error: 'มีหมวดหมู่นี้อยู่แล้ว' };
            }

            await prisma.tbl_categories.update({
                where: { cat_id: existing.cat_id },
                data: {
                    cat_desc: toTaggedDescription(description, name),
                },
            });
        } else {
            await prisma.tbl_categories.create({
                data: {
                    cat_name: name,
                    cat_desc: toTaggedDescription(description, name),
                },
            });
        }

        revalidateAssetCategoryPages();
        return { success: true as const };
    } catch (error) {
        console.error('Failed to create asset category:', error);
        return { success: false as const, error: 'ไม่สามารถเพิ่มหมวดหมู่สินทรัพย์ได้' };
    }
}

export async function updateAssetCategoryForSettings(payload: {
    catId: number;
    name: string;
    description?: string;
    syncAssets?: boolean;
}) {
    try {
        await assertEditAccess();

        const catId = Number(payload.catId || 0);
        const name = payload.name.trim();
        const description = (payload.description || '').trim();
        const syncAssets = payload.syncAssets !== false;

        if (!catId) {
            return { success: false as const, error: 'ไม่พบรหัสหมวดหมู่' };
        }
        if (name.length < 2) {
            return { success: false as const, error: 'ชื่อหมวดหมู่ต้องมีอย่างน้อย 2 ตัวอักษร' };
        }

        const target = await prisma.tbl_categories.findUnique({
            where: { cat_id: catId },
            select: { cat_id: true, cat_name: true, cat_desc: true },
        });

        if (!target || !(target.cat_desc || '').startsWith(ASSET_GROUP_DESC_PREFIX)) {
            return { success: false as const, error: 'ไม่พบหมวดหมู่สินทรัพย์ที่ต้องการแก้ไข' };
        }

        const duplicated = await prisma.tbl_categories.findFirst({
            where: {
                cat_name: name,
                NOT: { cat_id: catId },
            },
            select: { cat_id: true },
        });

        if (duplicated) {
            return { success: false as const, error: 'ชื่อหมวดหมู่ซ้ำ กรุณาใช้ชื่ออื่น' };
        }

        await prisma.$transaction(async (tx) => {
            await tx.tbl_categories.update({
                where: { cat_id: catId },
                data: {
                    cat_name: name,
                    cat_desc: toTaggedDescription(description, name),
                },
            });

            if (syncAssets && target.cat_name !== name) {
                await tx.tbl_assets.updateMany({
                    where: { category: target.cat_name },
                    data: { category: name },
                });
            }
        });

        revalidateAssetCategoryPages();
        return { success: true as const };
    } catch (error) {
        console.error('Failed to update asset category:', error);
        return { success: false as const, error: 'ไม่สามารถแก้ไขหมวดหมู่สินทรัพย์ได้' };
    }
}

export async function deleteAssetCategoryForSettings(catId: number) {
    try {
        await assertEditAccess();

        const id = Number(catId || 0);
        if (!id) {
            return { success: false as const, error: 'ไม่พบรหัสหมวดหมู่' };
        }

        const target = await prisma.tbl_categories.findUnique({
            where: { cat_id: id },
            select: {
                cat_id: true,
                cat_name: true,
                cat_desc: true,
                _count: {
                    select: {
                        tbl_products: true,
                    },
                },
            },
        });

        if (!target || !(target.cat_desc || '').startsWith(ASSET_GROUP_DESC_PREFIX)) {
            return { success: false as const, error: 'ไม่พบหมวดหมู่สินทรัพย์ที่ต้องการลบ' };
        }

        const assetCount = await prisma.tbl_assets.count({
            where: { category: target.cat_name },
        });

        if (assetCount > 0) {
            return {
                success: false as const,
                error: `ไม่สามารถลบได้ เนื่องจากมีสินทรัพย์ ${assetCount.toLocaleString('th-TH')} รายการใช้งานหมวดหมู่นี้`,
            };
        }

        if (target._count.tbl_products > 0) {
            return {
                success: false as const,
                error: `ไม่สามารถลบได้ เนื่องจากมีสินค้า ${target._count.tbl_products.toLocaleString('th-TH')} รายการเชื่อมกับหมวดหมู่นี้`,
            };
        }

        await prisma.tbl_categories.delete({
            where: { cat_id: id },
        });

        revalidateAssetCategoryPages();
        return { success: true as const };
    } catch (error) {
        console.error('Failed to delete asset category:', error);
        return { success: false as const, error: 'ไม่สามารถลบหมวดหมู่สินทรัพย์ได้' };
    }
}
