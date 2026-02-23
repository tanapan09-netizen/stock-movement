'use client';

import { useState } from 'react';
import { FileText, Download, Printer, Loader2 } from 'lucide-react';

interface PDFExportProps {
    title: string;
    filename?: string;
    data: Record<string, string | number>[];
    columns: { key: string; label: string; width?: number }[];
    subtitle?: string;
}

export default function PDFExportButton({
    title,
    filename = 'report',
    data,
    columns,
    subtitle
}: PDFExportProps) {
    const [loading, setLoading] = useState(false);

    const generatePDF = async () => {
        setLoading(true);

        // Create printable HTML
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    body {
                        font-family: 'Sarabun', Arial, sans-serif;
                        font-size: 12px;
                        line-height: 1.5;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    .header h1 {
                        font-size: 24px;
                        margin: 0;
                        color: #1a1a1a;
                    }
                    .header .subtitle {
                        font-size: 14px;
                        color: #666;
                        margin-top: 5px;
                    }
                    .header .date {
                        font-size: 12px;
                        color: #999;
                        margin-top: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                        color: #333;
                    }
                    tr:nth-child(even) {
                        background-color: #fafafa;
                    }
                    tr:hover {
                        background-color: #f0f0f0;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 10px;
                        color: #999;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }
                    .summary {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #f9f9f9;
                        border-radius: 5px;
                    }
                    @media print {
                        body { print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${title}</h1>
                    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
                    <div class="date">วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px">#</th>
                            ${columns.map(col => `<th${col.width ? ` style="width: ${col.width}px"` : ''}>${col.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((row, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                ${columns.map(col => `<td>${row[col.key] ?? '-'}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="summary">
                    <strong>รวมทั้งหมด:</strong> ${data.length} รายการ
                </div>
                
                <div class="footer">
                    Stock Movement System | พิมพ์โดยระบบอัตโนมัติ
                </div>
            </body>
            </html>
        `;

        // Open print window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();

            // Wait for content to load then print
            printWindow.onload = () => {
                printWindow.print();
            };
        }

        setLoading(false);
    };

    return (
        <button
            onClick={generatePDF}
            disabled={loading || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="ส่งออก PDF"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <FileText className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">PDF</span>
        </button>
    );
}

// Print current page function
export function PrintPageButton() {
    return (
        <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
            title="พิมพ์หน้านี้"
        >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">พิมพ์</span>
        </button>
    );
}
