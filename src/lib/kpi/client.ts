export const KPI_METRICS = [
    'approval_sla',
    'register_lead',
    'utilization',
    'maintenance_sla',
    'inventory_accuracy',
    'disposal_cycle',
] as const;

export const KPI_GRAINS = ['day', 'week', 'month'] as const;

export type KpiMetric = (typeof KPI_METRICS)[number];
export type KpiGrain = (typeof KPI_GRAINS)[number];

export interface KpiQueryFilters {
    from: string;
    to: string;
    location?: string;
    category?: string;
    department?: string;
}

export interface KpiSummaryResponse {
    approval_sla_pct: number;
    register_lead_days: number;
    utilization_pct: number;
    maintenance_sla_pct: number;
    inventory_accuracy_pct: number;
    disposal_cycle_days: number;
}

export interface KpiTrendPoint {
    period: string;
    value: number;
}

export interface KpiTrendResponse {
    metric: KpiMetric;
    grain: KpiGrain;
    points: KpiTrendPoint[];
}

export interface KpiTrendRequest extends KpiQueryFilters {
    metric: KpiMetric;
    grain?: KpiGrain;
}

export interface ApiErrorPayload {
    error: {
        code: string;
        message: string;
    };
}

function toSearchParams(filters: Record<string, string | undefined>): string {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim().length > 0) {
            params.set(key, value.trim());
        }
    });

    return params.toString();
}

async function throwApiError(response: Response): Promise<never> {
    try {
        const body = (await response.json()) as Partial<ApiErrorPayload>;
        const message = body?.error?.message || `Request failed with status ${response.status}`;
        throw new Error(message);
    } catch {
        throw new Error(`Request failed with status ${response.status}`);
    }
}

export async function getKpiSummary(
    filters: KpiQueryFilters,
    init?: RequestInit
): Promise<KpiSummaryResponse> {
    const query = toSearchParams({
        from: filters.from,
        to: filters.to,
        location: filters.location,
        category: filters.category,
        department: filters.department,
    });

    const response = await fetch(`/api/kpi/summary?${query}`, {
        ...init,
        cache: 'no-store',
    });

    if (!response.ok) {
        await throwApiError(response);
    }

    return response.json() as Promise<KpiSummaryResponse>;
}

export async function getKpiTrend(
    request: KpiTrendRequest,
    init?: RequestInit
): Promise<KpiTrendResponse> {
    const query = toSearchParams({
        metric: request.metric,
        grain: request.grain || 'month',
        from: request.from,
        to: request.to,
        location: request.location,
        category: request.category,
        department: request.department,
    });

    const response = await fetch(`/api/kpi/trend?${query}`, {
        ...init,
        cache: 'no-store',
    });

    if (!response.ok) {
        await throwApiError(response);
    }

    return response.json() as Promise<KpiTrendResponse>;
}

