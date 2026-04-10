import { NextResponse } from 'next/server';
import { runMonthlyDepreciationSnapshot } from '@/lib/server/asset-depreciation';

// This route should be called on the last day of every month by a cron job
// (e.g., Vercel Cron or Google Cloud Scheduler).
export async function POST() {
    try {
        // Optional: Check for a secret token in the request headers to secure the cron endpoint
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        // }
        const result = await runMonthlyDepreciationSnapshot({
            performedBy: 'System Cron',
        });

        return NextResponse.json({
            success: true,
            message: `Successfully ran monthly depreciation for ${result.successCount} assets.`,
            monthYear: result.monthYearLabel,
            timestamp: result.runDate.toISOString(),
        });
    } catch (error: unknown) {
        console.error('Error running depreciation cron', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to run depreciation cron',
                error: message,
            },
            { status: 500 },
        );
    }
}
