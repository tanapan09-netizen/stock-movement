'use client';

import React, { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import { useSidebar } from '@/contexts/SidebarContext';

export default function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { collapsed, isMobile } = useSidebar();
    const sidebarOffsetPx = isMobile ? 0 : (collapsed ? 80 : 288);
    const contentWidth = isMobile ? '100%' : `calc(100% - ${sidebarOffsetPx}px)`;
    const headerWrapperRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        const updateHeaderHeight = () => {
            const nextHeight = headerWrapperRef.current?.getBoundingClientRect().height ?? 0;
            setHeaderHeight(nextHeight);
        };

        updateHeaderHeight();

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateHeaderHeight)
            : null;

        if (resizeObserver && headerWrapperRef.current) {
            resizeObserver.observe(headerWrapperRef.current);
        }

        window.addEventListener('resize', updateHeaderHeight);
        return () => {
            window.removeEventListener('resize', updateHeaderHeight);
            resizeObserver?.disconnect();
        };
    }, [isMobile, collapsed]);

    return (
        <div
            className="relative flex min-h-screen min-w-0 flex-col overflow-x-hidden transition-[margin,width] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ marginLeft: `${sidebarOffsetPx}px`, width: contentWidth }}
        >
            <div
                ref={headerWrapperRef}
                className="fixed top-0 z-50 transition-[left,width] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ left: `${sidebarOffsetPx}px`, width: contentWidth }}
            >
                <Header />
            </div>
            <main className="app-page flex-1 w-full overflow-x-hidden" style={{ paddingTop: `${headerHeight}px` }}>
                <div className="app-content-panel">{children}</div>
            </main>
        </div>
    );
}
