'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import {
    getKpiSummary,
    getKpiTrend,
    type KpiQueryFilters,
    type KpiSummaryResponse,
    type KpiTrendRequest,
    type KpiTrendResponse,
} from '@/lib/kpi/client';

interface QueryState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return 'Failed to fetch data';
}

function buildSummaryKey(filters: KpiQueryFilters): string {
    return [
        filters.from,
        filters.to,
        filters.location || '',
        filters.category || '',
        filters.department || '',
    ].join('|');
}

function buildTrendKey(request: KpiTrendRequest): string {
    return [
        request.metric,
        request.grain || 'month',
        request.from,
        request.to,
        request.location || '',
        request.category || '',
        request.department || '',
    ].join('|');
}

export function useKpiSummary(filters: KpiQueryFilters | null, enabled: boolean = true): QueryState<KpiSummaryResponse> {
    const [state, setState] = useState<QueryState<KpiSummaryResponse>>({
        data: null,
        loading: false,
        error: null,
    });

    const key = useMemo(() => (filters ? buildSummaryKey(filters) : ''), [filters]);

    useEffect(() => {
        if (!enabled || !filters) return;

        const controller = new AbortController();
        setState((prev) => ({ ...prev, loading: true, error: null }));

        getKpiSummary(filters, { signal: controller.signal })
            .then((data) => {
                setState({ data, loading: false, error: null });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState({ data: null, loading: false, error: toErrorMessage(error) });
            });

        return () => controller.abort();
    }, [enabled, key, filters]);

    if (!enabled || !filters) {
        return { data: null, loading: false, error: null };
    }

    return state;
}

export function useKpiTrend(request: KpiTrendRequest | null, enabled: boolean = true): QueryState<KpiTrendResponse> {
    const [state, setState] = useState<QueryState<KpiTrendResponse>>({
        data: null,
        loading: false,
        error: null,
    });

    const key = useMemo(() => (request ? buildTrendKey(request) : ''), [request]);

    useEffect(() => {
        if (!enabled || !request) return;

        const controller = new AbortController();
        setState((prev) => ({ ...prev, loading: true, error: null }));

        getKpiTrend(request, { signal: controller.signal })
            .then((data) => {
                setState({ data, loading: false, error: null });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState({ data: null, loading: false, error: toErrorMessage(error) });
            });

        return () => controller.abort();
    }, [enabled, key, request]);

    if (!enabled || !request) {
        return { data: null, loading: false, error: null };
    }

    return state;
}


