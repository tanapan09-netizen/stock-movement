import {
  PERMISSIONS,
  getPagePermissionKey,
  getRequiredPageAccessLevelForPathname,
  resolveDashboardRoutePattern,
  type PageAccessLevel,
} from '@/lib/permissions';
import { normalizeRole } from '@/lib/roles';

export type AppRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'technician'
  | 'leader_technician'
  | 'operation'
  | 'leader_operation'
  | 'employee'
  | 'leader_employee'
  | 'general'
  | 'leader_general'
  | 'maid'
  | 'leader_maid'
  | 'driver'
  | 'leader_driver'
  | 'accounting'
  | 'leader_accounting'
  | 'purchasing'
  | 'leader_purchasing'
  | 'store'
  | 'leader_store';

export type Resource =
  | 'general_request'
  | 'maintenance'
  | 'vehicle'
  | 'purchase_order'
  | 'dashboard';

export type Action =
  | 'view'
  | 'read'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve';

export type PagePermissionMap = Record<string, boolean>;
export type DashboardHomeView = 'admin' | 'manager' | 'accounting' | 'purchasing' | 'technician' | 'store' | 'general';

type PermissionMatrix = {
  [role in AppRole]?: Partial<{
    [resource in Resource]: Action[];
  }>;
};

type DashboardAccessOptions = {
  isApprover?: boolean;
  level?: 'view' | PageAccessLevel;
};

type DashboardPageAccess = {
  routePattern: string | null;
  requiredAccessLevel: PageAccessLevel | null;
  hasPageAccess: boolean;
  canReadPage: boolean;
  canEditPage: boolean;
};

const normalizeAction = (action: Action): Exclude<Action, 'view'> | 'read' => {
  if (action === 'view') return 'read';
  return action;
};

const MANAGER_ROLES = new Set(['owner', 'admin', 'manager']);
const TECHNICIAN_ROLES = new Set(['technician', 'leader_technician', 'head_technician']);
const OPERATION_ROLES = new Set(['operation', 'leader_operation']);
const PURCHASING_ROLES = new Set(['purchasing', 'leader_purchasing']);
const ACCOUNTING_ROLES = new Set(['accounting', 'leader_accounting']);
const STORE_ROLES = new Set(['store', 'leader_store']);
const GENERAL_ROLES = new Set(['general', 'leader_general', 'employee', 'leader_employee']);

const isManagerLike = (role?: string | null) => MANAGER_ROLES.has(normalizeRole(role));
const isAccountingRole = (role?: string | null) => ACCOUNTING_ROLES.has(normalizeRole(role));
const isPurchasingRole = (role?: string | null) => PURCHASING_ROLES.has(normalizeRole(role));
const isStoreRole = (role?: string | null) => STORE_ROLES.has(normalizeRole(role));

const hasPermissionKey = (permissions: PagePermissionMap = {}, key: string) => Boolean(permissions[key]);

function hasAnyPermission(permissions: PagePermissionMap = {}, keys: string[]) {
  return keys.some(key => hasPermissionKey(permissions, key));
}

function resolveRoleAndPermissions(
  roleOrPermissions: string | PagePermissionMap | null | undefined,
  permissions: PagePermissionMap = {},
) {
  if (typeof roleOrPermissions === 'object' && roleOrPermissions !== null) {
    return {
      role: undefined,
      permissions: roleOrPermissions,
    };
  }

  return {
    role: roleOrPermissions,
    permissions,
  };
}

export const RBAC_MATRIX: PermissionMatrix = {
  owner: {
    general_request: ['read', 'create', 'edit', 'delete', 'approve'],
    maintenance: ['read', 'create', 'edit', 'delete', 'approve'],
    vehicle: ['read', 'create', 'edit', 'delete'],
    purchase_order: ['read', 'create', 'edit', 'delete', 'approve'],
    dashboard: ['read'],
  },
  admin: {
    general_request: ['read', 'create', 'edit', 'delete', 'approve'],
    maintenance: ['read', 'create', 'edit', 'delete', 'approve'],
    vehicle: ['read', 'create', 'edit', 'delete'],
    purchase_order: ['read', 'create', 'edit', 'delete', 'approve'],
    dashboard: ['read'],
  },
  manager: {
    general_request: ['read', 'create', 'edit', 'approve'],
    maintenance: ['read', 'create', 'edit', 'approve'],
    vehicle: ['read'],
    purchase_order: ['read', 'approve'],
    dashboard: ['read'],
  },
  general: {
    general_request: ['read', 'create', 'edit'],
    maintenance: ['read'],
    vehicle: ['read'],
    purchase_order: ['read'],
    dashboard: ['read'],
  },
  employee: {
    general_request: ['read'],
    maintenance: ['read'],
    vehicle: ['read'],
    purchase_order: [],
    dashboard: ['read'],
  },
  maid: {
    general_request: ['read', 'create'],
    maintenance: ['read'],
    dashboard: ['read'],
  },
  driver: {
    general_request: ['read', 'create'],
    maintenance: ['read'],
    vehicle: ['read'],
    dashboard: ['read'],
  },
};

export function mergePermissionMaps<T extends PagePermissionMap>(...maps: Array<T | null | undefined>): T {
  const merged: PagePermissionMap = {};
  for (const map of maps) {
    if (!map) continue;
    Object.entries(map).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        merged[key] = Boolean(value);
      }
    });
  }
  return merged as T;
}

export function hasPermission(
  role: string | null | undefined,
  resource: Resource,
  action: Action,
) {
  if (!role) return false;

  const normalizedRole = normalizeRole(role) as AppRole;
  const normalizedAction = normalizeAction(action);

  return RBAC_MATRIX[normalizedRole]?.[resource]?.includes(normalizedAction) ?? false;
}

export function getGeneralRequestPermissions(role: string | null | undefined) {
  return {
    canView: hasPermission(role, 'general_request', 'read'),
    canCreate: hasPermission(role, 'general_request', 'create'),
    canEdit: hasPermission(role, 'general_request', 'edit'),
    canDelete: hasPermission(role, 'general_request', 'delete'),
    canApprove: hasPermission(role, 'general_request', 'approve'),
  };
}

export function getSafePagePermissionKey(
  route: string,
  level: 'view' | 'read' | 'edit',
) {
  const normalizedLevel = level === 'view' ? 'read' : level;
  return getPagePermissionKey(route, normalizedLevel);
}

function getDashboardPageFlags(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  pathname: string,
  options: DashboardAccessOptions = {},
): DashboardPageAccess {
  const routePattern = resolveDashboardRoutePattern(pathname);
  const requiredAccessLevel = (options.level === 'view' ? 'read' : options.level) || getRequiredPageAccessLevelForPathname(pathname);

  if (!routePattern || !requiredAccessLevel) {
    return {
      routePattern,
      requiredAccessLevel,
      hasPageAccess: true,
      canReadPage: true,
      canEditPage: true,
    };
  }

  if (isManagerLike(role)) {
    return {
      routePattern,
      requiredAccessLevel,
      hasPageAccess: true,
      canReadPage: true,
      canEditPage: true,
    };
  }

  const readKey = getPagePermissionKey(routePattern, 'read');
  const editKey = getPagePermissionKey(routePattern, 'edit');
  const canReadPage = Boolean(permissions[readKey] || permissions[editKey]);
  const canEditPage = Boolean(permissions[editKey]);

  const hasPageAccess = requiredAccessLevel === 'edit' ? canEditPage : canReadPage;
  return {
    routePattern,
    requiredAccessLevel,
    hasPageAccess,
    canReadPage,
    canEditPage,
  };
}

export function canAccessDashboardPage(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  pathname: string,
  options: DashboardAccessOptions = {},
) {
  return getDashboardPageFlags(role, permissions, pathname, options).hasPageAccess;
}

export function resolveDashboardPageAccess(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  pathname: string,
  options: DashboardAccessOptions = {},
) {
  return getDashboardPageFlags(role, permissions, pathname, options);
}

export function resolveGeneralRequestAccess(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const pageKey = '/general-request';

  const pageRead = Boolean(userPermissions[getSafePagePermissionKey(pageKey, 'read')]);
  const pageEdit = Boolean(userPermissions[getSafePagePermissionKey(pageKey, 'edit')]);

  const rolePermissions = getGeneralRequestPermissions(role);

  return {
    canViewPage: rolePermissions.canView || pageRead || pageEdit,
    canEditPage: rolePermissions.canEdit || pageEdit,
    canCreate: rolePermissions.canCreate && (pageEdit || pageRead),
    canApprove: rolePermissions.canApprove,
    canDelete: rolePermissions.canDelete,
  };
}

export function resolveDashboardHomeView(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  options: { isApprover?: boolean } = {},
): DashboardHomeView {
  const normalized = normalizeRole(role);
  const isApprover = Boolean(options.isApprover);

  if (isManagerLike(normalized)) return normalized === 'manager' ? 'manager' : 'admin';
  if (isAccountingRole(normalized) || canAccessAccountingDashboard(role, permissions, isApprover)) return 'accounting';
  if (isPurchasingRole(normalized) || canAccessPurchasingDashboard(role, permissions, isApprover)) return 'purchasing';
  if (isMaintenanceTechnician(normalized)) return 'technician';
  if (isStoreRole(normalized)) return 'store';
  return 'general';
}

export function isMaintenanceTechnician(role?: string | null) {
  return TECHNICIAN_ROLES.has(normalizeRole(role));
}

export function canViewLowStockNotifications(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized)
    || OPERATION_ROLES.has(normalized)
    || PURCHASING_ROLES.has(normalized)
    || STORE_ROLES.has(normalized)
    || hasPermissionKey(permissions, PERMISSIONS.PRODUCTS);
}

export function canViewPurchaseOrderNotifications(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized)
    || PURCHASING_ROLES.has(normalized)
    || ACCOUNTING_ROLES.has(normalized)
    || hasAnyPermission(permissions, [PERMISSIONS.PO_VIEW, PERMISSIONS.PURCHASING_APPROVALS, PERMISSIONS.APPROVALS]);
}

export function canViewBorrowNotifications(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized)
    || OPERATION_ROLES.has(normalized)
    || GENERAL_ROLES.has(normalized)
    || normalized === 'maid'
    || normalized === 'leader_maid'
    || normalized === 'driver'
    || normalized === 'leader_driver';
}

export function canViewOwnBorrowNotifications(role: string | null | undefined) {
  return GENERAL_ROLES.has(normalizeRole(role));
}

export function canViewMaintenanceNotifications(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized)
    || isMaintenanceTechnician(normalized)
    || Boolean(isApprover)
    || hasAnyPermission(permissions, [PERMISSIONS.MAINTENANCE, PERMISSIONS.MAINTENANCE_DASHBOARD]);
}

export function canViewGeneralMaintenanceNotifications(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized) || GENERAL_ROLES.has(normalized);
}

export function canViewPurchaseApprovalNotifications(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const normalized = normalizeRole(role);
  return Boolean(isApprover)
    || isManagerLike(normalized)
    || PURCHASING_ROLES.has(normalized)
    || hasAnyPermission(permissions, [PERMISSIONS.APPROVALS, PERMISSIONS.PURCHASING_APPROVALS]);
}

export function canViewPartRequestNotifications(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const normalized = normalizeRole(role);
  return Boolean(isApprover)
    || isManagerLike(normalized)
    || isMaintenanceTechnician(normalized)
    || PURCHASING_ROLES.has(normalized)
    || hasAnyPermission(permissions, [PERMISSIONS.MAINTENANCE_REQUESTS, PERMISSIONS.APPROVALS]);
}

export function canViewPettyCashNotifications(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized)
    || isAccountingRole(normalized)
    || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canViewApprovalQueue(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return Boolean(isApprover)
    || isManagerLike(role)
    || hasAnyPermission(permissions, [PERMISSIONS.APPROVALS, PERMISSIONS.PURCHASING_APPROVALS]);
}

export function canManageGeneralApprovals(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return Boolean(isApprover)
    || isManagerLike(role)
    || hasPermissionKey(permissions, PERMISSIONS.APPROVALS);
}

export function canAccessPurchaseWorkflowQueue(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return Boolean(isApprover)
    || isManagerLike(role)
    || isPurchasingRole(role)
    || hasPermissionKey(permissions, PERMISSIONS.PURCHASING_APPROVALS);
}

export function canManagePurchaseRequests(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return canAccessPurchaseWorkflowQueue(role, permissions, isApprover);
}

export function canApproveApprovalRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  context?: {
    currentUserId?: number | null;
    requestType?: string | null;
    workflowStep?: { approver_role?: string | null } | null;
    isApprover?: boolean;
    [key: string]: unknown;
  },
) {
  const normalized = normalizeRole(role);
  const requestType = (context?.requestType || '').toLowerCase();
  const workflowRole = (context?.workflowStep?.approver_role || '').toLowerCase();

  if (isManagerLike(normalized)) return true;
  if (context?.isApprover) return true;
  if (requestType === 'purchase' && isPurchasingRole(normalized)) return true;
  if (requestType === 'purchase' && workflowRole.includes('accounting') && isAccountingRole(normalized)) return true;
  if (requestType === 'purchase' && workflowRole.includes('store') && isStoreRole(normalized)) return true;

  return hasAnyPermission(permissions, [PERMISSIONS.APPROVALS, PERMISSIONS.PURCHASING_APPROVALS]);
}

export function canEditPurchaseRequestRecord(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  context?: { currentUserId?: number | null; requestedBy?: number | null },
) {
  if (isManagerLike(role) || isPurchasingRole(role)) return true;
  if (hasAnyPermission(permissions, [PERMISSIONS.PURCHASING_APPROVALS, PERMISSIONS.APPROVALS])) return true;
  if (context?.currentUserId && context?.requestedBy && context.currentUserId === context.requestedBy) return true;
  return false;
}

export function canAccessManagerDashboard(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || hasPermissionKey(permissions, PERMISSIONS.DASHBOARD);
}

export function canAccessAccountingDashboard(
  roleOrPermissions: string | PagePermissionMap | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return isManagerLike(resolved.role) || isAccountingRole(resolved.role) || Boolean(isApprover) || hasPermissionKey(resolved.permissions, PERMISSIONS.PETTY_CASH);
}

export function canAccessPurchasingDashboard(
  roleOrPermissions: string | PagePermissionMap | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return isManagerLike(resolved.role)
    || isPurchasingRole(resolved.role)
    || Boolean(isApprover)
    || hasAnyPermission(resolved.permissions, [PERMISSIONS.PURCHASING_APPROVALS, PERMISSIONS.PO_VIEW]);
}

export function canAccessPettyCashModule(
  roleOrPermissions: string | PagePermissionMap | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return canViewPettyCashNotifications(resolved.role, resolved.permissions) || Boolean(isApprover);
}

export function canAccessPettyCashDashboard(
  roleOrPermissions: string | PagePermissionMap | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return isManagerLike(resolved.role) || isAccountingRole(resolved.role) || Boolean(isApprover) || hasPermissionKey(resolved.permissions, PERMISSIONS.PETTY_CASH);
}

export function canCreatePettyCashRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return canAccessPettyCashModule(role, permissions, isApprover);
}

export function canManagePettyCashApprovals(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return isManagerLike(role) || isAccountingRole(role) || Boolean(isApprover) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canApprovePettyCashRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return canManagePettyCashApprovals(role, permissions, isApprover);
}

export function canDispensePettyCashRequest(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isAccountingRole(role) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canReconcilePettyCashRequest(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isAccountingRole(role) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canSubmitPettyCashClearance(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  context?: { currentUserName?: string | null; ownerName?: string | null; isApprover?: boolean },
) {
  if (isManagerLike(role) || isAccountingRole(role)) return true;
  if (context?.isApprover) return true;
  if (context?.currentUserName && context?.ownerName && context.currentUserName === context.ownerName) return true;
  return hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canViewPettyCashRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  context?: { currentUserName?: string | null; ownerName?: string | null; isApprover?: boolean },
) {
  if (isManagerLike(role) || isAccountingRole(role)) return true;
  if (context?.isApprover) return true;
  if (context?.currentUserName && context?.ownerName && context.currentUserName === context.ownerName) return true;
  return hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canDeletePettyCashEntry(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  context?: {
    currentUserName?: string | null;
    ownerName?: string | null;
    status?: string | null;
    isApprover?: boolean;
  },
) {
  if (isManagerLike(role) || isAccountingRole(role) || context?.isApprover) return true;
  if (!context?.currentUserName || !context?.ownerName) return false;
  const ownEntry = context.currentUserName === context.ownerName;
  const deletableStatus = ['pending', 'rejected'].includes((context.status || '').toLowerCase());
  return ownEntry && deletableStatus && hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canVerifyPettyCashReceipt(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isAccountingRole(role) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canManagePettyCashAccounting(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isAccountingRole(role) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canReplenishPettyCashFund(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isAccountingRole(role) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canUpdatePettyCashFundLimit(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
}

export function canManageMaintenanceTechnicians(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  _isApprover = false,
) {
  return isManagerLike(role) || isMaintenanceTechnician(role) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_TECHNICIANS);
}

export function canViewMaintenanceTechnicians(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return canManageMaintenanceTechnicians(role, permissions, isApprover);
}

export function canCreateMaintenanceRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  _isApprover = false,
) {
  return isManagerLike(role)
    || isMaintenanceTechnician(role)
    || hasAnyPermission(permissions, [PERMISSIONS.MAINTENANCE, PERMISSIONS.GENERAL_REQUEST]);
}

export function canManageMaintenanceEdit(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  _isApprover = false,
) {
  return isManagerLike(role) || isMaintenanceTechnician(role) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE);
}

export function canReassignMaintenanceRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  _isApprover = false,
) {
  return isManagerLike(role) || isMaintenanceTechnician(role) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_DASHBOARD);
}

export function canSubmitMaintenanceCompletion(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  _isApprover = false,
) {
  return isManagerLike(role) || isMaintenanceTechnician(role) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE);
}

export function canApproveMaintenanceCompletion(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return isManagerLike(role) || Boolean(isApprover) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE);
}

export function canVerifyMaintenanceParts(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isStoreRole(role) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_PARTS);
}

export function canConfirmMaintenancePartUsage(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return canVerifyMaintenanceParts(role, permissions);
}

export function canDirectManageMaintenanceStock(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || isStoreRole(role) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_PARTS);
}

export function canReviewMaintenancePartRequests(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  _isApprover = false,
) {
  return isManagerLike(role)
    || isPurchasingRole(role)
    || isAccountingRole(role)
    || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_REQUESTS);
}

export function canManageMaintenanceParts(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return canReviewMaintenancePartRequests(role, permissions, isApprover) || isStoreRole(role);
}

export function canCreatePartRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return isManagerLike(role)
    || isMaintenanceTechnician(role)
    || Boolean(isApprover)
    || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_REQUESTS);
}

export function canUpdatePartRequestStatus(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return canReviewMaintenancePartRequests(role, permissions)
    || Boolean(isApprover)
    || isStoreRole(role);
}

export function canDeletePartRequest(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return isManagerLike(role)
    || isPurchasingRole(role)
    || Boolean(isApprover)
    || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_REQUESTS);
}

export function canApprovePartRequestStage(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  stage = 0,
  isApprover = false,
) {
  const normalized = normalizeRole(role);
  if (isManagerLike(normalized) || isApprover) return true;

  if (stage <= 0) {
    return isPurchasingRole(normalized) || isMaintenanceTechnician(normalized) || hasPermissionKey(permissions, PERMISSIONS.MAINTENANCE_REQUESTS);
  }
  if (stage === 1) {
    return isAccountingRole(normalized) || hasPermissionKey(permissions, PERMISSIONS.PETTY_CASH);
  }
  return isManagerLike(normalized) || hasPermissionKey(permissions, PERMISSIONS.APPROVALS);
}

export function canManageAdminRoles(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || hasPermissionKey(permissions, PERMISSIONS.ADMIN_ROLES);
}

export function canViewAdminRoles(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return canManageAdminRoles(role, permissions);
}

export function canManageAdminSecurity(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || hasPermissionKey(permissions, PERMISSIONS.ADMIN_SECURITY) || hasPermissionKey(permissions, PERMISSIONS.ADMIN_SETTINGS);
}

export function canManageLineCustomers(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || hasPermissionKey(permissions, PERMISSIONS.ADMIN_SETTINGS);
}

export function canViewLineCustomers(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return canManageLineCustomers(role, permissions);
}

export function canViewPurchaseOrders(roleOrPermissions: string | PagePermissionMap | null | undefined, permissions: PagePermissionMap = {}) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return isManagerLike(resolved.role) || hasAnyPermission(resolved.permissions, [PERMISSIONS.PO_VIEW, PERMISSIONS.PO_EDIT, PERMISSIONS.PO_PRINT, PERMISSIONS.PO_RECEIVE]);
}

export function canEditPurchaseOrders(roleOrPermissions: string | PagePermissionMap | null | undefined, permissions: PagePermissionMap = {}) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return isManagerLike(resolved.role) || isPurchasingRole(resolved.role) || hasPermissionKey(resolved.permissions, PERMISSIONS.PO_EDIT);
}

export function canPrintPurchaseOrders(roleOrPermissions: string | PagePermissionMap | null | undefined, permissions: PagePermissionMap = {}) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return canViewPurchaseOrders(resolved.role, resolved.permissions) || hasPermissionKey(resolved.permissions, PERMISSIONS.PO_PRINT);
}

export function canReceivePurchaseOrders(roleOrPermissions: string | PagePermissionMap | null | undefined, permissions: PagePermissionMap = {}) {
  const resolved = resolveRoleAndPermissions(roleOrPermissions, permissions);
  return isManagerLike(resolved.role)
    || isPurchasingRole(resolved.role)
    || isStoreRole(resolved.role)
    || hasPermissionKey(resolved.permissions, PERMISSIONS.PO_RECEIVE);
}

export function canViewPurchaseRequestDocument(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  context?: boolean | { currentUserId?: number | null; ownerId?: number | null; isApprover?: boolean },
) {
  const isApprover = typeof context === 'boolean' ? context : Boolean(context?.isApprover);
  const isOwner = typeof context === 'object'
    && context !== null
    && Number.isFinite(context.currentUserId)
    && Number.isFinite(context.ownerId)
    && context.currentUserId === context.ownerId;

  return canViewPurchaseOrders(role, permissions)
    || Boolean(isApprover)
    || Boolean(isOwner)
    || hasPermissionKey(permissions, PERMISSIONS.PURCHASING_APPROVALS);
}

export function canReceiveDailySummary(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  const normalized = normalizeRole(role);
  return isManagerLike(normalized)
    || isAccountingRole(normalized)
    || isPurchasingRole(normalized)
    || isStoreRole(normalized)
    || hasAnyPermission(permissions, [PERMISSIONS.DASHBOARD, PERMISSIONS.APPROVALS, PERMISSIONS.PURCHASING_APPROVALS]);
}

export function canReceiveApprovalRequestNotification(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  requestType?: string,
) {
  if (requestType?.toLowerCase() === 'purchase') {
    return canAccessPurchaseWorkflowQueue(role, permissions, false);
  }
  return canManageGeneralApprovals(role, permissions, false);
}

export function canReceiveApprovalStepNotification(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  approverRole?: string,
) {
  const normalized = normalizeRole(role);
  const targetRole = (approverRole || '').toLowerCase();

  if (targetRole.includes('accounting')) return isAccountingRole(normalized);
  if (targetRole.includes('purchasing')) return isPurchasingRole(normalized);
  if (targetRole.includes('store')) return isStoreRole(normalized);
  if (targetRole.includes('technician')) return isMaintenanceTechnician(normalized);
  if (targetRole.includes('manager')) return isManagerLike(normalized);
  return canManageGeneralApprovals(role, permissions, false);
}

export function canViewHealthMetrics(role: string | null | undefined, permissions: PagePermissionMap = {}) {
  return isManagerLike(role) || hasPermissionKey(permissions, PERMISSIONS.ADMIN_SECURITY);
}

export function canAccessInventoryAudit(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  level: 'read' | 'edit' = 'read',
) {
  return canAccessDashboardPage(role, permissions, '/inventory-audit', { level });
}

export function canApproveInventoryAudit(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  return isManagerLike(role) || Boolean(isApprover) || canAccessInventoryAudit(role, permissions, 'edit');
}

export function resolveInventoryAuditUserRole(
  role: string | null | undefined,
  permissions: PagePermissionMap = {},
  isApprover = false,
) {
  if (canApproveInventoryAudit(role, permissions, isApprover)) {
    return 'approver';
  }
  if (canAccessInventoryAudit(role, permissions, 'edit')) {
    return 'auditor';
  }
  return 'viewer';
}
