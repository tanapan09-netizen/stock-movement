export const DEPARTMENT_BASE_ROLES = [
    'general',
    'employee',
    'technician',
    'maid',
    'driver',
    'store',
    'accounting',
    'purchasing',
    'operation',
] as const;

export const LEADER_ROLES = DEPARTMENT_BASE_ROLES.map((role) => `leader_${role}`) as string[];

export const SYSTEM_ROLES = ['owner', 'admin', 'manager', ...DEPARTMENT_BASE_ROLES, ...LEADER_ROLES] as const;

export const ROLE_OPTIONS = [
    { value: 'owner', label: 'Owner (เจ้าของระบบ)' },
    { value: 'admin', label: 'Admin (ผู้ดูแลระบบ)' },
    { value: 'manager', label: 'Manager (ผู้จัดการ)' },
    { value: 'leader_employee', label: 'Leader Employee (หัวหน้าพนักงานทั่วไป)' },
    { value: 'employee', label: 'Employee (พนักงานทั่วไป)' },
    { value: 'leader_technician', label: 'Leader Technician (หัวหน้าช่างซ่อม)' },
    { value: 'technician', label: 'Technician (ช่างซ่อม)' },
    { value: 'leader_maid', label: 'Leader Maid (หัวหน้าแม่บ้าน)' },
    { value: 'maid', label: 'Maid (แม่บ้าน)' },
    { value: 'leader_driver', label: 'Leader Driver (หัวหน้าคนขับรถ)' },
    { value: 'driver', label: 'Driver (คนขับรถ)' },
    { value: 'leader_store', label: 'Leader Store (หัวหน้าคลังสินค้า)' },
    { value: 'store', label: 'Store (คลังสินค้า)' },
    { value: 'leader_accounting', label: 'Leader Accounting (หัวหน้าบัญชี)' },
    { value: 'accounting', label: 'Accounting (บัญชี)' },
    { value: 'leader_purchasing', label: 'Leader Purchasing (หัวหน้าจัดซื้อ)' },
    { value: 'purchasing', label: 'Purchasing (จัดซื้อ)' },
    { value: 'leader_operation', label: 'Leader Operation (หัวหน้าฝ่ายปฏิบัติการ)' },
    { value: 'operation', label: 'Operation (ฝ่ายปฏิบัติการ)' },
    { value: 'leader_general', label: 'Leader General (หัวหน้าทั่วไป)' },
    { value: 'general', label: 'General (ทั่วไป)' },
] as const;

export const normalizeRole = (role?: string | null) => (role || '').toLowerCase();

export const isOwnerRole = (role?: string | null) => normalizeRole(role) === 'owner';
export const isAdminRole = (role?: string | null) => ['owner', 'admin'].includes(normalizeRole(role));
export const isManagerRole = (role?: string | null) => ['owner', 'admin', 'manager'].includes(normalizeRole(role));
export const isLeaderRole = (role?: string | null) => normalizeRole(role).startsWith('leader_');
export const isDepartmentLeader = (role: string | null | undefined, department: string) => normalizeRole(role) === `leader_${department}`;
export const isDepartmentRole = (role: string | null | undefined, department: string) => {
    const normalized = normalizeRole(role);
    return normalized === department || normalized === `leader_${department}`;
};

export const getRoleLabel = (role?: string | null) => {
    const normalized = normalizeRole(role);
    const found = ROLE_OPTIONS.find((item) => item.value === normalized);
    if (found) return found.label;
    return normalized || 'Unknown';
};

export const getRoleDisplayName = (role?: string | null) => {
    const label = getRoleLabel(role);
    const match = label.match(/^(.+?)\s+\(/);
    return match ? match[1] : label;
};
