import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Edit, Lock, Shield, Trash2, UserPlus, Users } from 'lucide-react';

import { deleteUser, unlockUser } from '@/actions/userActions';
import { getRoles } from '@/actions/roleActions';
import { auth } from '@/auth';
import { canManageAdminRoles } from '@/lib/rbac';
import {
    getRoleAvatarColorClass,
    getRoleLabel,
    isLockedPermissionRole,
} from '@/lib/roles';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { resolveUserManagementActionState } from '@/lib/user-management-access';

import RolePermissionEditor from './RolePermissionEditor';
import UserPermissionButton from './UserPermissionButton';

type RoleRow = {
    role_id: number;
    role_name: string;
    permissions: string | null;
};

type UserWithPermissions = Awaited<ReturnType<typeof prisma.tbl_users.findMany>>[number] & {
    custom_permissions?: string | null;
};

export default async function UsersPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEdit = canManageAdminRoles(permissionContext.role, permissionContext.permissions);
    const currentUserId = session?.user?.id ? (parseInt(session.user.id as string, 10) || 0) : 0;

    const [users, rolesResult] = await Promise.all([
        prisma.tbl_users.findMany({
            orderBy: { created_at: 'desc' },
        }),
        getRoles(),
    ]);

    const roles: RoleRow[] = rolesResult.success ? (rolesResult.data as RoleRow[]) : [];
    const userRows = users as UserWithPermissions[];
    const lockedUsersCount = userRows.filter(
        (user) => user.locked_until && new Date(user.locked_until) > new Date(),
    ).length;
    const protectedRolesCount = roles.filter((role) => isLockedPermissionRole(role.role_name)).length;

    return (
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-3 pb-8 sm:px-5 lg:px-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eff6ff_100%)] shadow-sm">
                <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700">
                            <Shield className="h-3.5 w-3.5" />
                            Role And Access Control
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            เน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ…เน€เธเธเน€เธเธเน€เธเธ”เน€เธโ€”เน€เธยเน€เธเธ”เน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธโ€“เน€เธเธ–เน€เธย
                        </h1>
                        <p className="text-sm leading-6 text-slate-600 sm:text-[15px]">
                            เน€เธเธเน€เธเธเน€เธเธเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธย, เน€เธยเน€เธโ€”เน€เธยเน€เธเธ’เน€เธโ€”, เน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ…เน€เธโ€เน€เธเธ…เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ• เน€เธยเน€เธเธ…เน€เธเธเน€เธยเน€เธเธ’เน€เธเธ override เน€เธเธเน€เธเธ”เน€เธโ€”เน€เธยเน€เธเธ”เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธโฌเน€เธโ€เน€เธเธ•เน€เธเธเน€เธเธ
                            เน€เธโฌเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธโ€ขเน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธยเน€เธเธ…เน€เธเธเน€เธยเน€เธเธเน€เธเธ‘เน€เธยเน€เธเธเน€เธเธ”เน€เธโ€”เน€เธยเน€เธเธ”เน€เธยเน€เธยเน€เธโ€เน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ–เน€เธยเน€เธย
                        </p>
                    </div>

                    {canEdit && (
                        <Link
                            href="/roles/new"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            เน€เธโฌเน€เธยเน€เธเธ”เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธย
                        </Link>
                    )}
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-500">เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€”เน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธโ€</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">{userRows.length}</div>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-500">เน€เธยเน€เธโ€”เน€เธยเน€เธเธ’เน€เธโ€”เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธย</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">{roles.length}</div>
                        </div>
                        <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                            <Shield className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-500">เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ•เน€เธโ€”เน€เธเธ•เน€เธยเน€เธโ€“เน€เธเธเน€เธยเน€เธเธ…เน€เธยเน€เธเธเน€เธย</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">{lockedUsersCount}</div>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                            <Lock className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-500">เน€เธยเน€เธโ€”เน€เธยเน€เธเธ’เน€เธโ€”เน€เธโ€”เน€เธเธ•เน€เธยเน€เธเธ…เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ”เน€เธโ€”เน€เธยเน€เธเธ”เน€เธย</div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">{protectedRolesCount}</div>
                        </div>
                        <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                            <Shield className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">เน€เธเธเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธย</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            เน€เธยเน€เธเธเน€เธโ€เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธเธเน€เธเธ…เน€เธเธเน€เธเธ“เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธย เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธเธ‘เน€เธโ€เน€เธยเน€เธเธ’เน€เธเธเน€เธโ€”เน€เธเธ•เน€เธยเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธโ€“เน€เธเธ–เน€เธยเน€เธยเน€เธโ€เน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธยเน€เธเธ–เน€เธยเน€เธยเน€เธยเน€เธยเน€เธโ€”เน€เธเธเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธโ€เน€เธเธเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธเธ
                        </p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        {userRows.length} users
                    </div>
                </div>

                <div className="bg-slate-50/70 p-4 sm:p-5 lg:p-6">
                    {userRows.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-slate-900">เน€เธเธเน€เธเธ‘เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ•เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธย</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                เน€เธโฌเน€เธยเน€เธเธ”เน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธยเน€เธยเน€เธเธ’เน€เธยเน€เธยเน€เธเธเน€เธเธเน€เธยเน€เธโฌเน€เธยเน€เธเธ—เน€เธยเน€เธเธเน€เธโฌเน€เธเธเน€เธเธ”เน€เธยเน€เธเธเน€เธยเน€เธเธ“เน€เธเธเน€เธยเน€เธโ€เน€เธยเน€เธโ€”เน€เธยเน€เธเธ’เน€เธโ€”เน€เธยเน€เธเธ…เน€เธเธเน€เธเธเน€เธเธ”เน€เธโ€”เน€เธยเน€เธเธ”เน€เธยเน€เธยเน€เธเธ’เน€เธเธเน€เธโฌเน€เธยเน€เธยเน€เธเธ’เน€เธโ€“เน€เธเธ–เน€เธย
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {userRows.map((user) => {
                                const actionState = resolveUserManagementActionState({
                                    targetRole: user.role,
                                    targetUserId: user.p_id,
                                    currentUserId,
                                });
                                const isSelfLockedAdmin = actionState.isSelfLockedRole;
                                const isCurrentlyLocked = Boolean(user.locked_until && new Date(user.locked_until) > new Date());

                                return (
                                    <article
                                        key={user.p_id}
                                        className="flex h-full min-h-[236px] flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-start gap-4">
                                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md ${getRoleAvatarColorClass(user.role)}`}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-lg font-bold text-slate-900">{user.username}</h3>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                                            <Shield className="h-3.5 w-3.5" />
                                                            {getRoleLabel(user.role)}
                                                        </span>
                                                        {isLockedPermissionRole(user.role) && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                                                <Lock className="h-3 w-3" />
                                                                Protected Role
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {canEdit && (
                                                <div className="flex shrink-0 items-center gap-1 self-start rounded-full border border-slate-200 bg-slate-50 p-1">
                                                    <Link
                                                        href={`/roles/${user.p_id}/edit`}
                                                        className={isSelfLockedAdmin ? 'rounded-full p-2 text-amber-500 transition hover:bg-blue-50 hover:text-blue-600' : 'rounded-full p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600'}
                                                        title={isSelfLockedAdmin
                                                            ? 'เนเธเนเนเธเธเนเธญเธกเธนเธฅเนเธฅเธฐเธฃเธซเธฑเธชเธเนเธฒเธเนเธ”เน เนเธ•เนเน€เธเธฅเธตเนเธขเธ role เธเธญเธเธเธฑเธเธเธต admin เธ•เธฑเธงเน€เธญเธเนเธกเนเนเธ”เน'
                                                            : 'เนเธเนเนเธเธเธนเนเนเธเน'}
                                                    >
                                                        <Edit className="h-4.5 w-4.5" />
                                                    </Link>

                                                    {isSelfLockedAdmin && (
                                                        <span
                                                            className="rounded-full bg-amber-50 p-2 text-amber-500"
                                                            title="role เธเธญเธเธเธฑเธเธเธต admin เธ•เธฑเธงเน€เธญเธเธ–เธนเธเธฅเนเธญเธเนเธงเน เนเธ•เนเธขเธฑเธเนเธเนเนเธเธเนเธญเธกเธนเธฅเนเธฅเธฐเธฃเธซเธฑเธชเธเนเธฒเธเนเธ”เน"
                                                        >
                                                            <Lock className="h-4.5 w-4.5" />
                                                        </span>
                                                    )}

                                                    <UserPermissionButton
                                                        user={{
                                                            p_id: user.p_id,
                                                            username: user.username,
                                                            role: user.role,
                                                            custom_permissions: user.custom_permissions || null,
                                                        }}
                                                        dbRolePermissions={roles.find((role) => role.role_name === user.role)?.permissions}
                                                        isLocked={isLockedPermissionRole(user.role)}
                                                    />

                                                    {isCurrentlyLocked && (
                                                        <form action={async () => {
                                                            'use server';
                                                            await unlockUser(user.p_id);
                                                        }}>
                                                            <button
                                                                type="submit"
                                                                className="rounded-full p-2 text-slate-400 transition hover:bg-green-50 hover:text-green-600"
                                                                title="เน€เธยเน€เธเธ…เน€เธโ€เน€เธเธ…เน€เธยเน€เธเธเน€เธยเน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ•"
                                                            >
                                                                <Lock className="h-4.5 w-4.5" />
                                                            </button>
                                                        </form>
                                                    )}

                                                    <form action={async () => {
                                                        'use server';
                                                        if (actionState.canDelete) {
                                                            await deleteUser(user.p_id);
                                                        }
                                                    }}>
                                                        <button
                                                            type="submit"
                                                            disabled={!actionState.canDelete}
                                                            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                            title="เน€เธเธ…เน€เธยเน€เธยเน€เธเธเน€เธยเน€เธยเน€เธยเน€เธย"
                                                        >
                                                            <Trash2 className="h-4.5 w-4.5" />
                                                        </button>
                                                    </form>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
                                            <div className="grid gap-1">
                                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contact</div>
                                                <div className="space-y-1">
                                                    <div className="truncate">{user.email || 'No email'}</div>
                                                    <div className="truncate">{user.line_user_id || 'No LINE ID'}</div>
                                                </div>
                                            </div>

                                            <div className="grid gap-1">
                                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Created</div>
                                                <div>{user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : '-'}</div>
                                            </div>

                                            {isSelfLockedAdmin && (
                                                <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                                                    เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ• admin เน€เธยเน€เธเธเน€เธยเน€เธโ€ขเน€เธเธ‘เน€เธเธเน€เธโฌเน€เธเธเน€เธยเน€เธยเน€เธเธเน€เธยเน€เธเธเน€เธเธ’เน€เธเธเน€เธเธ’เน€เธเธเน€เธโ€“เน€เธโฌเน€เธยเน€เธเธ…เน€เธเธ•เน€เธยเน€เธเธเน€เธย role เน€เธยเน€เธโ€เน€เธย
                                                </div>
                                            )}

                                            {isCurrentlyLocked && (
                                                <div>
                                                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                                        <Lock className="h-3 w-3" />
                                                        เน€เธยเน€เธเธ‘เน€เธยเน€เธยเน€เธเธ•เน€เธโ€“เน€เธเธเน€เธยเน€เธเธ…เน€เธยเน€เธเธเน€เธย
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {canEdit && roles.length > 0 && (
                <section className="rounded-[28px]">
                    <RolePermissionEditor roles={roles} />
                </section>
            )}
        </div>
    );
}
