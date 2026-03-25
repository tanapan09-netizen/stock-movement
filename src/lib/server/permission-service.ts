import { DEFAULT_PERMISSIONS, getFullAccessPermissions, type RolePermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { mergePermissionMaps } from '@/lib/rbac';
import { isLockedPermissionRole, normalizeRole } from '@/lib/roles';

export interface PermissionSessionUser {
    role?: string | null;
    id?: string | null;
    is_linked?: boolean | null;
    is_approver?: boolean | null;
}

const parsePermissionMap = (value?: string | null): RolePermissions => {
    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value) as RolePermissions;
    } catch (error) {
        console.error('Failed to parse permission map', error);
        return {};
    }
};

export async function mergeRoleAndCustomPermissions(
    roleName: string | null | undefined,
    customPermissions?: string | null,
): Promise<RolePermissions> {
    return mergePermissionMaps<RolePermissions>(
        await getMergedRolePermissions(roleName),
        parsePermissionMap(customPermissions),
    );
}

export async function getMergedRolePermissions(roleName: string | null | undefined): Promise<RolePermissions> {
    const normalizedRole = normalizeRole(roleName);
    if (isLockedPermissionRole(normalizedRole)) {
        return getFullAccessPermissions();
    }

    const defaultPermissions = DEFAULT_PERMISSIONS[normalizedRole as keyof typeof DEFAULT_PERMISSIONS] || {};

    try {
        const role = await prisma.tbl_roles.findUnique({
            where: { role_name: normalizedRole },
            select: { permissions: true },
        });

        return mergePermissionMaps<RolePermissions>(
            defaultPermissions,
            parsePermissionMap(role?.permissions),
        );
    } catch (error) {
        console.error('Error fetching permissions for role:', normalizedRole, error);
        return defaultPermissions;
    }
}

export async function getMergedUserPermissions(sessionUser?: PermissionSessionUser | null): Promise<RolePermissions> {
    if (!sessionUser) {
        return {};
    }

    if (isLockedPermissionRole(sessionUser.role)) {
        return getFullAccessPermissions();
    }

    if (!sessionUser.id || !sessionUser.is_linked) {
        return getMergedRolePermissions(sessionUser.role);
    }

    try {
        const user = await prisma.tbl_users.findUnique({
            where: { p_id: Number(sessionUser.id) },
            select: { custom_permissions: true },
        });

        return mergeRoleAndCustomPermissions(
            sessionUser.role,
            user?.custom_permissions,
        );
    } catch (error) {
        console.error('Error fetching custom permissions for user:', sessionUser.id, error);
        return getMergedRolePermissions(sessionUser.role);
    }
}

export async function getUserPermissionContext(sessionUser?: PermissionSessionUser | null) {
    return {
        role: normalizeRole(sessionUser?.role),
        isApprover: Boolean(sessionUser?.is_approver),
        permissions: await getMergedUserPermissions(sessionUser),
    };
}
