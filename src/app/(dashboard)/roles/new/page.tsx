'use client';

import { useState } from 'react';
import { createUser } from '@/actions/userActions';
import { useRouter } from 'next/navigation';
import { Save, User, Lock, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        } else {
            router.push('/roles');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <Link href="/roles" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-blue-600 px-6 py-4">
                    <h1 className="text-xl font-bold text-white flex items-center">
                        <User className="w-6 h-6 mr-2" /> เพิ่มผู้ใช้งานใหม่
                    </h1>
                </div>

                <form action={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                name="username"
                                required
                                className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ตั้งชื่อผู้ใช้งาน..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                required
                                minLength={6}
                                className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="รหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <select
                                name="role"
                                className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="employee">Employee (พนักงานทั่วไป)</option>
                                <option value="technician">Technician (ช่างซ่อม)</option>
                                <option value="accounting">Accounting (บัญชี)</option>
                                <option value="purchasing">Purchasing (จัดซื้อ)</option>
                                <option value="operation">Operation (ฝ่ายปฏิบัติการ)</option>
                                <option value="manager">Manager (ผู้จัดการ)</option>
                                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="example@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LINE User ID (Optional)</label>
                        <input
                            type="text"
                            name="line_user_id"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="U1234..."
                        />
                    </div>

                    <div className="flex items-center mt-4">
                        <input
                            type="checkbox"
                            id="is_approver"
                            name="is_approver"
                            value="true"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_approver" className="ml-2 block text-sm text-gray-900 font-medium whitespace-nowrap">
                            ตั้งเป็น หัวหน้าสายงาน (ผู้อนุมัติ / Approver)
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                    >
                        {isPending ? 'กำลังสร้าง...' : 'สร้างบัญชีผู้ใช้'}
                    </button>
                </form>
            </div>
        </div>
    );
}
