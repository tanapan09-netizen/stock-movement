import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/ProductForm';

export default async function NewProductPage() {
    const categories = await prisma.tbl_categories.findMany({
        orderBy: { cat_name: 'asc' },
    });

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">เพิ่มสินค้าใหม่</h1>
                <p className="text-sm text-gray-500">กรอกข้อมูลเพื่อสร้างรายการสินค้าใหม่</p>
            </div>

            <ProductForm categories={categories} />
        </div>
    );
}
