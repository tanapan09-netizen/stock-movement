export type InventoryAuditItemStatus = 'pending' | 'matched' | 'variance';
export type InventoryAuditFilterKey = 'all' | 'pending' | 'counted';
export type InventoryAuditSessionStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type InventoryAuditTrailAction = 'enter' | 'edit' | 'save' | 'approve' | 'view';

export const INVENTORY_AUDIT_ITEM_STATUS_META: Record<InventoryAuditItemStatus, { label: string }> = {
    pending: { label: 'รอตรวจนับ' },
    matched: { label: 'ตรงกัน' },
    variance: { label: 'มีผลต่าง' },
};

export const INVENTORY_AUDIT_FILTER_OPTIONS: Array<{ key: InventoryAuditFilterKey; label: string }> = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'pending', label: 'รอตรวจ' },
    { key: 'counted', label: 'นับแล้ว' },
];

export const INVENTORY_AUDIT_SUMMARY_CARD_META = {
    pending: { label: 'รอตรวจนับ', color: 'text-gray-500', bg: 'bg-gray-50' },
    counted: { label: 'นับแล้ว', color: 'text-blue-600', bg: 'bg-blue-50' },
    edited: { label: 'รายการที่แก้ไข', color: 'text-amber-700', bg: 'bg-amber-50' },
} as const;

export const INVENTORY_AUDIT_SESSION_STATUS_META: Record<
    InventoryAuditSessionStatus,
    { label: string; badgeClass: string }
> = {
    draft: { label: 'ฉบับร่าง', badgeClass: 'bg-gray-50 text-gray-600 border-gray-200' },
    in_progress: { label: 'กำลังตรวจนับ', badgeClass: 'bg-blue-50 text-blue-600 border-blue-200' },
    completed: { label: 'เสร็จสิ้น', badgeClass: 'bg-green-50 text-green-600 border-green-200' },
    cancelled: { label: 'ยกเลิก', badgeClass: 'bg-red-50 text-red-600 border-red-200' },
};

export const INVENTORY_AUDIT_TRAIL_ACTION_META: Record<
    InventoryAuditTrailAction,
    { label: string; cls: string }
> = {
    enter: { label: 'กรอกข้อมูล', cls: 'bg-blue-100 text-blue-700' },
    edit: { label: 'แก้ไข', cls: 'bg-amber-100 text-amber-700' },
    save: { label: 'บันทึก', cls: 'bg-emerald-100 text-emerald-700' },
    approve: { label: 'อนุมัติ', cls: 'bg-purple-100 text-purple-700' },
    view: { label: 'ดูข้อมูล', cls: 'bg-gray-100 text-gray-500' },
};

export const INVENTORY_AUDIT_TAB_OPTIONS = [
    { key: 'audit', label: 'ตรวจนับสต็อก' },
    { key: 'history', label: 'ประวัติการตรวจนับ' },
    { key: 'trail', label: 'Audit Trail' },
] as const;

export const INVENTORY_AUDIT_PRODUCT_TABLE_HEADERS = [
    'รหัส',
    'ชื่อสินค้า',
    'นับจริง',
    'แก้ไข',
    'เวลาที่กรอกครั้งแรก',
] as const;

export const INVENTORY_AUDIT_HISTORY_TABLE_HEADERS = [
    'เลขที่',
    'วันที่',
    'รายการ',
    'ผลต่าง',
    'ผู้ตรวจนับ',
    'ผู้อนุมัติ',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_TRAIL_TABLE_HEADERS = [
    'เวลา',
    'Action',
    'สินค้า',
    'ค่าเดิม → ค่าใหม่',
    'ผู้ดำเนินการ',
    'IP Address',
] as const;

export const INVENTORY_AUDIT_REPORT_TABLE_HEADERS = [
    '#',
    'รหัส',
    'ชื่อสินค้า',
    'ในระบบ',
    'นับจริง',
    'ผลต่าง',
    'แก้ไข',
    'เวลาที่กรอกครั้งแรก',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_DETAIL_TABLE_HEADERS = [
    '#',
    'สินค้า',
    'จำนวนในระบบ',
    'จำนวนนับได้',
    'ผลต่าง',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_COPY = {
    accessDeniedTitle: 'ไม่มีสิทธิ์เข้าถึง',
    accessDeniedBody: 'คุณไม่มีสิทธิ์ใช้งานหน้าตรวจนับสต็อก',
    accessDeniedContact: 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์',
    sessionExpiredTitle: 'Session หมดอายุ',
    sessionExpiredBody: 'ระบบล็อกอัตโนมัติหลังจากไม่มีการใช้งาน',
    sessionExpiredSuffix: 'นาที',
    sessionExpiredKeepData: 'ข้อมูลที่กรอกไว้ยังคงอยู่',
    unlock: 'ปลดล็อกและดำเนินการต่อ',
    confirmSaveTitle: 'ยืนยันบันทึกผลตรวจนับ',
    confirmSaveBody: 'ข้อมูลจะถูกล็อกและไม่สามารถแก้ไขได้ภายหลัง',
    auditor: 'ผู้ตรวจนับ',
    approver: 'ผู้อนุมัติ',
    checkedItems: 'รายการที่ตรวจ',
    editedItems: 'รายการที่แก้ไข',
    highRiskItems: 'พบรายการความเสี่ยงสูง',
    andMore: 'และอีก',
    confirmApproverIdentity: 'ยืนยันตัวตนผู้อนุมัติ',
    approverPinPromptPrefix: 'ผู้อนุมัติ',
    approverPinPromptSuffix: 'กรุณาใส่ PIN เพื่อลงนามอนุมัติ',
    approverPinPlaceholder: 'PIN ผู้อนุมัติ (4–8 หลัก)',
    saveLogNotice: 'การบันทึกนี้จะถูกบันทึก log พร้อม IP address, timestamp และ checksum — ไม่สามารถย้อนกลับได้',
    cancel: 'ยกเลิก',
    confirming: 'กำลังยืนยัน...',
    approveAndSave: 'อนุมัติและบันทึก',
    saveDenied: 'คุณไม่มีสิทธิ์บันทึกผลตรวจนับ',
    approverRequired: 'กรุณาระบุชื่อผู้อนุมัติ (Supervisor)',
    dualControlRequired: 'ผู้ตรวจนับและผู้อนุมัติต้องเป็นคนละคน (Dual Control)',
    noCheckedItems: 'ยังไม่มีรายการที่ตรวจนับ',
    invalidApproverPin: 'PIN ผู้อนุมัติไม่ถูกต้อง',
    saveFailed: 'บันทึกไม่สำเร็จ',
    genericError: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    reportRequired: 'กรุณาบันทึกผลตรวจนับก่อน เพื่อดูรายงาน',
    checkingPermission: 'กำลังตรวจสอบสิทธิ์...',
    loadingData: 'กำลังโหลดข้อมูล...',
    latestReport: 'รายงานล่าสุด',
    printLatestReport: 'พิมพ์รายงานล่าสุด',
    saveAuditResult: 'บันทึกผลตรวจนับ',
    auditInfo: 'ข้อมูลการตรวจนับ',
    dualControlBadge: 'Dual Control บังคับใช้',
    auditDate: 'วันที่ตรวจนับ',
    fromSession: 'จาก session',
    approverSupervisor: 'ผู้อนุมัติ (Supervisor)',
    approverInputPlaceholder: 'ชื่อ หรือ รหัสพนักงาน',
    approverMustDiffer: 'ต้องเป็นคนละคนกับผู้ตรวจนับ',
    approverPinHint: 'PIN จะถูกขอเมื่อกด "บันทึก"',
    progress: 'ความคืบหน้า',
    editDetectedPrefix: 'ตรวจพบการแก้ไขใน',
    editDetectedSuffix: 'รายการ',
    editTrackingNotice: 'แถวสีเหลืองในตาราง = มีการแก้ไขหลังกรอกครั้งแรก ข้อมูลทุกเวอร์ชันจะถูกบันทึกลง audit trail',
    searchPlaceholder: 'ค้นหารหัสหรือชื่อสินค้า...',
    noItemsFound: 'ไม่พบรายการ',
    historyLatest: 'ประวัติการตรวจนับ (20 รายการล่าสุด)',
    trailLatest: 'Audit Trail (50 รายการล่าสุด)',
    refresh: 'รีเฟรช',
    noHistory: 'ยังไม่มีประวัติ',
    noData: 'ยังไม่มีข้อมูล',
    noInfo: 'ไม่มีข้อมูล',
    completed: 'สำเร็จ',
    lockedData: 'ข้อมูลถูกล็อก',
    trailReadOnly: 'บันทึกทุก action — อ่านได้อย่างเดียว',
    reportTitle: 'รายงานตรวจนับสต็อก',
    reportResultTitle: 'รายงานผลการตรวจนับสต็อก',
    reportNumber: 'เลขที่',
    printedAt: 'พิมพ์เมื่อ',
    latestReportSummaryCounted: 'นับแล้ว',
    latestReportSummaryVariance: 'มีผลต่าง',
    highRiskLegend: 'สีแดง = ผลต่าง',
    editLegend: 'สีเหลือง = มีการแก้ไขหลังกรอกครั้งแรก',
    autoGeneratedNotice: 'เอกสารนี้ถูกสร้างโดยระบบอัตโนมัติ — ห้ามแก้ไข',
    viewItems: 'ดูรายการ',
    sessionWarning: '⚠ session ใกล้หมดอายุ',
    failedToLoadProducts: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
    auditInProgressTitle: 'ตรวจนับสต็อก',
    reportLatestPrefix: 'เลขที่',
    reportDatePrefix: 'วันที่',
    backToList: 'กลับไปรายการ',
    warehouse: 'คลัง',
    startAudit: 'เริ่มตรวจนับ',
    completeAudit: 'เสร็จสิ้น',
    cancelAudit: 'ยกเลิก',
    confirmCompleteAudit: 'ยืนยันว่าตรวจนับครบแล้ว?',
    confirmCancelAudit: 'ยืนยันการยกเลิกรายการตรวจนับนี้?',
    draftStateTitle: 'รายการนี้อยู่ในสถานะฉบับร่าง',
    draftStateBody: 'กดปุ่ม "เริ่มตรวจนับ" เพื่อดึงข้อมูลสินค้าในคลังล่าสุดและเริ่มทำรายการตรวจนับ',
    noProductsInWarehouse: 'ไม่พบรายการสินค้าในคลังนี้',
    unknownProductName: 'ไม่ทราบชื่อสินค้า',
    valuePlaceholder: '—',
    unauthorized: 'ไม่มีสิทธิ์ใช้งาน',
    unknownUser: 'ไม่ทราบผู้ใช้งาน',
    unknownIp: 'ไม่ทราบ IP',
    failedToReadSession: 'ไม่สามารถอ่านข้อมูลผู้ใช้ได้',
    auditNotePrefix: 'ผู้ตรวจนับ:',
    auditTrailSaveAction: 'ตรวจนับสต็อก: บันทึก',
    auditTrailSaveDescriptionPrefix: 'บันทึกการตรวจนับสต็อก',
    approverRemarkPrefix: 'ผู้อนุมัติ:',
    auditTrailLogSkipped: 'ข้ามการบันทึก audit trail ของการตรวจนับสต็อก',
    missingApproverOrPin: 'กรุณาระบุผู้อนุมัติและ PIN',
    approverNotFound: 'ไม่พบผู้อนุมัติ',
    approverNotAllowed: 'ผู้ใช้นี้ไม่มีสิทธิ์อนุมัติ',
    pinVerificationFailed: 'ตรวจสอบ PIN ไม่สำเร็จ',
} as const;

export function getInventoryAuditVarianceResultLabel(variance: number, isHighRisk: boolean) {
    if (variance === 0) return '✓ ตรงกัน';
    if (isHighRisk) return '✗ เสี่ยงสูง';
    return '✗ มีผลต่าง';
}

export function getInventoryAuditSessionStatusMeta(
    status: InventoryAuditSessionStatus | string | null | undefined
) {
    if (!status) return INVENTORY_AUDIT_SESSION_STATUS_META.draft;
    return INVENTORY_AUDIT_SESSION_STATUS_META[status as InventoryAuditSessionStatus]
        ?? { label: status, badgeClass: 'bg-gray-50 text-gray-600 border-gray-200' };
}
