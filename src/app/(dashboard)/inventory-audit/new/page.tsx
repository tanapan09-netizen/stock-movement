import { createAudit } from '@/actions/auditActions';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

export default async function NewAuditPage() {
    const warehouses = await prisma.tbl_warehouses.findMany({
        orderBy: { warehouse_name: 'asc' },
        select: {
            warehouse_id: true,
            warehouse_name: true,
            warehouse_code: true,
        },
    });

    async function handleCreateAudit(formData: FormData) {
        'use server';

        const result = await createAudit(formData);
        if (result.success) {
            redirect(`/inventory-audit/${result.audit_id}`);
        }
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-6">
                <Link href="/inventory-audit" className="flex items-center text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> กลับไปรายการ
                </Link>
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow-lg">
                <div className="border-b bg-gray-50 px-6 py-4">
                    <h1 className="text-xl font-bold text-gray-800">สร้างรายการตรวจนับใหม่</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        เลือกคลังและวันที่ตรวจนับก่อนเริ่มสร้างรายการ
                    </p>
                </div>

                <div className="p-6">
                    <form action={handleCreateAudit}>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">คลังสินค้า</label>
                                <select
                                    name="warehouse_id"
                                    required
                                    disabled={warehouses.length === 0}
                                    className="w-full rounded-lg border p-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                                >
                                    <option value="">-- เลือกคลังสินค้า --</option>
                                    {warehouses.map((warehouse) => (
                                        <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                                            {warehouse.warehouse_code
                                                ? `${warehouse.warehouse_code} - ${warehouse.warehouse_name}`
                                                : warehouse.warehouse_name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    {warehouses.length > 0
                                        ? 'ระบบจะดึงรายการสินค้าในคลังที่เลือกมาใช้สำหรับการตรวจนับ'
                                        : 'ยังไม่พบข้อมูลคลังสินค้าในระบบ'}
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">วันที่ตรวจนับ</label>
                                <input
                                    type="date"
                                    name="audit_date"
                                    required
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full rounded-lg border p-2"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">หมายเหตุ</label>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    className="w-full rounded-lg border p-2"
                                    placeholder="เช่น ตรวจนับประจำเดือน หรือ ตรวจสอบสต็อกก่อนปิดรอบ"
                                />
                            </div>

                            <div className="flex justify-end border-t pt-4">
                                <button
                                    type="submit"
                                    disabled={warehouses.length === 0}
                                    className="flex items-center rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                                >
                                    <Save className="mr-2 h-5 w-5" /> สร้างรายการ
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
