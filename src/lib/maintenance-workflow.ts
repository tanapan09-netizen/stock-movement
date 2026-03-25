export const MAINTENANCE_WORKFLOW_LABELS = [
    'รอเรื่อง',
    'แจ้งเรื่องต่อ',
    'ดำเนินการ',
    'ยืนยันงาน',
    'เสร็จสมบูรณ์',
] as const;

export function getMaintenanceWorkflowStep(status?: string | null): number {
    switch ((status || '').trim().toLowerCase()) {
        case 'pending':
            return 1;
        case 'approved':
            return 2;
        case 'in_progress':
            return 3;
        case 'confirmed':
            return 4;
        case 'completed':
        case 'verified':
            return 5;
        default:
            return 1;
    }
}
