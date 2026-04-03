'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import path from 'path';
import { uploadFile } from '@/lib/gcs';

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
    'image',
    'image url',
    'รูปประกอบ',
    'รูปภาพ',
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

    const markerHits = tokens.filter((token) =>
        SUB_HEADER_TOKENS.some((marker) => token === marker || token.includes(marker)),
    ).length;

    if (markerHits === tokens.length) return true;
    return markerHits >= 3 && markerHits / tokens.length >= 0.4;
}

function buildFallbackProductId(rowData: Record<string, unknown>, rowNum: number): string {
    const main = normalizeCodePart(
        getValue(rowData, ['Main Category Code', 'Code หมวดหลัก', 'โค๊ตหมวดหลัก', 'โค้ดหมวดหลัก', 'หมวดหลัก', 'main_category_code']),
    );
    const sub = normalizeCodePart(
        getValue(rowData, ['Sub Category Code', 'Code หมวดรอง', 'โค๊ตหมวดรอง', 'โค้ดหมวดรอง', 'หมวดรอง', 'sub_category_code']),
    );
    const subSub = normalizeCodePart(
        getValue(rowData, ['Sub Sub Category Code', 'Code ย่อย', 'Code หมวดย่อย', 'โค๊ตหมวดย่อย', 'โค้ดหมวดย่อย', 'หมวดย่อย', 'sub_sub_category_code']),
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

type RelationshipEntry = { target: string; type: string };
type WorkbookFileEntry = { content?: ArrayLike<number> };
type WorkbookFiles = Record<string, WorkbookFileEntry | undefined>;

function resolveZipPath(baseFilePath: string, target: string): string {
    const normalizedTarget = target.replace(/\\/g, '/');
    if (normalizedTarget.startsWith('/')) {
        return normalizedTarget.replace(/^\/+/, '');
    }

    const baseDir = path.posix.dirname(baseFilePath);
    const resolved = path.posix.normalize(path.posix.join(baseDir, normalizedTarget));
    return resolved.replace(/^\/+/, '');
}

function extractAttribute(tagSource: string, attrName: string): string | null {
    const matcher = new RegExp(`${attrName}="([^"]+)"`, 'i');
    const match = matcher.exec(tagSource);
    return match?.[1] ?? null;
}

function parseRelationships(xml: string): Map<string, RelationshipEntry> {
    const relationMap = new Map<string, RelationshipEntry>();
    const relRegex = /<Relationship\b[^>]*\/?>/g;

    let match: RegExpExecArray | null;
    while ((match = relRegex.exec(xml)) !== null) {
        const tag = match[0];
        const id = extractAttribute(tag, 'Id');
        const target = extractAttribute(tag, 'Target');
        const type = extractAttribute(tag, 'Type');
        if (!id || !target || !type) continue;
        relationMap.set(id, { target, type });
    }

    return relationMap;
}

function extractImageAnchors(drawingXml: string): Array<{ row: number; relationId: string }> {
    const anchors: Array<{ row: number; relationId: string }> = [];
    const anchorRegex = /<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g;

    let anchorMatch: RegExpExecArray | null;
    while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
        const anchorXml = anchorMatch[0];
        const rowMatch = /<(?:xdr:)?from\b[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/.exec(anchorXml);
        const relationMatch = /\br:embed="([^"]+)"/.exec(anchorXml);
        if (!rowMatch || !relationMatch) continue;

        const zeroBasedRow = Number.parseInt(rowMatch[1], 10);
        if (!Number.isFinite(zeroBasedRow)) continue;

        anchors.push({ row: zeroBasedRow + 1, relationId: relationMatch[1] });
    }

    return anchors;
}

function getWorkbookFiles(fileBuffer: ArrayBuffer): WorkbookFiles {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', bookFiles: true });
    return ((workbook as unknown as { files?: WorkbookFiles }).files) ?? {};
}

function getFileText(files: WorkbookFiles, filePath: string): string | null {
    const content = files[filePath]?.content;
    if (!content) return null;
    return Buffer.from(content).toString('utf8');
}

function getFileBuffer(files: WorkbookFiles, filePath: string): Buffer | null {
    const content = files[filePath]?.content;
    if (!content) return null;
    return Buffer.from(content);
}

async function persistEmbeddedImage(buffer: Buffer, sourcePath: string, rowNum: number): Promise<string> {
    const sourceExt = path.extname(sourcePath).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(sourceExt)
        ? sourceExt
        : '.jpg';
    const mimeTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
    };
    const mimeType = mimeTypeMap[safeExt] || 'image/jpeg';
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const filename = `embedded-row-${rowNum}-${randomSuffix}${safeExt}`;
    const bytes = Uint8Array.from(buffer);
    const file = new File([bytes], filename, { type: mimeType });
    return uploadFile(file, 'products', { baseName: `embedded-row-${rowNum}` });
}

async function extractEmbeddedImagesByRow(fileBuffer: ArrayBuffer, maxRow: number): Promise<Map<number, string>> {
    const imageMap = new Map<number, string>();

    try {
        const files = getWorkbookFiles(fileBuffer);
        const workbookXml = getFileText(files, 'xl/workbook.xml');
        const workbookRelsXml = getFileText(files, 'xl/_rels/workbook.xml.rels');
        if (!workbookXml || !workbookRelsXml) return imageMap;

        const firstSheetRidMatch = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbookXml);
        const firstSheetRid = firstSheetRidMatch?.[1];
        if (!firstSheetRid) return imageMap;

        const workbookRelations = parseRelationships(workbookRelsXml);
        const sheetRelation = workbookRelations.get(firstSheetRid);
        if (!sheetRelation) return imageMap;

        const sheetPath = resolveZipPath('xl/workbook.xml', sheetRelation.target);
        const sheetRelsPath = `${path.posix.dirname(sheetPath)}/_rels/${path.posix.basename(sheetPath)}.rels`;
        const sheetRelsXml = getFileText(files, sheetRelsPath);
        if (!sheetRelsXml) return imageMap;
        const sheetRelations = parseRelationships(sheetRelsXml);
        const drawingRelation = [...sheetRelations.values()].find((entry) =>
            entry.type.includes('/drawing'),
        );
        if (!drawingRelation) return imageMap;

        const drawingPath = resolveZipPath(sheetPath, drawingRelation.target);
        const drawingXml = getFileText(files, drawingPath);
        if (!drawingXml) return imageMap;
        const drawingRelsPath = `${path.posix.dirname(drawingPath)}/_rels/${path.posix.basename(drawingPath)}.rels`;
        const drawingRelsXml = getFileText(files, drawingRelsPath);
        if (!drawingRelsXml) return imageMap;
        const drawingRelations = parseRelationships(drawingRelsXml);
        const anchors = extractImageAnchors(drawingXml);

        for (const anchor of anchors) {
            if (anchor.row < 1 || anchor.row > maxRow) continue;
            if (imageMap.has(anchor.row)) continue;

            const imageRelation = drawingRelations.get(anchor.relationId);
            if (!imageRelation) continue;

            const imagePath = resolveZipPath(drawingPath, imageRelation.target);
            const imageBuffer = getFileBuffer(files, imagePath);
            if (!imageBuffer) continue;
            const savedPath = await persistEmbeddedImage(imageBuffer, imagePath, anchor.row);
            imageMap.set(anchor.row, savedPath);
        }
    } catch (error) {
        console.error('Failed to extract embedded images from workbook:', error);
    }

    return imageMap;
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
        const embeddedImagesByRow = await extractEmbeddedImagesByRow(buffer, rows.length);

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
            const image = getValue(rowData, ['Image', 'Image URL', 'รูปประกอบ', 'รูปภาพ', 'p_image']);
            const mainCategoryCode = getValue(rowData, ['Main Category Code', 'Code หมวดหลัก', 'โค๊ตหมวดหลัก', 'โค้ดหมวดหลัก', 'หมวดหลัก', 'main_category_code']);
            const subCategoryCode = getValue(rowData, ['Sub Category Code', 'Code หมวดรอง', 'โค๊ตหมวดรอง', 'โค้ดหมวดรอง', 'หมวดรอง', 'sub_category_code']);
            const subSubCategoryCode = getValue(rowData, ['Sub Sub Category Code', 'Code ย่อย', 'Code หมวดย่อย', 'โค๊ตหมวดย่อย', 'โค้ดหมวดย่อย', 'หมวดย่อย', 'sub_sub_category_code']);

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
                const imageVal = optionalText(image) ?? embeddedImagesByRow.get(rowNum) ?? null;
                const mainCategoryCodeVal = optionalText(normalizeCodePart(mainCategoryCode));
                const subCategoryCodeVal = optionalText(normalizeCodePart(subCategoryCode));
                const subSubCategoryCodeVal = optionalText(normalizeCodePart(subSubCategoryCode));

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
                            ...(imageVal ? { p_image: imageVal } : {}),
                        },
                    });

                    await prisma.$executeRaw`
                        UPDATE tbl_products
                        SET model_name = ${modelVal},
                            brand_name = ${brandNameVal},
                            brand_code = ${brandCodeVal},
                            size = ${sizeVal},
                            main_category_code = ${mainCategoryCodeVal},
                            sub_category_code = ${subCategoryCodeVal},
                            sub_sub_category_code = ${subSubCategoryCodeVal}
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
                            ...(imageVal ? { p_image: imageVal } : {}),
                        },
                    });

                    await prisma.$executeRaw`
                        UPDATE tbl_products
                        SET model_name = ${modelVal},
                            brand_name = ${brandNameVal},
                            brand_code = ${brandCodeVal},
                            size = ${sizeVal},
                            main_category_code = ${mainCategoryCodeVal},
                            sub_category_code = ${subCategoryCodeVal},
                            sub_sub_category_code = ${subSubCategoryCodeVal}
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
                        p_image: imageVal || '',
                    },
                });

                await prisma.$executeRaw`
                    UPDATE tbl_products
                    SET model_name = ${modelVal},
                        brand_name = ${brandNameVal},
                        brand_code = ${brandCodeVal},
                        size = ${sizeVal},
                        main_category_code = ${mainCategoryCodeVal},
                        sub_category_code = ${subCategoryCodeVal},
                        sub_sub_category_code = ${subSubCategoryCodeVal}
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
