export const PERMISSIONS = {
    DASHBOARD: 'dashboard',
    PRODUCTS: 'products',
    MOVEMENTS: 'movements',
    STOCK_ADJUST: 'stock_adjust',
    BORROW: 'borrow',
    ASSETS: 'assets',
    MAINTENANCE: 'maintenance',
    MAINTENANCE_DASHBOARD: 'maintenance_dashboard',
    MAINTENANCE_TECHNICIANS: 'maintenance_technicians',
    MAINTENANCE_PARTS: 'maintenance_parts',
    MAINTENANCE_REQUESTS: 'maintenance_requests',
    MAINTENANCE_REPORTS: 'maintenance_reports',
    PETTY_CASH: 'petty_cash',
    ADMIN_ROLES: 'admin_roles',
    ADMIN_PO: 'admin_po',
    ADMIN_SUPPLIERS: 'admin_suppliers',
    ADMIN_WAREHOUSES: 'admin_warehouses',
    ADMIN_CATEGORIES: 'admin_categories',
    ADMIN_REPORTS: 'admin_reports',
    ADMIN_AUDIT: 'admin_audit',
    ADMIN_SETTINGS: 'admin_settings',
    ADMIN_SECURITY: 'admin_security',
    ADMIN_ROOMS: 'admin_rooms',
    ADMIN_LOGS: 'admin_logs',

    // PO Granular Permissions
    PO_VIEW: 'po_view',
    PO_EDIT: 'po_edit',
    PO_PRINT: 'po_print',
    PO_RECEIVE: 'po_receive',
} as const;

export interface PermissionItem {
    key: string;
    label: string;
    description: string;
    category: 'Core' | 'Maintenance' | 'Admin';
}

export const PERMISSION_LIST: PermissionItem[] = [
    // Core
    { key: PERMISSIONS.DASHBOARD, label: 'หน้าหลัก (Dashboard)', description: 'ดูภาพรวมของระบบ', category: 'Core' },
    { key: PERMISSIONS.PRODUCTS, label: 'รายการสินค้า', description: 'จัดการข้อมูลสินค้า', category: 'Core' },
    { key: PERMISSIONS.MOVEMENTS, label: 'ความเคลื่อนไหว', description: 'ดูประวัติการเข้า-ออกสินค้า', category: 'Core' },
    { key: PERMISSIONS.STOCK_ADJUST, label: 'ปรับปรุงสต็อก', description: 'บันทึกยอดนับจริง/ปรับยอด', category: 'Core' },
    { key: PERMISSIONS.BORROW, label: 'ยืม-คืน', description: 'จัดการการยืมและคืนของ', category: 'Core' },
    { key: PERMISSIONS.ASSETS, label: 'ทรัพย์สิน', description: 'ทะเบียนทรัพย์สินถาวร', category: 'Core' },
    { key: PERMISSIONS.MAINTENANCE, label: 'แจ้งซ่อม', description: 'สิทธิ์ในการส่งใบแจ้งซ่อม', category: 'Core' },
    { key: PERMISSIONS.PETTY_CASH, label: 'เงินสดย่อย', description: 'จัดการระบบเบิกจ่ายเงินสดย่อย', category: 'Core' },

    // Maintenance
    { key: PERMISSIONS.MAINTENANCE_DASHBOARD, label: 'Dashboard งานซ่อม', description: 'ดูภาพรวมงานซ่อมทั้งหมด', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_TECHNICIANS, label: 'จัดการช่างเทคนิค', description: 'เพิ่ม/ลด รายชื่อช่าง', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_PARTS, label: 'อะไหล่ซ่อมบำรุง', description: 'จัดการสต็อกอะไหล่', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_REQUESTS, label: 'ใบขอซื้ออะไหล่', description: 'จัดการใบขอซื้อ (PR) อะไหล่', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_REPORTS, label: 'รายงานซ่อมบำรุง', description: 'ดูรายงานสรุปงานซ่อม', category: 'Maintenance' },

    // Admin
    { key: PERMISSIONS.ADMIN_ROLES, label: 'จัดการผู้ใช้งาน', description: 'กำหนดสิทธิ์การใช้งาน (Role)', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_PO, label: 'ใบสั่งซื้อ (PO) - เต็มรูปแบบ', description: 'จัดการ PO สินค้าทั่วไป (Legacy)', category: 'Admin' },

    // Purchase Order Granular Permissions
    { key: PERMISSIONS.PO_VIEW, label: 'ใบสั่งซื้อ - ดูข้อมูล', description: 'ดูรายการและรายละเอียดใบสั่งซื้อ', category: 'Admin' },
    { key: PERMISSIONS.PO_EDIT, label: 'ใบสั่งซื้อ - สร้าง/แก้ไข', description: 'สร้างและแก้ไขใบสั่งซื้อ', category: 'Admin' },
    { key: PERMISSIONS.PO_PRINT, label: 'ใบสั่งซื้อ - พิมพ์', description: 'พิมพ์ใบสั่งซื้อ', category: 'Admin' },
    { key: PERMISSIONS.PO_RECEIVE, label: 'ใบสั่งซื้อ - รับสินค้า', description: 'บันทึกรับสินค้าจาก PO', category: 'Admin' },

    { key: PERMISSIONS.ADMIN_SUPPLIERS, label: 'ผู้ขาย/Supplier', description: 'จัดการฐานข้อมูลคู่ค้า', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_WAREHOUSES, label: 'คลังสินค้า', description: 'จัดการสถานที่จัดเก็บ', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_CATEGORIES, label: 'หมวดหมู่', description: 'จัดการหมวดหมู่สินค้า', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_REPORTS, label: 'รายงานขั้นสูง', description: 'เข้าถึงรายงานเชิงลึก', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_AUDIT, label: 'ตรวจสอบสต็อก', description: 'เปิดรอบการตรวจนับสินค้า', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_SETTINGS, label: 'ตั้งค่าระบบ', description: 'ตั้งค่าทั่วไปของระบบ', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_SECURITY, label: 'ความปลอดภัย', description: 'ตั้งค่า Password/Security', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_ROOMS, label: 'จัดการห้อง', description: 'เพิ่ม แก้ไข ลบห้อง', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_LOGS, label: 'ประวัติการใช้งาน', description: 'ดู Log การใช้งานระบบ', category: 'Admin' },
];

export type RolePermissions = Record<string, boolean>;

export const DEFAULT_PERMISSIONS: Record<string, RolePermissions> = {
    'admin': Object.fromEntries(PERMISSION_LIST.map(p => [p.key, true])),
    'manager': {
        ...Object.fromEntries(PERMISSION_LIST.map(p => [p.key, true])),
        // Adjust Manager permissions if needed, for now full access like admin
    },
    'technician': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.MAINTENANCE_DASHBOARD]: true,
        [PERMISSIONS.MAINTENANCE_PARTS]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.PO_VIEW]: true, // Allow tech to view POs? Maybe not by default.
    },
    'operation': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.MOVEMENTS]: true,
        [PERMISSIONS.STOCK_ADJUST]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.ASSETS]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.PO_RECEIVE]: true, // Operations usually receive goods
    },
    'employee': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
    },
    'general': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.MOVEMENTS]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.MAINTENANCE]: true,
    },
    'maid': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.BORROW]: true,
    },
    'driver': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.BORROW]: true,
    },
    'accounting': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PETTY_CASH]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.PO_PRINT]: true,
    },
    'purchasing': {
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.ADMIN_SUPPLIERS]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.PO_EDIT]: true,
        [PERMISSIONS.PO_PRINT]: true,
        [PERMISSIONS.PO_RECEIVE]: true,
    }
};
