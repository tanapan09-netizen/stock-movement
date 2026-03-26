import {
  PERMISSIONS,
  getPagePermissionKey,
  getPagePermissionKeyForPathname,
  getRequiredPageAccessLevelForPathname,
  resolveDashboardRoutePattern,
  type PageAccessLevel,
} from '@/lib/permissions';
import { isAdminRole, isDepartmentRole, isManagerRole, normalizeRole } from '@/lib/roles';

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
export type InventoryAuditRole = 'auditor' | 'supervisor' | 'admin' | 'viewer';
export type DashboardHomeView =
  | 'admin'
  | 'manager'
  | 'accounting'
  | 'purchasing'
  | 'technician'
  | 'store'
  | 'general';

export interface DashboardPageAccess {
  routePattern: string | null;
  requiredAccessLevel: PageAccessLevel | null;
  canReadPage: boolean;
  canEditPage: boolean;
  hasPageAccess: boolean;
}

type PermissionMatrix = {
  [role in AppRole]?: Partial<{
    [resource in Resource]: Action[];
  }>;
};

const normalizeAction = (action: Action): Exclude<Action, 'view'> | 'read' => {
  if (action === 'view') return 'read';
  return action;
};

export function mergePermissionMaps<T extends Record<string, boolean>>(
  ...permissionMaps: Array<Partial<T> | null | undefined>
): T {
  return Object.assign({}, ...permissionMaps.filter(Boolean)) as T;
}

export function hasMergedPermission(
  userPermissions: PagePermissionMap,
  permissionKey: string,
) {
  return Boolean(userPermissions[permissionKey]);
}

export function canAccessPettyCashModule(userPermissions: PagePermissionMap) {
  return hasMergedPermission(userPermissions, PERMISSIONS.PETTY_CASH);
}

export function canViewPurchaseOrders(userPermissions: PagePermissionMap) {
  return hasMergedPermission(userPermissions, PERMISSIONS.PO_VIEW);
}

export function canEditPurchaseOrders(userPermissions: PagePermissionMap) {
  return hasMergedPermission(userPermissions, PERMISSIONS.PO_EDIT);
}

export function canPrintPurchaseOrders(userPermissions: PagePermissionMap) {
  return hasMergedPermission(userPermissions, PERMISSIONS.PO_PRINT);
}

export function canReceivePurchaseOrders(userPermissions: PagePermissionMap) {
  return hasMergedPermission(userPermissions, PERMISSIONS.PO_RECEIVE);
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

export function hasPermission(
  role: string | null | undefined,
  resource: Resource,
  action: Action,
) {
  if (!role) return false;

  const normalizedRole = role.toLowerCase() as AppRole;
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

/**
 * รองรับทั้ง 'view' และ 'read'
 */
export function getSafePagePermissionKey(
  route: string,
  level: 'view' | 'read' | 'edit',
) {
  const normalizedLevel = level === 'view' ? 'read' : level;
  return getPagePermissionKey(route, normalizedLevel);
}

export function resolveExplicitPageAccess(
  userPermissions: PagePermissionMap,
  pathname: string,
): DashboardPageAccess {
  const requiredAccessLevel = getRequiredPageAccessLevelForPathname(pathname);
  const readPermissionKey = getPagePermissionKeyForPathname(pathname, 'read');
  const editPermissionKey = getPagePermissionKeyForPathname(pathname, 'edit');
  const canReadPage = readPermissionKey ? Boolean(userPermissions[readPermissionKey]) : true;
  const canEditPage = editPermissionKey ? Boolean(userPermissions[editPermissionKey]) : true;
  const hasPageAccess = requiredAccessLevel === 'edit'
    ? canEditPage
    : (canReadPage || canEditPage);

  return {
    routePattern: resolveDashboardRoutePattern(pathname),
    requiredAccessLevel,
    canReadPage,
    canEditPage,
    hasPageAccess,
  };
}

type BaselineAccessResolver = (context: {
  role: string;
  isApprover: boolean;
}) => Pick<DashboardPageAccess, 'canReadPage' | 'canEditPage'>;

const SPECIAL_ROUTE_BASELINE_ACCESS: Record<string, BaselineAccessResolver> = {
  '/approvals/manage': ({ role, isApprover }) => {
    const allowed = isManagerRole(role) || isApprover;
    return { canReadPage: allowed, canEditPage: allowed };
  },
  '/approvals/purchasing': ({ role, isApprover }) => {
    const allowed = isManagerRole(role) || isDepartmentRole(role, 'purchasing') || isApprover;
    return { canReadPage: allowed, canEditPage: allowed };
  },
  '/accounting-dashboard': ({ role }) => {
    const allowed = isManagerRole(role) || isDepartmentRole(role, 'accounting');
    return { canReadPage: allowed, canEditPage: allowed };
  },
  '/manager-dashboard': ({ role }) => {
    const allowed = isManagerRole(role);
    return { canReadPage: allowed, canEditPage: allowed };
  },
  '/purchasing-dashboard': ({ role }) => {
    const allowed = isManagerRole(role) || isDepartmentRole(role, 'purchasing');
    return { canReadPage: allowed, canEditPage: allowed };
  },
  '/purchase-request/manage': ({ role }) => {
    const allowed = isManagerRole(role) || isDepartmentRole(role, 'purchasing');
    return { canReadPage: allowed, canEditPage: allowed };
  },
  '/store-dashboard': ({ role }) => {
    const allowed =
      isManagerRole(role) ||
      isDepartmentRole(role, 'store') ||
      isDepartmentRole(role, 'operation');
    return { canReadPage: allowed, canEditPage: allowed };
  },
};

export function resolveDashboardPageAccess(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  pathname: string,
  options?: { isApprover?: boolean },
): DashboardPageAccess {
  const explicitAccess = resolveExplicitPageAccess(userPermissions, pathname);
  const normalizedRole = normalizeRole(role);
  const baselineAccess = explicitAccess.routePattern
    ? SPECIAL_ROUTE_BASELINE_ACCESS[explicitAccess.routePattern]?.({
      role: normalizedRole,
      isApprover: Boolean(options?.isApprover),
    })
    : undefined;

  const canReadPage = Boolean(
    baselineAccess?.canReadPage || explicitAccess.canReadPage || explicitAccess.canEditPage,
  );
  const canEditPage = Boolean(
    baselineAccess?.canEditPage || explicitAccess.canEditPage,
  );
  const hasPageAccess = explicitAccess.requiredAccessLevel === 'edit'
    ? canEditPage
    : (canReadPage || canEditPage);

  return {
    ...explicitAccess,
    canReadPage,
    canEditPage,
    hasPageAccess,
  };
}

export function canAccessDashboardPage(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  pathname: string,
  options?: { isApprover?: boolean; level?: PageAccessLevel },
) {
  const pageAccess = resolveDashboardPageAccess(role, userPermissions, pathname, options);

  if (options?.level === 'edit') {
    return pageAccess.canEditPage;
  }

  return pageAccess.hasPageAccess;
}

export function canAccessManagerDashboard(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/manager-dashboard');
}

export function canAccessAccountingDashboard(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/accounting-dashboard');
}

export function canViewAdminRoles(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/roles');
}

export function canManageAdminRoles(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/roles', { level: 'edit' });
}

export function canAccessPurchasingDashboard(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/purchasing-dashboard');
}

export function canAccessInventoryAudit(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  level: PageAccessLevel = 'read',
) {
  return canAccessDashboardPage(role, userPermissions, '/inventory-audit', { level });
}

export function canApproveInventoryAudit(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isApprover ||
    normalizedRole === 'supervisor' ||
    isManagerRole(normalizedRole) ||
    canAccessInventoryAudit(normalizedRole, userPermissions, 'edit')
  );
}

export function resolveInventoryAuditUserRole(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
): InventoryAuditRole {
  const normalizedRole = normalizeRole(role);

  if (isAdminRole(normalizedRole)) {
    return 'admin';
  }

  if (normalizedRole === 'supervisor' || isManagerRole(normalizedRole)) {
    return 'supervisor';
  }

  if (canAccessInventoryAudit(normalizedRole, userPermissions, 'edit') || isApprover) {
    return 'auditor';
  }

  return 'viewer';
}

export function canReviewMaintenancePartRequests(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isApprover ||
    normalizedRole === 'leader_technician' ||
    isManagerRole(normalizedRole) ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/maintenance/part-requests', {
      isApprover,
      level: 'edit',
    })
  );
}

export function canViewLowStockNotifications(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'operation') ||
    canAccessPurchasingDashboard(normalizedRole, userPermissions)
  );
}

export function canViewPurchaseOrderNotifications(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'accounting') ||
    canAccessPurchasingDashboard(normalizedRole, userPermissions) ||
    canViewPurchaseOrders(userPermissions)
  );
}

export function canViewBorrowNotifications(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return isManagerRole(normalizedRole) || isDepartmentRole(normalizedRole, 'operation');
}

export function canViewOwnBorrowNotifications(role: string | null | undefined) {
  return normalizeRole(role) === 'employee';
}

export function canViewMaintenanceNotifications(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'technician') ||
    normalizedRole === 'leader_technician' ||
    isApprover ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/maintenance/dashboard', { isApprover })
  );
}

export function canViewGeneralMaintenanceNotifications(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return isManagerRole(normalizedRole) || normalizedRole === 'general';
}

export function canViewPurchaseApprovalNotifications(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canAccessPurchasingApprovals(role, userPermissions, isApprover);
}

export function canViewPartRequestNotifications(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return (
    canReviewMaintenancePartRequests(role, userPermissions, isApprover) ||
    canAccessPurchasingDashboard(role, userPermissions)
  );
}

export function canViewPettyCashNotifications(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'accounting') ||
    canAccessPettyCashModule(userPermissions)
  );
}

export function canReceiveDailySummary(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return isAdminRole(role) || canAccessManagerDashboard(role, userPermissions);
}

export function canViewLineCustomers(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/settings/line-customers');
}

export function canManageLineCustomers(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/settings/line-customers', { level: 'edit' });
}

export function canReceiveApprovalRequestNotification(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  requestType: string,
  isApprover = false,
) {
  if (requestType === 'expense' || requestType === 'purchase') {
    return (
      canManageGeneralApprovals(role, userPermissions, isApprover) ||
      canAccessPurchasingApprovals(role, userPermissions, isApprover)
    );
  }

  return canManageGeneralApprovals(role, userPermissions, isApprover);
}

export function canReceiveApprovalStepNotification(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  approverRole: string,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);
  const normalizedApproverRole = normalizeRole(approverRole);

  if (!normalizedApproverRole) {
    return false;
  }

  if (normalizedApproverRole === 'any_manager' || normalizedApproverRole === 'manager') {
    return canAccessManagerDashboard(normalizedRole, userPermissions);
  }

  if (normalizedApproverRole === 'purchasing') {
    return canAccessPurchasingApprovals(normalizedRole, userPermissions, isApprover);
  }

  if (normalizedApproverRole === 'admin') {
    return isAdminRole(normalizedRole);
  }

  if (normalizedApproverRole === 'accounting') {
    return isDepartmentRole(normalizedRole, 'accounting') || isApprover;
  }

  return (
    normalizedRole === normalizedApproverRole ||
    isDepartmentRole(normalizedRole, normalizedApproverRole)
  );
}

export function canCreatePettyCashRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canAccessDashboardPage(role, userPermissions, '/petty-cash/new', {
    isApprover,
    level: 'edit',
  });
}

export function canAccessPettyCashDashboard(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/petty-cash/dashboard');
}

export function canManagePettyCashApprovals(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'accounting') ||
    isApprover ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/petty-cash', {
      isApprover,
      level: 'edit',
    })
  );
}

export function canManagePettyCashAccounting(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'accounting') ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/petty-cash', {
      level: 'edit',
    })
  );
}

export function canViewPettyCashRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserName?: string | null;
    ownerName?: string | null;
    isApprover?: boolean;
  },
) {
  return (
    Boolean(options.currentUserName && options.ownerName && options.currentUserName === options.ownerName) ||
    canManagePettyCashApprovals(role, userPermissions, options.isApprover)
  );
}

export function canSubmitPettyCashClearance(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserName?: string | null;
    ownerName?: string | null;
    isApprover?: boolean;
  },
) {
  return (
    canViewPettyCashRequest(role, userPermissions, options) ||
    canManagePettyCashAccounting(role, userPermissions)
  );
}

export function canApprovePettyCashRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canManagePettyCashApprovals(role, userPermissions, isApprover);
}

export function canDispensePettyCashRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canManagePettyCashAccounting(role, userPermissions);
}

export function canReconcilePettyCashRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canManagePettyCashAccounting(role, userPermissions);
}

export function canVerifyPettyCashReceipt(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canManagePettyCashAccounting(role, userPermissions);
}

export function canDeletePettyCashEntry(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserName?: string | null;
    ownerName?: string | null;
    status?: string | null;
    isApprover?: boolean;
  },
) {
  const normalizedRole = normalizeRole(role);

  return (
    isAdminRole(normalizedRole) ||
    canManagePettyCashApprovals(normalizedRole, userPermissions, options.isApprover) ||
    (
      options.status === 'pending' &&
      Boolean(options.currentUserName && options.ownerName && options.currentUserName === options.ownerName)
    )
  );
}

export function canReplenishPettyCashFund(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canManagePettyCashAccounting(role, userPermissions);
}

export function canUpdatePettyCashFundLimit(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isAdminRole(normalizedRole) ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/petty-cash/dashboard', {
      level: 'edit',
    })
  );
}

export function isMaintenanceTechnician(role: string | null | undefined) {
  return normalizeRole(role) === 'technician';
}

export function canViewMaintenanceTechnicians(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return (
    canAccessDashboardPage(role, userPermissions, '/maintenance/technicians') ||
    canAccessDashboardPage(role, userPermissions, '/maintenance', { isApprover }) ||
    canAccessDashboardPage(role, userPermissions, '/reports/maintenance')
  );
}

export function canManageMaintenanceTechnicians(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/maintenance/technicians', { level: 'edit' });
}

export function canManageMaintenanceEdit(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    canAccessDashboardPage(normalizedRole, userPermissions, '/maintenance', { isApprover, level: 'edit' }) ||
    normalizedRole === 'leader_technician' ||
    isApprover
  );
}

export function canCreateMaintenanceRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canManageMaintenanceEdit(role, userPermissions, isApprover);
}

export function canAdjustMaintenancePriority(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return isManagerRole(normalizedRole) || isApprover || canManageMaintenanceEdit(normalizedRole, userPermissions, isApprover);
}

export function canReassignMaintenanceRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isApprover ||
    normalizedRole === 'employee' ||
    normalizedRole === 'leader_technician' ||
    canManageMaintenanceEdit(normalizedRole, userPermissions, isApprover)
  );
}

export function canConfirmMaintenancePartUsage(role: string | null | undefined) {
  return !isDepartmentRole(role, 'store');
}

export function canManageMaintenanceParts(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isManagerRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'store') ||
    canManageMaintenanceEdit(normalizedRole, userPermissions) ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/maintenance/parts', { level: 'edit' })
  );
}

export function canVerifyMaintenanceParts(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isAdminRole(normalizedRole) ||
    isDepartmentRole(normalizedRole, 'store') ||
    canAccessDashboardPage(normalizedRole, userPermissions, '/maintenance/parts', { level: 'edit' })
  );
}

export function canReopenMaintenanceRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'manager' || canAccessManagerDashboard(normalizedRole, userPermissions);
}

export function canApproveMaintenanceCompletion(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);
  void userPermissions;
  void isApprover;

  return normalizedRole === 'leader_technician';
}

export function canSubmitMaintenanceCompletion(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    isMaintenanceTechnician(normalizedRole) ||
    canApproveMaintenanceCompletion(normalizedRole, userPermissions, isApprover)
  );
}

export function canViewHealthMetrics(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return isAdminRole(role) || hasMergedPermission(userPermissions, PERMISSIONS.ADMIN_SECURITY);
}

export function canManageAdminSecurity(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return isAdminRole(role) || hasMergedPermission(userPermissions, PERMISSIONS.ADMIN_SECURITY);
}

export function canCreatePartRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canManageMaintenanceEdit(role, userPermissions, isApprover);
}

export function canUpdatePartRequestStatus(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  return (
    canManageMaintenanceParts(normalizedRole, userPermissions) ||
    canAccessPurchasingDashboard(normalizedRole, userPermissions) ||
    isDepartmentRole(normalizedRole, 'accounting') ||
    isApprover
  );
}

export function canDeletePartRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canManageMaintenanceEdit(role, userPermissions, isApprover);
}

export function canApprovePartRequestStage(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  currentStage = 0,
  isApprover = false,
) {
  const normalizedRole = normalizeRole(role);

  if (currentStage <= 0) {
    return canReviewMaintenancePartRequests(normalizedRole, userPermissions, isApprover);
  }

  if (currentStage === 1) {
    return (
      isManagerRole(normalizedRole) ||
      isDepartmentRole(normalizedRole, 'accounting') ||
      isApprover
    );
  }

  if (currentStage === 2) {
    return canAccessManagerDashboard(normalizedRole, userPermissions);
  }

  return false;
}

export function resolveDashboardHomeView(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options?: { isApprover?: boolean },
): DashboardHomeView {
  const normalizedRole = normalizeRole(role);

  if (isAdminRole(normalizedRole)) {
    return 'admin';
  }

  if (canAccessManagerDashboard(normalizedRole, userPermissions)) {
    return 'manager';
  }

  if (canAccessAccountingDashboard(normalizedRole, userPermissions)) {
    return 'accounting';
  }

  if (canAccessPurchasingDashboard(normalizedRole, userPermissions)) {
    return 'purchasing';
  }

  if (normalizedRole === 'leader_technician' || isDepartmentRole(normalizedRole, 'technician')) {
    return 'technician';
  }

  if (canAccessDashboardPage(normalizedRole, userPermissions, '/store-dashboard', options)) {
    return 'store';
  }

  return 'general';
}

export function canManagePurchaseRequests(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  return canAccessDashboardPage(role, userPermissions, '/purchase-request/manage');
}

export function canViewPurchaseRequestDocument(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserId: number;
    ownerId: number;
    isApprover?: boolean;
  },
) {
  return (
    options.ownerId === options.currentUserId ||
    canManagePurchaseRequests(role, userPermissions) ||
    Boolean(options.isApprover)
  );
}

export function canViewApprovalQueue(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return (
    canManageGeneralApprovals(role, userPermissions, isApprover) ||
    canAccessPurchasingApprovals(role, userPermissions, isApprover)
  );
}

export function canViewApprovalRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserId: number;
    requestedBy?: number | null;
    requestType?: string | null;
    isApprover?: boolean;
  },
) {
  return (
    options.requestedBy === options.currentUserId ||
    canManageGeneralApprovals(role, userPermissions, options.isApprover) ||
    (
      options.requestType === 'purchase' &&
      canAccessPurchasingApprovals(role, userPermissions, options.isApprover)
    )
  );
}

export function canEditPurchaseRequestRecord(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserId: number;
    requestedBy?: number | null;
  },
) {
  return (
    options.requestedBy === options.currentUserId ||
    canManagePurchaseRequests(role, userPermissions)
  );
}

export function canApproveApprovalRequest(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  options: {
    currentUserId: number;
    requestType?: string | null;
    workflowStep?: {
      approver_id?: number | null;
      approver_role?: string | null;
    } | null;
    isApprover?: boolean;
  },
) {
  if (isAdminRole(role)) {
    return true;
  }

  if (options.workflowStep?.approver_id) {
    return options.currentUserId === options.workflowStep.approver_id;
  }

  if (options.workflowStep?.approver_role) {
    const approverRole = normalizeRole(options.workflowStep.approver_role);

    if (approverRole === 'manager' || approverRole === 'any_manager') {
      return canManageGeneralApprovals(role, userPermissions, options.isApprover);
    }

    return normalizeRole(role) === approverRole;
  }

  if (options.requestType === 'purchase') {
    return canAccessPurchasingApprovals(role, userPermissions, options.isApprover);
  }

  return canManageGeneralApprovals(role, userPermissions, options.isApprover);
}

export function canManageGeneralApprovals(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canAccessDashboardPage(role, userPermissions, '/approvals/manage', { isApprover });
}

export function canAccessPurchasingApprovals(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
  isApprover = false,
) {
  return canAccessDashboardPage(role, userPermissions, '/approvals/purchasing', { isApprover });
}

/**
 * merge RBAC + page permissions แบบ enterprise
 * - read/view: ใช้ OR เพื่อให้ DB/page override เปิดสิทธิ์เพิ่มได้
 * - edit/create/delete/approve: ยังยึด RBAC เป็นหลัก เว้นแต่คุณจะออกแบบ page-level เพิ่มเอง
 */
export function resolveGeneralRequestAccess(
  role: string | null | undefined,
  userPermissions: PagePermissionMap,
) {
  const pageAccess = resolveDashboardPageAccess(role, userPermissions, '/general-request');
  const rolePermissions = getGeneralRequestPermissions(role);

  return {
    canViewPage: pageAccess.canReadPage,
    canEditPage: pageAccess.canEditPage,
    canCreate: rolePermissions.canCreate && pageAccess.canEditPage,
    canApprove: rolePermissions.canApprove,
    canDelete: rolePermissions.canDelete,
  };
}
