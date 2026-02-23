'use client';

import { useState } from 'react';
import { CheckSquare, Square, Trash2, Edit, Tag, X, Loader2, Download, MoreHorizontal } from 'lucide-react';

interface BatchItem {
    id: string;
    name: string;
    [key: string]: unknown;
}

interface BatchOperationsProps {
    items: BatchItem[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    onBatchDelete?: (ids: string[]) => Promise<void>;
    onBatchUpdate?: (ids: string[], data: Record<string, unknown>) => Promise<void>;
    onBatchExport?: (ids: string[]) => void;
}

export default function BatchOperations({
    items,
    selectedIds,
    onSelectionChange,
    onBatchDelete,
    onBatchUpdate,
    onBatchExport
}: BatchOperationsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    const allSelected = items.length > 0 && selectedIds.length === items.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

    const toggleSelectAll = () => {
        if (allSelected) {
            onSelectionChange([]);
        } else {
            onSelectionChange(items.map(i => i.id));
        }
    };

    const handleBatchDelete = async () => {
        if (!onBatchDelete || selectedIds.length === 0) return;

        if (!confirm(`ต้องการลบ ${selectedIds.length} รายการที่เลือก?`)) return;

        setIsLoading(true);
        try {
            await onBatchDelete(selectedIds);
            onSelectionChange([]);
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการลบ');
        }
        setIsLoading(false);
    };

    const handleBatchCategory = async () => {
        if (!onBatchUpdate || !newCategory) return;

        setIsLoading(true);
        try {
            await onBatchUpdate(selectedIds, { category: newCategory });
            onSelectionChange([]);
            setShowCategoryModal(false);
            setNewCategory('');
        } catch (error) {
            alert('เกิดข้อผิดพลาด');
        }
        setIsLoading(false);
    };

    const handleExport = () => {
        if (onBatchExport && selectedIds.length > 0) {
            onBatchExport(selectedIds);
        }
    };

    if (selectedIds.length === 0) return null;

    return (
        <>
            {/* Floating Action Bar */}
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4 z-40 animate-slide-up">
                <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
                    <button onClick={toggleSelectAll} className="p-1">
                        {allSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-400" />
                        ) : someSelected ? (
                            <div className="w-5 h-5 border-2 border-blue-400 rounded flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-400 rounded-sm" />
                            </div>
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                    <span className="font-medium">{selectedIds.length} รายการ</span>
                </div>

                <div className="flex items-center gap-2">
                    {onBatchUpdate && (
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
                            title="เปลี่ยนหมวดหมู่"
                        >
                            <Tag className="w-4 h-4" />
                            <span className="hidden sm:inline">หมวดหมู่</span>
                        </button>
                    )}

                    {onBatchExport && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition text-sm"
                            title="Export"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    )}

                    {onBatchDelete && (
                        <button
                            onClick={handleBatchDelete}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm disabled:opacity-50"
                            title="ลบ"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            <span className="hidden sm:inline">ลบ</span>
                        </button>
                    )}

                    <button
                        onClick={() => onSelectionChange([])}
                        className="p-2 hover:bg-gray-700 rounded-lg transition"
                        title="ยกเลิก"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoryModal(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">เปลี่ยนหมวดหมู่</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            เปลี่ยนหมวดหมู่ให้ {selectedIds.length} รายการที่เลือก
                        </p>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="ชื่อหมวดหมู่ใหม่"
                            className="w-full p-3 border rounded-lg mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleBatchCategory}
                                disabled={!newCategory || isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slide-up 0.2s ease-out;
                }
            `}</style>
        </>
    );
}

// Checkbox for table rows
export function BatchCheckbox({
    id,
    selectedIds,
    onToggle
}: {
    id: string;
    selectedIds: string[];
    onToggle: (id: string) => void;
}) {
    const isSelected = selectedIds.includes(id);

    return (
        <button
            onClick={() => onToggle(id)}
            className="p-1"
        >
            {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-500" />
            ) : (
                <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            )}
        </button>
    );
}
