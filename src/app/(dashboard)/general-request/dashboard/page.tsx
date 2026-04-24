import Link from 'next/link';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Clock3,
    ClipboardList,
    Gauge,
    Timer,
    TrendingUp,
    Wrench,
    XCircle,
} from 'lucide-react';

import { auth } from '@/auth';
import { getMaintenanceRequests } from '@/actions/maintenanceActions';
import { GENERAL_REQUEST_CATEGORY_OPTIONS, GENERAL_REQUEST_PRIORITY_CONFIG } from '@/lib/general-request-options';
import { resolveGeneralRequestAccess } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'General Request KPI Dashboard | Stock Movement',
    description: 'Dashboard KPI for /general-request',
};

type SearchParams = {
    from?: string;
    to?: string;
};

type PageProps = {
    searchParams?: Promise<SearchParams>;
};

type RoomInfo = {
    room_code?: string | null;
    room_name?: string | null;
};

type GeneralRequestRow = {
    request_id: number;
    request_number: string;
    title: string;
    category: string | null;
    priority: string;
    status: string;
    reported_by: string;
    department: string | null;
    created_at: Date | string;
    updated_at: Date | string;
    completed_at: Date | string | null;
    tbl_rooms?: RoomInfo | null;
};

type EmployeeUserRow = {
    p_id: number;
    username: string;
    email: string | null;
    line_user_id: string | null;
};

type LineProfileRow = {
    user_id: number | null;
    line_user_id: string;
    display_name: string | null;
    full_name: string | null;
};

const FINISHED_REQUEST_STATUSES = new Set(['confirmed', 'completed', 'verified']);
const PENDING_REQUEST_STATUSES = new Set(['pending']);
const ACKNOWLEDGED_REQUEST_STATUSES = new Set(['approved']);
const IN_PROGRESS_REQUEST_STATUSES = new Set(['in_progress']);
const CANCELLED_REQUEST_STATUSES = new Set(['cancelled']);
const INFORMATIONAL_REQUEST_CATEGORIES = new Set(['general']);

const TH_DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const categoryLabelMap: Record<string, string> = Object.fromEntries(
    GENERAL_REQUEST_CATEGORY_OPTIONS.map((option) => [option.value, option.label] as const),
);

function normalizeStatus(status?: string | null): string {
    return (status || '').toLowerCase().trim();
}

function normalizeCategory(category?: string | null): string {
    return (category || '').toLowerCase().trim();
}

function normalizeIdentityKey(value?: string | null): string {
    return (value || '')
        .normalize('NFKC')
        .replace(/\u200B/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function buildIdentityKeys(value?: string | null): string[] {
    const normalized = normalizeIdentityKey(value);
    if (!normalized) return [];

    const sanitized = normalized
        .replace(/[^\p{L}\p{N}@._\-\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!sanitized || sanitized === normalized) {
        return [normalized];
    }

    return [normalized, sanitized];
}

function isPendingStatus(status?: string | null): boolean {
    return PENDING_REQUEST_STATUSES.has(normalizeStatus(status));
}

function isAcknowledgedStatus(status?: string | null): boolean {
    return ACKNOWLEDGED_REQUEST_STATUSES.has(normalizeStatus(status));
}

function isInProgressStatus(status?: string | null): boolean {
    return IN_PROGRESS_REQUEST_STATUSES.has(normalizeStatus(status));
}

function isFinishedStatus(status?: string | null): boolean {
    return FINISHED_REQUEST_STATUSES.has(normalizeStatus(status));
}

function isCancelledStatus(status?: string | null): boolean {
    return CANCELLED_REQUEST_STATUSES.has(normalizeStatus(status));
}

function isInformationalCategory(category?: string | null): boolean {
    return INFORMATIONAL_REQUEST_CATEGORIES.has(normalizeCategory(category));
}

function isAcknowledgedInformationalRequest(request: Pick<GeneralRequestRow, 'category' | 'status'>): boolean {
    return isInformationalCategory(request.category) && isFinishedStatus(request.status);
}

function isOperationalFinishedRequest(request: Pick<GeneralRequestRow, 'category' | 'status'>): boolean {
    return !isInformationalCategory(request.category) && isFinishedStatus(request.status);
}

function parseDateInput(value: string | undefined, fallback: Date): Date {
    if (!value) return new Date(fallback);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date(fallback);
    return parsed;
}

function getDateKey(value: Date | string | null | undefined): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return DATE_KEY_FORMATTER.format(parsed);
}

function formatDateLabel(value: Date | string | null | undefined): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return TH_DATE_FORMATTER.format(parsed);
}

function formatNumber(value: number): string {
    return value.toLocaleString('th-TH');
}

function formatPercent(value: number): string {
    if (!Number.isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
}

function diffHours(start: Date | string | null | undefined, end: Date | string | null | undefined): number {
    if (!start || !end) return 0;
    const from = new Date(start);
    const to = new Date(end);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
}

function toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function bucketCount<K extends string>(rows: GeneralRequestRow[], resolveKey: (row: GeneralRequestRow) => K): Map<K, number> {
    const counter = new Map<K, number>();
    for (const row of rows) {
        const key = resolveKey(row);
        counter.set(key, (counter.get(key) || 0) + 1);
    }
    return counter;
}

function rankBuckets(counter: Map<string, number>, limit = 6): Array<{ key: string; count: number }> {
    return Array.from(counter.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
        .slice(0, limit);
}

export default async function GeneralRequestKpiDashboardPage({ searchParams }: PageProps) {
    const session = await auth();
    const permissionContext = session?.user
        ? await getUserPermissionContext(session.user as PermissionSessionUser)
        : { role: '', permissions: {}, isApprover: false };
    const access = resolveGeneralRequestAccess(permissionContext.role, permissionContext.permissions);

    if (!access.canViewPage) {
        return (
            <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
                <Link href="/general-request" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" />
                    Back to General Request
                </Link>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5" />
                        <div>
                            <h1 className="text-lg font-semibold">Access denied</h1>
                            <p className="mt-1 text-sm">You do not have permission to view this KPI dashboard.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const params = (await searchParams) || {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const parsedFrom = parseDateInput(params.from, monthStart);
    const parsedTo = parseDateInput(params.to, now);
    const fromDate = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
    const toDate = parsedTo >= parsedFrom ? parsedTo : parsedFrom;

    const [requestResult, allTimeRequestResult, employeeUsers] = await Promise.all([
        getMaintenanceRequests({
            scope: 'general',
            startDate: fromDate,
            endDate: toDate,
        }),
        getMaintenanceRequests({
            scope: 'general',
        }),
        prisma.tbl_users.findMany({
            where: {
                role: 'employee',
                deleted_at: null,
            },
            select: {
                p_id: true,
                username: true,
                email: true,
                line_user_id: true,
            },
            orderBy: {
                username: 'asc',
            },
        }) as Promise<EmployeeUserRow[]>,
    ]);

    if (!requestResult.success || !requestResult.data) {
        return (
            <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
                <Link href="/general-request" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" />
                    Back to General Request
                </Link>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                    <h1 className="text-lg font-semibold">Cannot load dashboard data</h1>
                    <p className="mt-1 text-sm">{requestResult.error || 'Unknown error'}</p>
                </div>
            </div>
        );
    }

    const requests = (requestResult.data as unknown as GeneralRequestRow[]) || [];
    const allTimeRequests = allTimeRequestResult.success && allTimeRequestResult.data
        ? ((allTimeRequestResult.data as unknown as GeneralRequestRow[]) || [])
        : requests;

    const employeeUserIds = employeeUsers.map((user) => user.p_id);
    const employeeLineUserIds = employeeUsers
        .map((user) => (user.line_user_id || '').trim())
        .filter((lineUserId): lineUserId is string => Boolean(lineUserId));

    let employeeLineProfiles: LineProfileRow[] = [];
    if (employeeUserIds.length > 0 || employeeLineUserIds.length > 0) {
        const profileWhereOr: Array<Record<string, unknown>> = [];
        if (employeeUserIds.length > 0) {
            profileWhereOr.push({ user_id: { in: employeeUserIds } });
        }
        if (employeeLineUserIds.length > 0) {
            profileWhereOr.push({ line_user_id: { in: employeeLineUserIds } });
        }

        if (profileWhereOr.length > 0) {
            employeeLineProfiles = await prisma.tbl_line_users.findMany({
                where: {
                    is_active: true,
                    OR: profileWhereOr,
                },
                select: {
                    user_id: true,
                    line_user_id: true,
                    display_name: true,
                    full_name: true,
                },
            }) as LineProfileRow[];
        }
    }

    const lineProfileByUserId = new Map<number, LineProfileRow>();
    const lineProfileByLineUserId = new Map<string, LineProfileRow>();
    for (const profile of employeeLineProfiles) {
        if (typeof profile.user_id === 'number') {
            lineProfileByUserId.set(profile.user_id, profile);
        }
        const lineUserIdKey = normalizeIdentityKey(profile.line_user_id);
        if (lineUserIdKey) {
            lineProfileByLineUserId.set(lineUserIdKey, profile);
        }
    }

    const employeeIdentityMap = new Map<string, string>();
    for (const user of employeeUsers) {
        const username = (user.username || '').trim();
        if (!username) continue;

        const linkedProfile =
            lineProfileByUserId.get(user.p_id)
            || lineProfileByLineUserId.get(normalizeIdentityKey(user.line_user_id));

        const candidateValues = [
            user.username,
            user.email,
            user.line_user_id,
            linkedProfile?.display_name,
            linkedProfile?.full_name,
        ];

        for (const candidate of candidateValues) {
            for (const key of buildIdentityKeys(candidate)) {
                employeeIdentityMap.set(key, username);
            }
        }
    }

    const employeeDepartmentMatrix = new Map<string, Map<string, number>>();
    for (const request of allTimeRequests) {
        const reporterKeys = buildIdentityKeys(request.reported_by);
        const employeeName = reporterKeys
            .map((key) => employeeIdentityMap.get(key))
            .find((name): name is string => Boolean(name));
        if (!employeeName) continue;

        const departmentLabel = (request.department || '').trim() || 'ไม่ระบุฝ่าย';
        const departmentMap = employeeDepartmentMatrix.get(employeeName) || new Map<string, number>();
        departmentMap.set(departmentLabel, (departmentMap.get(departmentLabel) || 0) + 1);
        employeeDepartmentMatrix.set(employeeName, departmentMap);
    }

    const employeeDepartmentCards = Array.from(employeeDepartmentMatrix.entries())
        .map(([employeeName, departmentMap]) => {
            const departments = Array.from(departmentMap.entries())
                .map(([department, count]) => ({ department, count }))
                .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
            const total = departments.reduce((sum, item) => sum + item.count, 0);
            return {
                employeeName,
                total,
                departments,
            };
        })
        .sort((a, b) => b.total - a.total || a.employeeName.localeCompare(b.employeeName));

    const employeeDepartmentTotals = new Map<string, number>();
    for (const card of employeeDepartmentCards) {
        for (const item of card.departments) {
            employeeDepartmentTotals.set(item.department, (employeeDepartmentTotals.get(item.department) || 0) + item.count);
        }
    }

    const topEmployeeDepartmentTotals = rankBuckets(employeeDepartmentTotals, 8);
    const totalEmployeeSubmittedRequests = employeeDepartmentCards.reduce((sum, card) => sum + card.total, 0);
    const employeeWithSubmissionsCount = employeeDepartmentCards.length;

    const totalRequests = requests.length;
    const pendingRequests = requests.filter((request) => isPendingStatus(request.status));
    const acknowledgedRequests = requests.filter((request) => isAcknowledgedStatus(request.status));
    const inProgressRequests = requests.filter((request) => isInProgressStatus(request.status));
    const cancelledRequests = requests.filter((request) => isCancelledStatus(request.status));
    const acknowledgedInformationalRequests = requests.filter((request) => isAcknowledgedInformationalRequest(request));
    const operationalFinishedRequests = requests.filter((request) => isOperationalFinishedRequest(request));
    const closedRequests = requests.filter((request) => isFinishedStatus(request.status) || isCancelledStatus(request.status));

    const openRequestsCount = pendingRequests.length + acknowledgedRequests.length + inProgressRequests.length;
    const informationalRequestsCount = requests.filter((request) => isInformationalCategory(request.category)).length;
    const maintenanceFlowRequestsCount = totalRequests - informationalRequestsCount;

    const responseHourValues = requests
        .filter((request) => !isPendingStatus(request.status))
        .map((request) => diffHours(request.created_at, request.updated_at))
        .filter((hours) => Number.isFinite(hours));
    const avgResponseHours = average(responseHourValues);
    const responseWithin24hCount = responseHourValues.filter((hours) => hours <= 24).length;
    const responseSla24hRate = responseHourValues.length > 0
        ? (responseWithin24hCount / responseHourValues.length) * 100
        : 0;

    const closeHourValues = closedRequests
        .map((request) => diffHours(request.created_at, request.completed_at || request.updated_at))
        .filter((hours) => Number.isFinite(hours));
    const avgCloseHours = average(closeHourValues);

    const pendingOver24hCount = pendingRequests.filter((request) => diffHours(request.created_at, now) > 24).length;
    const pendingOver72hCount = pendingRequests.filter((request) => diffHours(request.created_at, now) > 72).length;
    const urgentOpenCount = requests.filter((request) => {
        const priority = (request.priority || '').toLowerCase().trim();
        return ['high', 'urgent'].includes(priority)
            && (isPendingStatus(request.status) || isAcknowledgedStatus(request.status) || isInProgressStatus(request.status));
    }).length;

    const createdByDay = new Map<string, number>();
    const closedByDay = new Map<string, number>();
    const acknowledgedByDay = new Map<string, number>();
    const dayKeys = new Set<string>();

    const cursor = new Date(fromDate);
    cursor.setHours(0, 0, 0, 0);
    const endCursor = new Date(toDate);
    endCursor.setHours(0, 0, 0, 0);
    while (cursor <= endCursor) {
        dayKeys.add(getDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    for (const request of requests) {
        const createdKey = getDateKey(request.created_at);
        if (createdKey) {
            dayKeys.add(createdKey);
            createdByDay.set(createdKey, (createdByDay.get(createdKey) || 0) + 1);
        }

        if (isAcknowledgedStatus(request.status)) {
            const acknowledgedKey = getDateKey(request.updated_at);
            if (acknowledgedKey) {
                dayKeys.add(acknowledgedKey);
                acknowledgedByDay.set(acknowledgedKey, (acknowledgedByDay.get(acknowledgedKey) || 0) + 1);
            }
        }

        if (isFinishedStatus(request.status) || isCancelledStatus(request.status)) {
            const closedKey = getDateKey(request.completed_at || request.updated_at);
            if (closedKey) {
                dayKeys.add(closedKey);
                closedByDay.set(closedKey, (closedByDay.get(closedKey) || 0) + 1);
            }
        }
    }

    const dailyRows = Array.from(dayKeys)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((dayKey) => ({
            dayKey,
            created: createdByDay.get(dayKey) || 0,
            acknowledged: acknowledgedByDay.get(dayKey) || 0,
            closed: closedByDay.get(dayKey) || 0,
        }));
    const recentDailyRows = dailyRows.slice(-14);
    const maxDailyValue = Math.max(
        1,
        ...recentDailyRows.map((row) => Math.max(row.created, row.acknowledged, row.closed)),
    );

    const categoryBuckets = bucketCount(requests, (request) => {
        const normalized = normalizeCategory(request.category) || 'other';
        return categoryLabelMap[normalized] || normalized;
    });
    const departmentBuckets = bucketCount(requests, (request) => {
        const value = (request.department || '').trim();
        return value || 'Not specified';
    });
    const reporterBuckets = bucketCount(requests, (request) => {
        const value = (request.reported_by || '').trim();
        return value || 'Unknown';
    });
    const priorityBuckets = bucketCount(requests, (request) => {
        const normalized = (request.priority || '').toLowerCase().trim();
        return GENERAL_REQUEST_PRIORITY_CONFIG[normalized]?.label || normalized || 'normal';
    });
    const roomBuckets = bucketCount(requests, (request) => {
        const roomCode = (request.tbl_rooms?.room_code || '').trim();
        const roomName = (request.tbl_rooms?.room_name || '').trim();
        if (!roomCode && !roomName) return 'Unknown location';
        if (!roomCode) return roomName;
        if (!roomName) return roomCode;
        return `${roomCode} - ${roomName}`;
    });

    const topCategories = rankBuckets(categoryBuckets, 6);
    const topDepartments = rankBuckets(departmentBuckets, 6);
    const topReporters = rankBuckets(reporterBuckets, 6);
    const topRooms = rankBuckets(roomBuckets, 6);
    const priorityDistribution = rankBuckets(priorityBuckets, 6);

    const oldestPending = [...pendingRequests]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, 10)
        .map((request) => ({
            ...request,
            ageHours: diffHours(request.created_at, now),
        }));

    const periodLabel = `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`;

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Link href="/general-request" className="mb-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="h-4 w-4" />
                        Back to General Request
                    </Link>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        KPI Dashboard: General Request
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Period: {periodLabel}
                    </p>
                </div>

                <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div>
                        <label htmlFor="from" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            From
                        </label>
                        <input
                            id="from"
                            name="from"
                            type="date"
                            defaultValue={toInputDate(fromDate)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="to" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            To
                        </label>
                        <input
                            id="to"
                            name="to"
                            type="date"
                            defaultValue={toInputDate(toDate)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        Apply
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Total</div>
                    <div className="mt-1 text-2xl font-bold text-blue-900">{formatNumber(totalRequests)}</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Pending</div>
                    <div className="mt-1 text-2xl font-bold text-yellow-900">{formatNumber(pendingRequests.length)}</div>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Acknowledged</div>
                    <div className="mt-1 text-2xl font-bold text-cyan-900">{formatNumber(acknowledgedRequests.length)}</div>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">In Progress</div>
                    <div className="mt-1 text-2xl font-bold text-indigo-900">{formatNumber(inProgressRequests.length)}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Info Acknowledged</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-900">{formatNumber(acknowledgedInformationalRequests.length)}</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-green-700">Finished</div>
                    <div className="mt-1 text-2xl font-bold text-green-900">{formatNumber(operationalFinishedRequests.length)}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Cancelled</div>
                    <div className="mt-1 text-2xl font-bold text-rose-900">{formatNumber(cancelledRequests.length)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Open Workload</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(openRequestsCount)}</div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">ผลงานการส่งงานของพนักงาน (role employee)</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            นับสะสมจากข้อมูลทั้งหมดในระบบของผู้แจ้งที่เป็น role employee ว่าส่งงานไปแต่ละฝ่ายกี่งาน
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                            พนักงานที่ส่งงาน: {formatNumber(employeeWithSubmissionsCount)} คน
                        </span>
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 font-semibold text-cyan-700">
                            งานจากพนักงานทั้งหมด: {formatNumber(totalEmployeeSubmittedRequests)} งาน
                        </span>
                    </div>
                </div>

                {topEmployeeDepartmentTotals.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {topEmployeeDepartmentTotals.map((item) => (
                            <span
                                key={`employee-dept-total-${item.key}`}
                                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                            >
                                {item.key}: {formatNumber(item.count)}
                            </span>
                        ))}
                    </div>
                ) : null}

                {employeeDepartmentCards.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {employeeDepartmentCards.map((card) => (
                            <div key={`employee-card-${card.employeeName}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="truncate text-sm font-semibold text-slate-900">{card.employeeName}</h3>
                                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                                        {formatNumber(card.total)} งาน
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1.5">
                                    {card.departments.map((item) => (
                                        <div
                                            key={`employee-card-${card.employeeName}-dept-${item.department}`}
                                            className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs"
                                        >
                                            <span className="truncate text-slate-600">{item.department}</span>
                                            <span className="ml-2 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        ไม่พบข้อมูลงานสะสมของผู้แจ้งที่เป็น role employee
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Timer className="h-4 w-4 text-blue-600" />
                        Avg Response Time
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{avgResponseHours.toFixed(1)} h</div>
                    <p className="mt-1 text-xs text-slate-500">From created to latest update for handled requests</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Gauge className="h-4 w-4 text-emerald-600" />
                        Response SLA (24h)
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{formatPercent(responseSla24hRate)}</div>
                    <p className="mt-1 text-xs text-slate-500">
                        {formatNumber(responseWithin24hCount)} / {formatNumber(responseHourValues.length)} requests
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Clock3 className="h-4 w-4 text-amber-600" />
                        Pending &gt; 24h / 72h
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                        {formatNumber(pendingOver24hCount)} / {formatNumber(pendingOver72hCount)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Backlog aging indicator</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Wrench className="h-4 w-4 text-rose-600" />
                        Avg Close Time
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{avgCloseHours.toFixed(1)} h</div>
                    <p className="mt-1 text-xs text-slate-500">
                        Closed requests: {formatNumber(closedRequests.length)} | Urgent open: {formatNumber(urgentOpenCount)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-800">Request Mix</h2>
                    <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <span className="text-slate-600">Maintenance flow</span>
                            <span className="font-semibold text-slate-900">{formatNumber(maintenanceFlowRequestsCount)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                            <span className="text-emerald-700">Informational only</span>
                            <span className="font-semibold text-emerald-900">{formatNumber(informationalRequestsCount)}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-800">Top Categories</h2>
                    <div className="mt-3 space-y-2">
                        {topCategories.length > 0 ? topCategories.map((item) => (
                            <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="truncate text-slate-600">{item.key}</span>
                                <span className="ml-2 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500">No data</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-800">Top Departments</h2>
                    <div className="mt-3 space-y-2">
                        {topDepartments.length > 0 ? topDepartments.map((item) => (
                            <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="truncate text-slate-600">{item.key}</span>
                                <span className="ml-2 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500">No data</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            Daily Trend (last 14 days in period)
                        </h2>
                    </div>
                    <div className="overflow-x-auto p-4">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="text-slate-500">
                                <tr>
                                    <th className="px-2 py-2 text-left">Date</th>
                                    <th className="px-2 py-2 text-left">Created</th>
                                    <th className="px-2 py-2 text-left">Acknowledged</th>
                                    <th className="px-2 py-2 text-left">Closed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentDailyRows.length > 0 ? recentDailyRows.map((row) => (
                                    <tr key={row.dayKey}>
                                        <td className="px-2 py-2 font-medium text-slate-700">{formatDateLabel(row.dayKey)}</td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 text-right text-xs text-slate-600">{row.created}</span>
                                                <div className="h-2 w-28 rounded bg-blue-100">
                                                    <div
                                                        className="h-2 rounded bg-blue-500"
                                                        style={{ width: `${(row.created / maxDailyValue) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 text-right text-xs text-slate-600">{row.acknowledged}</span>
                                                <div className="h-2 w-28 rounded bg-cyan-100">
                                                    <div
                                                        className="h-2 rounded bg-cyan-500"
                                                        style={{ width: `${(row.acknowledged / maxDailyValue) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 text-right text-xs text-slate-600">{row.closed}</span>
                                                <div className="h-2 w-28 rounded bg-emerald-100">
                                                    <div
                                                        className="h-2 rounded bg-emerald-500"
                                                        style={{ width: `${(row.closed / maxDailyValue) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-2 py-8 text-center text-slate-500">No trend data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                            <ClipboardList className="h-4 w-4 text-amber-600" />
                            Oldest Pending Requests
                        </h2>
                    </div>
                    <div className="overflow-x-auto p-4">
                        <table className="w-full min-w-[620px] text-sm">
                            <thead className="text-slate-500">
                                <tr>
                                    <th className="px-2 py-2 text-left">Request</th>
                                    <th className="px-2 py-2 text-left">Location</th>
                                    <th className="px-2 py-2 text-right">Age (h)</th>
                                    <th className="px-2 py-2 text-left">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {oldestPending.length > 0 ? oldestPending.map((request) => (
                                    <tr key={request.request_id}>
                                        <td className="px-2 py-2">
                                            <div className="font-medium text-slate-800">{request.title}</div>
                                            <div className="text-xs text-slate-500">{request.request_number}</div>
                                        </td>
                                        <td className="px-2 py-2 text-slate-600">
                                            {(request.tbl_rooms?.room_code || '-')}{request.tbl_rooms?.room_name ? ` - ${request.tbl_rooms.room_name}` : ''}
                                        </td>
                                        <td className="px-2 py-2 text-right font-semibold text-amber-700">{request.ageHours.toFixed(1)}</td>
                                        <td className="px-2 py-2 text-slate-600">{formatDateLabel(request.created_at)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-2 py-8 text-center text-slate-500">
                                            No pending requests in selected period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Priority Distribution
                    </h2>
                    <div className="mt-3 space-y-2">
                        {priorityDistribution.length > 0 ? priorityDistribution.map((item) => (
                            <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="truncate text-slate-600">{item.key}</span>
                                <span className="ml-2 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500">No data</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Clock3 className="h-4 w-4 text-blue-600" />
                        Top Reporters
                    </h2>
                    <div className="mt-3 space-y-2">
                        {topReporters.length > 0 ? topReporters.map((item) => (
                            <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="truncate text-slate-600">{item.key}</span>
                                <span className="ml-2 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500">No data</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        Top Locations
                    </h2>
                    <div className="mt-3 space-y-2">
                        {topRooms.length > 0 ? topRooms.map((item) => (
                            <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="truncate text-slate-600">{item.key}</span>
                                <span className="ml-2 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500">No data</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}




