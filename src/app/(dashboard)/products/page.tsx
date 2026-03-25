import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus, AlertTriangle, FileSpreadsheet } from 'lucide-react';
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

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">รายการสินค้า</h1>
                    <p className="text-sm text-gray-500">จัดการข้อมูลสินค้าทั้งหมดในระบบ</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ProductsToolbar products={serializedProducts} />
                    <Link
                        href="/reports/low-stock"
                        className="flex items-center rounded-lg bg-red-100 px-4 py-2 font-medium text-red-700 hover:bg-red-200 border border-red-200"
                    >
                        <AlertTriangle className="mr-2 h-4 w-4" /> สินค้าเหลือน้อย
                    </Link>
                    {canEditPage && (
                        <Link
                            href="/products/import"
                            className="flex items-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> นำเข้า Excel
                        </Link>
                    )}
                    {canEditPage && (
                    <Link
                        href="/products/new"
                        className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" /> เพิ่มสินค้า
                    </Link>
                    )}
                </div>
            </div>

            {/* Products View with Grid/List Toggle */}
            <ProductsView products={serializedProducts} isAdmin={canEditPage} />
        </div>
    );
}
