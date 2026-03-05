import { NextRequest, NextResponse } from 'next/server';
import { generatePmTasks } from '@/actions/pmActions';

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: NextRequest) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.warn('[Cron] CRON_SECRET is not set in environment variables');
    } else if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[Cron] Starting PM Task Generation...');
        const result = await generatePmTasks();

        if (result.success) {
            console.log(`[Cron] Generated ${result.count} PM tasks.`);
            return NextResponse.json({
                success: true,
                message: `Generated ${result.count} tasks`,
                count: result.count
            });
        } else {
            console.error('[Cron] Failed:', result.error);
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error('[Cron] Unexpected error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
