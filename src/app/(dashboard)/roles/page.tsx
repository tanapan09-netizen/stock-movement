import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { UserPlus, Shield, Trash2, Edit, Lock } from 'lucide-react';
import { deleteUser, unlockUser } from '@/actions/userActions';
import { getRoles } from '@/actions/roleActions';
import RolePermissionEditor from './RolePermissionEditor';
import UserPermissionButton from './UserPermissionButton';
import { auth } from '@/auth';
import { canManageAdminRoles } from '@/lib/rbac';
import {
    canDeleteUserWithRole,
    getRoleAvatarColorClass,
    getRoleLabel,
    isLockedPermissionRole,
} from '@/lib/roles';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

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

    return (
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-2 pb-8 sm:px-4">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 shadow-sm">
                <div className="flex flex-col gap-4 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">จัดการผู้ใช้งาน</h1>
                        <p className="max-w-3xl text-sm text-slate-600">
                            จัดการผู้ใช้ บทบาท และสิทธิ์การเข้าถึงระบบในหน้าเดียว พร้อมล็อกสิทธิ์ role สำคัญให้ชัดเจน
                        </p>
                    </div>
                    {canEdit && (
                        <Link
                            href="/roles/new"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            <UserPlus className="mr-2 h-4 w-4" /> เพิ่มผู้ใช้งาน
                        </Link>
                    )}
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">รายการผู้ใช้งาน</h2>
                            <p className="text-sm text-slate-500">จัดวางข้อมูลให้อ่านง่าย และเข้าถึงปุ่มจัดการได้สะดวก</p>
                        </div>
                        <div className="text-xs font-medium text-slate-400">{users.length} users</div>
                    </div>
                </div>

                <div className="bg-slate-50/70 p-4 sm:p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {(users as UserWithPermissions[]).map((user) => {
                            const isSelfLockedAdmin = user.p_id === currentUserId && isLockedPermissionRole(user.role);

                            return (
                                <article
                                    key={user.p_id}
                                    className="flex h-full min-h-[228px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-4">
                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-md ${getRoleAvatarColorClass(user.role)}`}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-lg font-bold text-slate-900">{user.username}</h3>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Shield className="h-3 w-3" />
                                                        <span className="uppercase">{getRoleLabel(user.role)}</span>
                                                    </span>
                                                    {isLockedPermissionRole(user.role) && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                                            <Lock className="h-3 w-3" /> Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {canEdit && (
                                            <div className="flex shrink-0 items-center gap-1 self-start">
                                                {isSelfLockedAdmin ? (
                                                    <span
                                                        className="rounded-full bg-amber-50 p-2 text-amber-500"
                                                        title="บัญชี admin ของตัวเองเปลี่ยน role ไม่ได้"
                                                    >
                                                        <Lock className="h-5 w-5" />
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={`/roles/${user.p_id}/edit`}
                                                        className="rounded-full p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                                                        title="แก้ไขผู้ใช้"
                                                    >
                                                        <Edit className="h-5 w-5" />
                                                    </Link>
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

                                                {user.locked_until && new Date(user.locked_until) > new Date() && (
                                                    <form action={async () => {
                                                        'use server';
                                                        await unlockUser(user.p_id);
                                                    }}>
                                                        <button
                                                            type="submit"
                                                            className="rounded-full p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-600"
                                                            title="ปลดล็อกบัญชี"
                                                        >
                                                            <Lock className="h-5 w-5" />
                                                        </button>
                                                    </form>
                                                )}

                                                <form action={async () => {
                                                    'use server';
                                                    if (canDeleteUserWithRole(user.role)) {
                                                        await deleteUser(user.p_id);
                                                    }
                                                }}>
                                                    <button
                                                        type="submit"
                                                        disabled={!canDeleteUserWithRole(user.role)}
                                                        className="rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                        title="ลบผู้ใช้"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                                        {(user.email || user.line_user_id) && (
                                            <div className="space-y-1">
                                                {user.email && <div className="truncate">Email: {user.email}</div>}
                                                {user.line_user_id && <div className="truncate">LINE ID: {user.line_user_id}</div>}
                                            </div>
                                        )}

                                        <div>
                                            สร้างเมื่อ: {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : '-'}
                                        </div>

                                        {isSelfLockedAdmin && (
                                            <div className="font-medium text-amber-700">
                                                บัญชี admin ของตัวเองเปลี่ยน role ไม่ได้
                                            </div>
                                        )}

                                        {user.locked_until && new Date(user.locked_until) > new Date() && (
                                            <div>
                                                <span className="inline-flex w-fit items-center gap-1 rounded border border-red-400 bg-red-100 px-2.5 py-0.5 font-medium text-red-800">
                                                    <Lock className="h-3 w-3" /> Locked
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {canEdit && roles.length > 0 && (
                <div>
                    <RolePermissionEditor roles={roles} />
                </div>
            )}
        </div>
    );
}
