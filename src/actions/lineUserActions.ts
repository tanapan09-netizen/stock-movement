/**
 * LINE User Management Actions
 * Server actions for managing LINE users and approvers
 */

'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logSystemAction } from '@/lib/logger';

/**
 * Get all LINE users
 */
export async function getLineUsers() {
    try {
        const users = await prisma.tbl_line_users.findMany({
            orderBy: [
                { is_approver: 'desc' },
                { created_at: 'desc' },
            ],
        });

        return { success: true, data: users };
    } catch (error) {
        console.error('Error fetching LINE users:', error);
        return { success: false, error: 'Failed to fetch LINE users' };
    }
}

/**
 * Get approver LINE user IDs
 */
export async function getApproverLineIds(): Promise<string[]> {
    try {
        const approvers = await prisma.tbl_line_users.findMany({
            where: {
                is_approver: true,
                is_active: true,
            },
            select: {
                line_user_id: true,
            },
        });

        return approvers.map(a => a.line_user_id);
    } catch (error) {
        console.error('Error fetching approver LINE IDs:', error);
        return [];
    }
}

/**
 * Get LINE user IDs by specific roles
 */
export async function getLineIdsByRoles(roles: string[]): Promise<string[]> {
    try {
        const users = await prisma.tbl_line_users.findMany({
            where: {
                role: { in: roles },
                is_active: true,
            },
            select: {
                line_user_id: true,
            },
        });

        return users.map(u => u.line_user_id);
    } catch (error) {
        console.error('Error fetching LINE IDs by roles:', error);
        return [];
    }
}

/**
 * Toggle approver status
 */
export async function toggleApprover(id: number, isApprover: boolean) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.tbl_line_users.update({
            where: { id },
            data: { is_approver: isApprover },
        });

        revalidatePath('/settings/line-users');

        await logSystemAction(
            'UPDATE',
            'LineUser',
            id,
            `Toggled approver status to ${isApprover}`,
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error toggling approver:', error);
        return { success: false, error: 'Failed to update approver status' };
    }
}

/**
 * Toggle active status
 */
export async function toggleLineUserActive(id: number, isActive: boolean) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.tbl_line_users.update({
            where: { id },
            data: { is_active: isActive },
        });

        revalidatePath('/settings/line-users');

        await logSystemAction(
            'UPDATE',
            'LineUser',
            id,
            `Toggled active status to ${isActive}`,
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error toggling active status:', error);
        return { success: false, error: 'Failed to update active status' };
    }
}

/**
 * Update LINE user role
 */
export async function updateLineUserRole(id: number, role: string) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.tbl_line_users.update({
            where: { id },
            data: { role },
        });

        revalidatePath('/settings/line-users');

        await logSystemAction(
            'UPDATE',
            'LineUser',
            id,
            `Updated role to ${role}`,
            parseInt(session.user.id || '0'),
            session.user.name || 'System',
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error updating role:', error);
        return { success: false, error: 'Failed to update role' };
    }
}

/**
 * Delete LINE user
 */
export async function deleteLineUser(id: number) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.tbl_line_users.delete({
            where: { id },
        });

        await logSystemAction(
            'DELETE',
            'LineUser',
            id,
            'Deleted LINE user',
            parseInt(session.user.id || '0'),
            session.user.name,
            'unknown'
        );

        revalidatePath('/settings/line-users');
        return { success: true };
    } catch (error) {
        console.error('Error deleting LINE user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}
