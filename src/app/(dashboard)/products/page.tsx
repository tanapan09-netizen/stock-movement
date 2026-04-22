import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus, AlertTriangle } from 'lucide-react';
import { ProductsToolbar, ProductsView } from './ProductsClient';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function ProductsPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/products',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );
    const canImportProducts = permissionContext.role === 'admin';
    const viewerRole = permissionContext.role;
    const viewerId = session?.user?.id ?? null;

    const products = await prisma.tbl_products.findMany({
        include: {
            tbl_categories: true,
        },
        orderBy: {
            created_at: 'desc',
        },
    });

    // Serialize products for client component
    const serializedProducts = JSON.parse(JSON.stringify(products));
    const totalProducts = serializedProducts.length;
    const lowStockProducts = serializedProducts.filter((product: { p_count: number; safety_stock: number }) => Number(product.p_count) < Number(product.safety_stock)).length;
    const outOfStockProducts = serializedProducts.filter((product: { p_count: number }) => Number(product.p_count) <= 0).length;
    const assetProducts = serializedProducts.filter((product: { is_asset?: boolean | null }) => Boolean(product.is_asset)).length;

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">รายการสินค้า</h1>
                        <p className="text-sm text-slate-500">จัดการข้อมูลสินค้า ค้นหาได้เร็ว และส่งออกข้อมูลได้ทันที</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ProductsToolbar
                            products={serializedProducts}
                            canImport={canImportProducts}
                            canEditPage={canEditPage}
                            viewerRole={viewerRole}
                            viewerId={viewerId}
                        />
                        <Link
                            href="/reports/low-stock"
                            className="inline-flex items-center rounded-lg border border-red-200 bg-red-100 px-4 py-2 font-medium text-red-700 hover:bg-red-200"
                        >
                            <AlertTriangle className="mr-2 h-4 w-4" /> สินค้าเหลือน้อย
                        </Link>
                        {canEditPage && (
                            <Link
                                href="/products/new"
                                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                            >
                                <Plus className="mr-2 h-4 w-4" /> เพิ่มสินค้า
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">สินค้าทั้งหมด</p>
                        <p className="mt-1 text-xl font-semibold text-slate-800">{totalProducts.toLocaleString('th-TH')}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">ใกล้จุดสั่งซื้อ</p>
                        <p className="mt-1 text-xl font-semibold text-amber-800">{lowStockProducts.toLocaleString('th-TH')}</p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs text-red-700">สินค้าหมด</p>
                        <p className="mt-1 text-xl font-semibold text-red-800">{outOfStockProducts.toLocaleString('th-TH')}</p>
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                        <p className="text-xs text-indigo-700">ทรัพย์สิน</p>
                        <p className="mt-1 text-xl font-semibold text-indigo-800">{assetProducts.toLocaleString('th-TH')}</p>
                    </div>
                </div>
            </section>

            {/* Products View with Grid/List Toggle */}
            <ProductsView
                products={serializedProducts}
                isAdmin={canEditPage}
                viewerRole={viewerRole}
                viewerId={viewerId}
            />
        </div>
    );
}
