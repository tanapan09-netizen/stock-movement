export const APPROVAL_REQUEST_TYPE_META = {
    ot: {
        shortLabel: 'OT',
        fullLabel: 'ทำงานล่วงเวลา (OT)',
        createLabel: 'ทำงานล่วงเวลา (OT)',
        workflowLabel: 'OT',
        badgeClass: 'bg-violet-100 text-violet-700',
        accentClass: 'bg-violet-400',
    },
    leave: {
        shortLabel: 'ลา',
        fullLabel: 'ลาหยุด',
        createLabel: 'ลาหยุด',
        workflowLabel: 'Leave',
        badgeClass: 'bg-sky-100 text-sky-700',
        accentClass: 'bg-sky-400',
    },
    expense: {
        shortLabel: 'Expense',
        fullLabel: 'เบิกค่าใช้จ่าย',
        createLabel: 'เบิกค่าใช้จ่ายอื่นๆ',
        workflowLabel: 'Expense',
        badgeClass: 'bg-amber-100 text-amber-700',
        accentClass: 'bg-amber-400',
    },
    purchase: {
        shortLabel: 'Purchase',
        fullLabel: 'คำขอซื้อ',
        createLabel: 'คำขอซื้อ',
        workflowLabel: 'Purchase',
        badgeClass: 'bg-orange-100 text-orange-700',
        accentClass: 'bg-orange-400',
    },
    other: {
        shortLabel: 'อื่นๆ',
        fullLabel: 'อื่นๆ',
        createLabel: 'อื่นๆ',
        workflowLabel: 'Other',
        badgeClass: 'bg-slate-100 text-slate-600',
        accentClass: 'bg-slate-300',
    },
} as const;

export type ApprovalRequestType = keyof typeof APPROVAL_REQUEST_TYPE_META;

export const APPROVAL_REQUEST_TYPE_OPTIONS = Object.entries(APPROVAL_REQUEST_TYPE_META).map(
    ([value, meta]) => ({
        value,
        label: meta.createLabel,
    }),
);

export const APPROVAL_REQUEST_TYPE_FILTER_OPTIONS = [
    { value: 'all', label: 'ทุกประเภท', color: 'bg-slate-100 text-slate-600' },
    ...Object.entries(APPROVAL_REQUEST_TYPE_META).map(([value, meta]) => ({
        value,
        label: meta.shortLabel,
        color: meta.badgeClass,
    })),
] as const;

export const APPROVAL_WORKFLOW_REQUEST_TYPE_OPTIONS = (
    ['ot', 'leave', 'expense', 'purchase'] as const
).map((value) => ({
    value,
    label: APPROVAL_REQUEST_TYPE_META[value].workflowLabel,
}));

export function getApprovalRequestTypeLabel(
    type: string,
    variant: 'short' | 'full' | 'create' = 'short',
) {
    const meta = APPROVAL_REQUEST_TYPE_META[type as ApprovalRequestType];
    if (!meta) return type;
    if (variant === 'full') return meta.fullLabel;
    if (variant === 'create') return meta.createLabel;
    return meta.shortLabel;
}

export function getApprovalRequestTypeBadgeClass(type: string) {
    return APPROVAL_REQUEST_TYPE_META[type as ApprovalRequestType]?.badgeClass ?? 'bg-slate-100 text-slate-600';
}

export function getApprovalRequestTypeAccentClass(type: string) {
    return APPROVAL_REQUEST_TYPE_META[type as ApprovalRequestType]?.accentClass ?? 'bg-slate-300';
}
