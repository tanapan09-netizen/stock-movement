import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Warehouse, Boxes, AlertTriangle, Search, Filter } from 'lucide-react';

type SearchParams = {
    warehouse_id?: string;
    q?: string;
    low?: string;
};

type PageProps = {
    searchParams?: Promise<SearchParams>;
};

export const metadata = {
    title: 'รายงานสต็อกแต่ละคลัง | Stock Movement',
    description: 'รายงานสินค้าคงคลังแยกตามคลัง',
};

function toNumber(value: unknown): number {
    return Number(value || 0);
}

function normalizeText(value?: string | null): string {
    return (value || '').trim().toLowerCase();
}

function formatDateTime(value?: Date | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(value);
}

const WAREHOUSE_FLOW_LABELS: Record<string, string> = {
    'WH-01': 'คลังหลัก',
    'WH-02': 'คลังตัดผ่าน',
    'WH-03': 'ใช้จริง',
    'WH-08': 'ของเสีย',
};

function getWarehouseFlowLabel(warehouseCode?: string | null): string | null {
    if (!warehouseCode) return null;
    return WAREHOUSE_FLOW_LABELS[warehouseCode] || null;
}

export default async function WarehouseStockReportPage({ searchParams }: PageProps) {
    const params = (await searchParams) || {};
    const selectedWarehouseId = Number.parseInt(params.warehouse_id || '', 10);
    const warehouseIdFilter = Number.isFinite(selectedWarehouseId) && selectedWarehouseId > 0
        ? selectedWarehouseId
        : null;
    const keyword = (params.q || '').trim();
    const normalizedKeyword = normalizeText(keyword);
    const lowStockOnly = params.low === '1';

    const [warehouses, stockRows] = await Promise.all([
        prisma.tbl_warehouses.findMany({
            where: { active: true },
            orderBy: [{ warehouse_code: 'asc' }, { warehouse_name: 'asc' }],
            select: {
                warehouse_id: true,
                warehouse_code: true,
                warehouse_name: true,
            },
        }),
        prisma.tbl_warehouse_stock.findMany({
            where: warehouseIdFilter ? { warehouse_id: warehouseIdFilter } : undefined,
            include: {
                tbl_warehouses: {
                    select: {
                        warehouse_id: true,
                        warehouse_code: true,
                        warehouse_name: true,
                    },
                },
            },
            orderBy: [{ warehouse_id: 'asc' }, { p_id: 'asc' }],
        }),
    ]);

    const wh01 = warehouses.find((warehouse) => warehouse.warehouse_code === 'WH-01') || null;
    const shouldUseProductsForWh01 = Boolean(
        wh01 && (!warehouseIdFilter || warehouseIdFilter === wh01.warehouse_id),
    );
    const stockRowsWithoutWh01 = wh01
        ? stockRows.filter((row) => row.warehouse_id !== wh01.warehouse_id)
        : stockRows;

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
        : (stockProductIds.length > 0
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
            : []);

    const productMap = new Map(products.map((product) => [product.p_id, product]));

    const stockReportItems = stockRowsWithoutWh01.map((row) => {
        const product = productMap.get(row.p_id);
        const quantity = toNumber(row.quantity);
        const minStock = toNumber(row.min_stock);
        const pricePerUnit = toNumber(product?.price_unit);
        const totalValue = quantity * pricePerUnit;
        const warehouseCode = row.tbl_warehouses?.warehouse_code || '-';
        const warehouseName = row.tbl_warehouses?.warehouse_name || '-';
        const productName = product?.p_name || row.p_id;
        const category = product?.main_category || '-';
        const supplier = product?.supplier || '-';
        const unit = product?.p_unit || 'unit';
        const isLowStock = quantity <= minStock;

        return {
            warehouseId: row.warehouse_id,
            warehouseCode,
            warehouseName,
            p_id: row.p_id,
            p_name: productName,
            category,
            supplier,
            quantity,
            minStock,
            unit,
            totalValue,
            lastUpdated: row.last_updated,
            isLowStock,
        };
    });

    const wh01ReportItems = shouldUseProductsForWh01 && wh01
        ? products.map((product) => {
            const quantity = toNumber(product.p_count);
            const minStock = toNumber(product.safety_stock);
            const totalValue = quantity * toNumber(product.price_unit);

            return {
                warehouseId: wh01.warehouse_id,
                warehouseCode: wh01.warehouse_code || 'WH-01',
                warehouseName: wh01.warehouse_name,
                p_id: product.p_id,
                p_name: product.p_name || product.p_id,
                category: product.main_category || '-',
                supplier: product.supplier || '-',
                quantity,
                minStock,
                unit: product.p_unit || 'unit',
                totalValue,
                lastUpdated: product.created_at ?? null,
                isLowStock: quantity <= minStock,
            };
        })
        : [];

    const reportItems = [...stockReportItems, ...wh01ReportItems]
        .filter((item) => {
            if (lowStockOnly && !item.isLowStock) return false;
            if (!normalizedKeyword) return true;

            return [
                item.p_id,
                item.p_name,
                item.category,
                item.supplier,
                item.warehouseCode,
                item.warehouseName,
            ].some((value) => normalizeText(value).includes(normalizedKeyword));
        })
        .sort((a, b) => {
            const warehouseCompare = normalizeText(a.warehouseCode).localeCompare(normalizeText(b.warehouseCode));
            if (warehouseCompare !== 0) return warehouseCompare;
            return normalizeText(a.p_id).localeCompare(normalizeText(b.p_id));
        });

    const totalRows = reportItems.length;
    const totalQuantity = reportItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = reportItems.filter((item) => item.isLowStock).length;
    const totalValue = reportItems.reduce((sum, item) => sum + item.totalValue, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/reports" className="mb-2 inline-flex items-center text-sm text-gray-500 transition hover:text-gray-700">
                        <ArrowLeft className="mr-1 h-4 w-4" /> กลับไปรายงาน
                    </Link>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                        <Warehouse className="h-8 w-8 text-indigo-600" />
                        รายงานสินค้าคงคลังแต่ละคลัง
                    </h1>
                    <p className="text-gray-500">ดูยอดคงเหลือสินค้า แยกตามคลัง พร้อมสถานะต่ำกว่า Min Stock</p>
                </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
                Flow คลังงานซ่อม: WH-01 -&gt; WH-02 -&gt; ใช้จริงไป WH-03 / ของเสียไป WH-08 / ไม่ได้ใช้ย้อนกลับ WH-01
            </div>

            <form method="get" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
                <div className="md:col-span-1">
                    <label htmlFor="warehouse_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        คลัง
                    </label>
                    <select
                        id="warehouse_id"
                        name="warehouse_id"
                        defaultValue={warehouseIdFilter ? String(warehouseIdFilter) : ''}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                    >
                        <option value="">ทุกคลัง</option>
                        {warehouses.map((warehouse) => {
                            const flowLabel = getWarehouseFlowLabel(warehouse.warehouse_code);
                            return (
                                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                                    {warehouse.warehouse_code ? `${warehouse.warehouse_code} - ` : ''}{warehouse.warehouse_name}{flowLabel ? ` (${flowLabel})` : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="q" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        ค้นหา
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            id="q"
                            name="q"
                            defaultValue={keyword}
                            placeholder="ค้นหาด้วย SKU, ชื่อสินค้า, หมวดหมู่, ผู้ขาย..."
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none ring-indigo-500 focus:ring-2"
                        />
                    </div>
                </div>

                <div className="flex items-end gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="low" value="1" defaultChecked={lowStockOnly} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                        เฉพาะสต็อกต่ำกว่าเกณฑ์
                    </label>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        <Filter className="h-4 w-4" />
                        ค้นหา
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">จำนวนรายการ</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{totalRows.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">จำนวนคงเหลือรวม</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">สต็อกต่ำ</p>
                    <p className="mt-1 text-2xl font-bold text-red-700">{lowStockCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">มูลค่าประมาณการ</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">฿{totalValue.toLocaleString()}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">คลัง</th>
                                <th className="px-4 py-3 text-left font-semibold">SKU</th>
                                <th className="px-4 py-3 text-left font-semibold">สินค้า</th>
                                <th className="px-4 py-3 text-left font-semibold">หมวดหมู่</th>
                                <th className="px-4 py-3 text-right font-semibold">คงเหลือ</th>
                                <th className="px-4 py-3 text-right font-semibold">Min</th>
                                <th className="px-4 py-3 text-left font-semibold">หน่วย</th>
                                <th className="px-4 py-3 text-right font-semibold">มูลค่า</th>
                                <th className="px-4 py-3 text-center font-semibold">สถานะ</th>
                                <th className="px-4 py-3 text-left font-semibold">อัปเดตล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportItems.length > 0 ? (
                                reportItems.map((item) => (
                                    <tr key={`${item.warehouseId}-${item.p_id}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span>{item.warehouseCode !== '-' ? `${item.warehouseCode} - ` : ''}{item.warehouseName}</span>
                                                {getWarehouseFlowLabel(item.warehouseCode) && (
                                                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                                                        {getWarehouseFlowLabel(item.warehouseCode)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.p_id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.p_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.category}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{item.quantity.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-gray-700">{item.minStock.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                                        <td className="px-4 py-3 text-right text-emerald-700">฿{item.totalValue.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            {item.isLowStock ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    ต่ำกว่าเกณฑ์
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                    <Boxes className="h-3.5 w-3.5" />
                                                    ปกติ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(item.lastUpdated)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                        ไม่พบข้อมูลคงคลังตามเงื่อนไขที่เลือก
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
