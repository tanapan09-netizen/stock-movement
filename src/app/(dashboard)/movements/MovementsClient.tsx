'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, FilterX } from 'lucide-react';
import { FloatingSearchInput } from '@/components/FloatingField';
import MovementActions from '@/components/MovementActions';
import ProductImage from '@/components/ProductImage';
import { exportToExcel, EXPORT_COLUMNS } from '@/lib/exportUtils';

interface Movement {
    movement_id: number;
    p_id: string;
    movement_type: string;
    quantity: number;
    remarks: string | null;
    username: string | null;
    movement_time: Date | string;
    p_name: string;
    p_image: string | null;
}

interface MovementsClientProps {
    initialMovements: Movement[];
    total: number;
    isAdmin: boolean;
    currentPage: number;
    totalPages: number;
}

export default function MovementsClient({
    initialMovements,
    total,
    isAdmin,
    currentPage,
    totalPages
}: MovementsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isExporting, setIsExporting] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

    // Debounce search update
    const handleSearch = () => {
        applyFilters({ search: searchTerm, page: 1 });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') {
            setStartDate(value);
            // Auto apply if valid dates
            if (endDate && value) applyFilters({ startDate: value, endDate, page: 1 });
        } else {
            setEndDate(value);
            if (startDate && value) applyFilters({ startDate, endDate: value, page: 1 });
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        router.push(pathname);
    };

    const applyFilters = (newParams: any) => {
        const params = new URLSearchParams(searchParams.toString());

        // Merge new params
        Object.keys(newParams).forEach(key => {
            if (newParams[key]) {
                params.set(key, newParams[key]);
            } else {
                params.delete(key);
            }
        });

        // Ensure current state is used if not overridden
        if (searchTerm && !newParams.hasOwnProperty('search')) params.set('search', searchTerm);
        if (startDate && !newParams.hasOwnProperty('startDate')) params.set('startDate', startDate);
        if (endDate && !newParams.hasOwnProperty('endDate')) params.set('endDate', endDate);

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        applyFilters({ page: newPage });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Fetch all data matching current filters via API
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);

            const response = await fetch(`/api/movements/export?${params.toString()}`);
            if (!response.ok) throw new Error('Export failed');

            const { movements } = await response.json();

            // Prepare for export
            const exportData = movements.map((m: any) => ({
                date: new Date(m.movement_time).toLocaleString('th-TH'),
                product_name: m.p_name,
                type: m.movement_type,
                quantity: m.quantity,
                note: m.remarks || '',
                user: m.username || ''
            }));

            exportToExcel(exportData, EXPORT_COLUMNS.movements, 'movement_history');
        } catch (error) {
            console.error('Export failed', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    {/* Search */}
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-700 mb-1">ค้นหา</label>
                        <FloatingSearchInput
                            type="text"
                            label="ค้นหารายการเคลื่อนไหว"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            dense
                            className="text-sm"
                        />
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">ตั้งแต่วันที่</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">ถึงวันที่</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                            ค้นหา
                        </button>
                        {(searchTerm || startDate || endDate) && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                                title="ล้างตะกร้า"
                            >
                                <FilterX className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-3">วันที่/เวลา</th>
                                <th className="px-6 py-3">สินค้า</th>
                                <th className="px-6 py-3 text-center">ประเภท</th>
                                <th className="px-6 py-3 text-right">จำนวน</th>
                                <th className="px-6 py-3">ดำเนินการโดย</th>
                                <th className="px-6 py-3">หมายเหตุ</th>
                                {isAdmin && <th className="px-6 py-3 text-center">จัดการ</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {initialMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                        ไม่พบข้อมูลการเคลื่อนไหว
                                    </td>
                                </tr>
                            ) : (
                                initialMovements.map((m) => {
                                    const isIn = m.movement_type === 'in' || m.movement_type === 'add' || m.movement_type === 'รับเข้า';
                                    return (
                                        <tr key={m.movement_id} className={`hover:bg-gray-50 ${isPending ? 'opacity-50' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(m.movement_time).toLocaleString('th-TH')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100 border mr-3">
                                                        {m.p_image ? (
                                                            <ProductImage
                                                                src={`/uploads/${m.p_image}`}
                                                                alt={m.p_name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">NA</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{m.p_name}</div>
                                                        <div className="text-xs text-gray-500">{m.p_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}
                                                >
                                                    {isIn ? 'รับเข้า' : 'เบิกออก'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                                                {isIn ? '+' : '-'}{m.quantity.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {m.username || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={m.remarks || ''}>
                                                {m.remarks || '-'}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 text-center">
                                                    <MovementActions
                                                        movement={{
                                                            movement_id: m.movement_id,
                                                            p_id: m.p_id,
                                                            movement_type: m.movement_type,
                                                            quantity: m.quantity,
                                                            remarks: m.remarks,
                                                            username: m.username,
                                                            movement_time: new Date(m.movement_time)
                                                        }}
                                                        product={{
                                                            p_id: m.p_id,
                                                            p_name: m.p_name,
                                                            p_image: m.p_image
                                                        }}
                                                        isAdmin={isAdmin}
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between sm:px-6">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    แสดง <span className="font-medium">{Math.min((currentPage - 1) * 50 + 1, total)}</span> ถึง <span className="font-medium">{Math.min(currentPage * 50, total)}</span> จาก <span className="font-medium">{total}</span> รายการ
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                        หน้า {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
