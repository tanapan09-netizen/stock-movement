'use client';

/**
 * Products Page Client Components
 * Export, Scanner, และ View Mode integration
 */

import { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, QrCode, Loader2, LayoutGrid, List, Edit, Trash2, ArrowUpDown, Upload, Gem, AlertTriangle, Columns3, ArrowUp, ArrowDown, RotateCcw, GripVertical } from 'lucide-react';
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
    model_name?: string | null;
    brand_name?: string | null;
    brand_code?: string | null;
    size?: string | null;
    main_category?: string | null;
    main_category_code?: string | null;
    sub_category_code?: string | null;
    is_asset?: boolean | null;
    asset_current_location?: string | null;
    p_image?: string | null;
    tbl_categories?: { cat_name: string } | null;
    is_luxury?: boolean | null;
}

type ProductColumnId =
    | 'image'
    | 'p_id'
    | 'p_name'
    | 'model_name'
    | 'brand_name'
    | 'brand_code'
    | 'size'
    | 'category'
    | 'main_category_code'
    | 'sub_category_code'
    | 'is_asset'
    | 'asset_current_location'
    | 'price_unit'
    | 'p_count'
    | 'status'
    | 'actions';

const BASE_PRODUCT_COLUMN_ORDER: ProductColumnId[] = [
    'image',
    'p_id',
    'p_name',
    'model_name',
    'brand_name',
    'brand_code',
    'size',
    'category',
    'main_category_code',
    'sub_category_code',
    'is_asset',
    'asset_current_location',
    'price_unit',
    'p_count',
    'status',
];

const ADMIN_PRODUCT_COLUMN_ORDER: ProductColumnId[] = [...BASE_PRODUCT_COLUMN_ORDER, 'actions'];

const COLUMN_LABELS: Record<ProductColumnId, string> = {
    image: 'รูปภาพ',
    p_id: 'รหัสสินค้า',
    p_name: 'ชื่อสินค้า',
    model_name: 'ชื่อรุ่น',
    brand_name: 'ชื่อแบรนด์',
    brand_code: 'รหัสแบรนด์',
    size: 'ขนาด',
    category: 'หมวดหมู่',
    main_category_code: 'Code หมวดหลัก',
    sub_category_code: 'Code หมวดรอง',
    is_asset: 'เป็นทรัพย์สิน',
    asset_current_location: 'ที่อยู่ปัจจุบันของทรัพย์สิน',
    price_unit: 'ราคา/หน่วย',
    p_count: 'คงเหลือ',
    status: 'สถานะ',
    actions: 'จัดการ',
};

const SORTABLE_COLUMNS = new Set<ProductColumnId>([
    'p_id',
    'p_name',
    'model_name',
    'brand_name',
    'brand_code',
    'size',
    'category',
    'main_category_code',
    'sub_category_code',
    'is_asset',
    'asset_current_location',
    'price_unit',
    'p_count',
    'status',
]);

function getDefaultColumnOrder(isAdmin: boolean): ProductColumnId[] {
    return isAdmin ? ADMIN_PRODUCT_COLUMN_ORDER : BASE_PRODUCT_COLUMN_ORDER;
}

function normalizeColumnOrder(raw: unknown, isAdmin: boolean): ProductColumnId[] {
    const defaultOrder = getDefaultColumnOrder(isAdmin);
    if (!Array.isArray(raw)) return defaultOrder;

    const validSet = new Set(defaultOrder);
    const seen = new Set<ProductColumnId>();
    const ordered = raw
        .filter((id): id is ProductColumnId => typeof id === 'string' && validSet.has(id as ProductColumnId))
        .filter((id) => {
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

    for (const id of defaultOrder) {
        if (!seen.has(id)) ordered.push(id);
    }
    return ordered;
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
        main_category_code: p.main_category_code ?? '',
        sub_category_code: p.sub_category_code ?? '',
        is_asset: p.is_asset ? 'ใช่' : 'ไม่ใช่',
        asset_current_location: p.asset_current_location ?? '',
        p_count: p.p_count,
        p_unit: p.p_unit,
        p_price: Number(p.price_unit).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        safety_stock: p.safety_stock,
        model_name: p.model_name ?? '',
        brand_name: p.brand_name ?? '',
        brand_code: p.brand_code ?? '',
        size: p.size ?? '',
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
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [columnOrder, setColumnOrder] = useState<ProductColumnId[]>(() => getDefaultColumnOrder(isAdmin));
    const [draggingColumn, setDraggingColumn] = useState<ProductColumnId | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<ProductColumnId | null>(null);
    const columnStorageKey = `products_column_order_${isAdmin ? 'admin' : 'user'}`;

    // Read default view from localStorage on mount
    useEffect(() => {
        let nextViewMode: 'list' | 'grid' | null = null;
        let nextColumnOrder: ProductColumnId[] | null = null;

        try {
            const savedSettings = localStorage.getItem('systemSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.defaultView === 'grid' || settings.defaultView === 'list') {
                    nextViewMode = settings.defaultView;
                }
            }
            const savedColumns = localStorage.getItem(columnStorageKey);
            if (savedColumns) {
                const parsed = JSON.parse(savedColumns);
                nextColumnOrder = normalizeColumnOrder(parsed, isAdmin);
            }
        } catch (e) {
            console.error('Error reading settings:', e);
        }

        const timeoutId = window.setTimeout(() => {
            if (nextViewMode) {
                setViewMode(nextViewMode);
            }
            if (nextColumnOrder) {
                setColumnOrder(nextColumnOrder);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [columnStorageKey, isAdmin]);

    
    const filteredProducts = products.filter(p => {
        const normalizedSearch = searchTerm.toLowerCase();
        const matchesSearch = p.p_name.toLowerCase().includes(normalizedSearch) ||
            p.p_id.toLowerCase().includes(normalizedSearch) ||
            (p.main_category_code || '').toLowerCase().includes(normalizedSearch) ||
            (p.sub_category_code || '').toLowerCase().includes(normalizedSearch) ||
            (p.asset_current_location || '').toLowerCase().includes(normalizedSearch);
        const matchesLowStock = showLowStock ? p.p_count <= p.safety_stock : true;

        return matchesSearch && matchesLowStock;
    });

    
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

        let aValue: string | number = '';
        let bValue: string | number = '';

        // Default value extraction
        const aVal = a[sortColumn as keyof Product];
        const bVal = b[sortColumn as keyof Product];

        if (aVal === null || aVal === undefined) aValue = '';
        else if (typeof aVal === 'string' || typeof aVal === 'number') aValue = aVal;

        if (bVal === null || bVal === undefined) bValue = '';
        else if (typeof bVal === 'string' || typeof bVal === 'number') bValue = bVal;

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
        } else if (sortColumn === 'is_asset') {
            aValue = a.is_asset ? 1 : 0;
            bValue = b.is_asset ? 1 : 0;
        }

        if (aValue === bValue) return 0;

        // Handle sorting
        if (sortDirection === 'asc') {
            return aValue < bValue ? -1 : 1;
        } else {
            return aValue > bValue ? -1 : 1;
        }
    });

    const moveColumn = (columnId: ProductColumnId, direction: 'up' | 'down') => {
        setColumnOrder((current) => {
            const index = current.indexOf(columnId);
            if (index === -1) return current;
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= current.length) return current;

            const next = [...current];
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            localStorage.setItem(columnStorageKey, JSON.stringify(next));
            return next;
        });
    };

    const reorderColumns = (draggedColumn: ProductColumnId, targetColumn: ProductColumnId) => {
        if (draggedColumn === targetColumn) return;
        setColumnOrder((current) => {
            const fromIndex = current.indexOf(draggedColumn);
            const toIndex = current.indexOf(targetColumn);
            if (fromIndex === -1 || toIndex === -1) return current;

            const next = [...current];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            localStorage.setItem(columnStorageKey, JSON.stringify(next));
            return next;
        });
    };

    const resetColumnOrder = () => {
        const defaultOrder = getDefaultColumnOrder(isAdmin);
        setColumnOrder(defaultOrder);
        localStorage.setItem(columnStorageKey, JSON.stringify(defaultOrder));
    };

    const renderCellValue = (columnId: ProductColumnId, product: Product) => {
        switch (columnId) {
            case 'image':
                return (
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                        {getProductImageSrc(product.p_image) ? (
                            <ProductImage
                                src={getProductImageSrc(product.p_image)!}
                                alt={product.p_name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-xs text-gray-400">NO IMG</span>
                        )}
                    </div>
                );
            case 'p_id':
                return <span className="font-medium text-gray-900">{product.p_id}</span>;
            case 'p_name':
                return (
                    <div className="flex items-center gap-2">
                        {product.p_name}
                        {product.is_luxury && (
                            <span title="สินค้าฟุ่มเฟือย">
                                <Gem className="h-4 w-4 text-purple-600" />
                            </span>
                        )}
                    </div>
                );
            case 'model_name':
                return product.model_name ?? '';
            case 'brand_name':
                return product.brand_name ?? '';
            case 'brand_code':
                return product.brand_code ?? '';
            case 'size':
                return product.size ?? '';
            case 'category':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {product.main_category || product.tbl_categories?.cat_name || '-'}
                    </span>
                );
            case 'main_category_code':
                return product.main_category_code || '-';
            case 'sub_category_code':
                return product.sub_category_code || '-';
            case 'is_asset':
                return product.is_asset ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                        ใช่
                    </span>
                ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        ไม่ใช่
                    </span>
                );
            case 'asset_current_location':
                return product.asset_current_location || '-';
            case 'price_unit':
                return Number(product.price_unit).toFixed(2);
            case 'p_count':
                return (
                    <span className={product.p_count <= product.safety_stock ? 'font-bold text-red-600' : ''}>
                        {product.p_count} {product.p_unit}
                    </span>
                );
            case 'status':
                return product.p_count > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        พร้อมขาย
                    </span>
                ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        สินค้าหมด
                    </span>
                );
            case 'actions':
                return isAdmin ? (
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
                ) : null;
            default:
                return null;
        }
    };

    const getCellClassName = (columnId: ProductColumnId) => {
        if (columnId === 'price_unit' || columnId === 'p_count' || columnId === 'actions') return 'px-4 py-3 text-right';
        if (columnId === 'is_asset' || columnId === 'status') return 'px-4 py-3 text-center';
        return 'px-4 py-3';
    };

    const visibleColumns = columnOrder.filter((columnId) => isAdmin || columnId !== 'actions');

    const handleViewModeChange = (mode: 'list' | 'grid') => {
        setViewMode(mode);
        if (mode !== 'list') {
            setShowColumnManager(false);
        }
    };

    return (
        <div className="rounded-lg bg-white shadow">
            {/* Search Bar with View Toggle */}
            <div className="border-b bg-white p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="ค้นหารหัส, ชื่อ, code หมวด, ที่อยู่ทรัพย์สิน..."
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
                        onClick={() => handleViewModeChange('list')}
                        className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="แบบตาราง"
                    >
                        <List className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => handleViewModeChange('grid')}
                        className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="แบบการ์ด"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowColumnManager((prev) => !prev)}
                        disabled={viewMode !== 'list'}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${viewMode === 'list'
                                ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                : 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400'
                            }`}
                        title={viewMode === 'list' ? 'สลับลำดับคอลัมน์' : 'สลับคอลัมน์ได้เฉพาะมุมมองตาราง'}
                    >
                        <Columns3 className="h-4 w-4" />
                        <span className="hidden sm:inline">คอลัมน์</span>
                    </button>

                    {showColumnManager && viewMode === 'list' && (
                        <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                                <p className="text-sm font-semibold text-gray-700">สลับลำดับคอลัมน์</p>
                                <button
                                    type="button"
                                    onClick={resetColumnOrder}
                                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    รีเซ็ต
                                </button>
                            </div>
                            <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                                {visibleColumns.map((columnId, index) => (
                                    <div
                                        key={columnId}
                                        draggable
                                        onDragStart={(event) => {
                                            setDraggingColumn(columnId);
                                            event.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            if (dragOverColumn !== columnId) {
                                                setDragOverColumn(columnId);
                                            }
                                        }}
                                        onDragLeave={() => {
                                            if (dragOverColumn === columnId) {
                                                setDragOverColumn(null);
                                            }
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (draggingColumn) {
                                                reorderColumns(draggingColumn, columnId);
                                            }
                                            setDraggingColumn(null);
                                            setDragOverColumn(null);
                                        }}
                                        onDragEnd={() => {
                                            setDraggingColumn(null);
                                            setDragOverColumn(null);
                                        }}
                                        className={`flex items-center justify-between rounded-lg border px-2 py-1.5 transition-colors ${dragOverColumn === columnId
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-gray-100 bg-white'
                                            } ${draggingColumn === columnId ? 'opacity-60' : ''}`}
                                    >
                                        <div className="flex min-w-0 items-center gap-2 pr-2">
                                            <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                            <span className="truncate text-sm text-gray-700">
                                                {index + 1}. {COLUMN_LABELS[columnId]}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moveColumn(columnId, 'up')}
                                                disabled={index === 0}
                                                className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                title="เลื่อนขึ้น"
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveColumn(columnId, 'down')}
                                                disabled={index === visibleColumns.length - 1}
                                                className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                title="เลื่อนลง"
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* List/Table View */}
            {viewMode === 'list' ? (
                <div className="relative w-full overflow-x-auto overflow-y-visible overscroll-x-contain">
                    <table className="relative min-w-[1500px] w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                {visibleColumns.map((columnId) => {
                                    const sortable = SORTABLE_COLUMNS.has(columnId);
                                    const alignClass = columnId === 'price_unit' || columnId === 'p_count' || columnId === 'actions'
                                        ? 'text-right'
                                        : columnId === 'is_asset' || columnId === 'status'
                                            ? 'text-center'
                                            : 'text-left';
                                    const thClass = `sticky top-16 z-20 whitespace-nowrap border-b border-gray-200 bg-gray-50 px-4 py-3 ${alignClass} ${sortable ? 'group cursor-pointer hover:bg-gray-100 transition-colors' : ''}`;

                                    return (
                                        <th
                                            key={columnId}
                                            className={thClass}
                                            onClick={sortable ? () => handleSort(columnId) : undefined}
                                        >
                                            <div className={`flex items-center gap-1 ${alignClass === 'text-right' ? 'justify-end' : alignClass === 'text-center' ? 'justify-center' : ''}`}>
                                                {COLUMN_LABELS[columnId]}
                                                {sortable && (
                                                    <ArrowUpDown className={`h-3 w-3 ${sortColumn === columnId ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-400">
                                        ไม่พบข้อมูลสินค้า
                                    </td>
                                </tr>
                            ) : (
                                sortedProducts.map((product) => (
                                    <tr key={product.p_id} className="hover:bg-gray-50">
                                        {visibleColumns.map((columnId) => (
                                            <td key={`${product.p_id}-${columnId}`} className={getCellClassName(columnId)}>
                                                {renderCellValue(columnId, product)}
                                            </td>
                                        ))}
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
                                    <div className="mt-1 text-[11px] text-gray-500">
                                        <span className="mr-2">หลัก: {product.main_category_code || '-'}</span>
                                        <span>รอง: {product.sub_category_code || '-'}</span>
                                    </div>
                                    {product.is_asset && (
                                        <div className="mt-1 rounded bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700">
                                            ทรัพย์สิน: {product.asset_current_location || '-'}
                                        </div>
                                    )}
                                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-500">
                                        <span className="truncate" title={product.model_name ?? ''}>
                                            รุ่น: {product.model_name || '-'}
                                        </span>
                                        <span className="truncate" title={product.size ?? ''}>
                                            ขนาด: {product.size || '-'}
                                        </span>
                                        <span className="truncate" title={product.brand_name ?? ''}>
                                            แบรนด์: {product.brand_name || '-'}
                                        </span>
                                        <span className="truncate" title={product.brand_code ?? ''}>
                                            รหัส: {product.brand_code || '-'}
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


