'use client';

import { useState, useEffect } from 'react';
import { updateUser, deleteUser } from '@/actions/userActions';
import { useRouter } from 'next/navigation';
import { Save, User, Lock, Shield, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

type UserData = {
    p_id: number;
    username: string;
    role: string;
    email?: string | null;
    line_user_id?: string | null;
    is_approver?: boolean;
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
            // Fetch user data from API or directly
            try {
                const res = await fetch(`/api/users/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUserData(data);
                } else {
                    // Fallback: try to get from server action/page props
                    setError('ไม่พบข้อมูลผู้ใช้');
                }
            } catch (e) {
                // For now, create mock data based on ID
                setUserData({
                    p_id: parseInt(id),
                    username: 'User ' + id,
                    role: 'employee',
                    email: '',
                    line_user_id: ''
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
        } else {
            setSuccess('บันทึกการเปลี่ยนแปลงเรียบร้อย');
            setIsPending(false);
            setTimeout(() => router.push('/roles'), 1000);
        }
    };

    const handleDelete = async () => {
        if (!confirm('ยืนยันการลบผู้ใช้นี้?')) return;
        if (!userData?.p_id) return;

        setIsDeleting(true);
        const res = await deleteUser(userData.p_id);

        if (res?.error) {
            setError(res.error);
            setIsDeleting(false);
        } else {
            router.push('/roles');
        }
    };

    if (loading) {
        return (
            <div className="max-w-md mx-auto mt-10 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10">
            <Link href="/roles" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-orange-500 px-6 py-4">
                    <h1 className="text-xl font-bold text-white flex items-center">
                        <User className="w-6 h-6 mr-2" /> แก้ไขผู้ใช้งาน
                    </h1>
                </div>

                <form action={handleSubmit} className="p-6 space-y-6">
                    <input type="hidden" name="p_id" value={userData?.p_id || ''} />

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">
                            {success}
                        </div>
                    )}

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                id="username"
                                type="text"
                                value={userData?.username || ''}
                                disabled
                                title="Username"
                                className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Username ไม่สามารถเปลี่ยนได้</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เปลี่ยนรหัสผ่านใหม่ (ถ้าต้องการ)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                minLength={6}
                                className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="กรอกรหัสผ่านใหม่..."
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <select
                                id="role"
                                name="role"
                                title="เลือก Role"
                                defaultValue={userData?.role || 'employee'}
                                className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="employee">Employee (พนักงานทั่วไป)</option>
                                <option value="technician">Technician (ช่างซ่อม)</option>
                                <option value="maid">Maid (แม่บ้าน)</option>
                                <option value="driver">Driver (คนขับรถ)</option>
                                <option value="store">Store (คลังสินค้า)</option>
                                <option value="accounting">Accounting (บัญชี)</option>
                                <option value="purchasing">Purchasing (จัดซื้อ)</option>
                                <option value="operation">Operation (ฝ่ายปฏิบัติการ)</option>
                                <option value="manager">Manager (ผู้จัดการ)</option>
                                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            defaultValue={userData?.email || ''}
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="example@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LINE User ID</label>
                        <input
                            type="text"
                            name="line_user_id"
                            defaultValue={userData?.line_user_id || ''}
                            className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="U1234..."
                        />
                    </div>

                    <div className="flex items-center mt-4">
                        <input
                            type="checkbox"
                            id="is_approver_edit"
                            name="is_approver"
                            value="true"
                            defaultChecked={userData?.is_approver ?? false}
                            className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-gray-300 rounded"
                        />
                        <label htmlFor="is_approver_edit" className="ml-2 block text-sm text-gray-900 font-medium">
                            ตั้งเป็น หัวหน้าสายงาน (ผู้อนุมัติ / Approver)
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>

                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            title="ลบผู้ใช้"
                            aria-label="ลบผู้ใช้"
                            className="px-4 bg-red-100 hover:bg-red-200 text-red-600 font-bold py-3 rounded-lg transition disabled:opacity-50"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
