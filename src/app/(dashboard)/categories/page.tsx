import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Tag, Package, Edit2, Trash2 } from 'lucide-react';
import CategoryActions from '@/components/CategoryActions';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { getCategories } from '@/lib/server/category-service';
...
export default async function CategoriesPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/categories',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    const categories = await getCategories();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Tag className="w-8 h-8 text-blue-600" />
                        จัดการหมวดหมู่สินค้า
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">รายการหมวดหมู่ทั้งหมด {categories.length} หมวดหมู่</p>
                </div>
                {canEditPage && (
                <Link
                    href="/categories/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow transition"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มหมวดหมู่
                </Link>
                )}
            </div>

            {categories.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">ยังไม่มีหมวดหมู่</h3>
                    <p className="text-gray-400 mb-6">เริ่มต้นสร้างหมวดหมู่แรก</p>
                    {canEditPage && (
                    <Link
                        href="/categories/new"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มหมวดหมู่
                    </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">หมวดหมู่</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">รายละเอียด</th>
                                <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">จำนวนสินค้า</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {categories.map((cat) => (
                                <tr key={cat.cat_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Tag className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-800">{cat.cat_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {cat.cat_desc || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                                            <Package className="w-4 h-4" />
                                            {cat._count.tbl_products}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <CategoryActions category={cat} productCount={cat._count.tbl_products} isAdmin={canEditPage} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
