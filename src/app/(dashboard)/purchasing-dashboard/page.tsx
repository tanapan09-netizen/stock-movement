import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getPurchasingDashboardData } from '@/actions/purchasingDashboardActions';
import PurchasingDashboardClient from './PurchasingDashboardClient';

export default async function PurchasingDashboardPage() {
    const session = await auth();
    if (!session || !session.user) {
        redirect('/login');
    }

    const role = (session.user.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager' && role !== 'purchasing') {
         redirect('/'); // Or show unauthorized page
    }

    const result = await getPurchasingDashboardData();
    const data = result.success ? result.data : null;

    if (!data) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">ไม่สามารถโหลดข้อมูลได้</h2>
                    <p className="mt-2 text-sm text-gray-500">กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ</p>
                </div>
            </div>
        );
    }

    return (
        <PurchasingDashboardClient 
            summary={data.summary}
            recentPRs={data.recentPRs}
            recentPOs={data.recentPOs}
            userRole={role}
        />
    );
}
