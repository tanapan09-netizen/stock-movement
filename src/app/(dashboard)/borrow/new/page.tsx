import { prisma } from '@/lib/prisma';
import BorrowForm from '@/components/BorrowForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewBorrowPage() {
    const products = await prisma.tbl_products.findMany({
        select: {
            p_id: true,
            p_name: true,
            p_count: true,
            p_unit: true,
        },
        where: {
            active: true,
            p_count: { gt: 0 } // Only show products with stock
        },
        orderBy: {
            p_name: 'asc',
        },
    });

    return (
        <div className="max-w-6xl mx-auto py-6">
            <div className="mb-6">
                <Link href="/borrow" className="text-gray-500 hover:text-gray-700 flex items-center text-sm mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้ารายการ
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">สร้างรายการเบิก/ยืมสินค้า</h1>
                <p className="text-sm text-gray-500">กรอกข้อมูลผู้เบิกและเลือกรายการสินค้า</p>
            </div>

            <BorrowForm products={products} />
        </div>
    );
}
