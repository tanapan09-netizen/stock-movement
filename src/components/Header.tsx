'use client';

import NotificationBell from './NotificationBell';
import { useSession } from 'next-auth/react';
import { getRoleDisplayName, isAdminRole } from '@/lib/roles';

interface UserWithRole {
    name?: string | null;
    role?: string;
}

export default function Header() {
    const { data: session } = useSession();
    const user = session?.user as UserWithRole;

    return (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-4">
                {isAdminRole(user?.role) && (
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Admin Mode: <span className="text-blue-600 dark:text-blue-400">สามารถแก้ไข/ลบได้</span>
                    </h1>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Theme Toggle - DISABLED: Light theme only */}
                {/* <ThemeToggle /> */}

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Info */}
                <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-gray-600">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-gray-800 dark:text-white">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplayName(user?.role)}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
