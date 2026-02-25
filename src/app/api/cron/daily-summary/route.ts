import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMulticastMessage } from '@/lib/notifications/lineMessaging';
import { getLineIdsByRoles } from '@/actions/lineUserActions';

export async function GET(request: Request) {
    try {
        // Verify Cron Secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        // Only enforce token if it's set in the environment
        if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Cron] Starting daily summary generation...');

        // 1. Get Pending Maintenance Jobs (Pending or In Progress)
        const pendingMaintenanceCount = await prisma.tbl_maintenance_requests.count({
            where: {
                status: {
                    in: ['pending', 'in_progress']
                }
            }
        });

        // 2. Get Pending Part Requests
        const pendingPartRequestsCount = await prisma.tbl_part_requests.count({
            where: {
                status: 'pending'
            }
        });

        // 3. Get Low Stock Items
        // Replicating logic from stock reports: where qty <= min_qty
        const lowStockItems = await prisma.$queryRaw<any[]>`
            SELECT COUNT(*) as count
            FROM tbl_products 
            WHERE quantity <= min_quantity AND is_active = 1
        `;
        const lowStockCount = Number(lowStockItems[0]?.count || 0);

        // Date String
        const today = new Date().toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        // Construct Message
        let messageText = `📋 **สรุปสถานะระบบประจำวัน**\n📅 ${today}\n`;
        messageText += `\n🛠️ แจ้งซ่อมค้างคิว: ${pendingMaintenanceCount} งาน`;
        messageText += `\n🛒 ขอเบิก/สั่งซื้อรออนุมัติ: ${pendingPartRequestsCount} รายการ`;
        messageText += `\n⚠️ สินค้าเหลือน้อย: ${lowStockCount} รายการ`;
        messageText += `\n\nสามารถตรวจสอบรายละเอียดได้ที่ระบบ Stock Movement`;

        const message = {
            type: 'text' as const,
            text: messageText,
        };

        // Send to Managers and Admins
        const targetIds = await getLineIdsByRoles(['manager', 'admin']);

        if (targetIds.length > 0) {
            const result = await sendMulticastMessage(targetIds, message);
            if (!result.success) {
                console.error('[Cron] Failed to send LINE daily summary:', result.error);
                return NextResponse.json({ error: 'Failed to send LINE message', details: result.error }, { status: 500 });
            }
        } else {
            console.log('[Cron] No active Manager or Admin LINE users found to receive summary.');
        }

        return NextResponse.json({
            success: true,
            message: 'Daily summary sent successfully',
            stats: {
                maintenance: pendingMaintenanceCount,
                purchaseRequests: pendingPartRequestsCount,
                lowStock: lowStockCount
            },
            recipients: targetIds.length
        });

    } catch (error) {
        console.error('[Cron Error] Daily summary failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
