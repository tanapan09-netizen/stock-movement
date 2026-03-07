import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineMessage, sendLineNotify } from '@/lib/lineNotify';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Check Settings
        const settings = await prisma.tbl_system_settings.findMany();
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

        if (settingsMap['overdue_alerts_enabled'] === 'false') {
            return NextResponse.json({ message: 'Overdue alerts disabled in settings', count: 0 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find overdue requests
        const overdueRequests = await prisma.tbl_maintenance_requests.findMany({
            where: {
                status: { in: ['pending', 'in_progress'] },
                scheduled_date: { lt: today }
            },
            include: {
                tbl_rooms: true
            }
        });

        if (overdueRequests.length === 0) {
            return NextResponse.json({ message: 'No overdue requests found', count: 0 });
        }

        // 1. Send Group Notification (Admin/Operation)
        const summaryMsg = `
🚨 แจ้งเตือนงานล่าช้า (Overdue)
พบงานซ่อมเกินกำหนด ${overdueRequests.length} รายการ
        `.trim();
        await sendLineNotify(summaryMsg);

        // 2. Notify Assigned Technicians
        let notifiedCount = 0;
        for (const req of overdueRequests) {
            if (req.assigned_to) {
                // Find technician user to get LINE ID
                // Check tbl_technicians or tbl_users
                // Assuming assigned_to matches tbl_technicians name or tbl_users username
                // We'll try tbl_technicians first as it's more specific for maintenance
                const tech = await prisma.tbl_technicians.findFirst({
                    where: { name: req.assigned_to }
                });

                if (tech?.line_user_id) {
                    const msg = `
⚠️ งานซ่อมเกินกำหนด!
เลขที่: ${req.request_number}
ห้อง: ${req.tbl_rooms.room_code}
กำหนดเสร็จ: ${req.scheduled_date ? new Date(req.scheduled_date).toLocaleDateString('th-TH') : '-'}
สถานะ: ${req.status}
                     `.trim();
                    await sendLineMessage(tech.line_user_id, msg);
                    notifiedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            overdueCount: overdueRequests.length,
            notifiedTechs: notifiedCount
        });

    } catch (error) {
        console.error('Overdue check failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
