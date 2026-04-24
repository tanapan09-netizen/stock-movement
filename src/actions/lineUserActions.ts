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
import { provisionLineUserLinkByRowId } from '@/lib/server/auth-user';

function sanitizeUsernameCandidate(value: string) {
    return value
        .normalize('NFKC')
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}._-]/gu, '')
        .replace(/^[_\-.]+|[_\-.]+$/g, '')
        .slice(0, 50);
}

async function buildSyncedLinkedUsername(lineUser: {
    id: number;
    display_name: string | null;
    full_name: string | null;
}, currentUserId: number, currentUsername: string) {
    const preferredName = lineUser.full_name?.trim() || lineUser.display_name?.trim();
    if (!preferredName) {
        return currentUsername;
    }

    const baseUsername = sanitizeUsernameCandidate(preferredName) || currentUsername;
    const suffix = `_line${lineUser.id}`;
    let username = baseUsername;
    let attempt = 0;

    while (true) {
        const existingUser = await prisma.tbl_users.findUnique({
            where: { username },
            select: { p_id: true },
        });

        if (!existingUser || existingUser.p_id === currentUserId) {
            return username;
        }

        attempt += 1;
        const indexedSuffix = `${suffix}_${attempt}`;
        username = `${baseUsername.slice(0, Math.max(1, 50 - indexedSuffix.length))}${indexedSuffix}`;
    }
}

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

        const linkedUsers = await prisma.tbl_users.findMany({
            where: {
                OR: [
                    { p_id: { in: users.map((user) => user.user_id).filter((value): value is number => typeof value === 'number') } },
                    { line_user_id: { in: users.map((user) => user.line_user_id).filter(Boolean) } },
                ],
            },
            select: {
                p_id: true,
                username: true,
                role: true,
                line_user_id: true,
            },
        });

        const linkedById = new Map(linkedUsers.map((user) => [user.p_id, user]));
        const linkedByLineId = new Map(linkedUsers.map((user) => [user.line_user_id, user]));
        const data = users.map((user) => ({
            ...user,
            linked_user: (typeof user.user_id === 'number' ? linkedById.get(user.user_id) : undefined)
                || linkedByLineId.get(user.line_user_id)
                || null,
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching LINE users:', error);
        return { success: false, error: 'Failed to fetch LINE users' };
    }
}

export async function provisionLineUserAccount(id: number) {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const lineUser = await prisma.tbl_line_users.findUnique({
            where: { id },
            select: {
                id: true,
                role: true,
                display_name: true,
                full_name: true,
                user_id: true,
            },
        });

        if (!lineUser) {
            return { success: false, error: 'LINE user not found' };
        }

        if (normalizeRole(lineUser.role) === 'pending') {
            return { success: false, error: 'กรุณากำหนด role ให้ LINE user ก่อน provision' };
        }

        const linkedUserId = await provisionLineUserLinkByRowId(id);
        if (!linkedUserId) {
            return { success: false, error: 'ไม่สามารถสร้างหรือผูก user ระบบให้ LINE account นี้ได้' };
        }

        const linkedUser = await prisma.tbl_users.findUnique({
            where: { p_id: linkedUserId },
            select: {
                p_id: true,
                username: true,
                role: true,
                line_user_id: true,
            },
        });

        revalidatePath('/settings/line-users');

        await logSystemAction(
            'UPDATE',
            'LineUser',
            id,
            `Provisioned LINE user ${lineUser.full_name || lineUser.display_name || id} to system user ${linkedUser?.username || linkedUserId}`,
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name,
            'unknown'
        );

        return { success: true, data: linkedUser };
    } catch (error) {
        console.error('Error provisioning LINE user account:', error);
        return { success: false, error: 'Failed to provision LINE user account' };
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

export async function getManagerSummaryLineIds(): Promise<string[]> {
    try {
        return await collectEligibleLineIds((role) => {
            const normalizedRole = normalizeRole(role);
            return normalizedRole === 'manager';
        });
    } catch (error) {
        console.error('Error fetching LINE IDs for manager summary:', error);
        return [];
    }
}

export async function getSummaryLineIdsByRoles(roles: string[]): Promise<string[]> {
    try {
        const normalizedTargetRoles = new Set(
            roles
                .map((role) => normalizeRole(role))
                .filter((role) => role.length > 0),
        );

        if (normalizedTargetRoles.size === 0) {
            return [];
        }

        return await collectEligibleLineIds((role) => normalizedTargetRoles.has(normalizeRole(role)));
    } catch (error) {
        console.error('Error fetching LINE IDs by summary roles:', error);
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

export async function syncLinkedLineUserAccount(id: number) {
    try {
        const authContext = await getLineUserAdminContext();
        if (!authContext?.session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const lineUser = await prisma.tbl_line_users.findUnique({
            where: { id },
            select: {
                id: true,
                user_id: true,
                line_user_id: true,
                display_name: true,
                full_name: true,
                role: true,
            },
        });

        if (!lineUser?.user_id) {
            return { success: false, error: 'LINE user นี้ยังไม่มี System Link' };
        }

        const linkedUser = await prisma.tbl_users.findUnique({
            where: { p_id: lineUser.user_id },
            select: {
                p_id: true,
                username: true,
                role: true,
                line_user_id: true,
            },
        });

        if (!linkedUser) {
            return { success: false, error: 'ไม่พบผู้ใช้ระบบที่เชื่อมอยู่' };
        }

        const normalizedRole = normalizeRole(lineUser.role);
        if (!normalizedRole || normalizedRole === 'pending') {
            return { success: false, error: 'กรุณากำหนด Department Role ก่อน sync System Link' };
        }

        const nextUsername = await buildSyncedLinkedUsername(lineUser, linkedUser.p_id, linkedUser.username);
        const roleRecord = await prisma.tbl_roles.findUnique({
            where: { role_name: normalizedRole },
            select: { role_id: true },
        });

        const changes: string[] = [];
        if (linkedUser.username !== nextUsername) {
            changes.push(`ชื่อ: ${linkedUser.username} -> ${nextUsername}`);
        }
        if (normalizeRole(linkedUser.role) !== normalizedRole) {
            changes.push(`Role: ${normalizeRole(linkedUser.role) || '-'} -> ${normalizedRole}`);
        }
        if ((linkedUser.line_user_id || null) !== (lineUser.line_user_id || null)) {
            changes.push('LINE Link');
        }

        const updatedLinkedUser = await prisma.tbl_users.update({
            where: { p_id: linkedUser.p_id },
            data: {
                username: nextUsername,
                role: normalizedRole,
                role_id: roleRecord?.role_id ?? null,
                line_user_id: lineUser.line_user_id,
            },
            select: {
                p_id: true,
                username: true,
                role: true,
                line_user_id: true,
            },
        });

        revalidatePath('/settings/line-users');

        await logSystemAction(
            'UPDATE',
            'LineUser',
            id,
            `Synced linked system user ${updatedLinkedUser.username} from LINE user ${lineUser.full_name || lineUser.display_name || id}${changes.length ? ` (${changes.join(', ')})` : ''}`,
            (parseInt(authContext.session.user.id as string) || 0),
            authContext.session.user.name || 'System',
            'unknown'
        );

        return {
            success: true,
            data: updatedLinkedUser,
            changes,
            message: changes.length > 0
                ? `อัปเดต System Link แล้ว: ${changes.join(', ')}`
                : 'System Link เป็นข้อมูลล่าสุดอยู่แล้ว',
        };
    } catch (error) {
        console.error('Error syncing linked LINE user account:', error);
        return { success: false, error: 'Failed to sync linked system user' };
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
