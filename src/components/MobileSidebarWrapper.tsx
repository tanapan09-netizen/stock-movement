'use client';

import { useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

interface MobileSidebarToggleProps {
    children: React.ReactNode;
}

export default function MobileSidebarWrapper({ children }: MobileSidebarToggleProps) {
    const { isOpen, setIsOpen, isMobile } = useSidebar();

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isOpen && !target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-btn')) {
                setIsOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isOpen]);

    return (
        <>
            {/* Mobile Menu Button */}
            {isMobile && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="mobile-menu-btn fixed top-4 left-4 z-[60] p-2 bg-gray-900 text-white rounded-lg shadow-lg lg:hidden"
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            )}

            {/* Overlay with subtle blur */}
            {isMobile && (
                <div
                    className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`mobile-sidebar fixed inset-y-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isMobile
                    ? isOpen
                        ? 'translate-x-0'
                        : '-translate-x-full'
                    : 'translate-x-0'
                    }`}
            >
                {children}
            </div>
        </>
    );
}
