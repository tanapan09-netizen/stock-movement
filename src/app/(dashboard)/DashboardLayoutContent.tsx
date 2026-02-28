'use client';

import React from 'react';
import Header from '@/components/Header';
import { useSidebar } from '@/contexts/SidebarContext';

export default function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { collapsed, isMobile } = useSidebar();

    return (
        <div className={`flex w-full flex-col min-h-screen transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isMobile ? 'ml-0' : (collapsed ? 'lg:ml-20' : 'lg:ml-72')}`}>
            <Header />
            <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
    );
}
