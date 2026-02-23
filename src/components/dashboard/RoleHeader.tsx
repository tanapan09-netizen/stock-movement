'use client';

import { useSession } from 'next-auth/react';
import { User, Wrench, ShieldCheck, Bell, Search } from 'lucide-react';

interface RoleHeaderProps {
    activeRole: 'reporter' | 'technician' | 'admin';
    onRoleChange: (role: 'reporter' | 'technician' | 'admin') => void;
}

export default function RoleHeader({ activeRole, onRoleChange }: RoleHeaderProps) {
    const { data: session } = useSession();
    // In a real app, you might restrict tabs based on session.user.role
    // For now, we allow switching to demonstrate the UI.

    return (
        <div className="bg-white border-b sticky top-0 z-10">
            {/* Top Bar: Brand & Profile */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 leading-tight">ระบบแจ้งซ่อมองค์กร</h1>
                        <p className="text-xs text-gray-500">Organizational Repair Request System</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            className="bg-gray-100 pl-10 pr-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                    <button
                        type="button"
                        title="Notifications"
                        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Bell className="w-5 h-5 text-gray-600" />
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'Guest User'}</p>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <p className="text-xs text-gray-500 capitalize">{(session?.user as any)?.role || 'Guest'}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                            {session?.user?.name?.[0]?.toUpperCase() || 'G'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center px-6 gap-8">
                <button
                    onClick={() => onRoleChange('reporter')}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeRole === 'reporter'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <User className="w-4 h-4" />
                    ผู้แจ้งซ่อม
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 ml-1">แจ้งปัญหา</span>
                </button>

                <button
                    onClick={() => onRoleChange('technician')}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeRole === 'technician'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Wrench className="w-4 h-4" />
                    ทีมช่าง
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 ml-1">รับงาน</span>
                </button>

                <button
                    onClick={() => onRoleChange('admin')}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeRole === 'admin'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    ผู้ดูแลระบบ
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 ml-1">จัดการ</span>
                </button>
            </div>
        </div>
    );
}
