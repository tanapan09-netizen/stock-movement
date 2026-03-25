import { normalizeRole, ROLE_OPTIONS } from '@/lib/roles';

export const PENDING_LINE_USER_ROLE = 'pending';
export const LINE_USER_ROLE_OPTIONS = [
    { value: PENDING_LINE_USER_ROLE, label: 'Pending (waiting for assignment)' },
    ...ROLE_OPTIONS,
] as const;

export interface LineUserRoleLike {
    role?: string | null;
}

export function isPendingLineUserRole(role?: string | null) {
    return normalizeRole(role) === PENDING_LINE_USER_ROLE;
}

export function partitionLineUsersByAssignment<T extends LineUserRoleLike>(users: T[]) {
    return users.reduce<{ pending: T[]; assigned: T[] }>(
        (groups, user) => {
            if (isPendingLineUserRole(user.role)) {
                groups.pending.push(user);
            } else {
                groups.assigned.push(user);
            }

            return groups;
        },
        { pending: [], assigned: [] },
    );
}
