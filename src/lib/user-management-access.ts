import { canDeleteUserWithRole, isLockedPermissionRole } from '@/lib/roles';

interface UserManagementActionInput {
    targetRole?: string | null;
    targetUserId?: number | null;
    currentUserId?: number | null;
}

export function resolveUserManagementActionState(input: UserManagementActionInput) {
    const isRoleLocked = isLockedPermissionRole(input.targetRole);
    const isSelfLockedRole = Boolean(
        isRoleLocked
        && input.targetUserId
        && input.currentUserId
        && input.targetUserId === input.currentUserId,
    );

    return {
        isRoleLocked,
        isSelfLockedRole,
        canOpenEdit: true,
        canChangeRole: !isSelfLockedRole,
        canDelete: canDeleteUserWithRole(input.targetRole),
    };
}
