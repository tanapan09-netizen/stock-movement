'use client';

import { useSession } from 'next-auth/react';
import { Bell, ShieldCheck, User, Wrench } from 'lucide-react';

import { FloatingSearchInput } from '@/components/FloatingField';
import { getRoleDisplayName } from '@/lib/roles';

interface RoleHeaderProps {
    activeRole: 'reporter' | 'technician' | 'admin';
    onRoleChange: (role: 'reporter' | 'technician' | 'admin') => void;
}

export default function RoleHeader({ activeRole, onRoleChange }: RoleHeaderProps) {
    const { data: session } = useSession();
    const user = session?.user as { name?: string | null; role?: string } | undefined;

    return (
        <div className="sticky top-0 z-10 border-b bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-600 p-2">
                        <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight text-gray-800">ระบบแจ้งซ่อมองค์กร</h1>
                        <p className="text-xs text-gray-500">Organizational Repair Request System</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                        <FloatingSearchInput
                            type="text"
                            label="ค้นหา"
                            placeholder="ค้นหา..."
                            dense
                            containerClassName="w-64"
                            className="border-gray-200 bg-gray-100/90 text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        title="Notifications"
                        className="relative rounded-full p-2 transition-colors hover:bg-gray-100"
                    >
                        <Bell className="h-5 w-5 text-gray-600" />
                        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>
                    </button>
                    <div className="flex items-center gap-3 border-l pl-4">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium text-gray-900">{user?.name || 'Guest User'}</p>
                            <p className="text-xs text-gray-500">{getRoleDisplayName(user?.role || 'guest')}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-100 font-bold text-blue-600 shadow-sm">
                            {user?.name?.[0]?.toUpperCase() || 'G'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8 px-6">
                <button
                    onClick={() => onRoleChange('reporter')}
                    className={`flex items-center gap-2 border-b-2 py-4 text-sm font-medium transition-colors ${
                        activeRole === 'reporter'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <User className="h-4 w-4" />
                    ผู้แจ้งซ่อม
                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">แจ้งปัญหา</span>
                </button>

                <button
                    onClick={() => onRoleChange('technician')}
                    className={`flex items-center gap-2 border-b-2 py-4 text-sm font-medium transition-colors ${
                        activeRole === 'technician'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Wrench className="h-4 w-4" />
                    ทีมช่าง
                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">รับงาน</span>
                </button>

                <button
                    onClick={() => onRoleChange('admin')}
                    className={`flex items-center gap-2 border-b-2 py-4 text-sm font-medium transition-colors ${
                        activeRole === 'admin'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <ShieldCheck className="h-4 w-4" />
                    ผู้ดูแลระบบ
                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">จัดการ</span>
                </button>
            </div>
        </div>
    );
}