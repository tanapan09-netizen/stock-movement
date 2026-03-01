import { Metadata } from 'next';
import PettyCashDashboardClient from './PettyCashDashboardClient';
import { getPettyCashAnalytics } from '@/actions/pettyCashAnalyticsActions';

export const metadata: Metadata = {
    title: 'Petty Cash Analytics | Stock Movement',
    description: 'Dashboard and analytics for petty cash',
};

export default async function PettyCashDashboardPage() {
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
