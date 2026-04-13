import Link from 'next/link';
import { FloatingSearchInput } from '@/components/FloatingField';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Boxes, CircleAlert, Filter, Warehouse } from 'lucide-react';

type SearchParams = {
    warehouse_id?: string;
    q?: string;
    low?: string;
    status?: string;
};

type PageProps = {
    searchParams?: Promise<SearchParams>;
};

type ReportStatusType = 'normal' | 'low_stock' | 'pending_withdrawal';
type StatusFilter = 'all' | ReportStatusType;

type ReportItem = {
    warehouseId: number;
    warehouseCode: string;
    warehouseName: string;
    p_id: string;
    p_name: string;
    category: string;
    supplier: string;
    quantity: number;
    minStock: number;
    unit: string;
    totalValue: number;
    lastUpdated: Date | null;
    statusType: ReportStatusType;
};

export const metadata = {
    title: 'รายงานสินค้าคงคลังแต่ละคลัง | Stock Movement',
    description: 'รายงานสินค้าแยกตามคลัง พร้อมสถานะคงเหลือและรายการเบิก',
};

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'normal', 'low_stock', 'pending_withdrawal'];

const STATUS_LABELS: Record<ReportStatusType, string> = {
    normal: 'ปกติ',
    low_stock: 'ต่ำกว่าเกณฑ์',
    pending_withdrawal: 'มีรายการเบิก',
};

const STATUS_BADGE_CLASSNAMES: Record<ReportStatusType, string> = {
    normal: 'bg-emerald-100 text-emerald-700',
    low_stock: 'bg-red-100 text-red-700',
    pending_withdrawal: 'bg-amber-100 text-amber-700',
};

const WAREHOUSE_FLOW_LABELS: Record<string, string> = {
    'WH-01': 'คลังหลัก',
    'WH-02': 'คลังตัดผ่าน',
    'WH-03': 'ใช้ไป',
    'WH-08': 'ของเสีย',
};

function toNumber(value: unknown): number {
    return Number(value || 0);
}

function normalizeText(value?: string | null): string {
    return (value || '').trim().toLowerCase();
}

function formatDateTime(value?: Date | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function formatCurrency(value: number): string {
    return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getWarehouseFlowLabel(warehouseCode?: string | null): string | null {
    if (!warehouseCode) return null;
    return WAREHOUSE_FLOW_LABELS[warehouseCode] || null;
}

function shouldHideMinAndValue(warehouseCode?: string | null): boolean {
    return warehouseCode === 'WH-03' || warehouseCode === 'WH-08';
}

function getWarehouseStatusType(warehouseCode: string, quantity: number, minStock: number): ReportStatusType {
    if (warehouseCode === 'WH-02') {
        return quantity > 0 ? 'pending_withdrawal' : 'normal';
    }
    return quantity < minStock ? 'low_stock' : 'normal';
}

function normalizeStatusFilter(value?: string): StatusFilter {
    const normalized = (value || 'all').trim().toLowerCase();
    return STATUS_FILTERS.includes(normalized as StatusFilter) ? (normalized as StatusFilter) : 'all';
}

function buildReportUrl(current: SearchParams, overrides: Partial<SearchParams>): string {
    const merged: SearchParams = { ...current, ...overrides };
    const params = new URLSearchParams();

    const entries: Array<[keyof SearchParams, string | undefined]> = [
        ['warehouse_id', merged.warehouse_id],
        ['q', merged.q],
        ['status', merged.status],
        ['low', merged.low],
    ];

    entries.forEach(([key, value]) => {
        const normalizedValue = (value || '').trim();
        if (normalizedValue) params.set(key, normalizedValue);
    });

    const query = params.toString();
    return query ? `/reports/warehouse-stock?${query}` : '/reports/warehouse-stock';
}

function isStatusActive(statusFilter: StatusFilter, lowStockOnly: boolean, status: ReportStatusType | 'all'): boolean {
    if (status === 'all') return statusFilter === 'all' && !lowStockOnly;
    if (status === 'low_stock') return lowStockOnly || statusFilter === 'low_stock';
    return statusFilter === status;
}

export default async function WarehouseStockReportPage({ searchParams }: PageProps) {
    const params = (await searchParams) || {};
    const selectedWarehouseId = Number.parseInt(params.warehouse_id || '', 10);
    const warehouseIdFilter = Number.isFinite(selectedWarehouseId) && selectedWarehouseId > 0 ? selectedWarehouseId : null;
    const keyword = (params.q || '').trim();
    const normalizedKeyword = normalizeText(keyword);
    const lowStockOnly = params.low === '1';
    const statusFilter = normalizeStatusFilter(params.status);

    const [warehouses, stockRows] = await Promise.all([
        prisma.tbl_warehouses.findMany({
            where: { active: true },
            orderBy: [{ warehouse_code: 'asc' }, { warehouse_name: 'asc' }],
            select: { warehouse_id: true, warehouse_code: true, warehouse_name: true },
        }),
        prisma.tbl_warehouse_stock.findMany({
            where: warehouseIdFilter ? { warehouse_id: warehouseIdFilter } : undefined,
            include: {
                tbl_warehouses: { select: { warehouse_id: true, warehouse_code: true, warehouse_name: true } },
            },
            orderBy: [{ warehouse_id: 'asc' }, { p_id: 'asc' }],
        }),
    ]);

    const wh01 = warehouses.find((warehouse) => warehouse.warehouse_code === 'WH-01') || null;
    const shouldUseProductsForWh01 = Boolean(wh01 && (!warehouseIdFilter || warehouseIdFilter === wh01.warehouse_id));
    const stockRowsWithoutWh01 = wh01 ? stockRows.filter((row) => row.warehouse_id !== wh01.warehouse_id) : stockRows;

    const stockProductIds = Array.from(new Set(stockRowsWithoutWh01.map((row) => row.p_id)));
    const products = shouldUseProductsForWh01
        ? await prisma.tbl_products.findMany({
            select: {
                p_id: true,
                p_name: true,
                p_unit: true,
                main_category: true,
                supplier: true,
                price_unit: true,
                p_count: true,
                safety_stock: true,
                created_at: true,
            },
            orderBy: { p_id: 'asc' },
        })
        : (
            stockProductIds.length > 0
                ? await prisma.tbl_products.findMany({
                    where: { p_id: { in: stockProductIds } },
                    select: {
                        p_id: true,
                        p_name: true,
                        p_unit: true,
                        main_category: true,
                        supplier: true,
                        price_unit: true,
                        p_count: true,
                        safety_stock: true,
                        created_at: true,
                    },
                })
                : []
        );

    const productMap = new Map(products.map((product) => [product.p_id, product]));

    const stockReportItems: ReportItem[] = stockRowsWithoutWh01.map((row) => {
        const product = productMap.get(row.p_id);
        const quantity = toNumber(row.quantity);
        const minStock = toNumber(row.min_stock);
        const warehouseCode = row.tbl_warehouses?.warehouse_code || '-';

        return {
            warehouseId: row.warehouse_id,
            warehouseCode,
            warehouseName: row.tbl_warehouses?.warehouse_name || '-',
            p_id: row.p_id,
            p_name: product?.p_name || row.p_id,
            category: product?.main_category || '-',
            supplier: product?.supplier || '-',
            quantity,
            minStock,
            unit: product?.p_unit || 'unit',
            totalValue: quantity * toNumber(product?.price_unit),
            lastUpdated: row.last_updated,
            statusType: getWarehouseStatusType(warehouseCode, quantity, minStock),
        };
    });

    const wh01ReportItems: ReportItem[] = shouldUseProductsForWh01 && wh01
        ? products.map((product) => {
            const quantity = toNumber(product.p_count);
            const minStock = toNumber(product.safety_stock);
            const warehouseCode = wh01.warehouse_code || 'WH-01';

            return {
                warehouseId: wh01.warehouse_id,
                warehouseCode,
                warehouseName: wh01.warehouse_name,
                p_id: product.p_id,
                p_name: product.p_name || product.p_id,
                category: product.main_category || '-',
                supplier: product.supplier || '-',
                quantity,
                minStock,
                unit: product.p_unit || 'unit',
                totalValue: quantity * toNumber(product.price_unit),
                lastUpdated: product.created_at ?? null,
                statusType: getWarehouseStatusType(warehouseCode, quantity, minStock),
            };
        })
        : [];

    const allItems = [...stockReportItems, ...wh01ReportItems].filter(
        (item) => !(item.warehouseCode === 'WH-02' && item.quantity === 0),
    );

    const reportItems = allItems
        .filter((item) => {
            if (lowStockOnly && item.statusType !== 'low_stock') return false;
            if (statusFilter !== 'all' && item.statusType !== statusFilter) return false;
            if (!normalizedKeyword) return true;

            return [item.p_id, item.p_name, item.category, item.supplier, item.warehouseCode, item.warehouseName]
                .some((value) => normalizeText(value).includes(normalizedKeyword));
        })
        .sort((a, b) => {
            const warehouseCompare = normalizeText(a.warehouseCode).localeCompare(normalizeText(b.warehouseCode));
            if (warehouseCompare !== 0) return warehouseCompare;
            return normalizeText(a.p_id).localeCompare(normalizeText(b.p_id));
        });

    const totalRows = reportItems.length;
    const totalQuantity = reportItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = reportItems.filter((item) => item.statusType === 'low_stock').length;
    const pendingWithdrawalCount = reportItems.filter((item) => item.statusType === 'pending_withdrawal').length;
    const totalValue = reportItems.reduce((sum, item) => sum + item.totalValue, 0);
    const hasActiveFilters = Boolean(warehouseIdFilter || keyword || lowStockOnly || statusFilter !== 'all');

    const allStatusLink = buildReportUrl(params, { status: 'all', low: undefined });
    const lowStockLink = buildReportUrl(params, { status: 'low_stock', low: '1' });
    const pendingLink = buildReportUrl(params, { status: 'pending_withdrawal', low: undefined });

    return (
        <div className="space-y-6">
            <div>
                <Link href="/reports" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-700">
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปรายงาน
                </Link>
                <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                    <Warehouse className="h-8 w-8 text-blue-600" />
                    รายงานสินค้าคงคลังแต่ละคลัง
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    ดูยอดคงเหลือรายคลัง พร้อมสถานะที่ต้องติดตามและรายการเบิกค้างจากคลังตัดผ่าน
                </p>
            </div>           

            <form method="get" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-12">
                <div className="md:col-span-3">
                    <label htmlFor="warehouse_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        คลัง
                    </label>
                    <select
                        id="warehouse_id"
                        name="warehouse_id"
                        defaultValue={warehouseIdFilter ? String(warehouseIdFilter) : ''}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                    >
                        <option value="">ทุกคลัง</option>
                        {warehouses.map((warehouse) => {
                            const flowLabel = getWarehouseFlowLabel(warehouse.warehouse_code);
                            return (
                                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                                    {warehouse.warehouse_code ? `${warehouse.warehouse_code} - ` : ''}
                                    {warehouse.warehouse_name}
                                    {flowLabel ? ` (${flowLabel})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="md:col-span-3">
                    <label htmlFor="status" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        สถานะ
                    </label>
                    <select
                        id="status"
                        name="status"
                        defaultValue={statusFilter}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="normal">ปกติ</option>
                        <option value="low_stock">ต่ำกว่าเกณฑ์</option>
                        <option value="pending_withdrawal">มีรายการเบิก (WH-02)</option>
                    </select>
                </div>

                <div className="md:col-span-4">
                    <label htmlFor="q" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        ค้นหา
                    </label>
                    <FloatingSearchInput
                        id="q"
                        name="q"
                        label="ค้นหาสินค้า"
                        defaultValue={keyword}
                        placeholder="ค้นหาด้วย SKU, ชื่อสินค้า, หมวดหมู่, Supplier"
                        dense
                        className="text-sm"
                    />
                </div>

                <div className="md:col-span-2 flex items-end">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name="low"
                            value="1"
                            defaultChecked={lowStockOnly}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        เฉพาะต่ำกว่าเกณฑ์
                    </label>
                </div>

                <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        <Filter className="h-4 w-4" />
                        ใช้ตัวกรอง
                    </button>
                    <Link href="/reports/warehouse-stock" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        ล้างตัวกรอง
                    </Link>
                    <span className="text-sm text-gray-500">ผลลัพธ์ {totalRows.toLocaleString()} รายการ</span>
                </div>
            </form>

            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href={allStatusLink}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                        isStatusActive(statusFilter, lowStockOnly, 'all')
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    ทั้งหมด
                </Link>
                <Link
                    href={lowStockLink}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                        isStatusActive(statusFilter, lowStockOnly, 'low_stock')
                            ? 'bg-red-600 text-white'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                >
                    ต่ำกว่าเกณฑ์
                </Link>
                <Link
                    href={pendingLink}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                        isStatusActive(statusFilter, lowStockOnly, 'pending_withdrawal')
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                >
                    รายการเบิกค้าง (WH-02)
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">จำนวนรายการ</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{totalRows.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">คงเหลือรวม</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">ต่ำกว่าเกณฑ์</p>
                    <p className="mt-1 text-2xl font-bold text-red-700">{lowStockCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">ค้างเบิก WH-02</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">{pendingWithdrawalCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">มูลค่ารวม</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">฿{formatCurrency(totalValue)}</p>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
                <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                    <Boxes className="h-3.5 w-3.5" /> ปกติ
                </span>
                <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 font-semibold text-red-700">
                    <CircleAlert className="h-3.5 w-3.5" /> ต่ำกว่าเกณฑ์
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">
                    <CircleAlert className="h-3.5 w-3.5" /> มีรายการเบิก (เฉพาะ WH-02)
                </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">คลัง</th>
                                <th className="px-4 py-3 text-left font-semibold">สินค้า</th>
                                <th className="px-4 py-3 text-right font-semibold">คงเหลือ</th>
                                <th className="px-4 py-3 text-right font-semibold">Min</th>
                                <th className="px-4 py-3 text-right font-semibold">มูลค่า</th>
                                <th className="px-4 py-3 text-center font-semibold">สถานะ</th>
                                <th className="px-4 py-3 text-left font-semibold">อัปเดตล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportItems.length > 0 ? (
                                reportItems.map((item) => {
                                    const flowLabel = getWarehouseFlowLabel(item.warehouseCode);
                                    const hideMinAndValue = shouldHideMinAndValue(item.warehouseCode);
                                    const quantityClassName =
                                        item.statusType === 'low_stock'
                                            ? 'text-red-700'
                                            : item.statusType === 'pending_withdrawal'
                                                ? 'text-amber-700'
                                                : 'text-gray-900';

                                    return (
                                        <tr
                                            key={`${item.warehouseId}-${item.p_id}`}
                                            className={
                                                item.statusType === 'pending_withdrawal'
                                                    ? 'bg-amber-50/40 hover:bg-amber-50'
                                                    : item.statusType === 'low_stock'
                                                        ? 'bg-red-50/40 hover:bg-red-50'
                                                        : 'hover:bg-gray-50'
                                            }
                                        >
                                            <td className="px-4 py-3 text-gray-700">
                                                <div className="font-semibold">
                                                    {item.warehouseCode !== '-' ? `${item.warehouseCode} - ` : ''}
                                                    {item.warehouseName}
                                                </div>
                                                {flowLabel ? (
                                                    <div className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                        {flowLabel}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{item.p_name}</div>
                                                <div className="mt-0.5 text-xs text-gray-500">
                                                    {item.p_id} | {item.category} | {item.supplier}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${quantityClassName}`}>
                                                {item.quantity.toLocaleString()} {item.unit}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">
                                                {hideMinAndValue ? '-' : `${item.minStock.toLocaleString()} ${item.unit}`}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                                {hideMinAndValue ? '-' : `฿${formatCurrency(item.totalValue)}`}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSNAMES[item.statusType]}`}>
                                                    {item.statusType === 'normal' ? <Boxes className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                                                    {STATUS_LABELS[item.statusType]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{formatDateTime(item.lastUpdated)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        <p className="font-medium text-gray-700">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                                        {hasActiveFilters ? (
                                            <Link href="/reports/warehouse-stock" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700">
                                                ล้างตัวกรองแล้วลองใหม่
                                            </Link>
                                        ) : null}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
