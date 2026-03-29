import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getKpiSummary } from '@/lib/kpi/queries';
import { parseSummaryQuery } from '@/lib/kpi/validation';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
                { status: 401 }
            );
        }

        const parsed = parseSummaryQuery(request.nextUrl.searchParams);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const summary = await getKpiSummary(parsed.data);
        return NextResponse.json(summary);
    } catch (error) {
        console.error('KPI summary API error:', error);
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch KPI summary' } },
            { status: 500 }
        );
    }
}
