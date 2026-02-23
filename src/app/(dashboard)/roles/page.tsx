import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { UserPlus, Shield, Trash2, Edit, Lock } from 'lucide-react';
import { deleteUser, unlockUser } from '@/actions/userActions';
import { getRoles } from '@/actions/roleActions';
import RolePermissionEditor from './RolePermissionEditor';
import { auth } from '@/auth';

export default async function UsersPage() {
    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role === 'admin';

    const [users, rolesResult] = await Promise.all([
        prisma.tbl_users.findMany({
            orderBy: { created_at: 'desc' },
        }),
        getRoles()
    ]);

    const roles = rolesResult.success ? rolesResult.data : [];

    return (
        <div className="space-y-12">
            {/* User Management Section */}
            <div>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน (Users)</h1>
                        <p className="text-sm text-gray-500">กำหนดสิทธิ์การเข้าใช้งานระบบ</p>
                    </div>
                    <Link
                        href="/roles/new"
                        className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> เพิ่มผู้ใช้งาน
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {users.map((user) => (
                        <div key={user.p_id} className="bg-white rounded-lg shadow p-6 flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md
                        ${user.role === 'admin' ? 'bg-purple-600' :
                                        user.role === 'manager' ? 'bg-blue-600' :
                                            user.role === 'technician' ? 'bg-orange-500' :
                                                user.role === 'accounting' ? 'bg-pink-500' :
                                                    user.role === 'purchasing' ? 'bg-cyan-600' :
                                                        user.role === 'operation' ? 'bg-teal-500' : 'bg-green-500'}
                     `}>
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{user.username}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <Shield className="w-3 h-3 mr-1" />
                                        <span className="uppercase">{user.role}</span>
                                    </div>
                                    {(user.email || user.line_user_id) && (
                                        <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                            {user.email && <div>✉️ {user.email}</div>}
                                            {user.line_user_id && <div>📱 {user.line_user_id}</div>}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-2">
                                        สร้างเมื่อ: {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : '-'}
                                    </div>
                                    {user.locked_until && new Date(user.locked_until) > new Date() && (
                                        <div className="mt-2">
                                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded border border-red-400 flex items-center w-fit gap-1">
                                                <Lock className="w-3 h-3" /> Locked
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="flex flex-col space-y-2">
                                    <Link href={`/roles/${user.p_id}/edit`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="แก้ไข">
                                        <Edit className="w-5 h-5" />
                                    </Link>

                                    {user.locked_until && new Date(user.locked_until) > new Date() && (
                                        <form action={async () => {
                                            'use server';
                                            await unlockUser(user.p_id);
                                        }}>
                                            <button
                                                type="submit"
                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition"
                                                title="ปลดล็อคบัญชี (Unlock)"
                                            >
                                                <Lock className="w-5 h-5" />
                                            </button>
                                        </form>
                                    )}

                                    <form action={async () => {
                                        'use server';
                                        if (user.role !== 'admin') {
                                            await deleteUser(user.p_id);
                                        }
                                    }}>
                                        <button
                                            type="submit"
                                            disabled={user.role === 'admin'}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="ลบผู้ใช้งาน"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Role Permissions Section */}
            {isAdmin && roles && roles.length > 0 && (
                <div>
                    <RolePermissionEditor roles={roles as any} />
                </div>
            )}
        </div>
    );
}
