
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineNotify } from '@/lib/lineNotify'; // Broadcast to admin group

// Cron job / API to check for pending maintenance requests > 2 hours
// Ideally called by an external scheduler (e.g. Vercel Cron, GitHub Actions)
export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: Request) {
    try {
        // Authenticate (Basic Auth or Secret Header)
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // Find requests: Pending & Created > 2h ago & Not yet escalated (no escalation flag in DB, maybe check if we logged it?)
        // To avoid spamming, we should check if we already escalated recently.
        // For simplicity v1: Find pending > 2h
        // Better: We might need a flag `is_escalated` or check `tbl_maintenance_history` for "Escalated" action.

        // Let's filter by checking history actions if "Auto Escalation" exists.
        // This is not efficient for many records but okay for small scale.

        const pendingRequests = await prisma.tbl_maintenance_requests.findMany({
            where: {
                status: 'pending',
                created_at: { lt: twoHoursAgo }
            },
            include: {
                tbl_rooms: true,
                tbl_maintenance_history: {
                    where: { action: 'Auto Escalation' } // Check if already escalated
                }
            }
        });

        const escalatedRequests = [];

        for (const req of pendingRequests) {
            // Check if already escalated
            if (req.tbl_maintenance_history.length > 0) {
                continue; // Already escalated
            }

            // Escalate!
            const message = `🚨 [Auto Escalation] งานค้างเกิน 2 ชม.\nTicket: ${req.request_number}\nTitle: ${req.title}\nRoom: ${req.tbl_rooms.room_name} (${req.tbl_rooms.room_code})\nReporter: ${req.reported_by}`;

            await sendLineNotify(message);

            // Log history
            await prisma.tbl_maintenance_history.create({
                data: {
                    request_id: req.request_id,
                    action: 'Auto Escalation',
                    new_value: 'แจ้งเตือนงานค้างเกิน 2 ชั่วโมง',
                    changed_by: 'System'
                }
            });

            // Update priority to Urgent? Optional.
            /*
            await prisma.tbl_maintenance_requests.update({
                where: { request_id: req.request_id },
                data: { priority: 'urgent' }
            });
            */

            escalatedRequests.push(req.request_number);
        }

        return NextResponse.json({
            success: true,
            escalated_count: escalatedRequests.length,
            escalated_tickets: escalatedRequests
        });

    } catch (error) {
        console.error('Error in escalation cron:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
