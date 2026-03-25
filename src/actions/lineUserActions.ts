/**
 * LINE User Management Actions
 * Server actions for managing LINE users and approvers
 */

'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logSystemAction } from '@/lib/logger';
import {
    canManageAdminSecurity,
    canReceiveApprovalRequestNotification,
    canReceiveApprovalStepNotification,
    canReceiveDailySummary,
    mergePermissionMaps,
    type PagePermissionMap,
} from '@/lib/rbac';
import { DEFAULT_PERMISSIONS, type RolePermissions } from '@/lib/permissions';
import { normalizeRole } from '@/lib/roles';
import { getUserPermissionContext } from '@/lib/server/permission-service';

async function getLineUserAdminContext() {
    const session = await auth();
    if (!session?.user) {
        return null;
    }

    const permissionContext = await getUserPermissionContext(session.user);
    if (!canManageAdminSecurity(permissionContext.role, permissionContext.permissions)) {
        return null;
    }

    return {
        session,
        ...permissionContext,
    };
}

/**
 * Get LINE user ID by username
 */
export async function getLineIdByUsername(username: string): Promise<string | null> {
    try {
        const user = await prisma.tbl_users.findUnique({
            where: { username },
            select: { line_user_id: true }
        });
        return user?.line_user_id || null;
    } catch (error) {
        console.error('Error fetching LINE ID by username:', error);
        return null;
    }
}

/**
 * Get all LINE users
 */
export async function getLineUsers() {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

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

export async function getDailySummaryLineIds(): Promise<string[]> {
    try {
        return await collectEligibleLineIds((role, permissions) =>
            canReceiveDailySummary(role, permissions)
        );
    } catch (error) {
        console.error('Error fetching LINE IDs for daily summary:', error);
        return [];
    }
}

async function collectEligibleLineIds(
    predicate: (role: string, permissions: PagePermissionMap) => boolean,
): Promise<string[]> {
    const userRows = await prisma.tbl_users.findMany({
        where: {
            line_user_id: { not: null },
        },
        select: {
            role: true,
            custom_permissions: true,
            line_user_id: true,
        },
    });

    const lineUserRows = await prisma.tbl_line_users.findMany({
        where: {
            is_active: true,
            line_user_id: { not: '' },
        },
        select: {
            role: true,
            line_user_id: true,
        },
    });

    const ids = new Set<string>();

    userRows.forEach((user) => {
        const normalizedRole = normalizeRole(user.role);
        const defaultPermissions = DEFAULT_PERMISSIONS[normalizedRole] || {};
        let customPermissions: RolePermissions = {};

        if (user.custom_permissions) {
            try {
                customPermissions = JSON.parse(user.custom_permissions) as RolePermissions;
            } catch (error) {
                console.error('Failed to parse custom permissions for LINE recipient:', error);
            }
        }

        const mergedPermissions = mergePermissionMaps<PagePermissionMap>(
            defaultPermissions,
            customPermissions,
        );

        if (user.line_user_id && predicate(normalizedRole, mergedPermissions)) {
            ids.add(user.line_user_id);
        }
    });

    lineUserRows.forEach((user) => {
        const normalizedRole = normalizeRole(user.role);
        const defaultPermissions = (DEFAULT_PERMISSIONS[normalizedRole] || {}) as PagePermissionMap;

        if (predicate(normalizedRole, defaultPermissions)) {
            ids.add(user.line_user_id);
        }
    });

    return Array.from(ids);
}

export async function getApprovalRecipientLineIds(requestType: string): Promise<string[]> {
    try {
        return await collectEligibleLineIds((role, permissions) =>
            canReceiveApprovalRequestNotification(role, permissions, requestType)
        );
    } catch (error) {
        console.error('Error fetching LINE IDs for approval recipients:', error);
        return [];
    }
}

export async function getApprovalStepLineIds(approverRole: string): Promise<string[]> {
    try {
        return await collectEligibleLineIds((role, permissions) =>
            canReceiveApprovalStepNotification(role, permissions, approverRole)
        );
    } catch (error) {
        console.error('Error fetching LINE IDs for approval step recipients:', error);
        return [];
    }
}

/**
 * Toggle approver status
 */
export async function toggleApprover(id: number, isApprover: boolean) {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
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
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
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
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name || 'System',
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error updating role:', error);
        return { success: false, error: 'Failed to update role' };
    }
}

/**
 * Update LINE user full name
 */
export async function updateLineUserFullName(id: number, fullName: string) {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.tbl_line_users.update({
            where: { id },
            data: { full_name: fullName || null },
        });

        revalidatePath('/settings/line-users');

        await logSystemAction(
            'UPDATE',
            'LineUser',
            id,
            `Updated full name to ${fullName}`,
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name || 'System',
            'unknown'
        );

        return { success: true };
    } catch (error) {
        console.error('Error updating full name:', error);
        return { success: false, error: 'Failed to update full name' };
    }
}

/**
 * Delete LINE user
 */
export async function deleteLineUser(id: number) {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
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
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
            'unknown'
        );

        revalidatePath('/settings/line-users');
        return { success: true };
    } catch (error) {
        console.error('Error deleting LINE user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}

/**
 * Refresh LINE user profile pictures from LINE API
 * Call this when pictures are broken/expired
 */
export async function refreshLineUserProfiles() {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const { getUserProfile } = await import('@/lib/notifications/lineMessaging');

        const users = await prisma.tbl_line_users.findMany({
            select: { id: true, line_user_id: true },
        });

        let updated = 0;
        let failed = 0;

        for (const user of users) {
            try {
                const profile = await getUserProfile(user.line_user_id);
                if (profile) {
                    await prisma.tbl_line_users.update({
                        where: { id: user.id },
                        data: {
                            display_name: profile.displayName || undefined,
                            picture_url: profile.pictureUrl || undefined,
                        },
                    });
                    updated++;
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        revalidatePath('/settings/line-users');

        return {
            success: true,
            updated,
            failed,
            message: `อัปเดตรูปสำเร็จ ${updated} คน, ล้มเหลว ${failed} คน`
        };
    } catch (error) {
        console.error('Error refreshing user profiles:', error);
        return { success: false, error: 'Failed to refresh profiles' };
    }
}
