'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/actions/productActions';
import { Save, X } from 'lucide-react';
import Image from 'next/image';

type Category = {
    cat_id: number;
    cat_name: string;
};

type Product = {
    p_id: string;
    p_name: string;
    p_desc: string | null;
    p_unit: string | null;
    price_unit: number | null; // Decimal is number in JS
    cat_id: number | null;
    supplier: string | null;
    safety_stock: number;
    p_image: string | null;
    is_luxury?: boolean | null;
};

export default function ProductForm({
    product,
    categories
}: {
    product?: Product,
    categories: Category[]
}) {
    const [isPending, setIsPending] = useState(false);
    const [preview, setPreview] = useState<string | null>(
        product?.p_image ? `/uploads/${product.p_image}` : null
    );

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        // Client-side validation could go here
        if (product) {
            await updateProduct(formData);
        } else {
            await createProduct(formData);
        }
        // No need to setIsPending(false) because of redirect
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Left Column: Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">รหัสสินค้า *</label>
                        <input
                            type="text"
                            name="p_id"
                            defaultValue={product?.p_id}
                            readOnly={!!product} // Read-only if editing
                            className={`mt-1 block w-full rounded-md border text-sm py-2 px-3 focus:border-blue-500 focus:outline-none ${product ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'
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
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">หมวดหมู่</label>
                        <select
                            name="cat_id"
                            defaultValue={product?.cat_id || ''}
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">-- เลือกหมวดหมู่ --</option>
                            {categories.map((cat) => (
                                <option key={cat.cat_id} value={cat.cat_id}>
                                    {cat.cat_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">ซัพพลายเออร์</label>
                        <input
                            type="text"
                            name="supplier"
                            defaultValue={product?.supplier || ''}
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Right Column: Details & Image */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                        <textarea
                            name="p_desc"
                            defaultValue={product?.p_desc || ''}
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ราคา/หน่วย</label>
                            <input
                                type="number"
                                step="0.01"
                                name="price_unit"
                                defaultValue={product?.price_unit ? Number(product.price_unit) : 0}
                                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">หน่วยนับ</label>
                            <input
                                type="text"
                                name="p_unit"
                                defaultValue={product?.p_unit || 'ชิ้น'}
                                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">จุดสั่งซื้อ (Safety Stock)</label>
                        <input
                            type="number"
                            name="safety_stock"
                            defaultValue={product?.safety_stock || 0}
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                        <input
                            type="checkbox"
                            id="is_luxury"
                            name="is_luxury"
                            value="true"
                            defaultChecked={product?.is_luxury === true}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_luxury" className="text-sm font-medium text-gray-700">
                            สินค้าฟุ่มเฟือย (Luxury Product)
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">รูปภาพสินค้า</label>
                        <div className="flex items-center space-x-4">
                            <div className="h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                                )}
                            </div>
                            <input
                                type="file"
                                name="p_image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t pt-4 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                    <X className="w-4 h-4 mr-2" /> ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center px-4 py-2 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" /> {isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>
        </form>
    );
}
