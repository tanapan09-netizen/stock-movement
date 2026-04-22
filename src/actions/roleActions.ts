'use server';

import { auth } from '@/auth';
import { logSystemAction } from '@/lib/logger';
import { DEFAULT_PERMISSIONS, getFullAccessPermissions, RolePermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { canManageAdminRoles, canViewAdminRoles } from '@/lib/rbac';
import { isLockedPermissionRole } from '@/lib/roles';
import {
    getMergedRolePermissions,
    getUserPermissionContext,
    type PermissionSessionUser,
} from '@/lib/server/permission-service';
import { revalidatePath } from 'next/cache';

const DEFAULT_ROLES = [
    { name: 'owner', desc: 'Owner - Full Access', is_system: true },
    { name: 'admin', desc: 'Administrator - Full Access', is_system: true },
    { name: 'manager', desc: 'Manager - Manage Operations', is_system: true },
    { name: 'leader_technician', desc: 'Leader Technician', is_system: true },
    { name: 'technician', desc: 'Technician - Maintenance Tasks', is_system: true },
    { name: 'leader_operation', desc: 'Leader Operation', is_system: true },
    { name: 'operation', desc: 'Operation - Warehouse Tasks', is_system: true },
    { name: 'leader_employee', desc: 'Leader Employee', is_system: true },
    { name: 'employee', desc: 'Employee - Basic Access', is_system: true },
    { name: 'leader_general', desc: 'Leader General', is_system: false },
    { name: 'general', desc: 'General', is_system: false },
    { name: 'leader_maid', desc: 'Leader Maid', is_system: false },
    { name: 'maid', desc: 'Maid', is_system: false },
    { name: 'leader_gardener', desc: 'Leader Gardener', is_system: false },
    { name: 'gardener', desc: 'Gardener', is_system: false },
    { name: 'leader_driver', desc: 'Leader Driver', is_system: false },
    { name: 'driver', desc: 'Driver', is_system: false },
    { name: 'leader_purchasing', desc: 'Leader Purchasing', is_system: false },
    { name: 'purchasing', desc: 'Purchasing', is_system: false },
    { name: 'leader_accounting', desc: 'Leader Accounting', is_system: false },
    { name: 'accounting', desc: 'Accounting', is_system: false },
    { name: 'leader_store', desc: 'Leader Store', is_system: true },
    { name: 'store', desc: 'Store', is_system: true },
] as const;

export async function getRoles() {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
        if (!canViewAdminRoles(permissionContext.role, permissionContext.permissions)) {
            return { success: false, error: 'ไม่มีสิทธิ์เข้าถึงหน้าจัดการสิทธิ์' };
        }

        await seedDefaultRoles();

        const roles = await prisma.tbl_roles.findMany({
            orderBy: { role_id: 'asc' },
        });

        return {
            success: true,
            data: roles.map((role) => (
                isLockedPermissionRole(role.role_name)
                    ? { ...role, permissions: JSON.stringify(getFullAccessPermissions()) }
                    : role
            )),
        };
    } catch (error) {
        console.error('Error fetching roles:', error);
        return { success: false, error: 'ไม่สามารถโหลดข้อมูล role ได้' };
    }
}

export async function getRolePermissions(roleName: string): Promise<RolePermissions> {
    const session = await auth();
    if (!session?.user) {
        return {};
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    if (!canViewAdminRoles(permissionContext.role, permissionContext.permissions)) {
        return {};
    }

    return getMergedRolePermissions(roleName);
}

export async function updateRolePermissions(roleId: number, permissions: RolePermissions) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'ไม่มีสิทธิ์ใช้งาน ต้องเป็นผู้ดูแลระบบ' };
        }

        const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
        if (!canManageAdminRoles(permissionContext.role, permissionContext.permissions)) {
            return { success: false, error: 'ไม่มีสิทธิ์จัดการ role และสิทธิ์' };
        }

        const oldRole = await prisma.tbl_roles.findUnique({
            where: { role_id: roleId },
            select: { role_name: true, permissions: true },
        });
        if (!oldRole) {
            return { success: false, error: 'ไม่พบ role ที่ต้องการแก้ไข' };
        }

        const effectivePermissions = isLockedPermissionRole(oldRole.role_name)
            ? getFullAccessPermissions()
            : permissions;

        const role = await prisma.tbl_roles.update({
            where: { role_id: roleId },
            data: {
                permissions: JSON.stringify(effectivePermissions),
            },
        });

        const oldPerms: RolePermissions = oldRole.permissions ? JSON.parse(oldRole.permissions) : {};
        const enabledKeys = Object.keys(effectivePermissions).filter((key) => effectivePermissions[key] === true && !oldPerms[key]);
        const disabledKeys = Object.keys(oldPerms).filter((key) => oldPerms[key] === true && !effectivePermissions[key]);

        const changeDetail = [
            enabledKeys.length > 0 ? `เปิดใช้: ${enabledKeys.join(', ')}` : '',
            disabledKeys.length > 0 ? `ปิดใช้: ${disabledKeys.join(', ')}` : '',
        ].filter(Boolean).join(' | ') || 'ไม่มีการเปลี่ยนแปลงสิทธิ์';

        await logSystemAction(
            'UPDATE_ROLE_PERMISSIONS',
            'Role',
            roleId,
            `อัปเดตสิทธิ์ของ role ${role.role_name} | ${changeDetail} | แก้ไขโดย ${session.user.name}`,
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'role_management',
        );

        revalidatePath('/roles');
        revalidatePath('/', 'layout');
        return { success: true, locked: isLockedPermissionRole(oldRole.role_name) };
    } catch (error) {
        console.error('Error updating role permissions:', error);
        return { success: false, error: 'ไม่สามารถอัปเดตสิทธิ์ได้' };
    }
}

async function seedDefaultRoles() {
    for (const role of DEFAULT_ROLES) {
        try {
            const defaultPerms = DEFAULT_PERMISSIONS[role.name] || {};
            await prisma.tbl_roles.upsert({
                where: { role_name: role.name },
                update: role.name === 'admin'
                    ? { permissions: JSON.stringify(getFullAccessPermissions()) }
                    : {},
                create: {
                    role_name: role.name,
                    role_description: role.desc,
                    is_system: role.is_system,
                    permissions: JSON.stringify(role.name === 'admin' ? getFullAccessPermissions() : defaultPerms),
                },
            });
        } catch (error) {
            console.error(`[seedDefaultRoles] Failed to upsert role "${role.name}":`, error);
        }
    }
}
