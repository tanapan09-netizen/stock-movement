'use client';

import { useEffect, useRef, useState } from 'react';
import { createProduct, generateNextProductId, updateProduct } from '@/actions/productActions';
import { FloatingInput, FloatingSelect, FloatingTextarea } from '@/components/FloatingField';
import ProductImage from '@/components/ProductImage';
import { resolveProductImageSrc } from '@/lib/product-image';
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
    sub_sub_category_code?: string | null;
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
    prefill,
    categories,
}: {
    product?: Product;
    prefill?: Partial<Product>;
    categories: Category[];
}) {
    const [isPending, setIsPending] = useState(false);
    const [isAsset, setIsAsset] = useState(product?.is_asset === true || prefill?.is_asset === true);
    const [mainCategoryCode, setMainCategoryCode] = useState(
        product?.main_category_code || prefill?.main_category_code || '',
    );
    const [subCategoryCode, setSubCategoryCode] = useState(
        product?.sub_category_code || prefill?.sub_category_code || '',
    );
    const [subSubCategoryCode, setSubSubCategoryCode] = useState(
        product?.sub_sub_category_code || prefill?.sub_sub_category_code || '',
    );
    const [autoProductId, setAutoProductId] = useState(product?.p_id || prefill?.p_id || '');
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [preview, setPreview] = useState<string | null>(() =>
        resolveProductImageSrc(product?.p_image ?? prefill?.p_image ?? null),
    );

    useEffect(() => {
        if (product) return;

        const normalizedMain = mainCategoryCode.trim().replace(/\s+/g, '').toUpperCase();
        const normalizedSub = subCategoryCode.trim().replace(/\s+/g, '').toUpperCase();
        const normalizedSubSub = subSubCategoryCode.trim().replace(/\s+/g, '').toUpperCase();

        let isStale = false;
        const timer = setTimeout(async () => {
            if (!normalizedMain || !normalizedSub || !normalizedSubSub) {
                setAutoProductId('');
                setCodeError(null);
                setIsGeneratingCode(false);
                return;
            }

            setIsGeneratingCode(true);
            setCodeError(null);

            const result = await generateNextProductId(
                normalizedMain,
                normalizedSub,
                normalizedSubSub,
            );
            if (isStale) return;

            if (result?.error) {
                setAutoProductId('');
                setCodeError('ไม่สามารถสร้างรหัสสินค้าอัตโนมัติได้');
            } else {
                setAutoProductId(result?.productId || '');
                setCodeError(null);
            }

            setIsGeneratingCode(false);
        }, 250);

        return () => {
            isStale = true;
            clearTimeout(timer);
        };
    }, [product, mainCategoryCode, subCategoryCode, subSubCategoryCode]);

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

    const handleOpenAssetNew = () => {
        if (!formRef.current) return;
        const fd = new FormData(formRef.current);
        const getText = (name: string) => String(fd.get(name) || '').trim();

        const params = new URLSearchParams();
        params.set('source', 'product');

        const productSku = getText('p_id');
        const pName = getText('p_name');
        const pDesc = getText('p_desc');
        const supplier = getText('supplier');
        const brandName = getText('brand_name');
        const modelName = getText('model_name');
        const rawLocation = getText('asset_current_location');

        if (productSku) {
            params.set('p_id', productSku);
            params.set('asset_code', productSku);
        }
        if (pName) params.set('p_name', pName);
        if (pDesc) params.set('p_desc', pDesc);
        if (supplier) params.set('supplier', supplier);
        if (brandName) params.set('brand_name', brandName);
        if (modelName) params.set('model_name', modelName);

        if (rawLocation) {
            const segments = rawLocation
                .split('/')
                .map((segment) => segment.trim())
                .filter(Boolean);

            if (segments.length > 0) {
                params.set('location', segments[0]);
            }
            if (segments.length > 1) {
                params.set('room_section', segments.slice(1).join(' / '));
            }
            params.set('asset_current_location', rawLocation);
        }

        params.set('status', 'Active');
        window.location.href = `/assets/new?${params.toString()}`;
    };

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div>
                        <FloatingInput
                            label="รหัสสินค้า SKU (อัตโนมัติ) *"
                            type="text"
                            name="p_id"
                            value={product ? product.p_id : autoProductId}
                            readOnly
                            className={
                                product
                                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
                                    : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-700'
                            }
                            required={!product}
                        />
                        {!product && (
                            <p className="mt-1 text-xs text-gray-500">
                                {codeError
                                    ? codeError
                                    : isGeneratingCode
                                        ? 'กำลังสร้างรหัสสินค้าอัตโนมัติ...'
                                        : ' '}
                            </p>
                        )}
                    </div>

                    <FloatingInput
                        label="ชื่อสินค้า *"
                        type="text"
                        name="p_name"
                        defaultValue={product?.p_name || prefill?.p_name || ''}
                        className="focus:ring-blue-500/20"
                        required
                    />

                    <FloatingSelect
                        label="หมวดหมู่"
                        name="cat_id"
                        defaultValue={product?.cat_id || prefill?.cat_id || ''}
                        className="focus:ring-blue-500/20"
                    >
                        <option value="">-- เลือกหมวดหมู่ --</option>
                        {categories.map((category) => (
                            <option key={category.cat_id} value={category.cat_id}>
                                {category.cat_name}
                            </option>
                        ))}
                    </FloatingSelect>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FloatingInput
                            label="Code หลัก *"
                            type="text"
                            name="main_category_code"
                            value={mainCategoryCode}
                            onChange={(event) => setMainCategoryCode(event.target.value)}
                            className="focus:ring-blue-500/20"
                            required={!product}
                        />
                        <FloatingInput
                            label="Code รอง *"
                            type="text"
                            name="sub_category_code"
                            value={subCategoryCode}
                            onChange={(event) => setSubCategoryCode(event.target.value)}
                            className="focus:ring-blue-500/20"
                            required={!product}
                        />
                        <FloatingInput
                            label="Code ย่อย *"
                            type="text"
                            name="sub_sub_category_code"
                            value={subSubCategoryCode}
                            onChange={(event) => setSubSubCategoryCode(event.target.value)}
                            className="focus:ring-blue-500/20"
                            required={!product}
                        />
                    </div>

                    <FloatingInput
                        label="ซัพพลายเออร์"
                        type="text"
                        name="supplier"
                        defaultValue={product?.supplier || prefill?.supplier || ''}
                        className="focus:ring-blue-500/20"
                    />

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_asset"
                                name="is_asset"
                                value="true"
                                defaultChecked={product?.is_asset === true || prefill?.is_asset === true}
                                onChange={(event) => setIsAsset(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="is_asset" className="text-sm font-medium text-gray-700">
                                เป็นทรัพย์สินหรือไม่
                            </label>
                        </div>
                        {isAsset && (
                            <div className="mt-3">
                                <FloatingInput
                                    label="ที่อยู่ปัจจุบันของทรัพย์สิน"
                                    type="text"
                                    name="asset_current_location"
                                    defaultValue={product?.asset_current_location || prefill?.asset_current_location || ''}
                                    className="bg-white focus:ring-blue-500/20"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <FloatingTextarea
                        label="รายละเอียด"
                        name="p_desc"
                        defaultValue={product?.p_desc || prefill?.p_desc || ''}
                        rows={3}
                        className="focus:ring-blue-500/20"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FloatingInput
                            label="ชื่อรุ่น"
                            type="text"
                            name="model_name"
                            defaultValue={product?.model_name || prefill?.model_name || ''}
                            className="focus:ring-blue-500/20"
                        />
                        <FloatingInput
                            label="ขนาด"
                            type="text"
                            name="size"
                            defaultValue={product?.size || prefill?.size || ''}
                            className="focus:ring-blue-500/20"
                        />
                        <FloatingInput
                            label="ชื่อแบรนด์"
                            type="text"
                            name="brand_name"
                            defaultValue={product?.brand_name || prefill?.brand_name || ''}
                            className="focus:ring-blue-500/20"
                        />
                        <FloatingInput
                            label="รหัสแบรนด์"
                            type="text"
                            name="brand_code"
                            defaultValue={product?.brand_code || prefill?.brand_code || ''}
                            className="focus:ring-blue-500/20"
                        />
                        <FloatingInput
                            label="ราคา/หน่วย"
                            type="number"
                            step="0.01"
                            name="price_unit"
                            defaultValue={
                                product?.price_unit
                                    ? Number(product.price_unit)
                                    : prefill?.price_unit
                                        ? Number(prefill.price_unit)
                                        : 0
                            }
                            className="focus:ring-blue-500/20"
                        />
                        <FloatingInput
                            label="หน่วยนับ"
                            type="text"
                            name="p_unit"
                            defaultValue={product?.p_unit || prefill?.p_unit || 'ชิ้น'}
                            className="focus:ring-blue-500/20"
                        />
                    </div>

                    <FloatingInput
                        label="จุดสั่งซื้อ (Safety Stock)"
                        type="number"
                        name="safety_stock"
                        defaultValue={product?.safety_stock || prefill?.safety_stock || 0}
                        className="focus:ring-blue-500/20"
                    />

                    <div className="mt-4 flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="is_luxury"
                            name="is_luxury"
                            value="true"
                            defaultChecked={product?.is_luxury === true || prefill?.is_luxury === true}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_luxury" className="text-sm font-medium text-gray-700">
                            สินค้าฟุ่มเฟือย (Luxury Product)
                        </label>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">รูปภาพสินค้า</label>
                        <div className="flex items-center space-x-4">
                            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                {preview ? (
                                    <ProductImage
                                        src={preview}
                                        alt={product?.p_name || prefill?.p_name || 'Preview'}
                                        className="h-full w-full object-cover"
                                    />
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
                {!product && isAsset && (
                    <button
                        type="button"
                        onClick={handleOpenAssetNew}
                        className="flex items-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-violet-700 hover:bg-violet-100"
                    >
                        ไปลงทะเบียนทรัพย์สินจากข้อมูลนี้
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                    <X className="mr-2 h-4 w-4" /> ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={isPending || (!product && (isGeneratingCode || !autoProductId))}
                    className="flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="mr-2 h-4 w-4" /> {isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
            </div>
        </form>
    );
}
