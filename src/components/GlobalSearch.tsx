'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FloatingSearchInput } from '@/components/FloatingField';
import {
    Search, Command, Plus, Home, Package, FileText, Settings,
    ArrowRightLeft, ArrowRight, X, Keyboard
} from 'lucide-react';

interface SearchResult {
    type: 'page' | 'product' | 'action';
    title: string;
    description?: string;
    href?: string;
    action?: (router: any) => void;
    icon: React.ReactNode;
}

// Pages for quick navigation
const pages: SearchResult[] = [
    { type: 'page', title: 'Dashboard', description: 'หน้าหลัก', href: '/', icon: <Home className="w-4 h-4" /> },
    { type: 'page', title: 'รายการสินค้า', description: 'ดูสินค้าทั้งหมด', href: '/products', icon: <Package className="w-4 h-4" /> },
    { type: 'page', title: 'เพิ่มสินค้าใหม่', description: 'สร้างสินค้าใหม่', href: '/products/new', icon: <Plus className="w-4 h-4" /> },
    { type: 'page', title: 'ใบสั่งซื้อ', description: 'จัดการ PO', href: '/purchase-orders', icon: <FileText className="w-4 h-4" /> },
    { type: 'page', title: 'รายงานขั้นสูง', description: 'ABC Analysis', href: '/reports', icon: <FileText className="w-4 h-4" /> },
    { type: 'page', title: 'รายงาน Movement รายเดือน', description: 'สรุปเคลื่อนไหว/ไม่เคลื่อนไหว/หมดสต็อก', href: '/reports/movement', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { type: 'page', title: 'ตรวจนับสต็อก', description: 'Inventory Audit', href: '/inventory-audit', icon: <Package className="w-4 h-4" /> },
    { type: 'page', title: 'ตั้งค่า', description: 'ตั้งค่าระบบ', href: '/settings', icon: <Settings className="w-4 h-4" /> },
];

// Quick actions
const actions: SearchResult[] = [
    { type: 'action', title: 'สร้างสินค้าใหม่', icon: <Plus className="w-4 h-4" />, action: (router: any) => router.push('/products/new') },
    { type: 'action', title: 'สร้าง PO ใหม่', icon: <Plus className="w-4 h-4" />, action: (router: any) => router.push('/purchase-orders/new') },
    { type: 'action', title: 'ปรับสต็อก', icon: <Package className="w-4 h-4" />, action: (router: any) => router.push('/stock/adjust') },
];

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    // Search products
    const searchProducts = async (q: string): Promise<SearchResult[]> => {
        if (q.length < 2) return [];

        try {
            const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const products = await res.json();
                return products.slice(0, 5).map((p: { p_id: string; p_name: string }) => ({
                    type: 'product' as const,
                    title: p.p_name,
                    description: p.p_id,
                    href: `/products/${p.p_id}`,
                    icon: <Package className="w-4 h-4" />
                }));
            }
        } catch {
            // ignore
        }
        return [];
    };

    // Filter results based on query
    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults([...actions, ...pages]);
                return;
            }

            const q = query.toLowerCase();
            const filteredPages = pages.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
            const filteredActions = actions.filter(a =>
                a.title.toLowerCase().includes(q)
            );

            const products = await searchProducts(query);

            setResults([...filteredActions, ...filteredPages, ...products]);
        };

        search();
    }, [query]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Open with Cmd+K or Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }

        // Close with Escape
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    const handleResultKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    const handleSelect = (result: SearchResult) => {
        if (result.action) {
            result.action(router);
        } else if (result.href) {
            router.push(result.href);
        }
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="ค้นหา (Ctrl+K)"
            >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline">ค้นหา...</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded">⌘K</kbd>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

                {/* Modal */}
                <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 border-b p-4 dark:border-gray-700">
                        <FloatingSearchInput
                            label="ค้นหาหน้า, สินค้า, หรือคำสั่ง"
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleResultKeyDown}
                            containerClassName="flex-1"
                            className="border-transparent bg-transparent text-lg shadow-none focus:border-cyan-400 focus:ring-cyan-200/60"
                            labelClassName="text-slate-500 dark:text-slate-400"
                            autoFocus
                        />
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="ปิด">
                            <X className="w-5 h-5" />
                        </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>ไม่พบผลลัพธ์</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.title}-${idx}`}
                                    onClick={() => handleSelect(result)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${idx === selectedIndex
                                            ? 'bg-blue-50 dark:bg-blue-900/30'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.type === 'action' ? 'bg-green-100 text-green-600' :
                                            result.type === 'product' ? 'bg-blue-100 text-blue-600' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {result.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{result.title}</p>
                                        {result.description && (
                                            <p className="text-sm text-gray-500">{result.description}</p>
                                        )}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t dark:border-gray-700 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> เลือก</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd> เปิด</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">esc</kbd> ปิด</span>
                    </div>
                    <Command className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}

// Keyboard shortcuts help modal
export function KeyboardShortcutsHelp() {
    const [isOpen, setIsOpen] = useState(false);

    const shortcuts = [
        { keys: ['Ctrl', 'K'], description: 'ค้นหาและคำสั่ง' },
        { keys: ['Ctrl', 'N'], description: 'สร้างรายการใหม่' },
        { keys: ['Ctrl', 'S'], description: 'บันทึก' },
        { keys: ['Ctrl', '/'], description: 'แสดง Shortcuts' },
        { keys: ['Esc'], description: 'ปิด Modal' },
        { keys: ['↑', '↓'], description: 'เลือกรายการ' },
    ];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Keyboard className="w-5 h-5" />
                        Keyboard Shortcuts
                    </h2>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded" title="ปิด">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="space-y-3">
                    {shortcuts.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-300">{s.description}</span>
                            <div className="flex items-center gap-1">
                                {s.keys.map((key, i) => (
                                    <kbd key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium">
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
