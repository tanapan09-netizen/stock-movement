import { Suspense } from 'react';
import GeneralRequestClient from './GeneralRequestClient';
import { auth } from '@/auth';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export const metadata = {
    title: 'รับแจ้งซ่อม (ธุรการ) | Stock Movement',
    description: 'หน้ารับแจ้งซ่อมจากทุก Role สำหรับฝ่ายธุรการ'
};

export default async function GeneralRequestPage() {
    const session = await auth();
    const permissions = session?.user
        ? (await getUserPermissionContext(session.user as PermissionSessionUser)).permissions
        : {};

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>}>
            <GeneralRequestClient userPermissions={permissions} />
        </Suspense>
    );
}
