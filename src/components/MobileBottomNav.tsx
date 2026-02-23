'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Package, FileText, BarChart3, Menu, Plus } from 'lucide-react';
import { useState } from 'react';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const [showMore, setShowMore] = useState(false);

    const mainLinks = [
        { href: '/', icon: Home, label: 'หน้าหลัก' },
        { href: '/products', icon: Package, label: 'สินค้า' },
        { href: '/products/new', icon: Plus, label: 'เพิ่ม', special: true },
        { href: '/purchase-orders', icon: FileText, label: 'PO' },
        { href: '/reports', icon: BarChart3, label: 'รายงาน' },
    ];

    const moreLinks = [
        { href: '/movements', label: 'เคลื่อนไหว' },
        { href: '/borrow', label: 'ยืม/คืน' },
        { href: '/assets', label: 'ทรัพย์สิน' },
        { href: '/inventory-audit', label: 'ตรวจนับ' },
        { href: '/settings', label: 'ตั้งค่า' },
    ];

    return (
        <>
            {/* Bottom Navigation - Mobile Only */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 md:hidden z-40 safe-area-inset-bottom">
                <div className="flex items-center justify-around px-2 py-1">
                    {mainLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;

                        if (link.special) {
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex flex-col items-center justify-center -mt-6"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition ${isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                                <span className="text-[10px] mt-1">{link.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* More Menu Overlay */}
            {showMore && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowMore(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-4 animate-slide-up">
                        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                        <div className="grid grid-cols-4 gap-4">
                            {moreLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setShowMore(false)}
                                    className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <Package className="w-6 h-6 text-gray-600 dark:text-gray-300 mb-1" />
                                    <span className="text-xs text-gray-600 dark:text-gray-300">{link.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.2s ease-out;
                }
                .safe-area-inset-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 0);
                }
            `}</style>
        </>
    );
}
