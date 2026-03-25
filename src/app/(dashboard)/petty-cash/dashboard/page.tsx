import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PettyCashDashboardClient from './PettyCashDashboardClient';
import { getPettyCashAnalytics } from '@/actions/pettyCashAnalyticsActions';
import { canAccessPettyCashDashboard } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Petty Cash Analytics | Stock Movement',
    description: 'Dashboard and analytics for petty cash',
};

export default async function PettyCashDashboardPage() {
    const session = await auth();
    if (!session) redirect('/login');

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canAccessPettyCashDashboard(permissionContext.role, permissionContext.permissions)) {
        redirect('/petty-cash');
    }

    const analyticsRes = await getPettyCashAnalytics();

    if (!analyticsRes.success) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                    {analyticsRes.error === 'Permission denied'
                        ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ Admin/Manager/Accounting)'
                        : 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + analyticsRes.error}
                </div>
            </div>
        );
    }

    return (
        <div>
            <PettyCashDashboardClient initialData={analyticsRes.data} />
        </div>
    );
}
