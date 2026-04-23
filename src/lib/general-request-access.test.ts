import { describe, expect, it } from 'vitest';

import { getPagePermissionKey } from '@/lib/permissions';
import { resolveGeneralRequestAccess } from '@/lib/rbac';

describe('resolveGeneralRequestAccess', () => {
    it('allows create when user can read general-request page', () => {
        const access = resolveGeneralRequestAccess('employee', {
            [getPagePermissionKey('/general-request', 'read')]: true,
        });

        expect(access.canViewPage).toBe(true);
        expect(access.canCreate).toBe(true);
        expect(access.canEditPage).toBe(false);
    });

    it('allows create for manager role even without explicit page keys', () => {
        const access = resolveGeneralRequestAccess('manager', {});

        expect(access.canViewPage).toBe(true);
        expect(access.canCreate).toBe(true);
        expect(access.canEditPage).toBe(true);
    });

    it('allows leader_employee to edit general request page', () => {
        const access = resolveGeneralRequestAccess('leader_employee', {});

        expect(access.canViewPage).toBe(true);
        expect(access.canCreate).toBe(true);
        expect(access.canEditPage).toBe(true);
    });

    it('denies create when role and page permissions do not allow page access', () => {
        const access = resolveGeneralRequestAccess('store', {});

        expect(access.canViewPage).toBe(false);
        expect(access.canCreate).toBe(false);
    });
});
