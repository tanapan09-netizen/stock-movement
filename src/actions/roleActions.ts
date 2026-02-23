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
        const roles = await prisma.tbl_roles.findMany({
            orderBy: { role_id: 'asc' }
        });

        // Ensure default roles exist if table is empty
        if (roles.length === 0) {
            await seedDefaultRoles();
            return await getRoles(); // Retry
        }

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
        // For admin, always return the latest permissions from code to ensure they have access to new features
        // if (roleName === 'admin') {
        //     return DEFAULT_PERMISSIONS.admin;
        // }

        const role = await prisma.tbl_roles.findUnique({
            where: { role_name: roleName }
        });

        if (role && role.permissions) {
            return JSON.parse(role.permissions);
        }

        // Fallback to defaults if not found in DB
        return DEFAULT_PERMISSIONS[roleName as keyof typeof DEFAULT_PERMISSIONS] || {};
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

        const role = await prisma.tbl_roles.update({
            where: { role_id: roleId },
            data: {
                permissions: JSON.stringify(permissions)
            }
        });

        // const session = await auth();
        await logSystemAction(
            'UPDATE',
            'Role',
            roleId,
            `Updated permissions for role: ${role.role_name}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
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
 * Seed default roles if table is empty
 */
async function seedDefaultRoles() {
    // console.log('Seeding default roles...');
    const roles = [
        { name: 'admin', desc: 'Administrator - Full Access', is_system: true },
        { name: 'manager', desc: 'Manager - Manage Operations', is_system: true },
        { name: 'technician', desc: 'Technician - Maintenance Tasks', is_system: true },
        { name: 'operation', desc: 'Operation - Warehouse Tasks', is_system: true },
        { name: 'employee', desc: 'Employee - Basic Access', is_system: true },
    ];

    for (const r of roles) {
        const defaultPerms = DEFAULT_PERMISSIONS[r.name] || {};
        await prisma.tbl_roles.upsert({
            where: { role_name: r.name },
            update: {}, // Do nothing if exists
            create: {
                role_name: r.name,
                role_description: r.desc,
                is_system: r.is_system,
                permissions: JSON.stringify(defaultPerms)
            }
        });
    }
}
