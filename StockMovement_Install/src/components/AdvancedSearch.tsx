'use client';

import { useState } from 'react';
import { Search, Filter, X, Calendar, Tag } from 'lucide-react';

interface FilterOptions {
    search: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    status: string;
    minStock: string;
    maxStock: string;
}

interface AdvancedSearchProps {
    onFilter: (filters: FilterOptions) => void;
    categories?: { id: number; name: string }[];
    showStatus?: boolean;
    showStock?: boolean;
    showDate?: boolean;
    placeholder?: string;
}

export default function AdvancedSearch({
    onFilter,
    categories = [],
    showStatus = false,
    showStock = false,
    showDate = false,
    placeholder = 'ค้นหา...'
}: AdvancedSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        category: '',
        dateFrom: '',
        dateTo: '',
        status: '',
        minStock: '',
        maxStock: ''
    });

    const handleChange = (field: keyof FilterOptions, value: string) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        onFilter(newFilters);
    };

    const clearFilters = () => {
        const emptyFilters: FilterOptions = {
            search: '',
            category: '',
            dateFrom: '',
            dateTo: '',
            status: '',
            minStock: '',
            maxStock: ''
        };
        setFilters(emptyFilters);
        onFilter(emptyFilters);
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
            {/* Main Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600"
                    />
                    {filters.search && (
                        <button
                            onClick={() => handleChange('search', '')}
                            title="ล้างการค้นหา"
                            aria-label="ล้างการค้นหา"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`px-4 py-2 flex items-center gap-2 rounded-lg border transition ${isExpanded || hasActiveFilters
                        ? 'bg-blue-50 border-blue-300 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">ตัวกรอง</span>
                    {hasActiveFilters && (
                        <span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                            !
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    {/* Category Filter */}
                    {categories.length > 0 && (
                        <div>
                            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Tag className="w-4 h-4 inline mr-1" />
                                หมวดหมู่
                            </label>
                            <select
                                id="category-filter"
                                title="เลือกหมวดหมู่"
                                value={filters.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">ทั้งหมด</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date Range */}
                    {showDate && (
                        <>
                            <div>
                                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    ตั้งแต่วันที่
                                </label>
                                <input
                                    id="date-from"
                                    type="date"
                                    title="ตั้งแต่วันที่"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleChange('dateFrom', e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    ถึงวันที่
                                </label>
                                <input
                                    id="date-to"
                                    type="date"
                                    title="ถึงวันที่"
                                    value={filters.dateTo}
                                    onChange={(e) => handleChange('dateTo', e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </>
                    )}

                    {/* Status */}
                    {showStatus && (
                        <div>
                            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                สถานะ
                            </label>
                            <select
                                id="status-filter"
                                title="เลือกสถานะ"
                                value={filters.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">ทั้งหมด</option>
                                <option value="active">ใช้งาน</option>
                                <option value="inactive">ไม่ใช้งาน</option>
                            </select>
                        </div>
                    )}

                    {/* Stock Range */}
                    {showStock && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    จำนวนขั้นต่ำ
                                </label>
                                <input
                                    type="number"
                                    value={filters.minStock}
                                    onChange={(e) => handleChange('minStock', e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    จำนวนสูงสุด
                                </label>
                                <input
                                    type="number"
                                    value={filters.maxStock}
                                    onChange={(e) => handleChange('maxStock', e.target.value)}
                                    placeholder="99999"
                                    min="0"
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
                <div className="flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                        <X className="w-4 h-4" />
                        ล้างตัวกรอง
                    </button>
                </div>
            )}
        </div>
    );
}
