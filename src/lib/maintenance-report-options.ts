export const MAINTENANCE_REPORT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending: { label: 'รอดำเนินการ', color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-200', dot: 'bg-amber-400' },
    in_progress: { label: 'กำลังซ่อม', color: 'text-blue-700', bg: 'bg-blue-50 border border-blue-200', dot: 'bg-blue-500' },
    completed: { label: 'เสร็จแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-200', dot: 'bg-emerald-500' },
    cancelled: { label: 'ยกเลิก', color: 'text-gray-500', bg: 'bg-gray-50 border border-gray-200', dot: 'bg-gray-400' },
} as const;

export const MAINTENANCE_REPORT_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    high: { label: 'เร่งด่วนสูง', color: 'text-red-600' },
    medium: { label: 'ปกติ', color: 'text-amber-600' },
    low: { label: 'ไม่เร่งด่วน', color: 'text-gray-400' },
} as const;

export const MAINTENANCE_PART_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    verified: { label: 'ตรวจสอบแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-200' },
    pending_verification: { label: 'รอตรวจสอบ', color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-200' },
    defective: { label: 'ของเสีย', color: 'text-red-700', bg: 'bg-red-50 border border-red-200' },
    withdrawn: { label: 'เบิกแล้ว', color: 'text-blue-700', bg: 'bg-blue-50 border border-blue-200' },
} as const;
