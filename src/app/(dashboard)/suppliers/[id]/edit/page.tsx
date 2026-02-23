import { prisma } from '@/lib/prisma';
import SupplierForm from '@/components/SupplierForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const supplier = await prisma.tbl_suppliers.findUnique({
        where: { id: parseInt(id) }
    });

    if (!supplier) {
        notFound();
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/suppliers" className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับ
            </Link>
            <SupplierForm supplier={supplier} />
        </div>
    );
}
