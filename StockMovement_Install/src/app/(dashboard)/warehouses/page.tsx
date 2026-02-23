import { prisma } from '@/lib/prisma';
import { createWarehouse, deleteWarehouse } from '@/actions/warehouseActions';
import { Warehouse, Trash2, Plus } from 'lucide-react';
import { auth } from '@/auth';

export default async function WarehousePage() {
    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role === 'admin';

    const warehouses = await prisma.tbl_warehouses.findMany();

    async function handleCreate(formData: FormData) {
        'use server';
        await createWarehouse(formData);
    }

    return (
        <div className="max-w-4xl mx-auto py-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">จัดการคลังสินค้า (Warehouses)</h1>

            {/* Create Form */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" /> เพิ่มคลังสินค้าใหม่
                </h3>
                <form action={handleCreate} className="flex gap-4">
                    <input
                        type="text"
                        name="warehouse_name"
                        placeholder="ชื่อคลังสินค้า (เช่น A, B, Main)"
                        required
                        className="flex-1 border rounded-lg px-4 py-2"
                    />
                    <input
                        type="text"
                        name="location"
                        placeholder="สถานที่ตั้ง (Optional)"
                        className="flex-1 border rounded-lg px-4 py-2"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">
                        บันทึก
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouses.map(w => (
                    <div key={w.warehouse_id} className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-4">
                                <Warehouse className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{w.warehouse_name}</h3>
                                <p className="text-sm text-gray-500">{w.location || 'ไม่ระบุสถานที่'}</p>
                            </div>
                        </div>
                        {isAdmin && (
                            <form action={async () => {
                                'use server';
                                await deleteWarehouse(w.warehouse_id);
                            }}>
                                <button className="text-gray-400 hover:text-red-600 p-2" title="ลบ">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
