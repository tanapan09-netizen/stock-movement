'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';


// Debugging helper removed for production

export async function importProducts(formData: FormData) {
    try {

        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No file uploaded' };
        }

        const buffer = await file.arrayBuffer();
        // Try to read with default settings first. If mojibake is detected later, we can't easily retry without cpexcel, 
        // so we will warn the user.
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];

        // Read as array of arrays to find header row
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length === 0) {
            return { success: false, error: 'File is empty' };
        }

        let headerRowIndex = -1;

        // Keywords to identify header row (Thai & English)
        const headerKeywords = ['code', 'name', 'price', 'stock', 'qty', 'รหัส', 'ชื่อ', 'ราคา', 'จำนวน', 'คงเหลือ', 'หมวด', 'หมวดหมู่', 'กลุ่ม', 'ประเภท', 'category'];
        // Mojibake checks (TIS-620 interpreted as Latin1)
        const mojibakeKeywords = ['ÃËÑÊ', 'ª×èÍ', 'ÊÔ¹¤éÒ', 'ÃÒ¤Ò', '¨Ó¹Ç¹'];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            const rowStr = row.join(' ').toLowerCase();

            // Check for valid keywords
            const matchCount = headerKeywords.filter(k => rowStr.includes(k)).length;
            if (matchCount >= 2) {
                headerRowIndex = i;
                break;
            }

            // Check for Mojibake (Encoding issue)
            const mojibakeCount = mojibakeKeywords.filter(k => {
                return row.some(cell => typeof cell === 'string' && cell.includes(k));
            }).length;

            if (mojibakeCount >= 1) {
                return { success: false, error: 'พบปัญหาการอ่านภาษาไทย (Encoding) กรุณาบันทึกไฟล์เป็น .xlsx หรือ CSV (UTF-8) แล้วลองใหม่' };
            }
        }

        if (headerRowIndex === -1) {
            // Fallback: assume row 0 if we can't find anything better
            headerRowIndex = 0;
        }

        const headerRow = rows[headerRowIndex].map(h => String(h).trim());
        const dataRows = rows.slice(headerRowIndex + 1);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];



        for (const [index, rowArr] of dataRows.entries()) {
            const rowNum = headerRowIndex + 2 + index; // 1-based index (Header is +1, Row is +index+1)

            // Convert Array Row to Object based on Header
            const rowData: Record<string, any> = {};
            headerRow.forEach((key, idx) => {
                rowData[key] = rowArr[idx];
            });

            // Helper to find value case-insensitive and robust
            const getValue = (rowData: Record<string, any>, targetKeys: string[]) => {
                const normalizedTargetKeys = targetKeys.map(k => k.toLowerCase().replace(/[\s\uFEFF]/g, ''));
                const rowKey = Object.keys(rowData).find(k => {
                    const normalizedKey = k.toLowerCase().replace(/[\s\uFEFF]/g, '');
                    return normalizedTargetKeys.includes(normalizedKey);
                });
                if (rowKey && rowData[rowKey] !== undefined) return rowData[rowKey];
                return undefined;
            };

            const p_id = getValue(rowData, ['Code', 'Product Code', 'รหัส', 'รหัสสินค้า', 'p_id']);
            const p_name = getValue(rowData, ['Name', 'Product Name', 'ชื่อ', 'ชื่อสินค้า', 'p_name']);
            const category = getValue(rowData, ['Category', 'หมวด', 'หมวดหมู่', 'หมวดสินค้า', 'กลุ่มสินค้า', 'main_category']);
            const price = getValue(rowData, ['Price', 'Price/Unit', 'ราคา', 'ราคาขาย', 'price_unit']);
            const stock = getValue(rowData, ['Stock', 'Qty', 'Quantity', 'จำนวน', 'คงเหลือ', 'p_count']);
            const safety = getValue(rowData, ['Safety', 'Safety Stock', 'จุดสั่งซื้อ', 'safety_stock']);
            const unit = getValue(rowData, ['Unit', 'หน่วย', 'หน่วยนับ', 'p_unit']);

            // Trim values
            const p_id_val = p_id ? String(p_id).trim() : '';
            const p_name_val = p_name ? String(p_name).trim() : '';

            if (!p_id_val || !p_name_val) {
                // Check if row is just empty
                const hasData = Object.values(rowData).some(v => v !== undefined && v !== '' && v !== null);
                if (hasData) {
                    errorCount++;
                    const foundKeys = headerRow.join(', ');
                    errors.push(`Row ${rowNum}: Missing Code or Name. Header used: [${foundKeys}]`);
                }
                continue;
            }

            // Fallback: If Category is undefined, try to find it by index manually
            let categoryFinal = category;
            if (!categoryFinal) {
                const catHeaderIdx = headerRow.findIndex(h => {
                    const hNorm = String(h).toLowerCase().replace(/[\s\uFEFF]/g, '');
                    return ['หมวด', 'หมวดหมู่', 'หมวดสินค้า', 'กลุ่มสินค้า', 'category', 'main_category'].some(k => hNorm.includes(k));
                });
                if (catHeaderIdx !== -1) {
                    categoryFinal = rowArr[catHeaderIdx];
                }
            }

            try {
                // Determine Category
                let categoryName = 'General';
                let categoryId: number | null = null;
                const catToUse = categoryFinal;

                if (catToUse) {
                    categoryName = String(catToUse).trim();

                    // Upsert Category if needed
                    let catRecord = await prisma.tbl_categories.findFirst({
                        where: { cat_name: categoryName }
                    });

                    if (!catRecord) {
                        catRecord = await prisma.tbl_categories.create({
                            data: { cat_name: categoryName }
                        });
                    }
                    categoryId = catRecord.cat_id;
                } else {
                    // Default to General if not provided, try to find ID for General
                    const generalCat = await prisma.tbl_categories.findFirst({ where: { cat_name: 'General' } });
                    if (generalCat) categoryId = generalCat.cat_id;
                }

                // Parse values
                const stockVal = stock ? parseInt(String(stock)) : 0;
                const priceVal = price ? parseFloat(String(price)) : 0;
                const safetyVal = safety ? parseInt(String(safety)) : 0;
                const unitVal = unit ? String(unit).trim() : 'ชิ้น';

                // LOGIC: Check ID first, then Name
                const existingById = await prisma.tbl_products.findUnique({
                    where: { p_id: p_id_val }
                });

                if (existingById) {
                    // Scenario 1: ID Exists -> Update fields
                    // Safe Update: Only update fields, do NOT touch p_id
                    await prisma.tbl_products.update({
                        where: { p_id: p_id_val },
                        data: {
                            p_name: p_name_val,
                            main_category: categoryName,
                            cat_id: categoryId, // Link to Category Table
                            price_unit: priceVal,
                            p_count: stockVal,
                            safety_stock: safetyVal,
                            p_unit: unitVal
                        }
                    });
                    successCount++;

                } else {
                    // Scenario 2: ID New -> Check Name
                    const existingByName = await prisma.tbl_products.findUnique({
                        where: { p_name: p_name_val }
                    });

                    if (existingByName) {
                        // Scenario 3: Name Exists (Different ID) -> UNSAFE TO RENAME ID
                        // Instead of renaming ID (which crashes DB due to FK constraints), 
                        // we will update the existing product with new details but KEEP the old ID.
                        // We will also warn the user in the logs/errors that ID was not changed.

                        await prisma.tbl_products.update({
                            where: { p_name: p_name_val },
                            data: {
                                // p_id: p_id_val, // DO NOT UPDATE ID
                                main_category: categoryName,
                                cat_id: categoryId, // Link to Category Table
                                price_unit: priceVal,
                                p_count: stockVal,
                                safety_stock: safetyVal,
                                p_unit: unitVal
                            }
                        });

                        // Treat as success but maybe append a note? For now just count as success to avoid cluttering error log
                        // But if strict, we could log it.
                        // For user friendliness: 
                        // errors.push(`Row ${rowNum}: Product Name "${p_name_val}" exists. Updated data but kept System ID "${existingByName.p_id}" (Input ID "${p_id_val}" ignored).`);
                        successCount++;

                    } else {
                        // Scenario 4: Brand New Product -> Create
                        await prisma.tbl_products.create({
                            data: {
                                p_id: p_id_val,
                                p_name: p_name_val,
                                main_category: categoryName,
                                cat_id: categoryId, // Link to Category Table
                                price_unit: priceVal,
                                p_count: stockVal,
                                safety_stock: safetyVal,
                                p_unit: unitVal,
                                active: true,
                                p_image: '',
                            }
                        });
                        successCount++;
                    }
                }

            } catch (err: any) {
                console.error(`Error importing row ${rowNum}:`, err);
                errorCount++;
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
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];

        // Read as array of arrays to find header row
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length === 0) {
            return { success: false, error: 'File is empty' };
        }

        let headerRowIndex = -1;
        // Keywords to identify header row (Thai & English)
        const headerKeywords = ['code', 'name', 'price', 'stock', 'qty', 'รหัส', 'ชื่อ', 'ราคา', 'จำนวน', 'คงเหลือ', 'หมวด'];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            const rowStr = row.join(' ').toLowerCase();
            // Check for valid keywords
            const matchCount = headerKeywords.filter(k => rowStr.includes(k)).length;
            if (matchCount >= 2) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            headerRowIndex = 0;
        }

        const headerRow = rows[headerRowIndex].map(h => String(h).trim());
        const dataRows = rows.slice(headerRowIndex + 1);

        const duplicates: { p_id: string; p_name: string; conflict: string }[] = [];

        for (const [index, rowArr] of dataRows.entries()) {
            // Convert Array Row to Object based on Header
            const rowData: Record<string, any> = {};
            headerRow.forEach((key, idx) => {
                rowData[key] = rowArr[idx];
            });

            // Helper to find value case-insensitive and robust against BOM/Spaces
            const getValue = (rowData: Record<string, any>, targetKeys: string[]) => {
                const normalizedTargetKeys = targetKeys.map(k => k.toLowerCase().replace(/[\s\uFEFF]/g, ''));
                const rowKey = Object.keys(rowData).find(k => {
                    const normalizedKey = k.toLowerCase().replace(/[\s\uFEFF]/g, '');
                    return normalizedTargetKeys.includes(normalizedKey);
                });
                if (rowKey && rowData[rowKey] !== undefined) return rowData[rowKey];
                return undefined;
            };

            const p_id = getValue(rowData, ['Code', 'Product Code', 'รหัส', 'รหัสสินค้า', 'p_id']);
            const p_name = getValue(rowData, ['Name', 'Product Name', 'ชื่อ', 'ชื่อสินค้า', 'p_name']);

            const p_id_val = p_id ? String(p_id).trim() : '';
            const p_name_val = p_name ? String(p_name).trim() : '';

            if (p_id_val) {
                const existing = await prisma.tbl_products.findUnique({
                    where: { p_id: p_id_val },
                    select: { p_id: true, p_name: true }
                });

                if (existing) {
                    duplicates.push({
                        p_id: existing.p_id,
                        p_name: existing.p_name,
                        conflict: `รหัสซ้ำ: ${existing.p_id}`
                    });
                } else if (p_name_val) {
                    const existingName = await prisma.tbl_products.findUnique({
                        where: { p_name: p_name_val },
                        select: { p_id: true, p_name: true }
                    });
                    if (existingName && existingName.p_id !== p_id_val) {
                        duplicates.push({
                            p_id: existingName.p_id,
                            p_name: existingName.p_name,
                            conflict: `ชื่อซ้ำ: ${existingName.p_name}`
                        });
                    }
                }
            }
        }

        // Remove duplicates from the list itself (if file has multiple rows same ID)
        // For now, simpler to just return what we found in DB.

        return { success: true, duplicates };

    } catch (error: any) {
        console.error('Check duplicate error:', error);
        return { success: false, error: 'Failed to check file: ' + error.message };
    }
}
