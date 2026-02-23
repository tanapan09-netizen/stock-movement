'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileSidebarToggleProps {
    children: React.ReactNode;
}

export default function MobileSidebarWrapper({ children }: MobileSidebarToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
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

            {/* Overlay */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`mobile-sidebar fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out ${isMobile
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
