import { describe, expect, it } from 'vitest';

import { getPagePermissionKey, PERMISSIONS } from '@/lib/permissions';
import { getApprovalsEntryRedirect, resolveApprovalsManagePageAccess } from '@/lib/approval-page-access';

describe('getApprovalsEntryRedirect', () => {
    it('redirects to manage page when user has manage page access but cannot approve', () => {
        const redirectTarget = getApprovalsEntryRedirect({
            role: 'employee',
            permissions: {
                [getPagePermissionKey('/approvals/manage', 'read')]: true,
            },
            isApprover: false,
        });

        expect(redirectTarget).toBe('/approvals/manage');
    });

    it('redirects purchasing users without general approval rights to purchase workflow', () => {
        const redirectTarget = getApprovalsEntryRedirect({
            role: 'purchasing',
            permissions: {
                [PERMISSIONS.PURCHASING_APPROVALS]: true,
            },
            isApprover: false,
        });

        expect(redirectTarget).toBe('/purchase-request/manage');
    });

    it('keeps regular users on report page when they only have personal approval access', () => {
        const redirectTarget = getApprovalsEntryRedirect({
            role: 'employee',
            permissions: {
                [PERMISSIONS.APPROVALS]: true,
            },
            isApprover: false,
        });

        expect(redirectTarget).toBeNull();
    });
});

describe('resolveApprovalsManagePageAccess', () => {
    it('allows create on manage page for users with page access even without approval permission', () => {
        const access = resolveApprovalsManagePageAccess({
            role: 'employee',
            permissions: {
                [getPagePermissionKey('/approvals/manage', 'read')]: true,
            },
            isApprover: false,
        });

        expect(access).toMatchObject({
            canAccessManagePage: true,
            canApprove: false,
            allowCreate: true,
            redirectTo: null,
        });
    });

    it('sends purchasing users without manage-page access to purchase workflow', () => {
        const access = resolveApprovalsManagePageAccess({
            role: 'purchasing',
            permissions: {
                [PERMISSIONS.PURCHASING_APPROVALS]: true,
            },
            isApprover: false,
        });

        expect(access.redirectTo).toBe('/purchase-request/manage');
        expect(access.allowCreate).toBe(false);
    });
});
