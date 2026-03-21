export const PERMISSIONS = {
    DASHBOARD: 'dashboard',
    PRODUCTS: 'products',
    MOVEMENTS: 'movements',
    STOCK_ADJUST: 'stock_adjust',
    BORROW: 'borrow',
    ASSETS: 'assets',
    GENERAL_REQUEST: 'general_request',
    MAINTENANCE: 'maintenance',
    MAINTENANCE_DASHBOARD: 'maintenance_dashboard',
    MAINTENANCE_TECHNICIANS: 'maintenance_technicians',
    MAINTENANCE_PARTS: 'maintenance_parts',
    MAINTENANCE_REQUESTS: 'maintenance_requests',
    MAINTENANCE_REPORTS: 'maintenance_reports',
    APPROVALS: 'approvals',
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

    // PO granular permissions
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

const BASE_PERMISSION_LIST: PermissionItem[] = [
    // Core
    { key: PERMISSIONS.DASHBOARD, label: 'Dashboard', description: 'Access dashboard home', category: 'Core' },
    { key: PERMISSIONS.PRODUCTS, label: 'Products', description: 'Manage products', category: 'Core' },
    { key: PERMISSIONS.MOVEMENTS, label: 'Movements', description: 'View stock movement history', category: 'Core' },
    { key: PERMISSIONS.STOCK_ADJUST, label: 'Stock Adjust', description: 'Adjust stock quantities', category: 'Core' },
    { key: PERMISSIONS.BORROW, label: 'Borrow/Return', description: 'Manage borrow and return', category: 'Core' },
    { key: PERMISSIONS.ASSETS, label: 'Assets', description: 'Manage fixed assets', category: 'Core' },
    { key: PERMISSIONS.GENERAL_REQUEST, label: 'รับแจ้งซ่อม', description: 'เข้าถึงหน้ารับแจ้งซ่อม', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE, label: 'Maintenance', description: 'Access maintenance requests', category: 'Core' },
    { key: PERMISSIONS.APPROVALS, label: 'Approvals', description: 'Access approval requests', category: 'Core' },
    { key: PERMISSIONS.PETTY_CASH, label: 'Petty Cash', description: 'Access petty cash module', category: 'Core' },

    // Maintenance
    { key: PERMISSIONS.MAINTENANCE_DASHBOARD, label: 'Maintenance Dashboard', description: 'View maintenance dashboard', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_TECHNICIANS, label: 'Maintenance Technicians', description: 'Manage technician master data', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_PARTS, label: 'Maintenance Parts', description: 'Manage maintenance part inventory', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_REQUESTS, label: 'Maintenance Part Requests', description: 'Manage maintenance PR flow', category: 'Maintenance' },
    { key: PERMISSIONS.MAINTENANCE_REPORTS, label: 'Maintenance Reports', description: 'View maintenance reports', category: 'Maintenance' },

    // Admin
    { key: PERMISSIONS.ADMIN_ROLES, label: 'Roles & Users', description: 'Manage users and role permissions', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_PO, label: 'Purchase Orders (Legacy)', description: 'Legacy PO menu access', category: 'Admin' },
    { key: PERMISSIONS.PO_VIEW, label: 'PO View', description: 'View purchase orders', category: 'Admin' },
    { key: PERMISSIONS.PO_EDIT, label: 'PO Create/Edit', description: 'Create and edit purchase orders', category: 'Admin' },
    { key: PERMISSIONS.PO_PRINT, label: 'PO Print', description: 'Print purchase orders', category: 'Admin' },
    { key: PERMISSIONS.PO_RECEIVE, label: 'PO Receive', description: 'Receive PO items', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_SUPPLIERS, label: 'Suppliers', description: 'Manage suppliers', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_WAREHOUSES, label: 'Warehouses', description: 'Manage warehouses', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_CATEGORIES, label: 'Categories', description: 'Manage categories', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_REPORTS, label: 'Reports', description: 'Access reports', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_AUDIT, label: 'Inventory Audit', description: 'Access inventory audit', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_SETTINGS, label: 'Settings', description: 'Manage system settings', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_SECURITY, label: 'Security', description: 'Manage security settings', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_ROOMS, label: 'Rooms', description: 'Manage rooms', category: 'Admin' },
    { key: PERMISSIONS.ADMIN_LOGS, label: 'System Logs', description: 'View system logs', category: 'Admin' },
];

export const DASHBOARD_PAGE_ROUTES = [
    '/',
    '/admin/reports',
    '/admin/rooms',
    '/admin/security',
    '/api-docs',
    '/approvals',
    '/approvals/purchasing',
    '/approvals/workflows',
    '/assets',
    '/assets/[id]',
    '/assets/[id]/edit',
    '/assets/new',
    '/audit-log',
    '/borrow',
    '/borrow/[id]',
    '/borrow/new',
    '/categories',
    '/categories/[id]/edit',
    '/categories/new',
    '/debug-auth',
    '/general-request',
    '/inventory-audit',
    '/inventory-audit/[id]',
    '/inventory-audit/new',
    '/maintenance',
    '/maintenance/dashboard',
    '/maintenance/job-sheet/[id]',
    '/maintenance/part-requests',
    '/maintenance/parts',
    '/maintenance/pm',
    '/maintenance/technicians',
    '/movements',
    '/petty-cash',
    '/petty-cash/[id]/print',
    '/petty-cash/dashboard',
    '/petty-cash/new',
    '/purchase-request',
    '/products',
    '/products/[id]/edit',
    '/products/import',
    '/products/new',
    '/purchase-orders',
    '/purchase-orders/[id]',
    '/purchase-orders/[id]/edit',
    '/purchase-orders/issue',
    '/purchase-orders/new',
    '/purchase-orders/receive',
    '/reports',
    '/reports/low-stock',
    '/reports/maintenance',
    '/roles',
    '/roles/[id]/edit',
    '/roles/new',
    '/settings',
    '/settings/line-customers',
    '/settings/line-users',
    '/settings/system-logs',
    '/stock/adjust',
    '/suppliers',
    '/suppliers/[id]/edit',
    '/suppliers/new',
    '/system-log',
    '/warehouses',
] as const;

type DashboardRoute = typeof DASHBOARD_PAGE_ROUTES[number];
export type PageAccessLevel = 'read' | 'edit';

type RouteRequirement = string | string[];

const ROUTE_REQUIRED_PERMISSIONS: Record<DashboardRoute, RouteRequirement> = {
    '/': PERMISSIONS.DASHBOARD,
    '/admin/reports': PERMISSIONS.ADMIN_REPORTS,
    '/admin/rooms': PERMISSIONS.ADMIN_ROOMS,
    '/admin/security': PERMISSIONS.ADMIN_SECURITY,
    '/api-docs': PERMISSIONS.ADMIN_SETTINGS,
    '/approvals': PERMISSIONS.APPROVALS,
    '/approvals/purchasing': PERMISSIONS.APPROVALS,
    '/approvals/workflows': PERMISSIONS.APPROVALS,
    '/assets': PERMISSIONS.ASSETS,
    '/assets/[id]': PERMISSIONS.ASSETS,
    '/assets/[id]/edit': PERMISSIONS.ASSETS,
    '/assets/new': PERMISSIONS.ASSETS,
    '/audit-log': PERMISSIONS.ADMIN_LOGS,
    '/borrow': PERMISSIONS.BORROW,
    '/borrow/[id]': PERMISSIONS.BORROW,
    '/borrow/new': PERMISSIONS.BORROW,
    '/categories': PERMISSIONS.ADMIN_CATEGORIES,
    '/categories/[id]/edit': PERMISSIONS.ADMIN_CATEGORIES,
    '/categories/new': PERMISSIONS.ADMIN_CATEGORIES,
    '/debug-auth': PERMISSIONS.ADMIN_SECURITY,
    '/general-request': PERMISSIONS.GENERAL_REQUEST,
    '/inventory-audit': PERMISSIONS.ADMIN_AUDIT,
    '/inventory-audit/[id]': PERMISSIONS.ADMIN_AUDIT,
    '/inventory-audit/new': PERMISSIONS.ADMIN_AUDIT,
    '/maintenance': PERMISSIONS.MAINTENANCE,
    '/maintenance/dashboard': PERMISSIONS.MAINTENANCE_DASHBOARD,
    '/maintenance/job-sheet/[id]': PERMISSIONS.MAINTENANCE,
    '/maintenance/part-requests': PERMISSIONS.MAINTENANCE_REQUESTS,
    '/maintenance/parts': PERMISSIONS.MAINTENANCE_PARTS,
    '/maintenance/pm': PERMISSIONS.MAINTENANCE,
    '/maintenance/technicians': PERMISSIONS.MAINTENANCE_TECHNICIANS,
    '/movements': PERMISSIONS.MOVEMENTS,
    '/petty-cash': PERMISSIONS.PETTY_CASH,
    '/petty-cash/[id]/print': PERMISSIONS.PETTY_CASH,
    '/petty-cash/dashboard': PERMISSIONS.PETTY_CASH,
    '/petty-cash/new': PERMISSIONS.PETTY_CASH,
    '/purchase-request': PERMISSIONS.APPROVALS,
    '/products': PERMISSIONS.PRODUCTS,
    '/products/[id]/edit': PERMISSIONS.PRODUCTS,
    '/products/import': PERMISSIONS.PRODUCTS,
    '/products/new': PERMISSIONS.PRODUCTS,
    '/purchase-orders': PERMISSIONS.PO_VIEW,
    '/purchase-orders/[id]': PERMISSIONS.PO_VIEW,
    '/purchase-orders/[id]/edit': PERMISSIONS.PO_EDIT,
    '/purchase-orders/issue': PERMISSIONS.PO_VIEW,
    '/purchase-orders/new': PERMISSIONS.PO_EDIT,
    '/purchase-orders/receive': PERMISSIONS.PO_VIEW,
    '/reports': PERMISSIONS.ADMIN_REPORTS,
    '/reports/low-stock': PERMISSIONS.ADMIN_REPORTS,
    '/reports/maintenance': PERMISSIONS.ADMIN_REPORTS,
    '/roles': PERMISSIONS.ADMIN_ROLES,
    '/roles/[id]/edit': PERMISSIONS.ADMIN_ROLES,
    '/roles/new': PERMISSIONS.ADMIN_ROLES,
    '/settings': PERMISSIONS.ADMIN_SETTINGS,
    '/settings/line-customers': PERMISSIONS.ADMIN_SETTINGS,
    '/settings/line-users': PERMISSIONS.ADMIN_SETTINGS,
    '/settings/system-logs': PERMISSIONS.ADMIN_LOGS,
    '/stock/adjust': PERMISSIONS.STOCK_ADJUST,
    '/suppliers': PERMISSIONS.ADMIN_SUPPLIERS,
    '/suppliers/[id]/edit': PERMISSIONS.ADMIN_SUPPLIERS,
    '/suppliers/new': PERMISSIONS.ADMIN_SUPPLIERS,
    '/system-log': PERMISSIONS.ADMIN_LOGS,
    '/warehouses': PERMISSIONS.ADMIN_WAREHOUSES,
};

const MAIN_LIST_EDIT_ROUTES = new Set<DashboardRoute>([
    '/approvals',
    '/assets',
    '/borrow',
    '/categories',
    '/general-request',
    '/inventory-audit',
    '/maintenance',
    '/maintenance/part-requests',
    '/maintenance/parts',
    '/maintenance/pm',
    '/maintenance/technicians',
    '/petty-cash',
    '/purchase-request',
    '/products',
    '/purchase-orders',
    '/roles',
    '/settings',
    '/settings/line-customers',
    '/settings/line-users',
    '/stock/adjust',
    '/suppliers',
    '/warehouses',
]);

const routeToCategory = (route: string): PermissionItem['category'] => {
    if (route.startsWith('/maintenance') || route === '/general-request') {
        return 'Maintenance';
    }

    if (
        route.startsWith('/admin') ||
        route.startsWith('/roles') ||
        route.startsWith('/settings') ||
        route.startsWith('/reports') ||
        route.startsWith('/inventory-audit') ||
        route === '/audit-log' ||
        route === '/system-log' ||
        route === '/api-docs' ||
        route.startsWith('/debug-auth')
    ) {
        return 'Admin';
    }

    return 'Core';
};

const buildRoutePermissionPrefix = (route: string): string => {
    const normalized = route
        .replace(/\//g, '_')
        .replace(/\[/g, '')
        .replace(/\]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/^_+/, '');

    return `page_${normalized || 'root'}`;
};

export const getPagePermissionKey = (route: string, level: PageAccessLevel): string =>
    `${buildRoutePermissionPrefix(route)}_${level}`;

const PAGE_PERMISSION_LIST: PermissionItem[] = DASHBOARD_PAGE_ROUTES.flatMap((route) => ([
    {
        key: getPagePermissionKey(route, 'read'),
        label: `หน้า ${route} (อ่าน)`,
        description: `อนุญาตให้ดูข้อมูลหน้า ${route}`,
        category: routeToCategory(route),
    },
    {
        key: getPagePermissionKey(route, 'edit'),
        label: `หน้า ${route} (แก้ไข)`,
        description: `อนุญาตให้เพิ่ม/แก้ไขข้อมูลในหน้า ${route}`,
        category: routeToCategory(route),
    },
]));

export const PERMISSION_LIST: PermissionItem[] = [...BASE_PERMISSION_LIST, ...PAGE_PERMISSION_LIST];

export type RolePermissions = Record<string, boolean>;

const ALL_PERMISSION_FALSE: RolePermissions = Object.fromEntries(
    PERMISSION_LIST.map((permission) => [permission.key, false]),
);

const normalizePathname = (pathname: string): string => {
    if (!pathname || pathname === '/') {
        return '/';
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

const routePatternToRegex = (route: DashboardRoute): RegExp => {
    if (route === '/') {
        return /^\/$/;
    }

    const wildcardPlaceholder = '__DYNAMIC_SEGMENT__';
    const escaped = route
        .replace('[id]', wildcardPlaceholder)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(wildcardPlaceholder, '[^/]+');

    return new RegExp(`^${escaped}$`);
};

export const resolveDashboardRoutePattern = (pathname: string): DashboardRoute | null => {
    const normalizedPath = normalizePathname(pathname);

    for (const route of DASHBOARD_PAGE_ROUTES) {
        if (routePatternToRegex(route).test(normalizedPath)) {
            return route;
        }
    }

    return null;
};

const isEditLikeRoute = (route: string): boolean => {
    return route.includes('/new') || route.includes('/edit');
};

const hasDefaultEditAccess = (route: DashboardRoute): boolean => {
    return isEditLikeRoute(route) || MAIN_LIST_EDIT_ROUTES.has(route);
};

export const getRequiredPageAccessLevelForPathname = (pathname: string): PageAccessLevel | null => {
    const routePattern = resolveDashboardRoutePattern(pathname);
    if (!routePattern) {
        return null;
    }

    return isEditLikeRoute(routePattern) ? 'edit' : 'read';
};

export const getPagePermissionKeyForPathname = (
    pathname: string,
    level?: PageAccessLevel
): string | null => {
    const routePattern = resolveDashboardRoutePattern(pathname);
    if (!routePattern) {
        return null;
    }

    const resolvedLevel = level || getRequiredPageAccessLevelForPathname(pathname) || 'read';
    return getPagePermissionKey(routePattern, resolvedLevel);
};

const hasRequiredPermission = (permissions: RolePermissions, required: RouteRequirement): boolean => {
    if (Array.isArray(required)) {
        return required.some((permissionKey) => !!permissions[permissionKey]);
    }

    return !!permissions[required];
};

const applyRouteDefaultPermissions = (permissions: RolePermissions, explicitPermissionKeys: Set<string>): RolePermissions => {
    const merged = { ...permissions };

    for (const route of DASHBOARD_PAGE_ROUTES) {
        const readKey = getPagePermissionKey(route, 'read');
        const editKey = getPagePermissionKey(route, 'edit');
        const canAccessRoute = hasRequiredPermission(merged, ROUTE_REQUIRED_PERMISSIONS[route]);

        if (!explicitPermissionKeys.has(readKey)) {
            merged[readKey] = canAccessRoute;
        }

        if (!explicitPermissionKeys.has(editKey)) {
            merged[editKey] = canAccessRoute && hasDefaultEditAccess(route);
        }
    }

    return merged;
};

const buildRolePermissions = (enabled: RolePermissions): RolePermissions => {
    const explicitPermissionKeys = new Set(Object.keys(enabled));
    const merged = {
        ...ALL_PERMISSION_FALSE,
        ...enabled,
    };

    return applyRouteDefaultPermissions(merged, explicitPermissionKeys);
};

export const DEFAULT_PERMISSIONS: Record<string, RolePermissions> = {
    admin: Object.fromEntries(PERMISSION_LIST.map((permission) => [permission.key, true])),
    manager: {
        ...Object.fromEntries(PERMISSION_LIST.map((permission) => [permission.key, true])),
    },
    technician: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.MAINTENANCE_DASHBOARD]: true,
        [PERMISSIONS.MAINTENANCE_PARTS]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    operation: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.MOVEMENTS]: true,
        [PERMISSIONS.STOCK_ADJUST]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.ASSETS]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.PO_RECEIVE]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    employee: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    general: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.MOVEMENTS]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
    }),
    maid: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    driver: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    accounting: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PETTY_CASH]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.PO_PRINT]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    purchasing: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.ADMIN_SUPPLIERS]: true,
        [PERMISSIONS.MAINTENANCE_REQUESTS]: true,
        [PERMISSIONS.PO_VIEW]: true,
        [PERMISSIONS.PO_EDIT]: true,
        [PERMISSIONS.PO_PRINT]: true,
        [PERMISSIONS.PO_RECEIVE]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
    store: buildRolePermissions({
        [PERMISSIONS.DASHBOARD]: true,
        [PERMISSIONS.PRODUCTS]: true,
        [PERMISSIONS.MOVEMENTS]: true,
        [PERMISSIONS.STOCK_ADJUST]: true,
        [PERMISSIONS.BORROW]: true,
        [PERMISSIONS.GENERAL_REQUEST]: true,
        [PERMISSIONS.MAINTENANCE]: true,
        [PERMISSIONS.PO_RECEIVE]: true,
        [PERMISSIONS.APPROVALS]: true,
    }),
};
