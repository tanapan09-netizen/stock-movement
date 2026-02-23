import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/ProductForm';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: { id: string } }) {
    // Use await for params to fix Next.js 15+ async params requirement
    const { id } = await params;

    const [product, categories] = await Promise.all([
        prisma.tbl_products.findUnique({
            where: { p_id: decodeURIComponent(id) },
        }),
        prisma.tbl_categories.findMany({
            orderBy: { cat_name: 'asc' },
        }),
    ]);

    if (!product) {
        notFound();
    }

    // Cast Decimal to number for the form
    const productData = {
        ...product,
        price_unit: product.price_unit ? Number(product.price_unit) : 0,
        p_image: product.p_image || null,
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">แก้ไขสินค้า: {product.p_name}</h1>
                <p className="text-sm text-gray-500">แก้ไขข้อมูลรายละเอียดสินค้า</p>
            </div>

            <ProductForm product={productData} categories={categories} />
        </div>
    );
}
