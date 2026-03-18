'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DEFAULT_PERMISSIONS, RolePermissions } from '@/lib/permissions';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';

/**
 * Get all roles with their permissions
 */
export async function getRoles() {
    try {
        // Ensure all default roles exist (upsert won't modify existing ones)
        await seedDefaultRoles();

        const roles = await prisma.tbl_roles.findMany({
            orderBy: { role_id: 'asc' }
        });

        return { success: true, data: roles };
    } catch (error) {
        console.error('Error fetching roles:', error);
        return { success: false, error: 'Failed to fetch roles' };
    }
}

/**
 * Get permissions for a specific role name (cached/optimized)
 * Used by layout/sidebar
 */
export async function getRolePermissions(roleName: string): Promise<RolePermissions> {
    try {
        const defaultPermissions = DEFAULT_PERMISSIONS[roleName as keyof typeof DEFAULT_PERMISSIONS] || {};

        const role = await prisma.tbl_roles.findUnique({
            where: { role_name: roleName }
        });

        if (role && role.permissions) {
            try {
                const dbPermissions = JSON.parse(role.permissions);
                // Ensure new permission keys always exist (especially page-level keys)
                return { ...defaultPermissions, ...dbPermissions };
            } catch {
                return defaultPermissions;
            }
        }

        // Fallback to defaults if not found in DB
        return defaultPermissions;
    } catch (error) {
        console.error('Error fetching permissions for role:', roleName, error);
        return {};
    }
}

/**
 * Update permissions for a role
 */
export async function updateRolePermissions(roleId: number, permissions: RolePermissions) {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || (session.user as any).role !== 'admin') {
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        // Get old permissions for comparison
        const oldRole = await prisma.tbl_roles.findUnique({
            where: { role_id: roleId },
            select: { role_name: true, permissions: true }
        });

        const role = await prisma.tbl_roles.update({
            where: { role_id: roleId },
            data: {
                permissions: JSON.stringify(permissions)
            }
        });

        // Count changes for logging
        const oldPerms: RolePermissions = oldRole?.permissions ? JSON.parse(oldRole.permissions) : {};
        const enabledKeys = Object.keys(permissions).filter((key) => permissions[key] === true && !oldPerms[key]);
        const disabledKeys = Object.keys(oldPerms).filter((key) => oldPerms[key] === true && !permissions[key]);

        const changeDetail = [
            enabledKeys.length > 0 ? `เปิด: ${enabledKeys.join(', ')}` : '',
            disabledKeys.length > 0 ? `ปิด: ${disabledKeys.join(', ')}` : '',
        ].filter(Boolean).join(' | ') || 'ไม่มีการเปลี่ยนแปลง';

        await logSystemAction(
            'แก้ไขสิทธิ์',
            'Role',
            roleId,
            `แก้ไขสิทธิ์ของ Role: ${role.role_name} | ${changeDetail} | แก้ไขโดย: ${session.user.name}`,
            session?.user?.id ? (parseInt(session.user.id as string) || 0) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );

        revalidatePath('/roles');
        revalidatePath('/', 'layout'); // Revalidate everything to update sidebar
        return { success: true };
    } catch (error) {
        console.error('Error updating role permissions:', error);
        return { success: false, error: 'Failed to update permissions' };
    }
}

/**
 * Seed default roles if they don't exist yet
 */
async function seedDefaultRoles() {
    const roles = [
        { name: 'admin', desc: 'Administrator - Full Access', is_system: true },
        { name: 'manager', desc: 'Manager - Manage Operations', is_system: true },
        { name: 'technician', desc: 'Technician - Maintenance Tasks', is_system: true },
        { name: 'operation', desc: 'Operation - Warehouse Tasks', is_system: true },
        { name: 'employee', desc: 'Employee - Basic Access', is_system: true },
        { name: 'general', desc: 'General - ทั่วไป', is_system: false },
        { name: 'maid', desc: 'Maid - แม่บ้าน', is_system: false },
        { name: 'driver', desc: 'Driver - คนขับรถ', is_system: false },
        { name: 'purchasing', desc: 'Purchasing - จัดซื้อ', is_system: false },
        { name: 'accounting', desc: 'Accounting - บัญชี', is_system: false },
        { name: 'store', desc: 'Store - คลังสินค้า', is_system: true },
    ];

    for (const r of roles) {
        try {
            const defaultPerms = DEFAULT_PERMISSIONS[r.name] || {};
            await prisma.tbl_roles.upsert({
                where: { role_name: r.name },
                update: {},
                create: {
                    role_name: r.name,
                    role_description: r.desc,
                    is_system: r.is_system,
                    permissions: JSON.stringify(defaultPerms)
                }
            });
        } catch (err) {
            console.error(`[seedDefaultRoles] Failed to upsert role "${r.name}":`, err);
        }
    }
}
