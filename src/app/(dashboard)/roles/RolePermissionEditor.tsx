'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Loader2,
  Lock,
  MinusSquare,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Square,
  Users,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { updateRolePermissions } from '@/actions/roleActions';
import { PERMISSION_LIST, PermissionItem } from '@/lib/permissions';
import { isLockedPermissionRole } from '@/lib/roles';

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

const PERMISSION_LABEL_COLUMN_WIDTH = 'w-[340px] min-w-[340px]';
const ROLE_PERMISSION_COLUMN_WIDTH = 'w-[148px] min-w-[148px] max-w-[148px]';
const ROLE_PERMISSION_CATEGORY_STICKY_TOP = 'top-[7rem]';

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
    PERMISSION_LIST.map((permission) => [permission.key, false]),
  ) as PermissionMap;
}

function parseRolePermissions(
  rawPermissions: string | null,
  defaultMap: PermissionMap,
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
  defaultMap: PermissionMap,
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
  saved: PermissionState,
): number[] {
  return Object.keys(current)
    .map(Number)
    .filter((roleId) => !arePermissionMapsEqual(current[roleId], saved[roleId]));
}

function getRoleColor(roleName: string) {
  switch (roleName.toLowerCase()) {
    case 'owner':
      return 'from-yellow-500 to-amber-600';
    case 'admin':
      return 'from-purple-500 to-violet-600';
    case 'manager':
      return 'from-blue-500 to-sky-600';
    case 'leader_technician':
    case 'technician':
      return 'from-orange-400 to-orange-600';
    case 'leader_operation':
    case 'operation':
      return 'from-teal-400 to-emerald-600';
    case 'leader_general':
    case 'general':
      return 'from-slate-500 to-slate-600';
    case 'leader_maid':
    case 'maid':
      return 'from-pink-400 to-rose-500';
    case 'leader_driver':
    case 'driver':
      return 'from-indigo-500 to-blue-600';
    case 'leader_purchasing':
    case 'purchasing':
      return 'from-amber-500 to-yellow-600';
    case 'leader_accounting':
    case 'accounting':
      return 'from-cyan-500 to-sky-600';
    case 'leader_employee':
    case 'employee':
      return 'from-green-500 to-emerald-600';
    case 'leader_store':
      return 'from-indigo-500 to-violet-600';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

function getSelectionState(total: number, checked: number): SelectionState {
  if (total === 0 || checked === 0) return 'none';
  if (checked === total) return 'all';
  return 'partial';
}

const ROUTE_LABELS: Record<string, string> = {
  '/': 'หน้าหลัก',
  '/accounting-dashboard': 'แดชบอร์ดบัญชี',
  '/approvals/manage': 'อนุมัติ / จัดการ',
  '/approvals/purchasing': 'คิวคำขอซื้อ / Redirect เก่า',
  '/purchase-request': 'คำขอจัดซื้อ',
  '/purchase-request/manage': 'Workflow จัดซื้อ / คิวงาน',
  '/manager-dashboard': 'แดชบอร์ดผู้จัดการ',
  '/store-dashboard': 'แดชบอร์ดคลังสินค้า',
  '/purchasing-dashboard': 'แดชบอร์ดจัดซื้อ',
};

const ROUTE_SEGMENT_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  reports: 'รายงาน',
  rooms: 'ห้อง',
  security: 'ความปลอดภัย',
  approvals: 'อนุมัติ',
  workflows: 'เวิร์กโฟลว์',
  assets: 'ทรัพย์สิน',
  borrow: 'ยืม/คืน',
  categories: 'หมวดหมู่',
  maintenance: 'งานซ่อมบำรุง',
  dashboard: 'แดชบอร์ด',
  technicians: 'ช่าง',
  parts: 'อะไหล่',
  'part-requests': 'คำขออะไหล่',
  movements: 'ความเคลื่อนไหว',
  'petty-cash': 'เงินสดย่อย',
  products: 'สินค้า',
  'purchase-orders': 'ใบสั่งซื้อ',
  'purchase-request': 'คำขอจัดซื้อ',
  roles: 'สิทธิ์และผู้ใช้',
  settings: 'ตั้งค่า',
  'line-users': 'ผู้ใช้ LINE',
  'line-customers': 'ลูกค้า LINE',
  'system-logs': 'บันทึกระบบ',
  stock: 'สต็อก',
  adjust: 'ปรับยอด',
  suppliers: 'ผู้ขาย',
  warehouses: 'คลังสินค้า',
  pm: 'PM',
  import: 'นำเข้า',
  new: 'เพิ่มใหม่',
  edit: 'แก้ไข',
  print: 'พิมพ์',
  'inventory-audit': 'ตรวจนับสต็อก',
  'general-request': 'คำขอทั่วไป',
  'api-docs': 'เอกสาร API',
  'audit-log': 'บันทึกตรวจสอบ',
  'system-log': 'บันทึกระบบ',
  'debug-auth': 'ตรวจสอบสิทธิ์',
  purchasing: 'จัดซื้อ',
  owner: 'เจ้าของระบบ',
  leader_purchasing: 'หัวหน้าจัดซื้อ',
  leader_store: 'หัวหน้าคลังสินค้า',
  leader_operation: 'หัวหน้าปฏิบัติการ',
  leader_accounting: 'หัวหน้าบัญชี',
  leader_technician: 'หัวหน้าช่าง',
  leader_employee: 'หัวหน้าพนักงาน',
  leader_general: 'หัวหน้าทั่วไป',
  leader_driver: 'หัวหน้าคนขับรถ',
  leader_maid: 'หัวหน้าแม่บ้าน',
};

function humanizeRouteSegment(segment: string): string {
  if (segment === '[id]' || segment === 'id') return 'รายละเอียด';
  if (ROUTE_SEGMENT_LABELS[segment]) return ROUTE_SEGMENT_LABELS[segment];

  const words = segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(' ');
}

function formatPagePermissionLabel(label: string): string {
  const pageLabelMatch = label.match(/^Page\s+(.+)\s+\((Read|Edit)\)$/);

  if (!pageLabelMatch) return label;

  const [, route, access] = pageLabelMatch;
  const normalizedRoute = route.trim();
  const accessText = access === 'Read' ? 'อ่าน' : 'แก้ไข';
  const routeLabel =
    ROUTE_LABELS[normalizedRoute] ||
    normalizedRoute
      .split('/')
      .filter(Boolean)
      .map(humanizeRouteSegment)
      .join(' / ');

  return `${routeLabel} (${accessText})`;
}

function getCategoryDescription(category: string) {
  switch (category) {
    case 'Core':
      return 'สิทธิ์การใช้งานหลักของระบบ';
    case 'Maintenance':
      return 'สิทธิ์งานซ่อมบำรุงและงานบริการ';
    case 'Admin':
      return 'สิทธิ์ผู้ดูแลระบบและการตั้งค่าระบบ';
    default:
      return 'หมวดสิทธิ์การใช้งาน';
  }
}

/* ======================================== */
/* UI Parts */
/* ======================================== */
function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={ariaLabel}
      aria-pressed={checked}
      disabled={disabled}
      title={disabled ? 'Role ถูกล็อก' : checked ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
      className={`
        group relative inline-flex h-6 w-11 items-center rounded-full
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
        active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100
        ${checked ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-md shadow-green-200/70' : 'bg-slate-300'}
      `}
    >
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-200 ${
          checked ? 'bg-white/10 opacity-100' : 'opacity-0'
        }`}
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

function StatChip({
  icon,
  label,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'success' | 'warning';
}) {
  const styles = {
    default: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${styles[variant]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

/* ======================================== */
/* Main Component */
/* ======================================== */
export default function RolePermissionEditor({ roles }: Props) {
  const defaultPermissionMap = useMemo(() => createDefaultPermissionMap(), []);

  const initialPermissionState = useMemo(
    () => buildPermissionState(roles, defaultPermissionMap),
    [roles, defaultPermissionMap],
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

  const debouncedSearch = useDebouncedValue(searchInput, 250);

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
    [roles, focusedRoleId],
  );
  const lockedRoleIds = useMemo(
    () => new Set(roles.filter((role) => isLockedPermissionRole(role.role_name)).map((role) => role.role_id)),
    [roles],
  );
  const modifiableVisibleRoles = useMemo(
    () => visibleRoles.filter((role) => !lockedRoleIds.has(role.role_id)),
    [visibleRoles, lockedRoleIds],
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
        const prettyLabel = formatPagePermissionLabel(item.label).toLowerCase();
        const description = item.description.toLowerCase();
        const key = item.key.toLowerCase();
        const categoryText = category.toLowerCase();
        const isChanged = changedPermissionKeys.has(item.key);

        const matchSearch =
          !hasSearch ||
          label.includes(keyword) ||
          prettyLabel.includes(keyword) ||
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
    [permissions, savedPermissions],
  );

  const isDirty = changedRoleIds.length > 0;

  const handleTogglePermission = (roleId: number, permissionKey: string) => {
    if (lockedRoleIds.has(roleId)) return;
    setPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionKey]: !prev[roleId]?.[permissionKey],
      },
    }));
  };

  const handleToggleAllByRole = (roleId: number, checked: boolean) => {
    if (lockedRoleIds.has(roleId)) return;
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
      (item) => item.key,
    );

    setPermissions((prev) => {
      const next = { ...prev };

      modifiableVisibleRoles.forEach((role) => {
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

      modifiableVisibleRoles.forEach((role) => {
        next[role.role_id] = { ...next[role.role_id] };
        next[role.role_id][permissionKey] = checked;
      });

      return next;
    });
  };

  const handleReset = () => {
    if (!isDirty) return;

    const confirmed = window.confirm(
      'Reset all changes back to the latest saved values?',
    );

    if (!confirmed) return;

    setPermissions(savedPermissions);
    toast.info('Reset to the latest saved values');
  };

  const handleSave = async () => {
    if (!isDirty) return;

    setSaving(true);

    try {
      const roleIdsToSave = getChangedRoleIds(permissions, savedPermissions)
        .filter((roleId) => !lockedRoleIds.has(roleId));

      if (roleIdsToSave.length === 0) {
        toast.info('ไม่มี role ที่บันทึกได้');
        return;
      }

      await Promise.all(
        roleIdsToSave.map((roleId) =>
          updateRolePermissions(roleId, permissions[roleId]),
        ),
      );

      setSavedPermissions((prev) => {
        const next = { ...prev };
        roleIdsToSave.forEach((roleId) => {
          next[roleId] = { ...permissions[roleId] };
        });
        return next;
      });

      toast.success(`Saved ${roleIdsToSave.length} role changes`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save permissions');
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
      (key) => permissions[roleId]?.[key],
    ).length;

    return getSelectionState(visiblePermissionKeys.length, checkedCount);
  };

  const getCategorySelectionState = (category: string): SelectionState => {
    const categoryKeys = (filteredGroupedPermissions[category] || []).map(
      (item) => item.key,
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
      Object.fromEntries(categoryNames.map((name) => [name, true])),
    );
  };

  const expandAllCategories = () => {
    setCollapsedCategories(
      Object.fromEntries(categoryNames.map((name) => [name, false])),
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
      {saving && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-700">
              กำลังบันทึกข้อมูล...
            </span>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 border-b border-slate-200 bg-gradient-to-r from-blue-50/95 via-white/95 to-indigo-50/95 px-4 py-5 shadow-sm backdrop-blur sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-2.5 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Permission Management
                </h2>
                <p className="text-sm text-slate-500">
                  จัดการสิทธิ์การเข้าถึงของแต่ละบทบาท รวมถึง page-level override ได้ในจุดเดียว
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <StatChip
                icon={<Users className="h-4 w-4" />}
                label={`${roles.length} บทบาท`}
              />
              <StatChip
                icon={<ShieldCheck className="h-4 w-4" />}
                label={`${totalPermissions} Permissions`}
              />
              <StatChip
                icon={<Lock className="h-4 w-4" />}
                label="Admin role locked"
                variant="warning"
              />
              <StatChip
                icon={
                  isDirty ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckSquare className="h-4 w-4" />
                  )
                }
                label={
                  isDirty
                    ? `มีการเปลี่ยนแปลง ${changedRoleIds.length} role`
                    : 'ไม่มีการเปลี่ยนแปลง'
                }
                variant={isDirty ? 'warning' : 'success'}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
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
                  focus:border-blue-400 focus:ring-4 focus:ring-blue-100
                "
              />
            </div>

            <select
              value={focusedRoleId}
              onChange={(e) =>
                setFocusedRoleId(
                  e.target.value === 'all' ? 'all' : Number(e.target.value),
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">ทุก Role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showChangedOnly}
                onChange={(e) => setShowChangedOnly(e.target.checked)}
              />
              เฉพาะที่แก้ไข
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={collapseAllCategories}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
              พับทั้งหมด
            </button>
            <button
              type="button"
              onClick={expandAllCategories}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronDown className="h-4 w-4" />
              ขยายทั้งหมด
            </button>
            <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs text-slate-600">
              แสดง {visiblePermissionKeys.length} permissions · {visibleRoles.length}/{roles.length} บทบาท
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-medium text-blue-700">
              เลื่อนซ้าย-ขวาเพื่อดูทุก role
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            รองรับ bulk edit
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            คลิกที่หัว role / หมวด / แถว เพื่อเปิด-ปิดหลายรายการพร้อมกัน
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 lg:hidden">
        {Object.entries(filteredGroupedPermissions).length === 0 ? (
          <EmptyState text="ไม่พบ permission ที่ค้นหา" />
        ) : (
          Object.entries(filteredGroupedPermissions).map(([category, items]) => {
            const selectionState = getCategorySelectionState(category);
            const isCollapsed = collapsedCategories[category] ?? false;

            return (
              <section
                key={category}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCategories((prev) => ({
                          ...prev,
                          [category]: !isCollapsed,
                        }))
                      }
                      className="flex items-start gap-2 text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="mt-0.5 h-4 w-4 text-slate-500" />
                      )}
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
                          {category}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {getCategoryDescription(category)} · {items.length} permissions
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleAllByCategory(
                          category,
                          selectionState !== 'all',
                        )
                      }
                      className="
                        inline-flex w-fit items-center gap-1 rounded-md border border-slate-200
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
                </div>

                <div
                  className={`transition-all duration-300 ${
                    isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[9999px]'
                  }`}
                >
                  <div className="divide-y divide-slate-200">
                    {items.map((permission, index) => {
                      const selectionState = getPermissionSelectionState(permission.key);
                      const enabledRoleCount = getEnabledRoleCountByPermission(permission.key);
                      const isChanged = changedPermissionKeys.has(permission.key);
                      const orderNumber = permissionOrderMap[permission.key] || index + 1;
                      const displayLabel = formatPagePermissionLabel(permission.label);

                      return (
                        <div key={permission.key} className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-1.5 flex items-center gap-2">
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-200 px-1 text-[10px] font-bold text-slate-700">
                                  {orderNumber}
                                </span>
                                <div className="text-sm font-semibold text-slate-800">
                                  {displayLabel}
                                </div>
                              </div>
                              <div className="text-[11px] leading-relaxed text-slate-500">
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

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              {permission.key}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleAllByPermission(
                                  permission.key,
                                  selectionState !== 'all',
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

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {visibleRoles.map((role) => {
                              const roleIsLocked = lockedRoleIds.has(role.role_id);
                              const checked =
                                permissions[role.role_id]?.[permission.key] || false;

                              return (
                                <div
                                  key={role.role_id}
                                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                  <div className="min-w-0 pr-3">
                                    <div
                                      className={`
                                        inline-flex max-w-full truncate rounded-full bg-gradient-to-r px-2 py-0.5
                                        text-[11px] font-semibold text-white ${getRoleColor(role.role_name)}
                                      `}
                                    >
                                      {role.role_name}
                                    </div>
                                    {roleIsLocked && (
                                      <div className="mt-1 text-[10px] font-semibold text-amber-700">
                                        Locked
                                      </div>
                                    )}
                                  </div>
                                  <Toggle
                                    checked={checked}
                                    onChange={() =>
                                      handleTogglePermission(
                                        role.role_id,
                                        permission.key,
                                      )
                                    }
                                    disabled={roleIsLocked}
                                    ariaLabel={`Toggle ${displayLabel} for ${role.role_name}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      <div className="hidden lg:block">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-white via-white/80 to-transparent" />
          <div className="max-h-[72vh] overflow-x-auto overflow-y-auto overscroll-contain rounded-b-3xl border-t border-slate-100 bg-white pb-3">
            <table className="w-max min-w-full table-auto border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-30 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <tr className="bg-slate-100">
              <th className={`${PERMISSION_LABEL_COLUMN_WIDTH} z-40 border-b border-r border-slate-300 bg-slate-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 lg:sticky lg:left-0 lg:shadow-[12px_0_24px_-16px_rgba(15,23,42,0.34),1px_0_0_0_rgba(148,163,184,0.45)]`}>
                เมนู / รายการสิทธิ์
              </th>

              {visibleRoles.map((role) => {
                const roleIsLocked = lockedRoleIds.has(role.role_id);
                const selectionState = getRoleSelectionState(role.role_id);
                const enabledCount = getEnabledCountByRole(role.role_id);

                return (
                  <th
                    key={role.role_id}
                    className={`${ROLE_PERMISSION_COLUMN_WIDTH} border-b border-slate-300 bg-slate-100 px-3 py-3 text-center align-top`}
                  >
                    <div className="flex w-full flex-col items-center gap-2">
                      <span
                        className={`
                          inline-flex w-full items-center justify-center truncate rounded-full bg-gradient-to-r px-2.5 py-1
                          text-[11px] font-semibold text-white shadow-sm
                          ${getRoleColor(role.role_name)}
                        `}
                      >
                        {role.role_name}
                      </span>
                      {roleIsLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          <Lock className="h-3 w-3" /> ล็อก
                        </span>
                      )}

                      <span className="text-[11px] leading-none text-slate-500">
                        {enabledCount} / {totalPermissions}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleAllByRole(
                            role.role_id,
                            selectionState !== 'all',
                          )
                        }
                        disabled={roleIsLocked}
                        className="
                          inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-200
                          bg-white px-2 py-1 text-[11px] font-medium text-slate-700
                          transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60
                        "
                      >
                        <SelectionIcon state={selectionState} />
                        {roleIsLocked
                          ? 'ล็อก'
                          : selectionState === 'all'
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
                        className={`${ROLE_PERMISSION_CATEGORY_STICKY_TOP} sticky z-20 border-b border-t border-slate-300 bg-gradient-to-r from-slate-100 via-slate-50 to-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]`}
                      >
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedCategories((prev) => ({
                                ...prev,
                                [category]: !isCollapsed,
                              }))
                            }
                            className="inline-flex items-start gap-3 text-left"
                          >
                            {isCollapsed ? (
                              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            ) : (
                              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <ChevronDown className="h-4 w-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                  {category}
                                </div>
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {items.length} permissions
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {getCategoryDescription(category)}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAllByCategory(
                                category,
                                selectionState !== 'all',
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

                    {!isCollapsed &&
                      items.map((permission, index) => {
                        const selectionState = getPermissionSelectionState(permission.key);
                        const enabledRoleCount = getEnabledRoleCountByPermission(permission.key);
                        const isChanged = changedPermissionKeys.has(permission.key);
                        const orderNumber = permissionOrderMap[permission.key] || index + 1;
                        const displayLabel = formatPagePermissionLabel(permission.label);

                        return (
                          <tr
                            key={permission.key}
                            className={`
                              transition-colors duration-150 hover:bg-blue-50/50
                              ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                            `}
                          >
                            <td
                              className={`
                                ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                z-20 border-b border-r border-slate-200 px-4 py-3 align-middle
                                shadow-[12px_0_22px_-18px_rgba(15,23,42,0.28),1px_0_0_0_rgba(203,213,225,1)] lg:sticky lg:left-0
                              `}
                            >
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
                                      selectionState !== 'all',
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
                              const roleIsLocked = lockedRoleIds.has(role.role_id);
                              const checked =
                                permissions[role.role_id]?.[permission.key] || false;

                              return (
                                <td
                                  key={role.role_id}
                                  className={`${ROLE_PERMISSION_COLUMN_WIDTH} border-b border-slate-200 px-2 py-3 text-center hover:bg-blue-50/60`}
                                >
                                  <div className="flex justify-center">
                                    <Toggle
                                      checked={checked}
                                      onChange={() =>
                                        handleTogglePermission(
                                          role.role_id,
                                          permission.key,
                                        )
                                      }
                                      disabled={roleIsLocked}
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
      </div>
    </div>
  );
}


