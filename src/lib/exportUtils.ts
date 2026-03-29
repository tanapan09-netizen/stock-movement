'use client';

/**
 * Export Utilities - Excel & PDF
 * เธเธฑเธเธเนเธเธฑเธเธชเธณเธซเธฃเธฑเธ Export เธเนเธญเธกเธนเธฅเน€เธเนเธ Excel เนเธฅเธฐ PDF
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
        { header: 'เธฃเธซเธฑเธชเธชเธดเธเธเนเธฒ', key: 'p_code', width: 15 },
        { header: 'เธเธทเนเธญเธชเธดเธเธเนเธฒ', key: 'p_name', width: 30 },
        { header: 'เธเธทเนเธญเธฃเธธเนเธ', key: 'model_name', width: 20 },
        { header: 'เธเธทเนเธญเนเธเธฃเธเธ”เน', key: 'brand_name', width: 20 },
        { header: 'เธฃเธซเธฑเธชเนเธเธฃเธเธ”เน', key: 'brand_code', width: 14 },
        { header: 'เธเธเธฒเธ”', key: 'size', width: 14 },
        { header: 'เธซเธกเธงเธ”เธซเธกเธนเน', key: 'category_name', width: 20 },
        { header: 'เธเธณเธเธงเธเธเธเน€เธซเธฅเธทเธญ', key: 'p_count', width: 12 },
        { header: 'เธซเธเนเธงเธข', key: 'p_unit', width: 10 },
        { header: 'เธฃเธฒเธเธฒ', key: 'p_price', width: 12 },
        { header: 'Safety Stock', key: 'safety_stock', width: 12 },
    ],
    movements: [
        { header: 'เธงเธฑเธเธ—เธตเน', key: 'date', width: 15 },
        { header: 'เธชเธดเธเธเนเธฒ', key: 'product_name', width: 25 },
        { header: 'เธเธฃเธฐเน€เธ เธ—', key: 'type', width: 10 },
        { header: 'เธเธณเธเธงเธ', key: 'quantity', width: 10 },
        { header: 'เธซเธกเธฒเธขเน€เธซเธ•เธธ', key: 'note', width: 30 },
        { header: 'เธเธนเนเธ”เธณเน€เธเธดเธเธเธฒเธฃ', key: 'user', width: 15 },
    ],
    lowStock: [
        { header: 'เธฃเธซเธฑเธชเธชเธดเธเธเนเธฒ', key: 'p_code', width: 15 },
        { header: 'เธเธทเนเธญเธชเธดเธเธเนเธฒ', key: 'p_name', width: 30 },
        { header: 'เธเธเน€เธซเธฅเธทเธญ', key: 'p_count', width: 12 },
        { header: 'Safety Stock', key: 'safety_stock', width: 12 },
        { header: 'เธ•เนเธญเธเน€เธ•เธดเธก', key: 'need_reorder', width: 12 },
    ],
};

