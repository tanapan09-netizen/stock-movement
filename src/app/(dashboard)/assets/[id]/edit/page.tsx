import { prisma } from '@/lib/prisma';
import AssetForm from '@/components/AssetForm';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const [asset, roomReferences] = await Promise.all([
        prisma.tbl_assets.findUnique({
            where: { asset_id: parseInt(id, 10) },
        }),
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
    ]);

    if (!asset) {
        return notFound();
    }

    // Convert Decimal to number for form
    const formattedAsset = {
        ...asset,
        purchase_price: Number(asset.purchase_price),
        salvage_value: Number(asset.salvage_value),
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">แก้ไขข้อมูลทรัพย์สิน</h1>
            <AssetForm asset={formattedAsset} roomReferences={roomReferences} />
        </div>
    );
}
