export const PROCUREMENT_STATUS_META = {
    pending: {
        label: 'รอดำเนินการ',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
        order: 0,
    },
    approved: {
        label: 'อนุมัติแล้ว',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
        order: 1,
    },
    rejected: {
        label: 'ไม่อนุมัติ',
        badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-400',
        order: 2,
    },
    draft: {
        label: 'ร่าง',
        badgeClass: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        order: 3,
    },
    ordered: {
        label: 'สั่งซื้อแล้ว',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
        order: 4,
    },
    received: {
        label: 'รับสินค้าแล้ว',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
        order: 5,
    },
    cancelled: {
        label: 'ยกเลิก',
        badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-400',
        order: 6,
    },
} as const;

export const PURCHASE_REQUEST_STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'pending', label: PROCUREMENT_STATUS_META.pending.label },
    { value: 'approved', label: PROCUREMENT_STATUS_META.approved.label },
    { value: 'rejected', label: PROCUREMENT_STATUS_META.rejected.label },
] as const;

export function getProcurementStatusLabel(status: string) {
    return PROCUREMENT_STATUS_META[status as keyof typeof PROCUREMENT_STATUS_META]?.label ?? status;
}

export function getProcurementStatusBadgeClass(status: string) {
    return PROCUREMENT_STATUS_META[status as keyof typeof PROCUREMENT_STATUS_META]?.badgeClass
        ?? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function getProcurementStatusOrder(status: string) {
    return PROCUREMENT_STATUS_META[status as keyof typeof PROCUREMENT_STATUS_META]?.order ?? 99;
}
