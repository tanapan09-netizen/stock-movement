import { z } from 'zod';
import { KPI_GRAINS, KPI_METRICS, type KpiFilters, type KpiGrain, type KpiMetric } from '@/lib/kpi/queries';

const summaryQuerySchema = z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    location: z.string().optional(),
    category: z.string().optional(),
    department: z.string().optional(),
});

const trendQuerySchema = summaryQuerySchema.extend({
    metric: z.enum(KPI_METRICS),
    grain: z.enum(KPI_GRAINS).default('month'),
});

type ParseError = {
    code: string;
    message: string;
};

type ParseResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: ParseError;
};

export interface KpiTrendRequest {
    filters: KpiFilters;
    metric: KpiMetric;
    grain: KpiGrain;
}

function parseDateOnly(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

function normalizeOptional(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function parseBaseFilters(raw: {
    from: string;
    to: string;
    location?: string;
    category?: string;
    department?: string;
}): ParseResult<KpiFilters> {
    const from = parseDateOnly(raw.from);
    const to = parseDateOnly(raw.to);

    if (!from || !to) {
        return {
            ok: false,
            error: {
                code: 'INVALID_DATE_FORMAT',
                message: 'from and to must be valid YYYY-MM-DD dates',
            },
        };
    }

    if (from.getTime() > to.getTime()) {
        return {
            ok: false,
            error: {
                code: 'INVALID_DATE_RANGE',
                message: 'from must be less than or equal to to',
            },
        };
    }

    return {
        ok: true,
        data: {
            from,
            to,
            location: normalizeOptional(raw.location),
            category: normalizeOptional(raw.category),
            department: normalizeOptional(raw.department),
        },
    };
}

export function parseSummaryQuery(searchParams: URLSearchParams): ParseResult<KpiFilters> {
    const raw = Object.fromEntries(searchParams.entries());
    const parsed = summaryQuerySchema.safeParse(raw);
    if (!parsed.success) {
        return {
            ok: false,
            error: {
                code: 'INVALID_QUERY',
                message: 'from and to are required query parameters',
            },
        };
    }

    return parseBaseFilters(parsed.data);
}

export function parseTrendQuery(searchParams: URLSearchParams): ParseResult<KpiTrendRequest> {
    const raw = Object.fromEntries(searchParams.entries());
    const parsed = trendQuerySchema.safeParse(raw);
    if (!parsed.success) {
        return {
            ok: false,
            error: {
                code: 'INVALID_QUERY',
                message: 'metric, grain, from and to are required query parameters',
            },
        };
    }

    const filters = parseBaseFilters(parsed.data);
    if (!filters.ok) return filters;

    return {
        ok: true,
        data: {
            filters: filters.data,
            metric: parsed.data.metric,
            grain: parsed.data.grain,
        },
    };
}
