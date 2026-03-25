export type InventoryAuditItemStatus =
    | 'pending'
    | 'matched'
    | 'variance'
    | 'recount_required'
    | 'reason_required'
    | 'review'
    | 'approved'
    | 'posted';

export type InventoryAuditFilterKey = 'all' | 'pending' | 'counted' | 'variance' | 'review';
export type InventoryAuditSessionStatus = 'draft' | 'frozen' | 'counting' | 'review' | 'approved' | 'posted' | 'cancelled';
export type InventoryAuditTrailAction =
    | 'create'
    | 'snapshot'
    | 'count'
    | 'recount'
    | 'reason'
    | 'submit_review'
    | 'reopen'
    | 'approve'
    | 'post'
    | 'cancel'
    | 'view';

export const INVENTORY_AUDIT_HIGH_VARIANCE_ABS = 10;
export const INVENTORY_AUDIT_HIGH_VARIANCE_PCT = 20;

export const INVENTORY_AUDIT_REASON_OPTIONS = [
    { value: 'count_error', label: 'นับผิด' },
    { value: 'wrong_location', label: 'ของอยู่ผิดตำแหน่ง' },
    { value: 'damage', label: 'เสียหาย / ชำรุด' },
    { value: 'expired', label: 'หมดอายุ / เสื่อมสภาพ' },
    { value: 'unposted_movement', label: 'มีการเคลื่อนไหวยังไม่ลงระบบ' },
    { value: 'shrinkage', label: 'สูญหาย / สูญเสีย' },
    { value: 'other', label: 'อื่น ๆ' },
] as const;

export const INVENTORY_AUDIT_ITEM_STATUS_META: Record<
    InventoryAuditItemStatus,
    { label: string; badgeClass: string }
> = {
    pending: { label: 'รอนับ', badgeClass: 'bg-slate-100 text-slate-700' },
    matched: { label: 'ตรงกัน', badgeClass: 'bg-emerald-100 text-emerald-700' },
    variance: { label: 'มีผลต่าง', badgeClass: 'bg-amber-100 text-amber-700' },
    recount_required: { label: 'ต้องนับซ้ำ', badgeClass: 'bg-rose-100 text-rose-700' },
    reason_required: { label: 'รอระบุสาเหตุ', badgeClass: 'bg-orange-100 text-orange-700' },
    review: { label: 'รอตรวจทาน', badgeClass: 'bg-indigo-100 text-indigo-700' },
    approved: { label: 'อนุมัติแล้ว', badgeClass: 'bg-blue-100 text-blue-700' },
    posted: { label: 'โพสต์ปรับยอดแล้ว', badgeClass: 'bg-violet-100 text-violet-700' },
};

export const INVENTORY_AUDIT_FILTER_OPTIONS: Array<{ key: InventoryAuditFilterKey; label: string }> = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'pending', label: 'รอนับ' },
    { key: 'counted', label: 'นับแล้ว' },
    { key: 'variance', label: 'มีผลต่าง' },
    { key: 'review', label: 'รอตรวจทาน' },
];

export const INVENTORY_AUDIT_SUMMARY_CARD_META = {
    draft: { label: 'ฉบับร่าง', color: 'text-slate-700', bg: 'bg-slate-50' },
    counting: { label: 'กำลังนับ', color: 'text-blue-700', bg: 'bg-blue-50' },
    review: { label: 'รอตรวจทาน', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    approved: { label: 'พร้อมโพสต์', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    exception: { label: 'มีข้อยกเว้น', color: 'text-rose-700', bg: 'bg-rose-50' },
} as const;

export const INVENTORY_AUDIT_SESSION_STATUS_META: Record<
    InventoryAuditSessionStatus,
    { label: string; badgeClass: string }
> = {
    draft: { label: 'ฉบับร่าง', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
    frozen: { label: 'Freeze Snapshot', badgeClass: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    counting: { label: 'กำลังนับ', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
    review: { label: 'รอตรวจทาน', badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    approved: { label: 'อนุมัติแล้ว', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    posted: { label: 'โพสต์ปรับยอดแล้ว', badgeClass: 'bg-violet-100 text-violet-700 border-violet-200' },
    cancelled: { label: 'ยกเลิก', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const INVENTORY_AUDIT_TRAIL_ACTION_META: Record<
    InventoryAuditTrailAction,
    { label: string; cls: string }
> = {
    create: { label: 'สร้างรายการ', cls: 'bg-slate-100 text-slate-700' },
    snapshot: { label: 'Freeze Snapshot', cls: 'bg-cyan-100 text-cyan-700' },
    count: { label: 'บันทึกการนับ', cls: 'bg-blue-100 text-blue-700' },
    recount: { label: 'นับซ้ำ', cls: 'bg-rose-100 text-rose-700' },
    reason: { label: 'อัปเดตสาเหตุ', cls: 'bg-amber-100 text-amber-700' },
    submit_review: { label: 'ส่งตรวจทาน', cls: 'bg-indigo-100 text-indigo-700' },
    reopen: { label: 'ส่งกลับไปนับต่อ', cls: 'bg-orange-100 text-orange-700' },
    approve: { label: 'อนุมัติ', cls: 'bg-emerald-100 text-emerald-700' },
    post: { label: 'โพสต์ปรับยอด', cls: 'bg-violet-100 text-violet-700' },
    cancel: { label: 'ยกเลิก', cls: 'bg-rose-100 text-rose-700' },
    view: { label: 'ดูข้อมูล', cls: 'bg-slate-100 text-slate-600' },
};

export const INVENTORY_AUDIT_TAB_OPTIONS = [
    { key: 'sessions', label: 'เซสชันตรวจนับ' },
    { key: 'exceptions', label: 'รายการต้องติดตาม' },
    { key: 'events', label: 'Audit Trail' },
] as const;

export const INVENTORY_AUDIT_PRODUCT_TABLE_HEADERS = [
    '#',
    'สินค้า',
    'Snapshot',
    'นับล่าสุด',
    'ผลต่าง',
    'ยอด live',
    'ปรับยอดที่จะโพสต์',
    'สาเหตุ',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_HISTORY_TABLE_HEADERS = [
    'เลขที่',
    'วันที่',
    'คลัง',
    'รายการ',
    'ผลต่างสุทธิ',
    'มูลค่าผลต่าง',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_TRAIL_TABLE_HEADERS = [
    'เวลา',
    'เหตุการณ์',
    'สินค้า',
    'ค่าเดิม → ค่าใหม่',
    'ผู้ดำเนินการ',
    'หมายเหตุ',
] as const;

export const INVENTORY_AUDIT_REPORT_TABLE_HEADERS = [
    '#',
    'รหัส',
    'สินค้า',
    'Snapshot',
    'นับได้',
    'ผลต่าง',
    'มูลค่าผลต่าง',
    'สาเหตุ',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_DETAIL_TABLE_HEADERS = [
    '#',
    'สินค้า',
    'Snapshot',
    'นับล่าสุด',
    'ผลต่าง',
    'ยอด live',
    'ปรับยอด',
    'สาเหตุ',
    'สถานะ',
] as const;

export const INVENTORY_AUDIT_COPY = {
    accessDeniedTitle: 'ไม่มีสิทธิ์เข้าถึง',
    accessDeniedBody: 'คุณไม่มีสิทธิ์ใช้งานหน้าตรวจนับสต็อก',
    accessDeniedContact: 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์',
    backToList: 'กลับไปรายการตรวจนับ',
    createAudit: 'สร้างเซสชันตรวจนับ',
    createAuditSubtitle: 'เริ่มงานตรวจนับตามคลัง พร้อม freeze ยอดอ้างอิงก่อนเริ่มนับจริง',
    auditDate: 'วันที่ตรวจนับ',
    warehouse: 'คลัง',
    notes: 'หมายเหตุ',
    draftStateTitle: 'เซสชันนี้ยังเป็นฉบับร่าง',
    draftStateBody: 'เมื่อกดเริ่มตรวจนับ ระบบจะ freeze snapshot ของยอดคงเหลือในคลังและสร้างรายการสินค้าทั้งหมดให้ทันที',
    noProductsInWarehouse: 'ไม่พบสินค้าคงเหลือในคลังนี้',
    unknownProductName: 'ไม่ทราบชื่อสินค้า',
    valuePlaceholder: '—',
    startAudit: 'Freeze Snapshot และเริ่มนับ',
    submitForReview: 'ส่งตรวจทาน',
    reopenForCounting: 'ส่งกลับไปนับต่อ',
    approveAudit: 'อนุมัติผลตรวจนับ',
    postAudit: 'โพสต์ปรับยอดเข้าสต็อก',
    cancelAudit: 'ยกเลิกเซสชัน',
    confirmStartAudit: 'เริ่มตรวจนับและ freeze snapshot ของคลังนี้',
    confirmSubmitReview: 'ส่งผลตรวจนับทั้งหมดไปยังผู้ตรวจทาน',
    confirmApproveAudit: 'ยืนยันอนุมัติผลตรวจนับชุดนี้',
    confirmPostAudit: 'ยืนยันโพสต์ปรับยอดเข้าสต็อกจริง',
    confirmCancelAudit: 'ยืนยันยกเลิกเซสชันตรวจนับนี้',
    auditSummary: 'สรุปการตรวจนับ',
    auditExceptions: 'รายการที่ต้องติดตาม',
    auditEvents: 'ประวัติการดำเนินการ',
    pendingReason: 'รอระบุสาเหตุ',
    recountRequired: 'ต้องนับซ้ำ',
    currentWarehouseQty: 'ยอด live ปัจจุบัน',
    approvedAdjustment: 'ปรับยอดที่จะโพสต์',
    reasonCode: 'รหัสสาเหตุ',
    reasonNote: 'รายละเอียด',
    reasonPlaceholder: 'อธิบายสาเหตุเพิ่มเติมถ้าจำเป็น',
    sessionCreated: 'สร้างเซสชันตรวจนับแล้ว',
    saveFailed: 'บันทึกข้อมูลไม่สำเร็จ',
    itemUpdateFailed: 'อัปเดตรายการไม่สำเร็จ',
    noAuditItems: 'ยังไม่มีรายการในเซสชันนี้',
    unauthorized: 'ไม่มีสิทธิ์ใช้งาน',
    unknownUser: 'ไม่ทราบผู้ใช้งาน',
    unknownIp: 'ไม่ทราบ IP',
    failedToReadSession: 'ไม่สามารถอ่านข้อมูลผู้ใช้งานได้',
    noCheckedItems: 'ยังไม่มีรายการที่นับครบ',
    missingApproverOrPin: 'กรุณาระบุผู้อนุมัติและ PIN',
    approverNotFound: 'ไม่พบผู้อนุมัติ',
    approverNotAllowed: 'ผู้ใช้นี้ไม่มีสิทธิ์อนุมัติ',
    invalidApproverPin: 'PIN ผู้อนุมัติไม่ถูกต้อง',
    pinVerificationFailed: 'ตรวจสอบ PIN ไม่สำเร็จ',
    auditNotePrefix: 'ผู้ตรวจนับ:',
    auditTrailSaveAction: 'ตรวจนับสต็อก: บันทึก',
    auditTrailSaveDescriptionPrefix: 'บันทึกการตรวจนับสต็อก',
    approverRemarkPrefix: 'ผู้อนุมัติ:',
    auditTrailLogSkipped: 'ข้ามการบันทึก audit trail ของการตรวจนับสต็อก',
    sessionStarted: 'เริ่มตรวจนับและ freeze snapshot แล้ว',
    sessionSubmitted: 'ส่งเซสชันไปตรวจทานแล้ว',
    sessionApproved: 'อนุมัติผลตรวจนับแล้ว',
    sessionPosted: 'โพสต์ปรับยอดเข้าสต็อกแล้ว',
    sessionCancelled: 'ยกเลิกเซสชันตรวจนับแล้ว',
    sessionReopened: 'ส่งเซสชันกลับไปนับต่อแล้ว',
    reportTitle: 'รายงานตรวจนับสต็อก',
    reportResultTitle: 'รายงานผลการตรวจนับสต็อก',
    reportNumber: 'เลขที่',
    printedAt: 'พิมพ์เมื่อ',
    saveDenied: 'คุณไม่มีสิทธิ์แก้ไขการตรวจนับ',
    openSession: 'เปิดเซสชัน',
    latestSessions: 'เซสชันล่าสุด',
    recentEvents: 'เหตุการณ์ล่าสุด',
    openExceptions: 'ข้อยกเว้นที่ยังต้องติดตาม',
    noData: 'ยังไม่มีข้อมูล',
    noInfo: 'ไม่มีข้อมูล',
    noHistory: 'ยังไม่มีประวัติ',
    totalVarianceValue: 'มูลค่าผลต่าง',
    totalVarianceAbs: 'ผลต่างรวม',
} as const;

export function getInventoryAuditVarianceResultLabel(variance: number, isHighRisk: boolean) {
    if (variance === 0) return 'ตรงกัน';
    if (isHighRisk) return 'ผลต่างสูง';
    return 'มีผลต่าง';
}

export function getInventoryAuditSessionStatusMeta(
    status: InventoryAuditSessionStatus | string | null | undefined,
) {
    if (!status) return INVENTORY_AUDIT_SESSION_STATUS_META.draft;
    return INVENTORY_AUDIT_SESSION_STATUS_META[status as InventoryAuditSessionStatus]
        ?? { label: status, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export function getInventoryAuditItemStatusMeta(
    status: InventoryAuditItemStatus | string | null | undefined,
) {
    if (!status) return INVENTORY_AUDIT_ITEM_STATUS_META.pending;
    return INVENTORY_AUDIT_ITEM_STATUS_META[status as InventoryAuditItemStatus]
        ?? { label: status, badgeClass: 'bg-slate-100 text-slate-700' };
}
