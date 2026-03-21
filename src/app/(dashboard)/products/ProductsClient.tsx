'use client';

/**
 * Products Page Client Components
 * Export, Scanner, และ View Mode integration
 */

import { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, QrCode, Loader2, LayoutGrid, List, Edit, Trash2, ArrowUpDown, Upload, Gem, AlertTriangle } from 'lucide-react';
import { exportToExcel, exportToPDF, EXPORT_COLUMNS } from '@/lib/exportUtils';
import BarcodeScanner from '@/components/BarcodeScanner';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';

interface Product {
    p_id: string;
    p_name: string;
    p_count: number;
    p_unit: string | null;
    price_unit: number | string;
    safety_stock: number;
    main_category?: string | null;
    p_image?: string | null;
    tbl_categories?: { cat_name: string } | null;
    is_luxury?: boolean | null;
}

function getProductImageSrc(imagePath?: string | null): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/uploads/')) {
        return imagePath;
    }
    return `/uploads/${imagePath.replace(/^\/+/, '')}`;
}

interface ProductsToolbarProps {
    products: Product[];
    onSearch?: (term: string) => void;
}

export function ProductsToolbar({ products }: ProductsToolbarProps) {
    const [exporting, setExporting] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    // Prepare data for export
    const exportData = products.map(p => ({
        p_code: p.p_id,
        p_name: p.p_name,
        category_name: p.main_category || p.tbl_categories?.cat_name || '-',
        p_count: p.p_count,
        p_unit: p.p_unit,
        p_price: Number(p.price_unit).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        safety_stock: p.safety_stock,
    }));

    const handleExportExcel = async () => {
        setExporting('excel');
        try {
            await new Promise(r => setTimeout(r, 200));
            exportToExcel(exportData, EXPORT_COLUMNS.products, 'products');
        } finally {
            setExporting(null);
        }
    };

    const handleExportPDF = async () => {
        setExporting('pdf');
        try {
            await new Promise(r => setTimeout(r, 200));
            exportToPDF(exportData, EXPORT_COLUMNS.products, 'รายการสินค้าทั้งหมด', 'products');
        } finally {
            setExporting(null);
        }
    };

    const handleScan = (result: { code: string; format: string }) => {
        // Navigate to product or show search results
        window.location.href = `/products?search=${encodeURIComponent(result.code)}`;
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Scanner Button */}
            <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                title="สแกน Barcode"
            >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">สแกน</span>
            </button>

            {/* Import Button */}
            <Link
                href="/products/import"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                title="นำเข้าสินค้า (Excel)"
            >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">นำเข้า</span>
            </Link>

            {/* Export Excel */}
            <button
                onClick={handleExportExcel}
                disabled={exporting !== null || products.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                title="Export Excel"
            >
                {exporting === 'excel' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Export PDF */}
            <button
                onClick={handleExportPDF}
                disabled={exporting !== null || products.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                title="Export PDF"
            >
                {exporting === 'pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}

// ====== Products View Component ======
interface ProductsViewProps {
    products: Product[];
    isAdmin: boolean;
}

export function ProductsView({ products, isAdmin }: ProductsViewProps) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Read default view from localStorage on mount
    useEffect(() => {
        setMounted(true);
        try {
            const savedSettings = localStorage.getItem('systemSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.defaultView === 'grid' || settings.defaultView === 'list') {
                    setViewMode(settings.defaultView);
                }
            }
        } catch (e) {
            console.error('Error reading settings:', e);
        }
    }, []);

    // Filter products by search term and low stock
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.p_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.p_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLowStock = showLowStock ? p.p_count <= p.safety_stock : true;

        return matchesSearch && matchesLowStock;
    });

    // Sorting State
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (!sortColumn) return 0;

        let aValue: string | number = 0;
        let bValue: string | number = 0;

        // Default value extraction
        const aVal = a[sortColumn as keyof Product];
        const bVal = b[sortColumn as keyof Product];

        if (typeof aVal === 'string' || typeof aVal === 'number') {
            aValue = aVal;
        }
        if (typeof bVal === 'string' || typeof bVal === 'number') {
            bValue = bVal;
        }

        if (sortColumn === 'category') {
            aValue = a.main_category || a.tbl_categories?.cat_name || '';
            bValue = b.main_category || b.tbl_categories?.cat_name || '';
        } else if (sortColumn === 'status') {
            // Sort by stock status: positive stock = 1 (Available), zero/negative = 0 (Out of Stock)
            aValue = a.p_count > 0 ? 1 : 0;
            bValue = b.p_count > 0 ? 1 : 0;
        } else if (sortColumn === 'price_unit') {
            aValue = Number(a.price_unit);
            bValue = Number(b.price_unit);
        }

        if (aValue === bValue) return 0;

        // Handle sorting
        if (sortDirection === 'asc') {
            return aValue < bValue ? -1 : 1;
        } else {
            return aValue > bValue ? -1 : 1;
        }
    });

    // Avoid hydration mismatch
    if (!mounted) {
        return <div className="p-8 text-center text-gray-400">กำลังโหลด...</div>;
    }

    return (
        <div className="rounded-lg bg-white shadow overflow-hidden">
            {/* Search Bar with View Toggle */}
            <div className="border-b p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="ค้นหารหัส, ชื่อสินค้า..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {/* Low Stock Toggle */}
                <button
                    onClick={() => setShowLowStock(!showLowStock)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${showLowStock
                            ? 'bg-red-50 border-red-200 text-red-600 ring-2 ring-red-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    title={showLowStock ? 'แสดงทั้งหมด' : 'แสดงเฉพาะสินค้าใกล้หมด'}
                >
                    <AlertTriangle className={`w-4 h-4 ${showLowStock ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium hidden sm:inline">สินค้าใกล้หมด ({products.filter(p => p.p_count <= p.safety_stock).length})</span>
                </button>

                {/* View Toggle */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="แบบตาราง"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="แบบการ์ด"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* List/Table View */}
            {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-3">รูปภาพ</th>
                                <th
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('p_id')}
                                >
                                    <div className="flex items-center gap-1">
                                        รหัสสินค้า
                                        <ArrowUpDown className={`w-3 h-3 ${sortColumn === 'p_id' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('p_name')}
                                >
                                    <div className="flex items-center gap-1">
                                        ชื่อสินค้า
                                        <ArrowUpDown className={`w-3 h-3 ${sortColumn === 'p_name' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('category')}
                                >
                                    <div className="flex items-center gap-1">
                                        หมวดหมู่
                                        <ArrowUpDown className={`w-3 h-3 ${sortColumn === 'category' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('price_unit')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        ราคา/หน่วย
                                        <ArrowUpDown className={`w-3 h-3 ${sortColumn === 'price_unit' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('p_count')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        คงเหลือ
                                        <ArrowUpDown className={`w-3 h-3 ${sortColumn === 'p_count' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors group"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        สถานะ
                                        <ArrowUpDown className={`w-3 h-3 ${sortColumn === 'status' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </div>
                                </th>
                                {isAdmin && <th className="px-6 py-3 text-right">จัดการ</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-gray-400">
                                        ไม่พบข้อมูลสินค้า
                                    </td>
                                </tr>
                            ) : (
                                sortedProducts.map((product) => (
                                    <tr key={product.p_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                {getProductImageSrc(product.p_image) ? (
                                                    <ProductImage
                                                        src={getProductImageSrc(product.p_image)!}
                                                        alt={product.p_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-gray-400">NO IMG</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{product.p_id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {product.p_name}
                                                {product.is_luxury && (
                                                    <span title="สินค้าฟุ่มเฟือย">
                                                        <Gem className="w-4 h-4 text-purple-600" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                {product.main_category || product.tbl_categories?.cat_name || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">{Number(product.price_unit).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={product.p_count <= product.safety_stock ? 'text-red-600 font-bold' : ''}>
                                                {product.p_count} {product.p_unit}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {product.p_count > 0 ? (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                    พร้อมขาย
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                                    สินค้าหมด
                                                </span>
                                            )}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/products/${product.p_id}/edit`}
                                                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        className="rounded p-1 text-red-600 hover:bg-red-50"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Grid/Card View */
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedProducts.length === 0 ? (
                        <div className="col-span-full text-center text-gray-400 py-12">
                            ไม่พบข้อมูลสินค้า
                        </div>
                    ) : (
                        sortedProducts.map((product) => (
                            <div key={product.p_id} className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                {/* Image */}
                                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {getProductImageSrc(product.p_image) ? (
                                        <ProductImage
                                            src={getProductImageSrc(product.p_image)!}
                                            alt={product.p_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-gray-300 text-sm">NO IMAGE</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <p className="text-xs text-gray-400 mb-1">{product.p_id}</p>
                                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2" title={product.p_name}>
                                        {product.p_name}
                                        {product.is_luxury && (
                                            <span title="สินค้าฟุ่มเฟือย" className="inline-block ml-1 align-text-bottom">
                                                <Gem className="w-3.5 h-3.5 text-purple-600" />
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                            {product.main_category || product.tbl_categories?.cat_name || '-'}
                                        </span>
                                        <span className={`font-bold ${product.p_count <= product.safety_stock ? 'text-red-600' : 'text-green-600'}`}>
                                            {product.p_count} {product.p_unit}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-right font-bold text-blue-600">
                                        ฿{Number(product.price_unit).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </div>

                                    {/* Admin Actions */}
                                    {isAdmin && (
                                        <div className="mt-2 pt-2 border-t flex justify-end gap-1">
                                            <Link
                                                href={`/products/${product.p_id}/edit`}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                title="แก้ไข"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                            <button
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                title="ลบ"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pagination Placeholder */}
            <div className="border-t p-4 flex justify-between items-center text-sm text-gray-500">
                <span>แสดง {filteredProducts.length} จาก {products.length} รายการ</span>
            </div>
        </div>
    );
}

