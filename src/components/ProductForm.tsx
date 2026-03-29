'use client';

import { useState } from 'react';
import { createProduct, updateProduct } from '@/actions/productActions';
import { Save, X } from 'lucide-react';

type Category = {
    cat_id: number;
    cat_name: string;
};

type Product = {
    p_id: string;
    p_name: string;
    p_desc: string | null;
    main_category_code?: string | null;
    sub_category_code?: string | null;
    model_name?: string | null;
    brand_name?: string | null;
    brand_code?: string | null;
    size?: string | null;
    p_unit: string | null;
    price_unit: number | null;
    cat_id: number | null;
    supplier: string | null;
    safety_stock: number;
    p_image: string | null;
    is_asset?: boolean | null;
    asset_current_location?: string | null;
    is_luxury?: boolean | null;
};

export default function ProductForm({
    product,
    categories,
}: {
    product?: Product;
    categories: Category[];
}) {
    const [isPending, setIsPending] = useState(false);
    const [isAsset, setIsAsset] = useState(product?.is_asset === true);
    const [preview, setPreview] = useState<string | null>(
        product?.p_image ? `/uploads/${product.p_image}` : null,
    );

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        if (product) {
            await updateProduct(formData);
        } else {
            await createProduct(formData);
        }
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
    };

    return (
        <form action={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">รหัสสินค้า *</label>
                        <input
                            type="text"
                            name="p_id"
                            defaultValue={product?.p_id}
                            readOnly={Boolean(product)}
                            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none ${
                                product
                                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
                                    : 'border-gray-300'
                            }`}
                            required={!product}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า *</label>
                        <input
                            type="text"
                            name="p_name"
                            defaultValue={product?.p_name}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">หมวดหมู่</label>
                        <select
                            name="cat_id"
                            defaultValue={product?.cat_id || ''}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">-- เลือกหมวดหมู่ --</option>
                            {categories.map((category) => (
                                <option key={category.cat_id} value={category.cat_id}>
                                    {category.cat_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Code หมวดหลัก</label>
                            <input
                                type="text"
                                name="main_category_code"
                                defaultValue={product?.main_category_code || ''}
                                placeholder="เช่น MC-01"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Code หมวดรอง</label>
                            <input
                                type="text"
                                name="sub_category_code"
                                defaultValue={product?.sub_category_code || ''}
                                placeholder="เช่น SC-001"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">ซัพพลายเออร์</label>
                        <input
                            type="text"
                            name="supplier"
                            defaultValue={product?.supplier || ''}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_asset"
                                name="is_asset"
                                value="true"
                                defaultChecked={product?.is_asset === true}
                                onChange={(event) => setIsAsset(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="is_asset" className="text-sm font-medium text-gray-700">
                                เป็นทรัพย์สินหรือไม่
                            </label>
                        </div>
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700">ที่อยู่ปัจจุบันของทรัพย์สิน</label>
                            <input
                                type="text"
                                name="asset_current_location"
                                defaultValue={product?.asset_current_location || ''}
                                placeholder="เช่น อาคาร A / ห้อง 1202"
                                disabled={!isAsset}
                                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none ${
                                    isAsset
                                        ? 'border-gray-300 bg-white'
                                        : 'border-gray-200 bg-gray-100 text-gray-500'
                                }`}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                        <textarea
                            name="p_desc"
                            defaultValue={product?.p_desc || ''}
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ชื่อรุ่น</label>
                            <input
                                type="text"
                                name="model_name"
                                defaultValue={product?.model_name || ''}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ขนาด</label>
                            <input
                                type="text"
                                name="size"
                                defaultValue={product?.size || ''}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ชื่อแบรนด์</label>
                            <input
                                type="text"
                                name="brand_name"
                                defaultValue={product?.brand_name || ''}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">รหัสแบรนด์</label>
                            <input
                                type="text"
                                name="brand_code"
                                defaultValue={product?.brand_code || ''}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ราคา/หน่วย</label>
                            <input
                                type="number"
                                step="0.01"
                                name="price_unit"
                                defaultValue={product?.price_unit ? Number(product.price_unit) : 0}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">หน่วยนับ</label>
                            <input
                                type="text"
                                name="p_unit"
                                defaultValue={product?.p_unit || 'ชิ้น'}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">จุดสั่งซื้อ (Safety Stock)</label>
                        <input
                            type="number"
                            name="safety_stock"
                            defaultValue={product?.safety_stock || 0}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="mt-4 flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="is_luxury"
                            name="is_luxury"
                            value="true"
                            defaultChecked={product?.is_luxury === true}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_luxury" className="text-sm font-medium text-gray-700">
                            สินค้าฟุ่มเฟือย (Luxury Product)
                        </label>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">รูปภาพสินค้า</label>
                        <div className="flex items-center space-x-4">
                            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No Image</div>
                                )}
                            </div>
                            <input
                                type="file"
                                name="p_image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                    <X className="mr-2 h-4 w-4" /> ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="mr-2 h-4 w-4" /> {isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>
        </form>
    );
}
