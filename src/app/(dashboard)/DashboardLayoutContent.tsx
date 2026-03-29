'use client';

import React from 'react';
import Header from '@/components/Header';
import { useSidebar } from '@/contexts/SidebarContext';

export default function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { collapsed, isMobile } = useSidebar();
    const sidebarOffsetPx = isMobile ? 0 : (collapsed ? 80 : 288);
    const contentWidth = isMobile ? '100%' : `calc(100% - ${sidebarOffsetPx}px)`;

    return (
        <div
            className="flex min-h-screen min-w-0 flex-col overflow-x-hidden transition-[margin,width] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ marginLeft: `${sidebarOffsetPx}px`, width: contentWidth }}
        >
            <Header />
            <main className="flex-1 w-full overflow-x-hidden p-4 lg:p-8">{children}</main>
        </div>
    );
}
