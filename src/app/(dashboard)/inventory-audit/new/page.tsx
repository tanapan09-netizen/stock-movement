import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Save, Warehouse } from 'lucide-react';

import { auth } from '@/auth';
import { createAudit } from '@/actions/auditActions';
import { prisma } from '@/lib/prisma';
import { canAccessInventoryAudit } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { INVENTORY_AUDIT_COPY } from '@/lib/inventory-audit';

export default async function NewAuditPage() {
    const session = await auth();
    const permissionContext = await getUserPermissionContext(session?.user as PermissionSessionUser | undefined);

    if (!session?.user || !canAccessInventoryAudit(permissionContext.role, permissionContext.permissions, 'edit')) {
        redirect('/inventory-audit');
    }

    const warehouses = await prisma.tbl_warehouses.findMany({
        where: { active: true },
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
            <div>
                <Link href="/inventory-audit" className="inline-flex items-center text-sm text-slate-500 transition hover:text-slate-700">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.backToList}
                </Link>
            </div>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{INVENTORY_AUDIT_COPY.createAudit}</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{INVENTORY_AUDIT_COPY.createAuditSubtitle}</p>
                </div>

                <form action={handleCreateAudit} className="space-y-5 px-6 py-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        เมื่อเริ่มตรวจนับ ระบบจะ freeze snapshot ของยอดคงเหลือในคลังที่เลือก และใช้ snapshot นี้เป็นฐานอ้างอิงตลอดทั้ง workflow
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            {INVENTORY_AUDIT_COPY.warehouse}
                        </label>
                        <div className="relative">
                            <Warehouse className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                name="warehouse_id"
                                required
                                disabled={warehouses.length === 0}
                                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                                <option value="">เลือกคลังสินค้า</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                                        {warehouse.warehouse_code
                                            ? `${warehouse.warehouse_code} - ${warehouse.warehouse_name}`
                                            : warehouse.warehouse_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            {INVENTORY_AUDIT_COPY.auditDate}
                        </label>
                        <input
                            type="date"
                            name="audit_date"
                            required
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            {INVENTORY_AUDIT_COPY.notes}
                        </label>
                        <textarea
                            name="notes"
                            rows={4}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                            placeholder="เช่น ตรวจนับประจำเดือน, ตรวจนับก่อนปิดงวด, หรือ ตรวจนับเฉพาะสินค้ากลุ่มเสี่ยง"
                        />
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                        <button
                            type="submit"
                            disabled={warehouses.length === 0}
                            className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            <Save className="mr-2 h-4 w-4" /> {INVENTORY_AUDIT_COPY.createAudit}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
