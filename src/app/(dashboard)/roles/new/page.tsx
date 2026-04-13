'use client';

import { createUser } from '@/actions/userActions';
import { FloatingInput, FloatingSelect } from '@/components/FloatingField';
import { ROLE_OPTIONS } from '@/lib/roles';
import { ArrowLeft, Lock, Mail, MessageSquareText, Shield, User } from 'lucide-react';
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

                    <FloatingInput
                        label="Username"
                        name="username"
                        icon={<User className="h-5 w-5" />}
                        className="focus:ring-blue-500/20"
                        required
                    />

                    <FloatingInput
                        label="Password"
                        type="password"
                        name="password"
                        icon={<Lock className="h-5 w-5" />}
                        className="focus:ring-blue-500/20"
                        minLength={6}
                        required
                    />

                    <FloatingSelect
                        label="Role"
                        name="role"
                        icon={<Shield className="h-5 w-5" />}
                        className="focus:ring-blue-500/20"
                        defaultValue="employee"
                    >
                        {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </FloatingSelect>

                    <FloatingInput
                        label="Email (Optional)"
                        type="email"
                        name="email"
                        icon={<Mail className="h-5 w-5" />}
                        className="focus:ring-blue-500/20"
                    />

                    <FloatingInput
                        label="LINE User ID (Optional)"
                        type="text"
                        name="line_user_id"
                        icon={<MessageSquareText className="h-5 w-5" />}
                        className="focus:ring-blue-500/20"
                    />

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
