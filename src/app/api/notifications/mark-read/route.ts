import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type MarkReadBody = {
    id?: unknown;
    ids?: unknown;
};

function normalizeNotificationIds(body: MarkReadBody): string[] {
    const single = typeof body.id === 'string' ? [body.id] : [];
    const multiple = Array.isArray(body.ids) ? body.ids.filter((value): value is string => typeof value === 'string') : [];

    return [...new Set([...single, ...multiple].map(value => value.trim()).filter(Boolean))].slice(0, 1000);
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const userIdRaw = session?.user?.id;
        const userId = Number(userIdRaw);

        if (!Number.isFinite(userId) || userId <= 0) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as MarkReadBody;
        const ids = normalizeNotificationIds(body);

        if (ids.length === 0) {
            return NextResponse.json({ success: false, error: 'No notification ids provided' }, { status: 400 });
        }

        await prisma.tbl_notification_reads.createMany({
            data: ids.map(notificationId => ({
                user_id: userId,
                notification_id: notificationId,
            })),
            skipDuplicates: true,
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Mark notification as read failed:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
