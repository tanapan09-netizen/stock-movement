export const ACCOUNTING_DASHBOARD_COPY = {
  heroEyebrow: 'ACCOUNTING CONTROL',
  heroTitle: 'Dashboard บัญชีสำหรับติดตามเงินสดย่อย ภาระผูกพัน และต้นทุนหลักของระบบ',
  heroDescription: 'ใช้ติดตาม cash flow, คำขอค่าใช้จ่าย, ใบสั่งซื้อ, คำขออะไหล่, ต้นทุนซ่อม และทรัพย์สินจากมุมมองเดียว',
  statCards: {
    pettyCashActive: {
      title: 'วงเงินสดย่อยที่กำลังวิ่ง',
      noteSuffix: 'รายการที่ยังไม่ปิดยอด',
      tone: 'bg-emerald-50',
      iconKey: 'wallet',
    },
    approvals: {
      title: 'คิวตรวจค่าใช้จ่ายและจัดซื้อ',
      noteSuffix: 'คำขอที่ยังรอดำเนินการ',
      tone: 'bg-rose-50',
      iconKey: 'approvals',
    },
    purchaseOrders: {
      title: 'ภาระผูกพันใบสั่งซื้อ',
      noteSuffix: 'ใบสั่งซื้อที่ยังเปิดอยู่',
      tone: 'bg-blue-50',
      iconKey: 'purchaseOrders',
    },
    assets: {
      title: 'ทรัพย์สินซื้อใหม่ปีนี้',
      noteSuffix: 'รายการที่เพิ่มเข้าระบบ',
      tone: 'bg-violet-50',
      iconKey: 'assets',
    },
  },
  financeSection: {
    title: 'สถานะการเงินที่ต้องติดตาม',
    subtitle: 'สรุปวงเงิน กองทุน และต้นทุนที่กระทบงบประมาณโดยตรง',
    fundTitle: 'กองทุนเงินสดย่อย',
    fundLimitPrefix: 'วงเงินสูงสุด',
    pettyCashMonthTitle: 'ปิดยอดเงินสดย่อยเดือนนี้',
    maintenanceMonthTitle: 'ต้นทุนซ่อมเดือนนี้',
    maintenanceMonthNoteSuffix: 'งานที่ปิดแล้ว',
  },
  quickLinksSection: {
    title: 'ลิงก์ลัดการทำงาน',
    subtitle: 'เข้าหน้าหลักของ workflow ฝ่ายบัญชีได้ทันที',
    empty: 'ยังไม่มีลิงก์ที่เปิดสิทธิ์ให้บทบาทนี้',
  },
  recentSections: {
    pettyCashTitle: 'เงินสดย่อยล่าสุด',
    pettyCashSubtitle: 'รายการที่ยังไม่ปิดยอดหรือยังต้องติดตามต่อ',
    approvalsTitle: 'คิวบัญชีล่าสุด',
    approvalsSubtitle: 'ค่าใช้จ่ายที่รอตรวจและคำขอซื้อที่อยู่ขั้นบัญชี',
    approvalsEmpty: 'ไม่พบคำขอที่ต้องติดตามในตอนนี้',
    purchaseOrdersTitle: 'PO เปิดค้างล่าสุด',
    purchaseOrdersSubtitle: 'ภาระผูกพันที่ยังต้องติดตามการสั่งซื้อและรับของ',
    purchaseOrdersEmpty: 'ไม่พบใบสั่งซื้อที่ต้องติดตามในตอนนี้',
  },
  activityLabels: {
    pettyCash: 'เงินสดย่อย',
    purchaseOrder: 'ใบสั่งซื้อ',
    amount: 'วงเงิน',
    total: 'ยอดรวม',
    requester: 'ผู้ขอ',
    updatedAt: 'อัปเดตล่าสุด',
    createdAt: 'วันที่สร้าง',
    creatorPrefix: 'ผู้สร้าง',
  },
} as const;

export const ACCOUNTING_DASHBOARD_QUICK_LINKS = [
  { href: '/petty-cash', title: 'เงินสดย่อย', iconKey: 'pettyCash' },
  { href: '/approvals', title: 'คำขออนุมัติ', iconKey: 'approvals' },
  { href: '/purchase-request/manage', title: 'คำขอซื้อรอบัญชี', iconKey: 'purchaseRequests' },
  { href: '/purchase-orders', title: 'ใบสั่งซื้อ', iconKey: 'purchaseOrders' },
  { href: '/maintenance/part-requests', title: 'คำขออะไหล่', iconKey: 'partRequests' },
  { href: '/assets', title: 'ทรัพย์สิน', iconKey: 'assets' },
] as const;

export const ACCOUNTING_DASHBOARD_HERO_STATS = [
  { key: 'pettyCashPending', label: 'รออนุมัติเงินสดย่อย' },
  { key: 'approvalQueue', label: 'คิวตรวจบัญชี' },
  { key: 'openPurchaseOrders', label: 'PO เปิดค้าง' },
  { key: 'partRequestQueue', label: 'คำขออะไหล่รอบัญชี' },
] as const;

export type AccountingDashboardQuickLink = (typeof ACCOUNTING_DASHBOARD_QUICK_LINKS)[number];
export type AccountingDashboardQuickLinkIconKey = AccountingDashboardQuickLink['iconKey'];
export type AccountingDashboardHeroStatKey = (typeof ACCOUNTING_DASHBOARD_HERO_STATS)[number]['key'];
export type AccountingDashboardMetricCardKey = keyof typeof ACCOUNTING_DASHBOARD_COPY.statCards;
export type AccountingDashboardMetricCardIconKey = (typeof ACCOUNTING_DASHBOARD_COPY.statCards)[AccountingDashboardMetricCardKey]['iconKey'];

export function getAccountingApprovalTypeMeta(type?: string | null) {
  switch ((type || '').toLowerCase()) {
    case 'expense':
      return { label: 'ค่าใช้จ่าย', badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' };
    case 'purchase':
      return { label: 'จัดซื้อ', badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' };
    default:
      return { label: type || 'ทั่วไป', badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' };
  }
}

export function getAccountingPettyCashStatusMeta(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return { label: 'รออนุมัติ', badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
    case 'approved':
      return { label: 'อนุมัติแล้ว', badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
    case 'dispensed':
      return { label: 'จ่ายแล้ว', badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' };
    case 'clearing':
      return { label: 'รอเคลียร์', badgeClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' };
    default:
      return { label: status || 'ทั่วไป', badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' };
  }
}

export function getAccountingPurchaseOrderStatusMeta(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return { label: 'รอดำเนินการ', badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
    case 'approved':
      return { label: 'อนุมัติแล้ว', badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
    case 'ordered':
      return { label: 'สั่งซื้อแล้ว', badgeClass: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' };
    case 'partial':
      return { label: 'รับบางส่วน', badgeClass: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' };
    default:
      return { label: status || 'ทั่วไป', badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' };
  }
}
