import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/ProductForm';

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

function getSingleParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

export default async function NewProductPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const categories = await prisma.tbl_categories.findMany({
        orderBy: { cat_name: 'asc' },
    });

    const params = (await searchParams) || {};
    const source = getSingleParam(params.source).trim();
    const location = getSingleParam(params.location).trim();
    const roomSection = getSingleParam(params.room_section).trim();
    const mergedLocation = [location, roomSection].filter(Boolean).join(' / ');

    const prefill = {
        p_name: getSingleParam(params.p_name).trim() || getSingleParam(params.asset_name).trim(),
        p_desc: getSingleParam(params.p_desc).trim() || getSingleParam(params.description).trim(),
        model_name: getSingleParam(params.model_name).trim() || getSingleParam(params.model).trim(),
        brand_name: getSingleParam(params.brand_name).trim() || getSingleParam(params.brand).trim(),
        supplier: getSingleParam(params.supplier).trim() || getSingleParam(params.vendor).trim(),
        asset_current_location:
            getSingleParam(params.asset_current_location).trim() || mergedLocation,
        is_asset:
            getSingleParam(params.is_asset).trim() === 'true' || source === 'asset',
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">เพิ่มสินค้าใหม่</h1>
                <p className="text-sm text-gray-500">กรอกข้อมูลเพื่อสร้างรายการสินค้าใหม่</p>
            </div>

            <ProductForm categories={categories} prefill={prefill} />
        </div>
    );
}
