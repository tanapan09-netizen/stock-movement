import { Suspense } from 'react';
import GeneralRequestClient from './GeneralRequestClient';
import { auth } from '@/auth';
import { getRolePermissions } from '@/actions/roleActions';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'รับแจ้งซ่อม (ธุรการ) | Stock Movement',
    description: 'หน้ารับแจ้งซ่อมจากทุก Role สำหรับฝ่ายธุรการ'
};

export default async function GeneralRequestPage() {
    const session = await auth();
    let permissions = {};

    if (session && session.user) {
        const role = (session.user as any).role || 'user';
        const defaultPermissions = await getRolePermissions(role);

        let customPermissions = {};
        const isLinked = (session.user as any).is_linked;

        if (isLinked) {
            const user = await prisma.tbl_users.findUnique({
                where: { p_id: parseInt(session.user.id as string) },
                select: { custom_permissions: true }
            });
            if (user?.custom_permissions) {
                try {
                    customPermissions = JSON.parse(user.custom_permissions);
                } catch (e) {
                    console.error('Failed to parse custom permissions', e);
                }
            }
        }
        permissions = { ...defaultPermissions, ...customPermissions };
    }

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>}>
            <GeneralRequestClient userPermissions={permissions} />
        </Suspense>
    );
}
