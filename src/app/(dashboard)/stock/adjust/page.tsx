import { prisma } from '@/lib/prisma';
import StockAdjustmentForm from '@/components/StockAdjustmentForm';
import { Suspense } from 'react';

interface PageProps {
    searchParams: Promise<{ id?: string }>;
}

export default async function StockAdjustmentPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const initialProductId = params.id || null;

    const products = await prisma.tbl_products.findMany({
        select: {
            p_id: true,
            p_name: true,
            p_count: true,
            p_image: true,
            p_unit: true,
        },
        orderBy: {
            p_name: 'asc',
        },
    });

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800">จัดการสต็อกสินค้า</h1>
                <p className="text-gray-500 mt-2">ทำรายการรับเข้า หรือ เบิกสินค้าออกจากคลัง</p>
            </div>

            <Suspense fallback={<div className="text-center text-gray-400 py-8">กำลังโหลด...</div>}>
                <StockAdjustmentForm products={products} initialProductId={initialProductId} />
            </Suspense>
        </div>
    );
}
