'use client';

import { useState, useEffect } from 'react';
import { Plus, Package, FileText, Truck, ArrowRightLeft, Hand, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    href: string;
}

export default function QuickActionsMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const actions: QuickAction[] = [
        { id: 'product', label: 'เพิ่มสินค้า', description: 'สร้างสินค้าใหม่', icon: <Package className="w-5 h-5" />, color: 'bg-blue-500', href: '/products/new' },
        { id: 'stock-in', label: 'รับสินค้า', description: 'บันทึกสินค้าเข้า', icon: <Plus className="w-5 h-5" />, color: 'bg-green-500', href: '/stock/adjust?type=in' },
        { id: 'stock-out', label: 'เบิกสินค้า', description: 'บันทึกสินค้าออก', icon: <ArrowRightLeft className="w-5 h-5" />, color: 'bg-orange-500', href: '/stock/adjust?type=out' },
        { id: 'po', label: 'สร้าง PO', description: 'ใบสั่งซื้อใหม่', icon: <FileText className="w-5 h-5" />, color: 'bg-purple-500', href: '/purchase-orders/new' },
        { id: 'borrow', label: 'ยืมสินค้า', description: 'บันทึกการยืม', icon: <Hand className="w-5 h-5" />, color: 'bg-yellow-500', href: '/borrow/new' },
        { id: 'supplier', label: 'เพิ่มผู้ขาย', description: 'ผู้ขายใหม่', icon: <Truck className="w-5 h-5" />, color: 'bg-pink-500', href: '/suppliers/new' },
    ];

    const handleAction = (action: QuickAction) => {
        router.push(action.href);
        setIsOpen(false);
    };

    // Keyboard shortcut Ctrl+N
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            {/* FAB Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 z-40"
                title="Quick Actions (Ctrl+N)"
            >
                <Zap className="w-6 h-6" />
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Zap className="w-5 h-5 text-purple-500" />
                                Quick Actions
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="ปิด">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Actions Grid */}
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {actions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => handleAction(action)}
                                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition text-left"
                                >
                                    <div className={`w-10 h-10 ${action.color} text-white rounded-lg flex items-center justify-center`}>
                                        {action.icon}
                                    </div>
                                    <div>
                                        <p className="font-medium">{action.label}</p>
                                        <p className="text-xs text-gray-500">{action.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-4 pb-4 text-center text-xs text-gray-500">
                            กด <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+N</kbd> เพื่อเปิด Quick Actions
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scale-in 0.15s ease-out;
                }
            `}</style>
        </>
    );
}
