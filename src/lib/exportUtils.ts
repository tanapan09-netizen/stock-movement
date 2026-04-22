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
    if (data.length === 0) {
        return;
    }
    const headers = columns.map(col => escapeHtml(col.header));
    const rows = data.map(item =>
        columns.map(col => {
            const value = item[col.key];
            return value !== null && value !== undefined ? escapeHtml(String(value)) : '';
        }),
    );
    const renderedTitle = escapeHtml(title);
    const renderedDate = escapeHtml(new Date().toLocaleString('th-TH'));

    const columnWidths = columns.map((col) => Math.max(96, (col.width || 14) * 8));
    const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 56);
    const contentWidth = Math.max(1180, Math.min(2600, totalTableWidth + 140));
    const useA3 = columns.length > 12 || contentWidth > 1700;
    const baseFontSize = columns.length > 12 ? 10 : 11.5;

    const headerCells = headers.map((header) => `<th>${header}</th>`).join('');
    const colGroup = `<col style="width:56px" />${columnWidths
        .map((width) => `<col style="width:${width}px" />`)
        .join('')}`;
    const bodyRows = rows
        .map((row, rowIndex) => {
            const cells = row.map((cell) => `<td>${cell || '-'}</td>`).join('');
            return `<tr class="${rowIndex % 2 === 1 ? 'alt-row' : ''}"><td class="row-index">${rowIndex + 1}</td>${cells}</tr>`;
        })
        .join('');

    const buildPrintableStyles = () => `
            <style>
                @page {
                    size: ${useA3 ? 'A3' : 'A4'} landscape;
                    margin: 10mm;
                }
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    background: #f3f6fb;
                    color: #0f172a;
                    font-family: 'Tahoma', 'Sarabun', 'Noto Sans Thai', 'Segoe UI', sans-serif;
                }
                .pdf-export-root {
                    width: ${contentWidth}px;
                    background: #ffffff;
                    margin: 0 auto;
                    padding: 22px 24px 18px;
                }
                .pdf-export-head {
                    border-radius: 14px;
                    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #0ea5e9 100%);
                    color: #ffffff;
                    padding: 16px 18px;
                    margin-bottom: 14px;
                }
                .pdf-export-title {
                    margin: 0;
                    font-size: 24px;
                    line-height: 1.25;
                    font-weight: 700;
                }
                .pdf-export-meta {
                    margin-top: 6px;
                    font-size: 12px;
                    opacity: 0.9;
                }
                .pdf-export-summary {
                    margin: 0 0 14px 0;
                    font-size: 12px;
                    color: #334155;
                }
                .pdf-export-table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    font-size: ${baseFontSize}px;
                    line-height: 1.35;
                }
                .pdf-export-table th,
                .pdf-export-table td {
                    border: 1px solid #dbe2ef;
                    padding: 6px 8px;
                    text-align: left;
                    vertical-align: top;
                    white-space: normal;
                    word-break: break-word;
                    overflow-wrap: anywhere;
                }
                .pdf-export-table th {
                    background: #1e40af;
                    color: #ffffff;
                    font-weight: 700;
                }
                .pdf-export-table .row-index {
                    text-align: center;
                    font-weight: 600;
                    color: #475569;
                    background: #f8fafc;
                }
                .pdf-export-table .alt-row td {
                    background: #f8fbff;
                }
                .pdf-export-foot {
                    margin-top: 10px;
                    font-size: 10px;
                    color: #64748b;
                    text-align: right;
                }
            </style>
    `;

    const buildPrintableBody = () => `
            <div class="pdf-export-root">
                <div class="pdf-export-head">
                    <h1 class="pdf-export-title">${renderedTitle}</h1>
                    <div class="pdf-export-meta">วันที่สร้างรายงาน: ${renderedDate}</div>
                </div>
                <p class="pdf-export-summary">จำนวนทั้งหมด ${data.length.toLocaleString('th-TH')} รายการ</p>
                <table class="pdf-export-table">
                    <colgroup>${colGroup}</colgroup>
                    <thead>
                        <tr><th>#</th>${headerCells}</tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
                <div class="pdf-export-foot">Stock Movement Pro</div>
            </div>
    `;

    const openPrintFallback = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="utf-8" />
                <title>${renderedTitle}</title>
                ${buildPrintableStyles()}
            </head>
            <body>
                ${buildPrintableBody()}
            </body>
            </html>
        `);
        printWindow.document.close();
        window.setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (error) {
                console.error('Print fallback failed:', error);
            }
        }, 300);
    };

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-22000px';
    container.style.top = '0';
    container.style.width = `${contentWidth}px`;
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.background = '#ffffff';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    container.innerHTML = `${buildPrintableStyles()}${buildPrintableBody()}`;
    document.body.appendChild(container);

    try {
        const root = container.querySelector('.pdf-export-root');
        if (!(root instanceof HTMLElement)) {
            throw new Error('PDF render root not found');
        }

        if ('fonts' in document && document.fonts?.ready) {
            await document.fonts.ready;
        }

        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });
        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });

        const { default: html2canvas } = await import('html2canvas');
        const canvasScale = contentWidth > 2000 ? 1.2 : 1.5;
        const fullCanvas = await html2canvas(root, {
            scale: canvasScale,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: useA3 ? 'a3' : 'a4',
            compress: true,
        });
        const margin = 8;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const printableWidth = pageWidth - margin * 2;
        const printableHeight = pageHeight - margin * 2;
        const pageHeightPx = Math.max(1, Math.floor((printableHeight * fullCanvas.width) / printableWidth));

        let offsetY = 0;
        let page = 0;
        while (offsetY < fullCanvas.height) {
            const sliceHeight = Math.min(pageHeightPx, fullCanvas.height - offsetY);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = fullCanvas.width;
            pageCanvas.height = sliceHeight;
            const pageCtx = pageCanvas.getContext('2d');
            if (!pageCtx) break;

            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
                fullCanvas,
                0,
                offsetY,
                fullCanvas.width,
                sliceHeight,
                0,
                0,
                fullCanvas.width,
                sliceHeight,
            );

            if (page > 0) {
                doc.addPage();
            }

            const renderedHeightMm = (sliceHeight * printableWidth) / fullCanvas.width;
            doc.addImage(
                pageCanvas.toDataURL('image/png'),
                'PNG',
                margin,
                margin,
                printableWidth,
                renderedHeightMm,
                undefined,
                'FAST',
            );

            page += 1;
            offsetY += sliceHeight;
        }

        const totalPages = doc.getNumberOfPages();
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
            doc.setPage(pageNumber);
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text(
                `${pageNumber}/${totalPages}`,
                pageWidth - margin,
                pageHeight - 3,
                { align: 'right' },
            );
        }

        doc.save(`${filename}_${formatDate(new Date())}.pdf`);
    } catch (error) {
        console.error('PDF export render failed, fallback to print preview:', error);
        openPrintFallback();
    } finally {
        container.remove();
    }
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
