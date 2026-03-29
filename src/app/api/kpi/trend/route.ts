import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getKpiTrend } from '@/lib/kpi/queries';
import { parseTrendQuery } from '@/lib/kpi/validation';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
                { status: 401 }
            );
        }

        const parsed = parseTrendQuery(request.nextUrl.searchParams);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const points = await getKpiTrend(
            parsed.data.filters,
            parsed.data.metric,
            parsed.data.grain
        );

        return NextResponse.json({
            metric: parsed.data.metric,
            grain: parsed.data.grain,
            points,
        });
    } catch (error) {
        console.error('KPI trend API error:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch KPI trend' } },
            { status: 500 }
        );
    }
}
