import AssetForm from '@/components/AssetForm';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { generateNextAssetCodeByPolicy } from '@/lib/server/asset-code-service';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

type NewAssetMode = 'register' | 'purchase' | 'opening';

const ASSET_GROUP_DESC_PREFIX = 'ASSET_GROUP:';

function getSingleParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

function normalizeNewAssetMode(raw: string): NewAssetMode {
    const value = raw.trim().toLowerCase();
    if (value === 'purchase') return 'purchase';
    if (value === 'opening') return 'opening';
    return 'register';
}

export default async function NewAssetPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    if (!canEditPage) {
        redirect('/assets');
    }

    let suggestedAssetCode = '';
    try {
        suggestedAssetCode = await generateNextAssetCodeByPolicy();
    } catch {
        suggestedAssetCode = '';
    }

    const params = (await searchParams) || {};
    const mode = normalizeNewAssetMode(getSingleParam(params.mode));
    const prefill = {
        asset_code: getSingleParam(params.asset_code).trim() || getSingleParam(params.p_id).trim(),
        asset_name: getSingleParam(params.asset_name).trim() || getSingleParam(params.p_name).trim(),
        description: getSingleParam(params.description).trim() || getSingleParam(params.p_desc).trim(),
        category: getSingleParam(params.category).trim(),
        location: getSingleParam(params.location).trim() || getSingleParam(params.asset_current_location).trim(),
        room_section: getSingleParam(params.room_section).trim(),
        vendor: getSingleParam(params.vendor).trim() || getSingleParam(params.supplier).trim(),
        brand: getSingleParam(params.brand).trim() || getSingleParam(params.brand_name).trim(),
        model: getSingleParam(params.model).trim() || getSingleParam(params.model_name).trim(),
        serial_number: getSingleParam(params.serial_number).trim(),
        status: getSingleParam(params.status).trim() || 'Active',
    };

    const [roomReferences, categoryRows, groupRows] = await Promise.all([
        prisma.tbl_rooms.findMany({
            where: { active: true },
            select: {
                room_id: true,
                room_code: true,
                room_name: true,
                room_type: true,
                building: true,
                floor: true,
                zone: true,
                active: true,
            },
            orderBy: [{ room_code: 'asc' }],
        }),
        prisma.tbl_assets.findMany({
            distinct: ['category'],
            select: { category: true },
            orderBy: { category: 'asc' },
        }),
        prisma.tbl_categories.findMany({
            where: { cat_desc: { startsWith: ASSET_GROUP_DESC_PREFIX } },
            select: { cat_name: true },
            orderBy: { cat_name: 'asc' },
        }),
    ]);

    const assetGroups = Array.from(
        new Set([
            ...categoryRows.map((row) => row.category),
            ...groupRows.map((row) => row.cat_name),
        ]),
    )
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => left.localeCompare(right));

    const pageTitle =
        mode === 'opening'
            ? 'เพิ่มสินทรัพย์ยกมา'
            : mode === 'purchase'
                ? 'ซื้อสินทรัพย์ผ่านใหม่'
                : 'ลงทะเบียนทรัพย์สินใหม่';

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{pageTitle}</h1>
            <AssetForm
                suggestedAssetCode={suggestedAssetCode}
                prefill={prefill}
                roomReferences={roomReferences}
                assetGroups={assetGroups}
                acquisitionType={mode}
            />
        </div>
    );
}
