'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

interface MobileSidebarToggleProps {
    children: React.ReactNode;
}

export default function MobileSidebarWrapper({ children }: MobileSidebarToggleProps) {
    const { isOpen, setIsOpen, isMobile } = useSidebar();
    const pathname = usePathname();

    // Close drawer after route changes on mobile
    useEffect(() => {
        if (isMobile) {
            setIsOpen(false);
        }
    }, [pathname, isMobile, setIsOpen]);

    // Prevent background scroll when mobile drawer is open
    useEffect(() => {
        if (!isMobile) return;

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [isOpen, isMobile]);

    // Allow closing with Escape
    useEffect(() => {
        if (!isMobile || !isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, isMobile, setIsOpen]);

    return (
        <>
            {/* Mobile Menu Button */}
            {isMobile && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="mobile-menu-btn fixed top-4 left-4 z-[60] p-2.5 bg-slate-900/95 text-white rounded-xl shadow-lg border border-slate-700/80 transition-colors active:scale-95 lg:hidden"
                    aria-label="Toggle menu"
                    aria-expanded={isOpen}
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
                className={`mobile-sidebar fixed inset-y-0 z-50 will-change-transform shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isMobile
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
