import { describe, expect, it } from 'vitest';

import { getPagePermissionKey, PERMISSIONS } from '@/lib/permissions';
import { getApprovalsEntryRedirect, resolveApprovalsManagePageAccess } from '@/lib/approval-page-access';

describe('getApprovalsEntryRedirect', () => {
    it('does not redirect non-manager roles to manage page even if permission key exists', () => {
        const redirectTarget = getApprovalsEntryRedirect({
            role: 'employee',
            permissions: {
                [getPagePermissionKey('/approvals/manage', 'read')]: true,
            },
            isApprover: false,
        });

        expect(redirectTarget).toBeNull();
    });

    it('keeps non-manager purchasing users on requester page', () => {
        const redirectTarget = getApprovalsEntryRedirect({
            role: 'purchasing',
            permissions: {
                [PERMISSIONS.PURCHASING_APPROVALS]: true,
            },
            isApprover: false,
        });

        expect(redirectTarget).toBeNull();
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
    it('allows manager role to stay on manage page', () => {
        const access = resolveApprovalsManagePageAccess({
            role: 'manager',
            permissions: {
                [getPagePermissionKey('/approvals/manage', 'read')]: true,
                [PERMISSIONS.APPROVALS]: true,
            },
            isApprover: false,
        });

        expect(access).toMatchObject({
            canAccessManagePage: true,
            canApprove: true,
            allowCreate: true,
            redirectTo: null,
        });
    });

    it('forces non-manager roles back to requester page even if permission key exists', () => {
        const access = resolveApprovalsManagePageAccess({
            role: 'employee',
            permissions: {
                [getPagePermissionKey('/approvals/manage', 'read')]: true,
            },
            isApprover: false,
        });

        expect(access).toMatchObject({
            canAccessManagePage: false,
            canApprove: false,
            allowCreate: false,
            redirectTo: '/approvals',
        });
    });

    it('sends purchasing users without manager role back to requester page', () => {
        const access = resolveApprovalsManagePageAccess({
            role: 'purchasing',
            permissions: {
                [PERMISSIONS.PURCHASING_APPROVALS]: true,
            },
            isApprover: false,
        });

        expect(access.redirectTo).toBe('/approvals');
        expect(access.allowCreate).toBe(false);
    });
});
