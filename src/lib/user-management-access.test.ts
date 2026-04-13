import { describe, expect, it } from 'vitest';

import { resolveUserManagementActionState } from '@/lib/user-management-access';

describe('resolveUserManagementActionState', () => {
    it('allows opening edit for own admin account but keeps role locked and non-deletable', () => {
        const state = resolveUserManagementActionState({
            targetRole: 'admin',
            targetUserId: 7,
            currentUserId: 7,
        });

        expect(state).toEqual({
            isRoleLocked: true,
            isSelfLockedRole: true,
            canOpenEdit: true,
            canChangeRole: false,
            canDelete: false,
        });
    });

    it('allows changing role for other locked-role accounts from the management screen', () => {
        const state = resolveUserManagementActionState({
            targetRole: 'admin',
            targetUserId: 8,
            currentUserId: 7,
        });

        expect(state).toEqual({
            isRoleLocked: true,
            isSelfLockedRole: false,
            canOpenEdit: true,
            canChangeRole: true,
            canDelete: false,
        });
    });

    it('keeps regular users editable and deletable', () => {
        const state = resolveUserManagementActionState({
            targetRole: 'employee',
            targetUserId: 10,
            currentUserId: 7,
        });

        expect(state).toEqual({
            isRoleLocked: false,
            isSelfLockedRole: false,
            canOpenEdit: true,
            canChangeRole: true,
            canDelete: true,
        });
    });
});
