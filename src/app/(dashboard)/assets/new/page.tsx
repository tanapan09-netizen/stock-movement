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

function getSingleParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
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
    const prefill = {
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

    const roomReferences = await prisma.tbl_rooms.findMany({
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
    });

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">ลงทะเบียนทรัพย์สินใหม่</h1>
            <AssetForm suggestedAssetCode={suggestedAssetCode} prefill={prefill} roomReferences={roomReferences} />
        </div>
    );
}
