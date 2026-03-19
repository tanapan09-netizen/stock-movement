'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    CheckSquare,
    Loader2,
    MinusSquare,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    Square,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { updateRolePermissions } from '@/actions/roleActions';
import { PERMISSION_LIST, PermissionItem } from '@/lib/permissions';

interface Role {
    role_id: number;
    role_name: string;
    permissions: string | null;
}

interface Props {
    roles: Role[];
}

type PermissionMap = Record<string, boolean>;
type PermissionState = Record<number, PermissionMap>;
type SelectionState = 'all' | 'partial' | 'none';

/* ======================================== */
/* Hooks */
/* ======================================== */
function useDebouncedValue<T>(value: T, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => window.clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/* ======================================== */
/* Helpers */
/* ======================================== */
function createDefaultPermissionMap(): PermissionMap {
    return Object.fromEntries(
        PERMISSION_LIST.map((permission) => [permission.key, false])
    ) as PermissionMap;
}

function parseRolePermissions(
    rawPermissions: string | null,
    defaultMap: PermissionMap
): PermissionMap {
    try {
        const parsed = JSON.parse(rawPermissions || '{}');
        return {
            ...defaultMap,
            ...parsed,
        };
    } catch {
        return { ...defaultMap };
    }
}

function buildPermissionState(
    roles: Role[],
    defaultMap: PermissionMap
): PermissionState {
    return roles.reduce((acc, role) => {
        acc[role.role_id] = parseRolePermissions(role.permissions, defaultMap);
        return acc;
    }, {} as PermissionState);
}

function arePermissionMapsEqual(a: PermissionMap = {}, b: PermissionMap = {}) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
        if (Boolean(a[key]) !== Boolean(b[key])) return false;
    }
    return true;
}

function getChangedRoleIds(
    current: PermissionState,
    saved: PermissionState
): number[] {
    return Object.keys(current)
        .map(Number)
        .filter((roleId) => !arePermissionMapsEqual(current[roleId], saved[roleId]));
}

function getRoleColor(roleName: string) {
    switch (roleName.toLowerCase()) {
        case 'admin':
            return 'from-purple-500 to-violet-600';
        case 'manager':
            return 'from-blue-500 to-sky-600';
        case 'technician':
            return 'from-orange-400 to-orange-600';
        case 'operation':
            return 'from-teal-400 to-emerald-600';
        case 'general':
            return 'from-slate-500 to-slate-600';
        case 'maid':
            return 'from-pink-400 to-rose-500';
        case 'driver':
            return 'from-indigo-500 to-blue-600';
        case 'purchasing':
            return 'from-amber-500 to-yellow-600';
        case 'accounting':
            return 'from-cyan-500 to-sky-600';
        case 'employee':
            return 'from-green-500 to-emerald-600';
        default:
            return 'from-gray-400 to-gray-500';
    }
}

function getSelectionState(total: number, checked: number): SelectionState {
    if (total === 0 || checked === 0) return 'none';
    if (checked === total) return 'all';
    return 'partial';
}

const ROUTE_LABEL_TH: Record<string, string> = {
    '/': 'หน้าหลัก',
    '/admin/reports': 'แอดมิน / รายงาน',
    '/admin/rooms': 'แอดมิน / ห้อง',
    '/admin/security': 'แอดมิน / ความปลอดภัย',
    '/api-docs': 'เอกสาร API',
    '/approvals': 'อนุมัติรายการ',
    '/approvals/workflows': 'อนุมัติรายการ / เวิร์กโฟลว์',
    '/assets': 'ทรัพย์สิน',
    '/assets/[id]': 'ทรัพย์สิน / รายละเอียด',
    '/assets/[id]/edit': 'ทรัพย์สิน / แก้ไขรายการ',
    '/assets/new': 'ทรัพย์สิน / เพิ่มใหม่',
    '/audit-log': 'บันทึกตรวจสอบ',
    '/borrow': 'ยืม-คืน',
    '/borrow/[id]': 'ยืม-คืน / รายละเอียด',
    '/borrow/new': 'ยืม-คืน / เพิ่มใหม่',
    '/categories': 'หมวดหมู่',
    '/categories/[id]/edit': 'หมวดหมู่ / แก้ไขรายการ',
    '/categories/new': 'หมวดหมู่ / เพิ่มใหม่',
    '/debug-auth': 'ดีบักสิทธิ์เข้าใช้งาน',
    '/general-request': 'คำขอทั่วไป',
    '/inventory-audit': 'ตรวจนับสต็อก',
    '/inventory-audit/[id]': 'ตรวจนับสต็อก / รายละเอียด',
    '/inventory-audit/new': 'ตรวจนับสต็อก / เพิ่มใหม่',
    '/maintenance': 'งานซ่อมบำรุง',
    '/maintenance/dashboard': 'งานซ่อมบำรุง / แดชบอร์ด',
    '/maintenance/job-sheet/[id]': 'งานซ่อมบำรุง / ใบงาน / รายละเอียด',
    '/maintenance/part-requests': 'งานซ่อมบำรุง / เบิกอะไหล่',
    '/maintenance/parts': 'งานซ่อมบำรุง / อะไหล่',
    '/maintenance/pm': 'งานซ่อมบำรุง / PM',
    '/maintenance/technicians': 'งานซ่อมบำรุง / ช่าง',
    '/movements': 'ความเคลื่อนไหวสต็อก',
    '/petty-cash': 'เงินสดย่อย',
    '/petty-cash/[id]/print': 'เงินสดย่อย / พิมพ์เอกสาร',
    '/petty-cash/dashboard': 'เงินสดย่อย / แดชบอร์ด',
    '/petty-cash/new': 'เงินสดย่อย / เพิ่มใหม่',
    '/products': 'สินค้า',
    '/products/[id]/edit': 'สินค้า / แก้ไขรายการ',
    '/products/import': 'สินค้า / นำเข้า',
    '/products/new': 'สินค้า / เพิ่มใหม่',
    '/purchase-orders': 'ใบสั่งซื้อ',
    '/purchase-orders/[id]': 'ใบสั่งซื้อ / รายละเอียด',
    '/purchase-orders/[id]/edit': 'ใบสั่งซื้อ / แก้ไขรายการ',
    '/purchase-orders/new': 'ใบสั่งซื้อ / เพิ่มใหม่',
    '/reports': 'รายงาน',
    '/reports/low-stock': 'รายงาน / สินค้าใกล้หมด',
    '/reports/maintenance': 'รายงาน / งานซ่อมบำรุง',
    '/roles': 'บทบาทสิทธิ์',
    '/roles/[id]/edit': 'บทบาทสิทธิ์ / แก้ไขรายการ',
    '/roles/new': 'บทบาทสิทธิ์ / เพิ่มใหม่',
    '/settings': 'ตั้งค่า',
    '/settings/line-users': 'ตั้งค่า / ผู้ใช้ LINE',
    '/settings/system-logs': 'ตั้งค่า / บันทึกระบบ',
    '/stock/adjust': 'ปรับยอดสต็อก',
    '/suppliers': 'ผู้ขาย',
    '/suppliers/[id]/edit': 'ผู้ขาย / แก้ไขรายการ',
    '/suppliers/new': 'ผู้ขาย / เพิ่มใหม่',
    '/system-log': 'บันทึกระบบ',
    '/warehouses': 'คลังสินค้า',
};

const ROUTE_SEGMENT_LABEL_TH: Record<string, string> = {
    admin: 'แอดมิน',
    reports: 'รายงาน',
    rooms: 'ห้อง',
    security: 'ความปลอดภัย',
    approvals: 'อนุมัติรายการ',
    workflows: 'เวิร์กโฟลว์',
    assets: 'ทรัพย์สิน',
    borrow: 'ยืม-คืน',
    categories: 'หมวดหมู่',
    maintenance: 'งานซ่อมบำรุง',
    dashboard: 'แดชบอร์ด',
    technicians: 'ช่าง',
    parts: 'อะไหล่',
    'part-requests': 'เบิกอะไหล่',
    movements: 'ความเคลื่อนไหวสต็อก',
    'petty-cash': 'เงินสดย่อย',
    products: 'สินค้า',
    'purchase-orders': 'ใบสั่งซื้อ',
    roles: 'บทบาทสิทธิ์',
    settings: 'ตั้งค่า',
    'line-users': 'ผู้ใช้ LINE',
    'system-logs': 'บันทึกระบบ',
    stock: 'สต็อก',
    adjust: 'ปรับยอด',
    suppliers: 'ผู้ขาย',
    warehouses: 'คลังสินค้า',
    pm: 'PM',
    import: 'นำเข้า',
    new: 'เพิ่มใหม่',
    edit: 'แก้ไข',
    print: 'พิมพ์เอกสาร',
    'inventory-audit': 'ตรวจนับสต็อก',
    'general-request': 'คำขอทั่วไป',
    'api-docs': 'เอกสาร API',
    'audit-log': 'บันทึกตรวจสอบ',
    'system-log': 'บันทึกระบบ',
    'debug-auth': 'ดีบักสิทธิ์เข้าใช้งาน',
};

function humanizeRouteSegment(segment: string): string {
    if (segment === '[id]' || segment === 'id') return 'รายละเอียด';
    if (ROUTE_SEGMENT_LABEL_TH[segment]) return ROUTE_SEGMENT_LABEL_TH[segment];

    const words = segment
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    return words.join(' ');
}

function formatPagePermissionLabel(label: string): string {
    const pageLabelMatch = label.match(/^หน้า\s+(.+)\s+\((อ่าน|แก้ไข)\)$/);

    if (!pageLabelMatch) return label;

    const [, route, access] = pageLabelMatch;
    const normalizedRoute = route.trim();
    const accessText = access === 'อ่าน' ? 'อ่าน' : 'แก้ไข';
    const routeLabel =
        ROUTE_LABEL_TH[normalizedRoute] ||
        normalizedRoute
            .split('/')
            .filter(Boolean)
            .map(humanizeRouteSegment)
            .join(' / ');

    return `${routeLabel} (${accessText})`;
}

/* ======================================== */
/* UI Parts */
/* ======================================== */
function Toggle({
    checked,
    onChange,
    ariaLabel,
}: {
    checked: boolean;
    onChange: () => void;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            aria-label={ariaLabel}
            aria-pressed={checked}
            title={checked ? 'Enabled' : 'Disabled'}
            className={`
                group relative inline-flex h-6 w-11 items-center rounded-full
                transition-all duration-200 ease-out
                focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1
                active:scale-95
                ${checked ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-slate-300'}
            `}
        >
            <span
                className={`
                    absolute inset-0 rounded-full transition-opacity duration-200
                    ${checked ? 'bg-green-400/20 opacity-100' : 'opacity-0'}
                `}
            />

            <span
                className={`
                    relative z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm
                    transition-all duration-200 ease-out
                    ${checked ? 'translate-x-6' : 'translate-x-1'}
                `}
            >
                <span
                    className={`
                        text-[9px] font-bold text-green-600 transition-all duration-200
                        ${checked ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
                    `}
                >
                    ✓
                </span>
            </span>

            <span className="absolute inset-0 rounded-full bg-black/5 opacity-0 transition group-hover:opacity-100" />
        </button>
    );
}

function SelectionIcon({ state }: { state: SelectionState }) {
    if (state === 'all') return <CheckSquare className="h-3.5 w-3.5" />;
    if (state === 'partial') return <MinusSquare className="h-3.5 w-3.5" />;
    return <Square className="h-3.5 w-3.5" />;
}

/* ======================================== */
/* Main Component */
/* ======================================== */
export default function RolePermissionEditor({ roles }: Props) {
    const defaultPermissionMap = useMemo(() => createDefaultPermissionMap(), []);

    const initialPermissionState = useMemo(
        () => buildPermissionState(roles, defaultPermissionMap),
        [roles, defaultPermissionMap]
    );

    const groupedPermissions = useMemo(() => {
        return PERMISSION_LIST.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, PermissionItem[]>);
    }, []);

    const [savedPermissions, setSavedPermissions] =
        useState<PermissionState>(initialPermissionState);
    const [permissions, setPermissions] =
        useState<PermissionState>(initialPermissionState);
    const [saving, setSaving] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [focusedRoleId, setFocusedRoleId] = useState<number | 'all'>('all');
    const [showChangedOnly, setShowChangedOnly] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const debouncedSearch = useDebouncedValue(searchInput, 300);

    useEffect(() => {
        setSavedPermissions(initialPermissionState);
        setPermissions(initialPermissionState);
    }, [initialPermissionState]);

    useEffect(() => {
        if (
            focusedRoleId !== 'all' &&
            !roles.some((role) => role.role_id === focusedRoleId)
        ) {
            setFocusedRoleId('all');
        }
    }, [focusedRoleId, roles]);

    const totalPermissions = PERMISSION_LIST.length;
    const visibleRoles = useMemo(
        () =>
            focusedRoleId === 'all'
                ? roles
                : roles.filter((role) => role.role_id === focusedRoleId),
        [roles, focusedRoleId]
    );

    const changedPermissionKeys = useMemo(() => {
        const changedKeys = new Set<string>();

        PERMISSION_LIST.forEach((permission) => {
            const key = permission.key;
            const changedInAnyVisibleRole = visibleRoles.some((role) => {
                const current = Boolean(permissions[role.role_id]?.[key]);
                const saved = Boolean(savedPermissions[role.role_id]?.[key]);
                return current !== saved;
            });

            if (changedInAnyVisibleRole) {
                changedKeys.add(key);
            }
        });

        return changedKeys;
    }, [permissions, savedPermissions, visibleRoles]);

    const filteredGroupedPermissions = useMemo(() => {
        const keyword = debouncedSearch.trim().toLowerCase();
        const hasSearch = keyword.length > 0;

        const next: Record<string, PermissionItem[]> = {};

        Object.entries(groupedPermissions).forEach(([category, items]) => {
            const filteredItems = items.filter((item) => {
                const label = item.label.toLowerCase();
                const description = item.description.toLowerCase();
                const key = item.key.toLowerCase();
                const categoryText = category.toLowerCase();
                const isChanged = changedPermissionKeys.has(item.key);

                const matchSearch =
                    !hasSearch ||
                    label.includes(keyword) ||
                    description.includes(keyword) ||
                    key.includes(keyword) ||
                    categoryText.includes(keyword);

                const matchChanged = !showChangedOnly || isChanged;

                return matchSearch && matchChanged;
            });

            if (filteredItems.length > 0) {
                next[category] = filteredItems;
            }
        });

        return next;
    }, [groupedPermissions, debouncedSearch, showChangedOnly, changedPermissionKeys]);

    const visiblePermissionKeys = useMemo(() => {
        return Object.values(filteredGroupedPermissions)
            .flat()
            .map((item) => item.key);
    }, [filteredGroupedPermissions]);

    const changedRoleIds = useMemo(
        () => getChangedRoleIds(permissions, savedPermissions),
        [permissions, savedPermissions]
    );

    const isDirty = changedRoleIds.length > 0;

    const handleTogglePermission = (roleId: number, permissionKey: string) => {
        setPermissions((prev) => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [permissionKey]: !prev[roleId]?.[permissionKey],
            },
        }));
    };

    const handleToggleAllByRole = (roleId: number, checked: boolean) => {
        setPermissions((prev) => {
            const nextRolePermissions = { ...prev[roleId] };

            visiblePermissionKeys.forEach((key) => {
                nextRolePermissions[key] = checked;
            });

            return {
                ...prev,
                [roleId]: nextRolePermissions,
            };
        });
    };

    const handleToggleAllByCategory = (category: string, checked: boolean) => {
        const categoryKeys = (filteredGroupedPermissions[category] || []).map(
            (item) => item.key
        );

        setPermissions((prev) => {
            const next = { ...prev };

            visibleRoles.forEach((role) => {
                next[role.role_id] = { ...next[role.role_id] };
                categoryKeys.forEach((key) => {
                    next[role.role_id][key] = checked;
                });
            });

            return next;
        });
    };

    const handleToggleAllByPermission = (permissionKey: string, checked: boolean) => {
        setPermissions((prev) => {
            const next = { ...prev };

            visibleRoles.forEach((role) => {
                next[role.role_id] = { ...next[role.role_id] };
                next[role.role_id][permissionKey] = checked;
            });

            return next;
        });
    };

    const handleReset = () => {
        if (!isDirty) return;

        const confirmed = window.confirm(
            'คุณต้องการรีเซ็ตการเปลี่ยนแปลงทั้งหมดกลับเป็นค่าล่าสุดที่บันทึกไว้หรือไม่?'
        );

        if (!confirmed) return;

        setPermissions(savedPermissions);
        toast.info('รีเซ็ตกลับเป็นค่าล่าสุดที่บันทึกแล้ว');
    };

    const handleSave = async () => {
        if (!isDirty) return;

        setSaving(true);

        try {
            const roleIdsToSave = getChangedRoleIds(permissions, savedPermissions);

            if (roleIdsToSave.length === 0) {
                toast.info('ไม่มีข้อมูลที่ต้องบันทึก');
                return;
            }

            await Promise.all(
                roleIdsToSave.map((roleId) =>
                    updateRolePermissions(roleId, permissions[roleId])
                )
            );

            setSavedPermissions((prev) => {
                const next = { ...prev };
                roleIdsToSave.forEach((roleId) => {
                    next[roleId] = { ...permissions[roleId] };
                });
                return next;
            });

            toast.success(`บันทึกสำเร็จ ${roleIdsToSave.length} role`);
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSaving(false);
        }
    };

    const getEnabledCountByRole = (roleId: number) => {
        const rolePermissions = permissions[roleId] || {};
        return Object.values(rolePermissions).filter(Boolean).length;
    };

    const getRoleSelectionState = (roleId: number): SelectionState => {
        const checkedCount = visiblePermissionKeys.filter(
            (key) => permissions[roleId]?.[key]
        ).length;

        return getSelectionState(visiblePermissionKeys.length, checkedCount);
    };

    const getCategorySelectionState = (category: string): SelectionState => {
        const categoryKeys = (filteredGroupedPermissions[category] || []).map(
            (item) => item.key
        );

        const totalCells = categoryKeys.length * visibleRoles.length;
        let checkedCells = 0;

        visibleRoles.forEach((role) => {
            categoryKeys.forEach((key) => {
                if (permissions[role.role_id]?.[key]) {
                    checkedCells += 1;
                }
            });
        });

        return getSelectionState(totalCells, checkedCells);
    };

    const getEnabledRoleCountByPermission = (permissionKey: string) => {
        return visibleRoles.reduce((count, role) => {
            if (permissions[role.role_id]?.[permissionKey]) {
                return count + 1;
            }
            return count;
        }, 0);
    };

    const getPermissionSelectionState = (permissionKey: string): SelectionState => {
        const checkedCount = getEnabledRoleCountByPermission(permissionKey);
        return getSelectionState(visibleRoles.length, checkedCount);
    };

    const categoryNames = Object.keys(filteredGroupedPermissions);
    const permissionOrderMap = useMemo(() => {
        const orderMap: Record<string, number> = {};
        let counter = 1;

        Object.values(filteredGroupedPermissions).forEach((items) => {
            items.forEach((item) => {
                orderMap[item.key] = counter;
                counter += 1;
            });
        });

        return orderMap;
    }, [filteredGroupedPermissions]);

    const collapseAllCategories = () => {
        setCollapsedCategories(
            Object.fromEntries(categoryNames.map((name) => [name, true]))
        );
    };

    const expandAllCategories = () => {
        setCollapsedCategories(
            Object.fromEntries(categoryNames.map((name) => [name, false]))
        );
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100">
            {saving && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                        <span className="text-sm font-medium text-slate-700">
                            กำลังบันทึกข้อมูล...
                        </span>
                    </div>
                </div>
            )}

            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                Permission Management
                            </h2>
                        </div>

                        <p className="text-sm text-slate-500">
                            จัดการสิทธิ์การเข้าถึงระบบของแต่ละ Role ได้แบบละเอียด
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2.5 sm:gap-3">
                            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                                <Users className="h-4 w-4" />
                                <span>{roles.length} บทบาท</span>
                            </div>

                            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                                <ShieldCheck className="h-4 w-4" />
                                <span>{totalPermissions} Permissions</span>
                            </div>

                            <div
                                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                                    isDirty
                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                }`}
                            >
                                {isDirty ? (
                                    <>
                                        <AlertCircle className="h-4 w-4" />
                                        <span>มีการเปลี่ยนแปลง {changedRoleIds.length} role</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckSquare className="h-4 w-4" />
                                        <span>ไม่มีการเปลี่ยนแปลง</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={saving || !isDirty}
                            className="
                                inline-flex items-center justify-center gap-2 rounded-xl
                                border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700
                                transition hover:bg-slate-50 active:scale-[0.98]
                                disabled:cursor-not-allowed disabled:opacity-50
                            "
                        >
                            <RotateCcw className="h-4 w-4" />
                            รีเซ็ต
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !isDirty}
                            className="
                                inline-flex items-center justify-center gap-2 rounded-xl
                                bg-blue-600 px-5 py-3 text-sm font-semibold text-white
                                shadow-lg shadow-blue-200 transition-all duration-200
                                hover:-translate-y-0.5 hover:bg-blue-700
                                active:scale-[0.98]
                                disabled:cursor-not-allowed disabled:opacity-60
                            "
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="ค้นหา permission, key, description, category..."
                            className="
                                w-full rounded-xl border border-slate-200 bg-white
                                py-2.5 pl-10 pr-4 text-sm text-slate-700
                                outline-none transition
                                placeholder:text-slate-400
                                focus:border-primary-400 focus:ring-4 focus:ring-primary-100
                            "
                        />
                    </div>

                    <div className="text-sm text-slate-500">
                        แสดง {visiblePermissionKeys.length} รายการ
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                        value={focusedRoleId}
                        onChange={(e) =>
                            setFocusedRoleId(
                                e.target.value === 'all' ? 'all' : Number(e.target.value)
                            )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                        <option value="all">ทุก Role</option>
                        {roles.map((role) => (
                            <option key={role.role_id} value={role.role_id}>
                                {role.role_name}
                            </option>
                        ))}
                    </select>

                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={showChangedOnly}
                            onChange={(e) => setShowChangedOnly(e.target.checked)}
                        />
                        เฉพาะที่แก้ไข
                    </label>

                    <button
                        type="button"
                        onClick={collapseAllCategories}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        พับทั้งหมด
                    </button>
                    <button
                        type="button"
                        onClick={expandAllCategories}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        ขยายทั้งหมด
                    </button>

                    <div className="ml-auto text-xs text-slate-500">
                        แสดง {visibleRoles.length}/{roles.length} บทบาท
                    </div>
                </div>
            </div>

            <div className="w-full min-w-0 overflow-x-auto overflow-y-auto max-h-[70vh] overscroll-contain">
                <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-30">
                        <tr className="bg-slate-50">
                            <th className="sticky left-0 z-40 w-[280px] sm:w-[320px] lg:w-[360px] border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                                เมนู / รายการสิทธิ์
                            </th>

                            {visibleRoles.map((role) => {
                                const selectionState = getRoleSelectionState(role.role_id);
                                const enabledCount = getEnabledCountByRole(role.role_id);

                                return (
                                    <th
                                        key={role.role_id}
                                        className="w-[118px] sm:w-[128px] lg:w-[140px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-center align-top"
                                    >
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span
                                                className={`
                                                    inline-flex max-w-full truncate rounded-full bg-gradient-to-r px-2.5 py-1
                                                    text-[11px] font-semibold text-white shadow-sm
                                                    ${getRoleColor(role.role_name)}
                                                `}
                                            >
                                                {role.role_name}
                                            </span>

                                            <span className="text-[11px] text-slate-500">
                                                {enabledCount} / {totalPermissions}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleToggleAllByRole(
                                                        role.role_id,
                                                        selectionState !== 'all'
                                                    )
                                                }
                                                className="
                                                    inline-flex items-center gap-1 rounded-md border border-slate-200
                                                    bg-white px-2 py-1 text-[11px] font-medium text-slate-700
                                                    transition hover:bg-slate-50
                                                "
                                            >
                                                <SelectionIcon state={selectionState} />
                                                {selectionState === 'all'
                                                    ? 'ยกเลิก'
                                                    : selectionState === 'partial'
                                                      ? 'ให้ครบ'
                                                      : 'ทั้งหมด'}
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {Object.entries(filteredGroupedPermissions).length === 0 ? (
                            <tr>
                                <td
                                    colSpan={visibleRoles.length + 1}
                                    className="px-6 py-12 text-center text-sm text-slate-500"
                                >
                                    ไม่พบ permission ที่ค้นหา
                                </td>
                            </tr>
                        ) : (
                            Object.entries(filteredGroupedPermissions).map(([category, items]) => {
                                const selectionState = getCategorySelectionState(category);
                                const isCollapsed = collapsedCategories[category] ?? false;

                                return (
                                    <Fragment key={category}>
                                        <tr>
                                            <td
                                                colSpan={visibleRoles.length + 1}
                                                className="sticky top-[49px] sm:top-[57px] z-20 border-b border-t border-slate-200 bg-slate-100/95 px-4 py-2.5 backdrop-blur"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCollapsedCategories((prev) => ({
                                                                ...prev,
                                                                [category]: !isCollapsed,
                                                            }))
                                                        }
                                                        className="inline-flex items-center gap-2 text-left"
                                                    >
                                                        {isCollapsed ? (
                                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                                        )}
                                                        <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                                            {category}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {items.length} permissions
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleAllByCategory(
                                                                category,
                                                                selectionState !== 'all'
                                                            )
                                                        }
                                                        className="
                                                            inline-flex items-center gap-1 rounded-md border border-slate-200
                                                            bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700
                                                            transition hover:bg-slate-50
                                                        "
                                                    >
                                                        <SelectionIcon state={selectionState} />
                                                        {selectionState === 'all'
                                                            ? 'ยกเลิกทั้งหมวด'
                                                            : 'เลือกทั้งหมวด'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {!isCollapsed && items.map((permission, index) => {
                                            const selectionState = getPermissionSelectionState(permission.key);
                                            const enabledRoleCount = getEnabledRoleCountByPermission(permission.key);
                                            const isChanged = changedPermissionKeys.has(permission.key);
                                            const orderNumber = permissionOrderMap[permission.key] || index + 1;
                                            const displayLabel = formatPagePermissionLabel(permission.label);

                                            return (
                                                <tr
                                                    key={permission.key}
                                                    className={`
                                                        transition-colors duration-150 hover:bg-primary-50/40
                                                        ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                                                    `}
                                                >
                                                    <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-4 py-3 align-middle">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="mb-1.5 flex items-center gap-2">
                                                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-200 px-1 text-[10px] font-bold text-slate-700">
                                                                        {orderNumber}
                                                                    </span>
                                                                    <div className="truncate text-sm font-semibold text-slate-800">
                                                                        {displayLabel}
                                                                    </div>
                                                                </div>
                                                                <div className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                                                                    {permission.description}
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                                    {enabledRoleCount}/{visibleRoles.length} บทบาท
                                                                </span>
                                                                {isChanged && (
                                                                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                                        แก้ไขแล้ว
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <span className="inline-flex max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                                                {permission.key}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleToggleAllByPermission(
                                                                        permission.key,
                                                                        selectionState !== 'all'
                                                                    )
                                                                }
                                                                className="
                                                                    inline-flex items-center gap-1 rounded-md border border-slate-200
                                                                    bg-white px-2 py-1 text-[11px] font-medium text-slate-700
                                                                    transition hover:bg-slate-50
                                                                "
                                                            >
                                                                <SelectionIcon state={selectionState} />
                                                                {selectionState === 'all'
                                                                    ? 'ปิดทั้งแถว'
                                                                    : 'เปิดทั้งแถว'}
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {visibleRoles.map((role) => {
                                                        const checked =
                                                            permissions[role.role_id]?.[
                                                                permission.key
                                                            ] || false;

                                                        return (
                                                            <td
                                                                key={role.role_id}
                                                                className="border-b border-slate-200 px-2 py-3 text-center"
                                                            >
                                                                <div className="flex justify-center">
                                                                    <Toggle
                                                                        checked={checked}
                                                                        onChange={() =>
                                                                            handleTogglePermission(
                                                                                role.role_id,
                                                                                permission.key
                                                                            )
                                                                        }
                                                                        ariaLabel={`Toggle ${displayLabel} for ${role.role_name}`}
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
