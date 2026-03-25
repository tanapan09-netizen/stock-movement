'use client';

import { deleteUser, updateUser } from '@/actions/userActions';
import { ROLE_OPTIONS } from '@/lib/roles';
import { ArrowLeft, Lock, Save, Shield, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type UserData = {
    p_id: number;
    username: string;
    role: string;
    email?: string | null;
    line_user_id?: string | null;
    is_approver?: boolean;
    is_current_user?: boolean;
    is_role_locked?: boolean;
};

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const { id } = await params;
            try {
                const res = await fetch(`/api/users/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUserData(data);
                } else {
                    setError('ไม่พบข้อมูลผู้ใช้');
                }
            } catch {
                setUserData({
                    p_id: parseInt(id, 10),
                    username: `User ${id}`,
                    role: 'employee',
                    email: '',
                    line_user_id: '',
                });
            }
            setLoading(false);
        };
        loadUser();
    }, [params]);

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        setError('');
        setSuccess('');

        const res = await updateUser(formData);

        if (res?.error) {
            setError(res.error);
            setIsPending(false);
            return;
        }

        setSuccess('บันทึกการเปลี่ยนแปลงเรียบร้อย');
        setIsPending(false);
        setTimeout(() => router.push('/roles'), 1000);
    };

    const handleDelete = async () => {
        if (!confirm('ยืนยันการลบผู้ใช้นี้?') || !userData?.p_id) return;

        setIsDeleting(true);
        const res = await deleteUser(userData.p_id);

        if (res?.error) {
            setError(res.error);
            setIsDeleting(false);
            return;
        }

        router.push('/roles');
    };

    if (loading) {
        return (
            <div className="mx-auto mt-10 flex h-64 max-w-md items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const isSelfLockedRole = Boolean(userData?.is_current_user && userData?.is_role_locked);

    return (
        <div className="mx-auto mt-10 max-w-md">
            <Link href="/roles" className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="mr-1 h-4 w-4" /> กลับ
            </Link>

            <div className="overflow-hidden rounded-lg bg-white shadow-lg">
                <div className="bg-orange-500 px-6 py-4">
                    <h1 className="flex items-center text-xl font-bold text-white">
                        <User className="mr-2 h-6 w-6" /> แก้ไขผู้ใช้งาน
                    </h1>
                </div>

                <form action={handleSubmit} className="space-y-6 p-6">
                    <input type="hidden" name="p_id" value={userData?.p_id || ''} />

                    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                    {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}
                    {isSelfLockedRole && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            role ของบัญชี admin ของตัวเองถูกล็อกไว้ เปลี่ยนไม่ได้ แต่ยังแก้ไขข้อมูลอื่นได้
                        </div>
                    )}

                    <div>
                        <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                id="username"
                                type="text"
                                value={userData?.username || ''}
                                disabled
                                className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 pl-10 text-gray-500"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Username เปลี่ยนไม่ได้</p>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">เปลี่ยนรหัสผ่านใหม่ (ถ้าต้องการ)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                minLength={6}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="กรอกรหัสผ่านใหม่..."
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <select
                                id="role"
                                name="role"
                                defaultValue={userData?.role || 'employee'}
                                disabled={isSelfLockedRole}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                        {isSelfLockedRole && (
                            <p className="mt-1 text-xs text-amber-700">ระบบล็อก role `admin` ของบัญชีตัวเองไว้เสมอ</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            name="email"
                            defaultValue={userData?.email || ''}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="example@email.com"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">LINE User ID</label>
                        <input
                            type="text"
                            name="line_user_id"
                            defaultValue={userData?.line_user_id || ''}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="U1234..."
                        />
                    </div>

                    <div className="mt-4 flex items-center">
                        <input
                            type="checkbox"
                            id="is_approver_edit"
                            name="is_approver"
                            value="true"
                            defaultChecked={userData?.is_approver ?? false}
                            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                        />
                        <label htmlFor="is_approver_edit" className="ml-2 block text-sm font-medium text-gray-900">
                            ตั้งเป็นหัวหน้าสายงาน (Approver)
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                        >
                            <Save className="h-5 w-5" />
                            {isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>

                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="rounded-lg bg-red-100 px-4 py-3 font-bold text-red-600 transition hover:bg-red-200 disabled:opacity-50"
                            title="ลบผู้ใช้"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
