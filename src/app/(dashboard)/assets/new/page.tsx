import AssetForm from '@/components/AssetForm';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { generateNextAssetCodeByPolicy } from '@/lib/server/asset-code-service';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { redirect } from 'next/navigation';

export default async function NewAssetPage() {
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

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">ลงทะเบียนทรัพย์สินใหม่</h1>
            <AssetForm suggestedAssetCode={suggestedAssetCode} />
        </div>
    );
}
