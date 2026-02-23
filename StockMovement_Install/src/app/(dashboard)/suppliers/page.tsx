import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Building2, Phone, Mail, MapPin, User, Edit2, Trash2 } from 'lucide-react';
import SupplierActions from '@/components/SupplierActions';
import { auth } from '@/auth';

export default async function SuppliersPage() {
    const session = await auth();
    const isAdmin = (session?.user as { role?: string })?.role === 'admin';

    const suppliers = await prisma.tbl_suppliers.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        จัดการผู้ขาย (Suppliers)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">รายการผู้ขาย/Vendor ทั้งหมด {suppliers.length} ราย</p>
                </div>
                <Link
                    href="/suppliers/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow transition"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มผู้ขายใหม่
                </Link>
            </div>

            {suppliers.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">ยังไม่มีข้อมูลผู้ขาย</h3>
                    <p className="text-gray-400 mb-6">เริ่มต้นเพิ่มผู้ขายรายแรกของคุณ</p>
                    <Link
                        href="/suppliers/new"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5" />
                        เพิ่มผู้ขาย
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.map((supplier) => (
                        <div key={supplier.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{supplier.name}</h3>
                                        {supplier.contact_name && (
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <User className="w-3 h-3" /> {supplier.contact_name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <SupplierActions supplier={supplier} isAdmin={isAdmin} />
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                {supplier.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="text-blue-600">{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <span className="line-clamp-2">{supplier.address}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs text-gray-400">
                                <span>เพิ่มเมื่อ: {new Date(supplier.created_at).toLocaleDateString('th-TH')}</span>
                                <Link
                                    href={`/suppliers/${supplier.id}/edit`}
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <Edit2 className="w-3 h-3" /> แก้ไข
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
