'use client';

/**
 * Export Utilities - Excel & PDF
 * ฟังก์ชันสำหรับ Export ข้อมูลเป็น Excel และ PDF
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
export interface ExportColumn {
    header: string;
    key: string;
    width?: number;
}

export interface ExportData {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Export data to Excel file
 */
export function exportToExcel(
    data: ExportData[],
    columns: ExportColumn[],
    filename: string = 'export'
): void {
    // Prepare data with headers
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
        columns.map(col => {
            const value = item[col.key];
            return value !== null && value !== undefined ? value : '';
        })
    );

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Download
    XLSX.writeFile(wb, `${filename}_${formatDate(new Date())}.xlsx`);
}

/**
 * Export data to PDF file
 */
export function exportToPDF(
    data: ExportData[],
    columns: ExportColumn[],
    title: string = 'Report',
    filename: string = 'export'
): void {
    // Create PDF document
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Add Thai font support note
    doc.setFont('helvetica');

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, 14, 28);

    // Prepare table data
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
        columns.map(col => {
            const value = item[col.key];
            return value !== null && value !== undefined ? String(value) : '';
        })
    );

    // Add table
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [59, 130, 246], // Blue
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount} - Stock Movement Pro`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    // Download
    doc.save(`${filename}_${formatDate(new Date())}.pdf`);
}

/**
 * Format date for filename
 */
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Pre-defined column configurations
 */
export const EXPORT_COLUMNS = {
    products: [
        { header: 'รหัสสินค้า', key: 'p_code', width: 15 },
        { header: 'ชื่อสินค้า', key: 'p_name', width: 30 },
        { header: 'หมวดหมู่', key: 'category_name', width: 20 },
        { header: 'จำนวนคงเหลือ', key: 'p_count', width: 12 },
        { header: 'หน่วย', key: 'p_unit', width: 10 },
        { header: 'ราคา', key: 'p_price', width: 12 },
        { header: 'Safety Stock', key: 'safety_stock', width: 12 },
    ],
    movements: [
        { header: 'วันที่', key: 'date', width: 15 },
        { header: 'สินค้า', key: 'product_name', width: 25 },
        { header: 'ประเภท', key: 'type', width: 10 },
        { header: 'จำนวน', key: 'quantity', width: 10 },
        { header: 'หมายเหตุ', key: 'note', width: 30 },
        { header: 'ผู้ดำเนินการ', key: 'user', width: 15 },
    ],
    lowStock: [
        { header: 'รหัสสินค้า', key: 'p_code', width: 15 },
        { header: 'ชื่อสินค้า', key: 'p_name', width: 30 },
        { header: 'คงเหลือ', key: 'p_count', width: 12 },
        { header: 'Safety Stock', key: 'safety_stock', width: 12 },
        { header: 'ต้องเติม', key: 'need_reorder', width: 12 },
    ],
};
