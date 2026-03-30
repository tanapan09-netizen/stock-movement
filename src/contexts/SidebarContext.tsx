'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    isMobile: boolean;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    sidebarMode: 'mobile' | 'compact' | 'desktop';
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarMode, setSidebarMode] = useState<'mobile' | 'compact' | 'desktop'>('desktop');
    const preferredDesktopCollapsedRef = useRef(false);
    const previousModeRef = useRef<'mobile' | 'compact' | 'desktop' | null>(null);

    const resolveSidebarMode = (width: number): 'mobile' | 'compact' | 'desktop' => {
        if (width < 1024) return 'mobile';
        if (width < 1280) return 'compact';
        return 'desktop';
    };

    useEffect(() => {
        const savedState = localStorage.getItem('sidebar_collapsed');
        preferredDesktopCollapsedRef.current = savedState === 'true';

        const applyResponsiveSidebar = () => {
            const mode = resolveSidebarMode(window.innerWidth);
            setSidebarMode(mode);
            setIsMobile(mode === 'mobile');

            if (mode !== 'mobile') {
                setIsOpen(false);
            }

            if (previousModeRef.current !== mode) {
                if (mode === 'desktop') {
                    setCollapsed(preferredDesktopCollapsedRef.current);
                } else if (mode === 'compact') {
                    setCollapsed(true);
                } else {
                    setCollapsed(false);
                }

                previousModeRef.current = mode;
            }
        };

        applyResponsiveSidebar();
        window.addEventListener('resize', applyResponsiveSidebar);
        return () => window.removeEventListener('resize', applyResponsiveSidebar);
    }, []);

    const handleSetCollapsed = (val: boolean) => {
        setCollapsed(val);
        preferredDesktopCollapsedRef.current = val;
        localStorage.setItem('sidebar_collapsed', val.toString());
    };

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed, isMobile, isOpen, setIsOpen, sidebarMode }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
