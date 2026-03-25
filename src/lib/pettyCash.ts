export type PettyCashSignatureRole = 'payee' | 'payer';
export type PettyCashStatus = 'pending' | 'approved' | 'dispensed' | 'clearing' | 'reconciled' | 'rejected';

const PETTY_CASH_SIGNATURE_ROLE_LABELS: Record<PettyCashSignatureRole, string> = {
    payee: 'ผู้เบิกเงิน',
    payer: 'ผู้จ่ายเงิน',
};

const PETTY_CASH_STATUS_META: Record<PettyCashStatus, { label: string; badgeClass: string }> = {
    pending: { label: 'รออนุมัติ', badgeClass: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'อนุมัติแล้ว', badgeClass: 'bg-emerald-100 text-emerald-800' },
    dispensed: { label: 'จ่ายเงินแล้ว', badgeClass: 'bg-blue-100 text-blue-800' },
    clearing: { label: 'รอตรวจเคลียร์', badgeClass: 'bg-indigo-100 text-indigo-800' },
    reconciled: { label: 'ปิดยอดแล้ว', badgeClass: 'bg-green-100 text-green-800' },
    rejected: { label: 'ถูกปฏิเสธ', badgeClass: 'bg-red-100 text-red-800' },
};

export const PETTY_CASH_ACTIVE_STATUSES: PettyCashStatus[] = ['pending', 'approved', 'dispensed', 'clearing'];
export const PETTY_CASH_HISTORY_STATUSES: PettyCashStatus[] = ['reconciled', 'rejected'];

export function getPettyCashSignatureRoleLabel(role: PettyCashSignatureRole) {
    return PETTY_CASH_SIGNATURE_ROLE_LABELS[role];
}

export function getPettyCashStatusLabel(status: string) {
    return PETTY_CASH_STATUS_META[status as PettyCashStatus]?.label ?? status;
}

export function getPettyCashStatusBadgeClass(status: string) {
    return PETTY_CASH_STATUS_META[status as PettyCashStatus]?.badgeClass ?? 'bg-gray-100 text-gray-800';
}

export function isPettyCashActiveStatus(status: string) {
    return PETTY_CASH_ACTIVE_STATUSES.includes(status as PettyCashStatus);
}

export function isPettyCashHistoryStatus(status: string) {
    return PETTY_CASH_HISTORY_STATUSES.includes(status as PettyCashStatus);
}
