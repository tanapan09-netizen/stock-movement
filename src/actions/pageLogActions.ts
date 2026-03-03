'use server';

import { auth } from '@/auth';
import { logSystemAction } from '@/lib/logger';

export async function logPageView(pathname: string) {
    try {
        const session = await auth();
        if (!session?.user) return; // Do not log anonymous users

        const userId = (session.user as any).p_id || (session.user as any).id;
        const parsedUserId = userId ? parseInt(userId.toString(), 10) : null;
        const validUserId = isNaN(parsedUserId as number) ? null : parsedUserId;

        await logSystemAction(
            'เข้าชมหน้าจอ', // "View Page"
            'Page',
            pathname,
            `ผู้ใช้เข้าถึงหน้า: ${pathname}`,
            validUserId,
            session.user.name || 'Unknown',
            'unknown' // Next.js doesn't easily expose IP in server actions without passing headers from middleware
        );
    } catch (error) {
        console.error('Failed to log page view:', error);
    }
}
