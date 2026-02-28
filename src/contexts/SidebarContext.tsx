'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    isMobile: boolean;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const savedState = localStorage.getItem('sidebar_collapsed');
        if (savedState) {
            setCollapsed(savedState === 'true');
        }
    }, []);

    const handleSetCollapsed = (val: boolean) => {
        setCollapsed(val);
        localStorage.setItem('sidebar_collapsed', val.toString());
    };

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed, isMobile, isOpen, setIsOpen }}>
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
