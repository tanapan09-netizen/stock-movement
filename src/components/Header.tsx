'use client';

import NotificationBell from './NotificationBell';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, LogOut, ShieldAlert } from 'lucide-react';
import { getRoleDisplayName, isAdminRole } from '@/lib/roles';

interface UserWithRole {
    name?: string | null;
    role?: string;
}

const ROUTE_LABELS: Record<string, string> = {
    '/': 'Dashboard',
    '/assets': 'ทะเบียนทรัพย์สิน',
    '/assets/depreciation': 'บันทึกค่าเสื่อมราคา',
    '/products': 'รายการสินค้า',
    '/movements': 'เคลื่อนไหวสินค้า',
    '/borrow': 'ยืม/คืนสินค้า',
    '/maintenance': 'งานซ่อมบำรุง',
    '/general-request': 'รับแจ้งซ่อม',
    '/general-request/dashboard': 'KPI Dashboard',
    '/purchase-request': 'คำขอจัดซื้อ',
    '/purchase-orders': 'ใบสั่งซื้อ',
    '/reports': 'รายงาน',
    '/settings': 'ตั้งค่าระบบ',
};

const titleCase = (value: string) =>
    value
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const user = session?.user as UserWithRole;
    const isAdmin = isAdminRole(user?.role);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const currentPage = (() => {
        if (ROUTE_LABELS[pathname]) {
            return ROUTE_LABELS[pathname];
        }

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) {
            return 'Dashboard';
        }

        return titleCase(segments[segments.length - 1]);
    })();

    const currentDate = new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
    }).format(new Date());

    return (
        <>
            <header className="z-40 w-full border-b border-slate-200/80 bg-white/85 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-3.5 lg:px-8">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                        <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm sm:flex">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium tracking-wide text-slate-500">{currentDate}</p>
                            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{currentPage}</h1>
                        </div>
                        {isAdmin && (
                            <span className="hidden items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 lg:inline-flex">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Admin Mode
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <NotificationBell />

                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm sm:px-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="hidden text-sm sm:block">
                                <p className="max-w-[180px] truncate font-medium text-slate-900">{user?.name || 'User'}</p>
                                <p className="text-xs text-slate-500">{getRoleDisplayName(user?.role)}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowLogoutConfirm(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 sm:px-3"
                            title="ออกจากระบบ"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">ออกจากระบบ</span>
                        </button>
                    </div>
                </div>

                {isAdmin && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-medium text-blue-700 lg:hidden">
                        สิทธิ์ผู้ดูแลระบบเปิดใช้งานอยู่ (สามารถแก้ไข/ลบข้อมูลได้)
                    </div>
                )}
            </header>

            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">ยืนยันออกจากระบบ</h3>
                        <p className="mt-2 text-sm text-slate-600">คุณต้องการออกจากระบบใช่หรือไม่?</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowLogoutConfirm(false)}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
