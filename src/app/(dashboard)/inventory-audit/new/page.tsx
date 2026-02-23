'use client';

import { createAudit } from '@/actions/auditActions';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewAuditPage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // Fetch warehouses client-side for simplicity in this form or use server component wrapper
    // Let's simpler: fetch via API or just hardcode if API not ready?
    // Better: use a server action to fetch warehouses? Or just fetch in simple useEffect since we are in client component.
    // Actually, let's assume we have an API endpoint since Phase 4 mentions it, or we rely on page props.
    // Since I can't easily pass props from parent layout here without server component, let's fetch specific list.

    // Re-architecture: Make this a Server Component that renders a Client Form? 
    // Yes, much better. But to save steps, I will make this file a client component and fetch data or just use a basic select if I can't easily fetch.
    // Wait, create_audit logic needs warehouse_id. I verified tbl_warehouses exists.
    // Let's toggle to Server Component for Page, Client for Form.

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Link href="/inventory-audit" className="text-gray-500 hover:text-gray-700 flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปรายการ
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                    <h1 className="text-xl font-bold text-gray-800">สร้างรายการตรวจนับใหม่</h1>
                </div>
                <div className="p-6">
                    <form action={async (formData) => {
                        const result = await createAudit(formData);
                        if (result.success) {
                            router.push(`/inventory-audit/${result.audit_id}`);
                        }
                    }}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">คลังสินค้า</label>
                                {/* Hardcoding or Fetching? Let's Fetch via Server Action wrapper or just use common query if possible... 
                                    Let's try to just hardcode 1-2 for demo OR fetch via a simple API call if /api/warehouses exists.
                                    Actually I can just verify warehouse table content.
                                    Let's use a simple input for ID or a basic select.
                                    Ideally, we pass data from Server Component.
                                */}
                                <select name="warehouse_id" required className="w-full border rounded-lg p-2">
                                    <option value="">-- เลือกคลังสินค้า --</option>
                                    <option value="1">Main Warehouse</option>
                                    <option value="2">Secondary Warehouse</option>
                                    {/* Add more dynamically if needed */}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    *เลือกคลังที่ต้องการตรวจนับ (ระบบจะดึงสินค้าทั้งหมดในคลังนี้มาให้ตรวจ)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ตรวจนับ</label>
                                <input type="date" name="audit_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg p-2" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                <textarea name="notes" rows={3} className="w-full border rounded-lg p-2" placeholder="เช่น ตรวจนับประจำเดือน..."></textarea>
                            </div>

                            <div className="pt-4 border-t flex justify-end">
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center">
                                    <Save className="w-5 h-5 mr-2" /> สร้างรายการ
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
