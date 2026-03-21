'use server';

import { auth } from '@/auth';
import { logSystemAction } from '@/lib/logger';
import { DEFAULT_PERMISSIONS, RolePermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/roles';
import { revalidatePath } from 'next/cache';

const DEFAULT_ROLES = [
    { name: 'owner', desc: 'Owner - Full Access', is_system: true },
    { name: 'admin', desc: 'Administrator - Full Access', is_system: true },
    { name: 'manager', desc: 'Manager - Manage Operations', is_system: true },
    { name: 'leader_technician', desc: 'Leader Technician - หัวหน้าช่างซ่อม', is_system: true },
    { name: 'technician', desc: 'Technician - Maintenance Tasks', is_system: true },
    { name: 'leader_operation', desc: 'Leader Operation - หัวหน้าฝ่ายปฏิบัติการ', is_system: true },
    { name: 'operation', desc: 'Operation - Warehouse Tasks', is_system: true },
    { name: 'leader_employee', desc: 'Leader Employee - หัวหน้าพนักงานทั่วไป', is_system: true },
    { name: 'employee', desc: 'Employee - Basic Access', is_system: true },
    { name: 'leader_general', desc: 'Leader General - หัวหน้าทั่วไป', is_system: false },
    { name: 'general', desc: 'General - ทั่วไป', is_system: false },
    { name: 'leader_maid', desc: 'Leader Maid - หัวหน้าแม่บ้าน', is_system: false },
    { name: 'maid', desc: 'Maid - แม่บ้าน', is_system: false },
    { name: 'leader_driver', desc: 'Leader Driver - หัวหน้าคนขับรถ', is_system: false },
    { name: 'driver', desc: 'Driver - คนขับรถ', is_system: false },
    { name: 'leader_purchasing', desc: 'Leader Purchasing - หัวหน้าจัดซื้อ', is_system: false },
    { name: 'purchasing', desc: 'Purchasing - จัดซื้อ', is_system: false },
    { name: 'leader_accounting', desc: 'Leader Accounting - หัวหน้าบัญชี', is_system: false },
    { name: 'accounting', desc: 'Accounting - บัญชี', is_system: false },
    { name: 'leader_store', desc: 'Leader Store - หัวหน้าคลังสินค้า', is_system: true },
    { name: 'store', desc: 'Store - คลังสินค้า', is_system: true },
] as const;

export async function getRoles() {
    try {
        await seedDefaultRoles();

        const roles = await prisma.tbl_roles.findMany({
            orderBy: { role_id: 'asc' },
        });

        return { success: true, data: roles };
    } catch (error) {
        console.error('Error fetching roles:', error);
        return { success: false, error: 'Failed to fetch roles' };
    }
}

export async function getRolePermissions(roleName: string): Promise<RolePermissions> {
    try {
        const defaultPermissions = DEFAULT_PERMISSIONS[roleName as keyof typeof DEFAULT_PERMISSIONS] || {};
        const role = await prisma.tbl_roles.findUnique({
            where: { role_name: roleName },
        });

        if (role?.permissions) {
            try {
                const dbPermissions = JSON.parse(role.permissions);
                return { ...defaultPermissions, ...dbPermissions };
            } catch {
                return defaultPermissions;
            }
        }

        return defaultPermissions;
    } catch (error) {
        console.error('Error fetching permissions for role:', roleName, error);
        return {};
    }
}

export async function updateRolePermissions(roleId: number, permissions: RolePermissions) {
    try {
        const session = await auth();
        if (!session || !isAdminRole((session.user as { role?: string })?.role)) {
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        const oldRole = await prisma.tbl_roles.findUnique({
            where: { role_id: roleId },
            select: { role_name: true, permissions: true },
        });

        const role = await prisma.tbl_roles.update({
            where: { role_id: roleId },
            data: {
                permissions: JSON.stringify(permissions),
            },
        });

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
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'unknown',
        );

        revalidatePath('/roles');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Error updating role permissions:', error);
        return { success: false, error: 'Failed to update permissions' };
    }
}

async function seedDefaultRoles() {
    for (const role of DEFAULT_ROLES) {
        try {
            const defaultPerms = DEFAULT_PERMISSIONS[role.name] || {};
            await prisma.tbl_roles.upsert({
                where: { role_name: role.name },
                update: {},
                create: {
                    role_name: role.name,
                    role_description: role.desc,
                    is_system: role.is_system,
                    permissions: JSON.stringify(defaultPerms),
                },
            });
        } catch (err) {
            console.error(`[seedDefaultRoles] Failed to upsert role "${role.name}":`, err);
        }
    }
}
