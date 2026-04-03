'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

const HEADER_KEYWORDS = [
    'code',
    'product code',
    'name',
    'product name',
    'price',
    'price/unit',
    'stock',
    'qty',
    'quantity',
    'category',
    'main_category',
    'รหัส',
    'รหัสสินค้า',
    'ชื่อ',
    'ชื่อสินค้า',
    'ราคา',
    'ราคาขาย',
    'จำนวน',
    'คงเหลือ',
    'หมวด',
    'หมวดหมู่',
    'หมวดสินค้า',
    'กลุ่มสินค้า',
    'ประเภท',
    'หน่วย',
    'หน่วยนับ',
    'จุดสั่งซื้อ',
    'รุ่น',
    'ชื่อรุ่น',
    'แบรนด์',
    'ชื่อแบรนด์',
    'รหัสแบรนด์',
    'ขนาด',
];

const CATEGORY_HEADER_HINTS = [
    'หมวด',
    'หมวดหมู่',
    'หมวดสินค้า',
    'กลุ่มสินค้า',
    'category',
    'main_category',
];

const SUB_HEADER_TOKENS = [
    'main',
    'sub',
    'minor',
    'max',
    'min',
    'order',
    'high',
    'medium',
    'low',
    'หลัก',
    'รอง',
    'ย่อย',
    'มาก',
    'ปานกลาง',
    'ต่ำ',
    'สั่งซื้อ',
];

const MOJIBAKE_PATTERNS = [
    /[\u00C2\u00C3]/,
    /\u00E2\u20AC/,
    /(?:เธ[\u0E00-\u0E7F]?){2,}/,
    /(?:เน[\u0E00-\u0E7F]?){2,}/,
];

const ENCODING_ERROR_MESSAGE =
    'พบปัญหาการอ่านภาษาไทย (Encoding) กรุณาบันทึกไฟล์เป็น .xlsx หรือ CSV (UTF-8) แล้วลองใหม่';

function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[\s\uFEFF]/g, '');
}

function normalizeCodePart(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value)
        .trim()
        .replace(/\s+/g, '')
        .replace(/[^0-9A-Za-zก-๙_-]/g, '')
        .toUpperCase();
}

function getValue(rowData: Record<string, unknown>, targetKeys: string[]): unknown {
    const normalizedTargetKeys = targetKeys.map((key) => normalizeKey(key));
    const rowKey = Object.keys(rowData).find((key) => {
        return normalizedTargetKeys.includes(normalizeKey(key));
    });
    if (!rowKey) return undefined;
    return rowData[rowKey];
}

function containsMojibake(cell: unknown): boolean {
    if (typeof cell !== 'string') return false;
    return MOJIBAKE_PATTERNS.some((pattern) => pattern.test(cell));
}

function findHeaderRowIndex(rows: unknown[][]): { index: number; error?: string } {
    for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
        const row = rows[i] ?? [];
        const rowStr = row.join(' ').toLowerCase();

        const matchCount = HEADER_KEYWORDS.filter((keyword) =>
            rowStr.includes(keyword),
        ).length;
        if (matchCount >= 2) {
            return { index: i };
        }

        const hasMojibake = row.some((cell) => containsMojibake(cell));
        if (hasMojibake) {
            return { index: -1, error: ENCODING_ERROR_MESSAGE };
        }
    }

    return { index: 0 };
}

function buildRowObject(headerRow: string[], rowArr: unknown[]): Record<string, unknown> {
    const rowData: Record<string, unknown> = {};
    headerRow.forEach((key, idx) => {
        rowData[key] = rowArr[idx];
    });
    return rowData;
}

function optionalText(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
}

function hasAnyValue(rowData: Record<string, unknown>): boolean {
    return Object.values(rowData).some((value) => {
        if (value === undefined || value === null) return false;
        return String(value).trim() !== '';
    });
}

function isLikelySubHeaderRow(rowData: Record<string, unknown>): boolean {
    const tokens = Object.values(rowData)
        .map((value) => normalizeKey(String(value ?? '')))
        .filter((value) => value.length > 0);

    if (tokens.length === 0) return true;

    return tokens.every((token) =>
        SUB_HEADER_TOKENS.some((marker) => token === marker || token.includes(marker)),
    );
}

function buildFallbackProductId(rowData: Record<string, unknown>, rowNum: number): string {
    const main = normalizeCodePart(
        getValue(rowData, ['Main Category Code', 'โค๊ตหมวดหลัก', 'โค้ดหมวดหลัก', 'หมวดหลัก', 'main_category_code']),
    );
    const sub = normalizeCodePart(
        getValue(rowData, ['Sub Category Code', 'โค๊ตหมวดรอง', 'โค้ดหมวดรอง', 'หมวดรอง', 'sub_category_code']),
    );
    const subSub = normalizeCodePart(
        getValue(rowData, ['Sub Sub Category Code', 'โค๊ตหมวดย่อย', 'โค้ดหมวดย่อย', 'หมวดย่อย', 'sub_sub_category_code']),
    );
    const seq = normalizeCodePart(
        getValue(rowData, ['Sequence', 'Seq', 'ลำดับ', 'เลขลำดับ']),
    );

    const composed = [main, sub, subSub, seq].filter((part) => part.length > 0).join('');
    if (composed.length > 0) return composed.slice(0, 64);

    return `IMP${Date.now().toString(36).toUpperCase()}${String(rowNum).padStart(4, '0')}`;
}

function toInt(value: unknown, fallback = 0): number {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value: unknown, fallback = 0): number {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseWorkbookRows(fileBuffer: ArrayBuffer): unknown[][] {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
}

async function resolveCategory(categoryInput: unknown): Promise<{ categoryName: string; categoryId: number | null }> {
    let categoryName = 'General';
    let categoryId: number | null = null;

    if (categoryInput) {
        categoryName = String(categoryInput).trim();
        let catRecord = await prisma.tbl_categories.findFirst({
            where: { cat_name: categoryName },
        });

        if (!catRecord) {
            catRecord = await prisma.tbl_categories.create({
                data: { cat_name: categoryName },
            });
        }

        categoryId = catRecord.cat_id;
        return { categoryName, categoryId };
    }

    const generalCat = await prisma.tbl_categories.findFirst({
        where: { cat_name: 'General' },
    });
    if (generalCat) categoryId = generalCat.cat_id;
    return { categoryName, categoryId };
}

export async function importProducts(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No file uploaded' };
        }

        const buffer = await file.arrayBuffer();
        const rows = parseWorkbookRows(buffer);

        if (rows.length === 0) {
            return { success: false, error: 'File is empty' };
        }

        const headerLookup = findHeaderRowIndex(rows);
        if (headerLookup.error) {
            return { success: false, error: headerLookup.error };
        }

        const headerRowIndex = headerLookup.index;
        const headerRow = (rows[headerRowIndex] ?? []).map((h) => String(h).trim());
        const dataRows = rows.slice(headerRowIndex + 1);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const [index, rawRow] of dataRows.entries()) {
            const rowArr = rawRow as unknown[];
            const rowNum = headerRowIndex + 2 + index;
            const rowData = buildRowObject(headerRow, rowArr);

            const p_id = getValue(rowData, ['Code', 'Product Code', 'รหัส', 'รหัสสินค้า', 'p_id']);
            const p_name = getValue(rowData, ['Name', 'Product Name', 'ชื่อ', 'ชื่อสินค้า', 'ชื่อเรียกภาษาไทย', 'p_name']);
            const category = getValue(rowData, ['Category', 'หมวด', 'หมวดหมู่', 'หมวดสินค้า', 'กลุ่มสินค้า', 'main_category', 'ประเภทงาน']);
            const price = getValue(rowData, ['Price', 'Price/Unit', 'ราคา', 'ราคาขาย', 'price_unit']);
            const stock = getValue(rowData, ['Stock', 'Qty', 'Quantity', 'จำนวน', 'คงเหลือ', 'นับจริง', 'p_count']);
            const safety = getValue(rowData, ['Safety', 'Safety Stock', 'จุดสั่งซื้อ', 'จำนวน min สั่งซื้อ', 'min สั่งซื้อ', 'safety_stock']);
            const unit = getValue(rowData, ['Unit', 'หน่วย', 'หน่วยนับ', 'p_unit']);
            const model_name = getValue(rowData, ['Model', 'Model Name', 'รุ่น', 'ชื่อรุ่น', 'model_name']);
            const brand_name = getValue(rowData, ['Brand', 'Brand Name', 'แบรนด์', 'ชื่อแบรนด์', 'brand_name']);
            const brand_code = getValue(rowData, ['Brand Code', 'รหัสแบรนด์', 'brand_code']);
            const size = getValue(rowData, ['Size', 'ขนาด', 'size']);
            const mainCategoryCode = getValue(rowData, ['Main Category Code', 'โค๊ตหมวดหลัก', 'โค้ดหมวดหลัก', 'หมวดหลัก', 'main_category_code']);
            const subCategoryCode = getValue(rowData, ['Sub Category Code', 'โค๊ตหมวดรอง', 'โค้ดหมวดรอง', 'หมวดรอง', 'sub_category_code']);
            const subSubCategoryCode = getValue(rowData, ['Sub Sub Category Code', 'โค๊ตหมวดย่อย', 'โค้ดหมวดย่อย', 'หมวดย่อย', 'sub_sub_category_code']);

            let p_id_val = p_id ? String(p_id).trim() : '';
            const p_name_val = p_name ? String(p_name).trim() : '';

            if (!p_name_val) {
                if (hasAnyValue(rowData) && !isLikelySubHeaderRow(rowData)) {
                    errorCount += 1;
                    const foundKeys = headerRow.join(', ');
                    errors.push(`Row ${rowNum}: Missing Name. Header used: [${foundKeys}]`);
                }
                continue;
            }

            if (!p_id_val) {
                p_id_val = buildFallbackProductId(rowData, rowNum);
            }

            let categoryFinal = category;
            if (!categoryFinal) {
                const groupedCategory = [mainCategoryCode, subCategoryCode, subSubCategoryCode]
                    .map((part) => optionalText(part))
                    .filter((part): part is string => Boolean(part))
                    .join('-');
                if (groupedCategory.length > 0) {
                    categoryFinal = groupedCategory;
                }
            }
            if (!categoryFinal) {
                const catHeaderIdx = headerRow.findIndex((headerKey) => {
                    const normalizedKey = normalizeKey(String(headerKey));
                    return CATEGORY_HEADER_HINTS.some((keyword) =>
                        normalizedKey.includes(normalizeKey(keyword)),
                    );
                });
                if (catHeaderIdx !== -1) {
                    categoryFinal = rowArr[catHeaderIdx];
                }
            }

            try {
                const { categoryName, categoryId } = await resolveCategory(categoryFinal);

                const stockVal = toInt(stock, 0);
                const priceVal = toFloat(price, 0);
                const safetyVal = toInt(safety, 0);
                const unitVal = unit ? String(unit).trim() : 'ชิ้น';

                const modelVal = optionalText(model_name);
                const brandNameVal = optionalText(brand_name);
                const brandCodeVal = optionalText(brand_code);
                const sizeVal = optionalText(size);

                const existingById = await prisma.tbl_products.findUnique({
                    where: { p_id: p_id_val },
                });

                if (existingById) {
                    await prisma.tbl_products.update({
                        where: { p_id: p_id_val },
                        data: {
                            p_name: p_name_val,
                            main_category: categoryName,
                            cat_id: categoryId,
                            price_unit: priceVal,
                            p_count: stockVal,
                            safety_stock: safetyVal,
                            p_unit: unitVal,
                        },
                    });

                    await prisma.$executeRaw`
                        UPDATE tbl_products
                        SET model_name = ${modelVal},
                            brand_name = ${brandNameVal},
                            brand_code = ${brandCodeVal},
                            size = ${sizeVal}
                        WHERE p_id = ${p_id_val}
                    `;
                    successCount += 1;
                    continue;
                }

                const existingByName = await prisma.tbl_products.findUnique({
                    where: { p_name: p_name_val },
                });

                if (existingByName) {
                    await prisma.tbl_products.update({
                        where: { p_name: p_name_val },
                        data: {
                            main_category: categoryName,
                            cat_id: categoryId,
                            price_unit: priceVal,
                            p_count: stockVal,
                            safety_stock: safetyVal,
                            p_unit: unitVal,
                        },
                    });

                    await prisma.$executeRaw`
                        UPDATE tbl_products
                        SET model_name = ${modelVal},
                            brand_name = ${brandNameVal},
                            brand_code = ${brandCodeVal},
                            size = ${sizeVal}
                        WHERE p_id = ${existingByName.p_id}
                    `;
                    successCount += 1;
                    continue;
                }

                await prisma.tbl_products.create({
                    data: {
                        p_id: p_id_val,
                        p_name: p_name_val,
                        main_category: categoryName,
                        cat_id: categoryId,
                        price_unit: priceVal,
                        p_count: stockVal,
                        safety_stock: safetyVal,
                        p_unit: unitVal,
                        active: true,
                        p_image: '',
                    },
                });

                await prisma.$executeRaw`
                    UPDATE tbl_products
                    SET model_name = ${modelVal},
                        brand_name = ${brandNameVal},
                        brand_code = ${brandCodeVal},
                        size = ${sizeVal}
                    WHERE p_id = ${p_id_val}
                `;
                successCount += 1;
            } catch (err: any) {
                console.error(`Error importing row ${rowNum}:`, err);
                errorCount += 1;
                errors.push(`Row ${rowNum}: ${err.message}`);
            }
        }

        revalidatePath('/products');
        return { success: true, count: successCount, errorCount, errors };
    } catch (error: any) {
        console.error('Import error:', error);
        return { success: false, error: 'Failed to process file: ' + error.message };
    }
}

export async function checkDuplicateProducts(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No file uploaded' };
        }

        const buffer = await file.arrayBuffer();
        const rows = parseWorkbookRows(buffer);

        if (rows.length === 0) {
            return { success: false, error: 'File is empty' };
        }

        const headerLookup = findHeaderRowIndex(rows);
        if (headerLookup.error) {
            return { success: false, error: headerLookup.error };
        }

        const headerRow = (rows[headerLookup.index] ?? []).map((h) => String(h).trim());
        const dataRows = rows.slice(headerLookup.index + 1);
        const duplicates: { p_id: string; p_name: string; conflict: string }[] = [];

        for (const rawRow of dataRows) {
            const rowArr = rawRow as unknown[];
            const rowData = buildRowObject(headerRow, rowArr);

            const p_id = getValue(rowData, ['Code', 'Product Code', 'รหัส', 'รหัสสินค้า', 'p_id']);
            const p_name = getValue(rowData, ['Name', 'Product Name', 'ชื่อ', 'ชื่อสินค้า', 'ชื่อเรียกภาษาไทย', 'p_name']);

            const p_id_val = p_id ? String(p_id).trim() : '';
            const p_name_val = p_name ? String(p_name).trim() : '';

            if (isLikelySubHeaderRow(rowData)) continue;
            if (!p_id_val && !p_name_val) continue;

            if (p_id_val) {
                const existing = await prisma.tbl_products.findUnique({
                    where: { p_id: p_id_val },
                    select: { p_id: true, p_name: true },
                });

                if (existing) {
                    duplicates.push({
                        p_id: existing.p_id,
                        p_name: existing.p_name,
                        conflict: `รหัสซ้ำ: ${existing.p_id}`,
                    });
                    continue;
                }
            }

            if (!p_name_val) continue;

            const existingName = await prisma.tbl_products.findUnique({
                where: { p_name: p_name_val },
                select: { p_id: true, p_name: true },
            });

            if (existingName && (!p_id_val || existingName.p_id !== p_id_val)) {
                duplicates.push({
                    p_id: existingName.p_id,
                    p_name: existingName.p_name,
                    conflict: `ชื่อซ้ำ: ${existingName.p_name}`,
                });
            }
        }

        return { success: true, duplicates };
    } catch (error: any) {
        console.error('Check duplicate error:', error);
        return { success: false, error: 'Failed to check file: ' + error.message };
    }
}
