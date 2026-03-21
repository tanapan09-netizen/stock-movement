'use client';

import { createUser } from '@/actions/userActions';
import { ROLE_OPTIONS } from '@/lib/roles';
import { ArrowLeft, Lock, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewUserPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        setError('');
        const res = await createUser(formData);

        if (res?.error) {
            setError(res.error);
            setIsPending(false);
            return;
        }

        router.push('/roles');
    };

    return (
        <div className="mx-auto mt-10 max-w-md">
            <Link href="/roles" className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="mr-1 h-4 w-4" /> กลับ
            </Link>

            <div className="overflow-hidden rounded-lg bg-white shadow-lg">
                <div className="bg-blue-600 px-6 py-4">
                    <h1 className="flex items-center text-xl font-bold text-white">
                        <User className="mr-2 h-6 w-6" /> เพิ่มผู้ใช้งานใหม่
                    </h1>
                </div>

                <form action={handleSubmit} className="space-y-6 p-6">
                    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                name="username"
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ตั้งชื่อผู้ใช้งาน..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                required
                                minLength={6}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="รหัสผ่านขั้นต่ำ 6 ตัวอักษร"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <select
                                name="role"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue="employee"
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email (Optional)</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="example@email.com"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">LINE User ID (Optional)</label>
                        <input
                            type="text"
                            name="line_user_id"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="U1234..."
                        />
                    </div>

                    <div className="mt-4 flex items-center">
                        <input
                            type="checkbox"
                            id="is_approver"
                            name="is_approver"
                            value="true"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_approver" className="ml-2 block whitespace-nowrap text-sm font-medium text-gray-900">
                            ตั้งเป็นหัวหน้าสายงาน (Approver)
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isPending ? 'กำลังสร้าง...' : 'สร้างบัญชีผู้ใช้'}
                    </button>
                </form>
            </div>
        </div>
    );
}
