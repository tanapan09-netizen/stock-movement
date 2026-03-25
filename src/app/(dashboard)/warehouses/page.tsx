import { prisma } from '@/lib/prisma';
import { createWarehouse, deleteWarehouse } from '@/actions/warehouseActions';
import { Warehouse, Trash2, Plus } from 'lucide-react';
import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';

export default async function WarehousePage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);
    const canEditPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/warehouses',
        { isApprover: permissionContext.isApprover, level: 'edit' },
    );

    const warehouses = await prisma.tbl_warehouses.findMany();

    async function handleCreate(formData: FormData) {
        'use server';
        await createWarehouse(formData);
    }

    return (
        <div className="mx-auto max-w-4xl py-6">
            <h1 className="mb-6 text-2xl font-bold text-gray-800">จัดการคลังสินค้า (Warehouses)</h1>

            {canEditPage && (
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 flex items-center font-bold text-gray-700">
                    <Plus className="mr-2 h-5 w-5" /> เพิ่มคลังสินค้าใหม่
                </h3>
                <form action={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <input
                        type="text"
                        name="warehouse_code"
                        placeholder="รหัสคลัง เช่น WH-01"
                        required
                        className="border rounded-lg px-4 py-2"
                    />
                    <input
                        type="text"
                        name="warehouse_name"
                        placeholder="ชื่อคลังสินค้า"
                        required
                        className="border rounded-lg px-4 py-2"
                    />
                    <input
                        type="text"
                        name="location"
                        placeholder="สถานที่ตั้ง (ไม่บังคับ)"
                        className="border rounded-lg px-4 py-2"
                    />
                    <button type="submit" className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700 md:col-span-3">
                        บันทึก
                    </button>
                </form>
            </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {warehouses.map(w => (
                    <div key={w.warehouse_id} className="flex items-center justify-between rounded-lg bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <Warehouse className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{w.warehouse_name}</h3>
                                <p className="text-sm text-gray-600">{w.warehouse_code || 'ไม่มีรหัสคลัง'}</p>
                                <p className="text-sm text-gray-500">{w.location || 'ไม่ระบุสถานที่'}</p>
                            </div>
                        </div>
                        {canEditPage && (
                            <form action={async () => {
                                'use server';
                                await deleteWarehouse(w.warehouse_id);
                            }}>
                                <button className="p-2 text-gray-400 hover:text-red-600" title="ลบ">
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
