'use client';

/**
 * Export Utilities - Excel & PDF
 * ฟังก์ชันสำหรับ Export ข้อมูลเป็น Excel และ PDF
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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
export async function exportToPDF(
    data: ExportData[],
    columns: ExportColumn[],
    title: string = 'Report',
    filename: string = 'export'
): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const headers = columns.map(col => escapeHtml(col.header));
    const rows = data.map(item =>
        columns.map(col => {
            const value = item[col.key];
            return value !== null && value !== undefined ? escapeHtml(String(value)) : '';
        })
    );

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '1120px';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.background = '#ffffff';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';

    const headerCells = headers.map((header) => `<th>${header}</th>`).join('');
    const bodyRows = rows.map((row, rowIndex) => {
        const cells = row.map((cell) => `<td>${cell}</td>`).join('');
        return `<tr class="${rowIndex % 2 === 1 ? 'alt-row' : ''}">${cells}</tr>`;
    }).join('');

    const renderedTitle = escapeHtml(title);
    const renderedDate = escapeHtml(new Date().toLocaleString('th-TH'));
    container.innerHTML = `
        <style>
            .pdf-export-root {
                width: 1120px;
                color: #111827;
                background: #ffffff;
                font-family: 'Sarabun', 'Noto Sans Thai', 'IBM Plex Sans Thai', 'Tahoma', 'Segoe UI', sans-serif;
                box-sizing: border-box;
                padding: 28px 32px 24px;
            }
            .pdf-export-title {
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 4px 0;
                line-height: 1.25;
            }
            .pdf-export-date {
                font-size: 14px;
                color: #6b7280;
                margin: 0 0 18px 0;
            }
            .pdf-export-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 12px;
                line-height: 1.35;
            }
            .pdf-export-table th,
            .pdf-export-table td {
                border: 1px solid #d1d5db;
                padding: 6px 8px;
                text-align: left;
                vertical-align: top;
                word-break: break-word;
                overflow-wrap: anywhere;
            }
            .pdf-export-table th {
                background: #3b82f6;
                color: #ffffff;
                font-weight: 700;
            }
            .pdf-export-table .alt-row td {
                background: #f8fafc;
            }
        </style>
        <div class="pdf-export-root">
            <h1 class="pdf-export-title">${renderedTitle}</h1>
            <p class="pdf-export-date">Generated: ${renderedDate}</p>
            <table class="pdf-export-table">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${bodyRows}
                </tbody>
            </table>
        </div>
    `;
    document.body.appendChild(container);

    try {
        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });

        await doc.html(container, {
            x: 6,
            y: 6,
            width: 285,
            windowWidth: 1120,
            autoPaging: 'text',
            html2canvas: {
                scale: 0.72,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            },
            margin: [6, 6, 12, 6],
        });

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Page ${i} of ${pageCount} - Stock Movement Pro`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 6,
                { align: 'center' }
            );
        }
    } finally {
        container.remove();
    }

    doc.save(`${filename}_${formatDate(new Date())}.pdf`);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        { header: 'ชื่อรุ่น', key: 'model_name', width: 20 },
        { header: 'ชื่อแบรนด์', key: 'brand_name', width: 20 },
        { header: 'รหัสแบรนด์', key: 'brand_code', width: 14 },
        { header: 'ขนาด', key: 'size', width: 14 },
        { header: 'หมวดหมู่', key: 'category_name', width: 20 },
        { header: 'Code หมวดหลัก', key: 'main_category_code', width: 14 },
        { header: 'Code หมวดรอง', key: 'sub_category_code', width: 14 },
        { header: 'Code ย่อย', key: 'sub_sub_category_code', width: 14 },
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
