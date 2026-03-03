'use server';

import { auth } from '@/auth';
import { logSystemAction } from '@/lib/logger';

// Map paths to Thai page names for better readability
const PAGE_NAMES: Record<string, string> = {
    '/': 'หน้าแรก (Dashboard)',
    '/dashboard': 'หน้าแรก (Dashboard)',
    '/products': 'คลังสินค้า',
    '/products/add': 'เพิ่มสินค้า',
    '/stock-movement': 'เคลื่อนไหวสินค้า',
    '/maintenance': 'แจ้งซ่อม',
    '/maintenance/technicians': 'จัดการช่างซ่อม',
    '/maintenance/part-requests': 'ขอซื้ออะไหล่',
    '/maintenance/reports': 'รายงานการซ่อม',
    '/borrow': 'ยืม-คืนอุปกรณ์',
    '/petty-cash': 'เงินสดย่อย',
    '/roles': 'จัดการสิทธิ์',
    '/settings': 'ตั้งค่าระบบ',
    '/settings/line-users': 'จัดการผู้ใช้ LINE',
    '/settings/system-logs': 'ดู Log ระบบ',
    '/admin/security': 'ความปลอดภัย',
    '/audit': 'ตรวจสอบทรัพย์สิน',
    '/fixed-assets': 'ทรัพย์สินถาวร',
};

function getPageName(pathname: string): string {
    // Exact match first
    if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];

    // Check dynamic routes
    if (pathname.match(/^\/petty-cash\/\d+\/print$/)) return 'พิมพ์ใบเบิกเงินสดย่อย';
    if (pathname.match(/^\/petty-cash\/\d+$/)) return 'รายละเอียดเงินสดย่อย';
    if (pathname.match(/^\/products\/\d+$/)) return 'รายละเอียดสินค้า';
    if (pathname.match(/^\/maintenance\/\d+$/)) return 'รายละเอียดใบแจ้งซ่อม';
    if (pathname.match(/^\/borrow\//)) return 'รายละเอียดการยืม-คืน';

    // Fallback: use path
    return pathname;
}

export async function logPageView(
    pathname: string,
    extra?: {
        userAgent?: string;
        screenWidth?: number;
        screenHeight?: number;
        referrer?: string;
    }
) {
    try {
        const session = await auth();
        if (!session?.user) return; // Do not log anonymous users

        const userId = (session.user as any).p_id || (session.user as any).id;
        const parsedUserId = userId ? parseInt(userId.toString(), 10) : null;
        const validUserId = isNaN(parsedUserId as number) ? null : parsedUserId;

        const pageName = getPageName(pathname);

        // Parse device info from user agent
        let deviceInfo = '';
        if (extra?.userAgent) {
            if (extra.userAgent.includes('Mobile')) deviceInfo = '📱 มือถือ';
            else if (extra.userAgent.includes('Tablet')) deviceInfo = '📟 แท็บเล็ต';
            else deviceInfo = '💻 คอมพิวเตอร์';

            // Detect browser
            if (extra.userAgent.includes('Chrome') && !extra.userAgent.includes('Edg')) deviceInfo += ' / Chrome';
            else if (extra.userAgent.includes('Firefox')) deviceInfo += ' / Firefox';
            else if (extra.userAgent.includes('Safari') && !extra.userAgent.includes('Chrome')) deviceInfo += ' / Safari';
            else if (extra.userAgent.includes('Edg')) deviceInfo += ' / Edge';
        }

        const screenInfo = extra?.screenWidth ? `${extra.screenWidth}x${extra.screenHeight}` : '';

        const details = [
            `เข้าหน้า: ${pageName}`,
            `เส้นทาง: ${pathname}`,
            deviceInfo ? `อุปกรณ์: ${deviceInfo}` : '',
            screenInfo ? `หน้าจอ: ${screenInfo}` : '',
            extra?.referrer ? `มาจาก: ${extra.referrer}` : '',
        ].filter(Boolean).join(' | ');

        await logSystemAction(
            'เข้าชมหน้าจอ',
            `Page #${pathname}`,
            pathname,
            details,
            validUserId,
            session.user.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        console.error('Failed to log page view:', error);
    }
}
