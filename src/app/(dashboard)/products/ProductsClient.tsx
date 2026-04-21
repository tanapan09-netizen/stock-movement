'use client';

/**
 * Products Page Client Components
 * Export, Scanner, และ View Mode integration
 */

import { useState, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { FloatingSearchInput } from '@/components/FloatingField';
import { FileSpreadsheet, FileText, QrCode, Loader2, LayoutGrid, List, Edit, Trash2, ArrowUpDown, Upload, Gem, AlertTriangle, Columns3, ArrowUp, ArrowDown, RotateCcw, GripVertical, Package, X, Image as ImageIcon } from 'lucide-react';
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
    sub_sub_category_code?: string | null;
    is_asset?: boolean | null;
    asset_current_location?: string | null;
    p_image?: string | null;
    tbl_categories?: { cat_name: string } | null;
    is_luxury?: boolean | null;
}

interface ImagePreviewState {
    src: string;
    alt: string;
    left: number;
    top: number;
}

function isBelowSafetyStock(product: Pick<Product, 'p_count' | 'safety_stock'>): boolean {
    return product.p_count < product.safety_stock;
}

function isAtSafetyStock(product: Pick<Product, 'p_count' | 'safety_stock'>): boolean {
    return product.p_count === product.safety_stock;
}

function isOutOfStock(product: Pick<Product, 'p_count' | 'safety_stock'>): boolean {
    return product.p_count <= 0 && !isAtSafetyStock(product);
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
    | 'sub_sub_category_code'
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
    'sub_sub_category_code',
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
    sub_sub_category_code: 'Code ย่อย',
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
    'sub_sub_category_code',
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
    const normalizedInput = imagePath.trim().replace(/\\/g, '/');
    if (!normalizedInput) return null;

    if (
        normalizedInput.startsWith('http://') ||
        normalizedInput.startsWith('https://') ||
        normalizedInput.startsWith('data:image/')
    ) {
        return normalizedInput;
    }

    if (normalizedInput.startsWith('storage.googleapis.com/')) {
        return `https://${normalizedInput}`;
    }

    if (normalizedInput.startsWith('/uploads/')) {
        return normalizedInput;
    }

    if (normalizedInput.startsWith('uploads/')) {
        return `/${normalizedInput}`;
    }

    if (normalizedInput.startsWith('public/uploads/')) {
        return `/${normalizedInput.replace(/^public\//, '')}`;
    }

    const uploadsIndex = normalizedInput.indexOf('/uploads/');
    if (uploadsIndex >= 0) {
        return normalizedInput.slice(uploadsIndex);
    }

    const publicUploadsIndex = normalizedInput.indexOf('public/uploads/');
    if (publicUploadsIndex >= 0) {
        return `/${normalizedInput.slice(publicUploadsIndex).replace(/^public\//, '')}`;
    }

    // Legacy values may store only file name or folder/file without leading slash.
    const normalized = normalizedInput.replace(/^\/+/, '');
    if (normalized.includes('/')) {
        return `/${normalized}`;
    }
    return `/uploads/products/${normalized}`;
}

const IMAGE_PREVIEW_WIDTH = 288;
const IMAGE_PREVIEW_HEIGHT = 320;
const IMAGE_PREVIEW_MARGIN = 14;

function getImagePreviewPositionFromPointer(clientX: number, clientY: number) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const prefersRight = clientX + IMAGE_PREVIEW_MARGIN + IMAGE_PREVIEW_WIDTH <= viewportWidth - 8;
    const left = prefersRight
        ? clientX + IMAGE_PREVIEW_MARGIN
        : Math.max(8, clientX - IMAGE_PREVIEW_WIDTH - IMAGE_PREVIEW_MARGIN);
    const centeredTop = clientY - IMAGE_PREVIEW_HEIGHT / 2;
    const top = Math.min(
        Math.max(8, centeredTop),
        Math.max(8, viewportHeight - IMAGE_PREVIEW_HEIGHT - 8),
    );
    return { left, top };
}

interface ProductsToolbarProps {
    products: Product[];
    canImport: boolean;
}

export function ProductsToolbar({ products, canImport }: ProductsToolbarProps) {
    const [exporting, setExporting] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    // Prepare data for export
    const exportData = products.map(p => ({
        p_code: p.p_id,
        p_name: p.p_name,
        category_name: p.main_category || p.tbl_categories?.cat_name || '-',
        main_category_code: p.main_category_code ?? '',
        sub_category_code: p.sub_category_code ?? '',
        sub_sub_category_code: p.sub_sub_category_code ?? '',
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
            await exportToPDF(exportData, EXPORT_COLUMNS.products, 'รายการสินค้าทั้งหมด', 'products');
        } finally {
            setExporting(null);
        }
    };

    const handleScan = (result: { code: string; format: string }) => {
        // Navigate to product or show search results
        window.location.href = `/products?search=${encodeURIComponent(result.code)}`;
    };

    const exportDisabled = exporting !== null || products.length === 0;

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm">
            {/* Scanner Button */}
            <button
                onClick={() => setShowScanner(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-purple-600 px-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                title="สแกน Barcode"
                aria-label="สแกนบาร์โค้ดสินค้า"
            >
                <QrCode className="w-4 h-4" />
                <span>สแกน</span>
            </button>

            {canImport && (
                <div className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 p-1" aria-label="กลุ่มปุ่มนำเข้าข้อมูล">
                    <span className="px-2 text-xs font-semibold tracking-wide text-blue-700">นำเข้า</span>
                    <Link
                        href="/products/import"
                        className="inline-flex h-10 w-[118px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                        title="นำเข้าสินค้า (Excel)"
                        aria-label="นำเข้าข้อมูลสินค้าจากไฟล์ Excel"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Excel</span>
                    </Link>
                </div>
            )}

            <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 p-1" aria-label="กลุ่มปุ่มส่งออกข้อมูล">
                <span className="px-2 text-xs font-semibold tracking-wide text-emerald-700">ส่งออก</span>
                <button
                    onClick={handleExportExcel}
                    disabled={exportDisabled}
                    className="inline-flex h-10 w-[118px] items-center justify-center gap-2 rounded-md bg-green-600 px-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2"
                    title="Export Excel"
                    aria-label="ส่งออกข้อมูลสินค้าเป็นไฟล์ Excel"
                >
                    {exporting === 'excel' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                    )}
                    <span>Excel</span>
                </button>

                <button
                    onClick={handleExportPDF}
                    disabled={exportDisabled}
                    className="inline-flex h-10 w-[118px] items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                    title="Export PDF"
                    aria-label="ส่งออกข้อมูลสินค้าเป็นไฟล์ PDF"
                >
                    {exporting === 'pdf' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FileText className="w-4 h-4" />
                    )}
                    <span>PDF</span>
                </button>
            </div>

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
    const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false);
    const [showAssetOnly, setShowAssetOnly] = useState(false);
    const [showHasImageOnly, setShowHasImageOnly] = useState(false);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [columnOrder, setColumnOrder] = useState<ProductColumnId[]>(() => getDefaultColumnOrder(isAdmin));
    const [draggingColumn, setDraggingColumn] = useState<ProductColumnId | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<ProductColumnId | null>(null);
    const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
    const columnStorageKey = `products_column_order_${isAdmin ? 'admin' : 'user'}`;
    const lowStockCount = products.filter(isBelowSafetyStock).length;
    const outOfStockCount = products.filter(isOutOfStock).length;
    const assetCount = products.filter((product) => Boolean(product.is_asset)).length;
    const hasImageCount = products.filter((product) => Boolean(getProductImageSrc(product.p_image))).length;
    const hasSearchFilter = searchTerm.trim().length > 0;
    const hasActiveQuickFilters = showOutOfStockOnly || showAssetOnly || showHasImageOnly;
    const hasActiveFilters = hasSearchFilter || showLowStock || hasActiveQuickFilters;

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

    useEffect(() => {
        const closePreview = () => setImagePreview(null);
        window.addEventListener('scroll', closePreview, true);
        window.addEventListener('resize', closePreview);
        return () => {
            window.removeEventListener('scroll', closePreview, true);
            window.removeEventListener('resize', closePreview);
        };
    }, []);

    
    const filteredProducts = products.filter(p => {
        const normalizedSearch = searchTerm.toLowerCase();
        const matchesSearch = p.p_name.toLowerCase().includes(normalizedSearch) ||
            p.p_id.toLowerCase().includes(normalizedSearch) ||
            (p.main_category_code || '').toLowerCase().includes(normalizedSearch) ||
            (p.sub_category_code || '').toLowerCase().includes(normalizedSearch) ||
            (p.sub_sub_category_code || '').toLowerCase().includes(normalizedSearch) ||
            (p.asset_current_location || '').toLowerCase().includes(normalizedSearch);
        const matchesLowStock = showLowStock ? isBelowSafetyStock(p) : true;
        const matchesOutOfStock = showOutOfStockOnly ? isOutOfStock(p) : true;
        const matchesAssetOnly = showAssetOnly ? Boolean(p.is_asset) : true;
        const matchesHasImageOnly = showHasImageOnly ? Boolean(getProductImageSrc(p.p_image)) : true;

        return matchesSearch && matchesLowStock && matchesOutOfStock && matchesAssetOnly && matchesHasImageOnly;
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
            // Sort by stock status: ready = 2, equal safety stock = 1, out of stock = 0
            aValue = isOutOfStock(a) ? 0 : isAtSafetyStock(a) ? 1 : 2;
            bValue = isOutOfStock(b) ? 0 : isAtSafetyStock(b) ? 1 : 2;
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
            case 'image': {
                const imageSrc = getProductImageSrc(product.p_image);
                return (
                    <div
                        className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center"
                        onMouseEnter={imageSrc ? (event) => handleImageMouseEnter(event, imageSrc, product.p_name) : undefined}
                        onMouseMove={imageSrc ? (event) => handleImageMouseMove(event, imageSrc, product.p_name) : undefined}
                        onMouseLeave={imageSrc ? handleImageMouseLeave : undefined}
                    >
                        {imageSrc ? (
                            <ProductImage
                                src={imageSrc}
                                alt={product.p_name}
                                className="h-full w-full object-cover cursor-zoom-in"
                            />
                        ) : (
                            <span className="text-xs text-gray-400">NO IMG</span>
                        )}
                    </div>
                );
            }
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
            case 'sub_sub_category_code':
                return product.sub_sub_category_code || '-';
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
                    <span className={isBelowSafetyStock(product) ? 'font-bold text-red-600' : ''}>
                        {product.p_count} {product.p_unit}
                    </span>
                );
            case 'status':
                return isOutOfStock(product) ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        สินค้าหมด
                    </span>
                ) : isAtSafetyStock(product) ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        เท่าจุดสั่งซื้อ
                    </span>
                ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        พร้อมขาย
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

    const clearFilters = () => {
        setSearchTerm('');
        setShowLowStock(false);
        setShowOutOfStockOnly(false);
        setShowAssetOnly(false);
        setShowHasImageOnly(false);
    };

    const showImagePreview = (
        event: ReactMouseEvent<HTMLElement>,
        imageSrc: string,
        imageAlt: string,
    ) => {
        const { left, top } = getImagePreviewPositionFromPointer(event.clientX, event.clientY);
        setImagePreview({
            src: imageSrc,
            alt: imageAlt,
            left,
            top,
        });
    };

    const handleImageMouseEnter = (
        event: ReactMouseEvent<HTMLElement>,
        imageSrc: string,
        imageAlt: string,
    ) => {
        showImagePreview(event, imageSrc, imageAlt);
    };

    const handleImageMouseMove = (
        event: ReactMouseEvent<HTMLElement>,
        imageSrc: string,
        imageAlt: string,
    ) => {
        showImagePreview(event, imageSrc, imageAlt);
    };

    const handleImageMouseLeave = () => {
        setImagePreview(null);
    };

    return (
        <div className="rounded-lg bg-white shadow">
            {/* Search Bar with View Toggle */}
            <div className="border-b border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-start gap-3 lg:items-center">
                    <div className="min-w-[240px] flex-1">
                        <FloatingSearchInput
                            label="ค้นหารหัส, ชื่อ, code หลัก/รอง/ย่อย, ที่อยู่ทรัพย์สิน"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="focus:ring-blue-500/20"
                        />
                    </div>

                    {/* Low Stock Toggle */}
                    <button
                        onClick={() => setShowLowStock(!showLowStock)}
                        className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${showLowStock
                                ? 'border-red-200 bg-red-50 text-red-700 ring-2 ring-red-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        title={showLowStock ? 'แสดงทั้งหมด' : 'แสดงเฉพาะสินค้าใกล้หมด'}
                        aria-pressed={showLowStock}
                    >
                        <AlertTriangle className={`h-4 w-4 ${showLowStock ? 'fill-current' : ''}`} />
                        <span className="hidden sm:inline">สินค้าใกล้หมด ({lowStockCount})</span>
                    </button>

                    {/* View Toggle */}
                    <div className="flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white" role="tablist" aria-label="รูปแบบการแสดงผลสินค้า">
                        <button
                            onClick={() => handleViewModeChange('list')}
                            className={`h-full px-3 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            title="แบบตาราง"
                            aria-pressed={viewMode === 'list'}
                        >
                            <List className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => handleViewModeChange('grid')}
                            className={`h-full px-3 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            title="แบบการ์ด"
                            aria-pressed={viewMode === 'grid'}
                        >
                            <LayoutGrid className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowColumnManager((prev) => !prev)}
                            disabled={viewMode !== 'list'}
                            className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${viewMode === 'list'
                                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
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

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50"
                            title="ล้างตัวกรองทั้งหมด"
                        >
                            <X className="h-4 w-4" />
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Quick filters">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Filter</span>
                    <button
                        type="button"
                        onClick={() => setShowOutOfStockOnly((prev) => !prev)}
                        aria-pressed={showOutOfStockOnly}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                            showOutOfStockOnly
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        title="แสดงเฉพาะสินค้าที่หมด"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        เฉพาะสินค้าหมด ({outOfStockCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAssetOnly((prev) => !prev)}
                        aria-pressed={showAssetOnly}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                            showAssetOnly
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        title="แสดงเฉพาะสินค้าที่เป็นทรัพย์สิน"
                    >
                        <Gem className="h-4 w-4" />
                        เฉพาะทรัพย์สิน ({assetCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowHasImageOnly((prev) => !prev)}
                        aria-pressed={showHasImageOnly}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                            showHasImageOnly
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        title="แสดงเฉพาะสินค้าที่มีรูปภาพ"
                    >
                        <ImageIcon className="h-4 w-4" />
                        มีรูปภาพ ({hasImageCount})
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600" role="status" aria-live="polite">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">ทั้งหมด {products.length} รายการ</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">ใกล้หมด {lowStockCount}</span>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">สินค้าหมด {outOfStockCount}</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">ทรัพย์สิน {assetCount}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">มีรูป {hasImageCount}</span>
                    {hasActiveFilters && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">ผลลัพธ์ที่กรองแล้ว {filteredProducts.length}</span>
                    )}
                </div>
            </div>

            {/* List/Table View */}
            {viewMode === 'list' ? (
                <div className="w-full overflow-x-auto">
                    <table className="relative min-w-[1500px] w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                            <tr>
                                {visibleColumns.map((columnId) => {
                                    const sortable = SORTABLE_COLUMNS.has(columnId);
                                    const isSorted = sortColumn === columnId;
                                    const alignClass = columnId === 'price_unit' || columnId === 'p_count' || columnId === 'actions'
                                        ? 'text-right'
                                        : columnId === 'is_asset' || columnId === 'status'
                                            ? 'text-center'
                                            : 'text-left';
                                    const thClass = `sticky top-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 ${alignClass}`;

                                    return (
                                        <th
                                            key={columnId}
                                            scope="col"
                                            className={thClass}
                                            aria-sort={sortable ? (isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                                        >
                                            {sortable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort(columnId)}
                                                    className={`group inline-flex w-full items-center gap-1 ${alignClass === 'text-right' ? 'justify-end' : alignClass === 'text-center' ? 'justify-center' : 'justify-start'} hover:text-slate-900`}
                                                >
                                                    {COLUMN_LABELS[columnId]}
                                                    <ArrowUpDown className={`h-3 w-3 ${isSorted ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                                </button>
                                            ) : (
                                                <div className={`flex items-center gap-1 ${alignClass === 'text-right' ? 'justify-end' : alignClass === 'text-center' ? 'justify-center' : ''}`}>
                                                    {COLUMN_LABELS[columnId]}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {sortedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length} className="px-6 py-12">
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="rounded-full bg-slate-100 p-3 text-slate-500">
                                                <Package className="h-6 w-6" />
                                            </div>
                                            <p className="text-base font-medium text-slate-700">ไม่พบข้อมูลสินค้าที่ตรงเงื่อนไข</p>
                                            <p className="text-sm text-slate-500">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด</p>
                                            {hasActiveFilters && (
                                                <button
                                                    type="button"
                                                    onClick={clearFilters}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                >
                                                    <X className="h-4 w-4" />
                                                    ล้างตัวกรอง
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedProducts.map((product) => (
                                    <tr
                                        key={product.p_id}
                                        className={`${isOutOfStock(product)
                                                ? 'bg-red-50/30 hover:bg-red-50/60'
                                                : isBelowSafetyStock(product)
                                                    ? 'bg-amber-50/30 hover:bg-amber-50/50'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                    >
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
                        <div className="col-span-full py-12">
                            <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
                                <div className="rounded-full bg-slate-100 p-3 text-slate-500">
                                    <Package className="h-6 w-6" />
                                </div>
                                <p className="text-base font-medium text-slate-700">ไม่พบข้อมูลสินค้าที่ตรงเงื่อนไข</p>
                                <p className="text-sm text-slate-500">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อแสดงรายการทั้งหมด</p>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <X className="h-4 w-4" />
                                        ล้างตัวกรอง
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        sortedProducts.map((product) => (
                            <div key={product.p_id} className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                {/* Image */}
                                {(() => {
                                    const imageSrc = getProductImageSrc(product.p_image);
                                    return (
                                        <div
                                            className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden"
                                            onMouseEnter={imageSrc ? (event) => handleImageMouseEnter(event, imageSrc, product.p_name) : undefined}
                                            onMouseMove={imageSrc ? (event) => handleImageMouseMove(event, imageSrc, product.p_name) : undefined}
                                            onMouseLeave={imageSrc ? handleImageMouseLeave : undefined}
                                        >
                                            {imageSrc ? (
                                                <ProductImage
                                                    src={imageSrc}
                                                    alt={product.p_name}
                                                    className="w-full h-full object-cover cursor-zoom-in"
                                                />
                                            ) : (
                                                <span className="text-gray-300 text-sm">NO IMAGE</span>
                                            )}
                                        </div>
                                    );
                                })()}

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
                                        <span className={`font-bold ${isBelowSafetyStock(product) ? 'text-red-600' : 'text-green-600'}`}>
                                            {product.p_count} {product.p_unit}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-gray-500">
                                        <span className="mr-2">หลัก: {product.main_category_code || '-'}</span>
                                        <span className="mr-2">รอง: {product.sub_category_code || '-'}</span>
                                        <span>ย่อย: {product.sub_sub_category_code || '-'}</span>
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

            {imagePreview && (
                <div
                    className="pointer-events-none fixed z-[9999] w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
                    style={{ left: imagePreview.left, top: imagePreview.top }}
                    role="status"
                    aria-live="polite"
                >
                    <div className="h-64 w-full overflow-hidden rounded-lg bg-slate-100">
                        <ProductImage
                            src={imagePreview.src}
                            alt={imagePreview.alt}
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{imagePreview.alt}</p>
                </div>
            )}

            {/* Pagination Placeholder */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" role="status" aria-live="polite">
                <span>
                    แสดง {filteredProducts.length} จาก {products.length} รายการ
                </span>
                {hasActiveFilters && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                        มีตัวกรองที่ใช้งานอยู่
                    </span>
                )}
            </div>
        </div>
    );
}
