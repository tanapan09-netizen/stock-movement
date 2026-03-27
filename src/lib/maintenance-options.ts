export const MAINTENANCE_PRIORITY_OPTIONS = [
    { value: 'low', label: 'ต่ำ' },
    { value: 'normal', label: 'ปกติ' },
    { value: 'high', label: 'สูง' },
    { value: 'urgent', label: 'เร่งด่วน' },
] as const;

export const MAINTENANCE_STATUS_OPTIONS = [
    { value: 'pending', label: 'รอเรื่อง' },
    { value: 'approved', label: 'แจ้งเรื่องต่อ' },
    { value: 'in_progress', label: 'ดำเนินการ' },
    { value: 'confirmed', label: 'รอหัวหน้าช่างตรวจรับ' },
    { value: 'completed', label: 'ปิดงานแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' },
] as const;

export const MAINTENANCE_WORKFLOW_STATUS_OPTIONS = [
    { value: 'pending', label: 'รอเรื่อง' },
    { value: 'approved', label: 'แจ้งเรื่องต่อ' },
    { value: 'in_progress', label: 'ดำเนินการ' },
    { value: 'confirmed', label: 'รอหัวหน้าช่างตรวจรับ' },
    { value: 'completed', label: 'ปิดงานแล้ว' },
] as const;

export const MAINTENANCE_CATEGORY_OPTIONS = [
    { value: 'electrical', label: 'ไฟฟ้า' },
    { value: 'plumbing', label: 'ประปา' },
    { value: 'internet', label: 'อินเตอร์เน็ต' },
    { value: 'furniture', label: 'เฟอร์นิเจอร์' },
    { value: 'other', label: 'อื่นๆ' },
] as const;

export const MAINTENANCE_TARGET_ROLE_OPTIONS = [
    { value: 'general', label: 'General (ทั่วไป)' },
    { value: 'technician', label: 'Technician (ช่างซ่อมบำรุง)' },
    { value: 'maid', label: 'Maid (แม่บ้าน)' },
    { value: 'driver', label: 'Driver (คนขับรถ)' },
    { value: 'purchasing', label: 'Purchasing (จัดซื้อ)' },
    { value: 'store', label: 'Store (คลังสินค้า)' },
    { value: 'accounting', label: 'Accounting (บัญชี)' },
    { value: 'manager', label: 'Manager (ผู้จัดการ)' },
    { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' },
] as const;

export const TECHNICIAN_STATUS_OPTIONS = [
    { value: 'active', label: 'พร้อมปฏิบัติงาน' },
    { value: 'inactive', label: 'ไม่พร้อม/พักงาน' },
] as const;
