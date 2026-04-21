'use client';

/**
 * Export Buttons Component
 * ปุ่ม Export ข้อมูลเป็น Excel และ PDF
 */

import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { exportToExcel, exportToPDF, ExportColumn, ExportData } from '@/lib/exportUtils';

interface ExportButtonsProps {
    data: ExportData[];
    columns: ExportColumn[];
    filename: string;
    title?: string;
}

export default function ExportButtons({ data, columns, filename, title }: ExportButtonsProps) {
    const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

    const handleExportExcel = async () => {
        setExporting('excel');
        try {
            // Small delay for UI feedback
            await new Promise(resolve => setTimeout(resolve, 300));
            exportToExcel(data, columns, filename);
        } finally {
            setExporting(null);
        }
    };

    const handleExportPDF = async () => {
        setExporting('pdf');
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            await exportToPDF(data, columns, title || filename, filename);
        } finally {
            setExporting(null);
        }
    };

    if (data.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleExportExcel}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                title="Export เป็น Excel"
            >
                {exporting === 'excel' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Excel</span>
            </button>
            <button
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                title="Export เป็น PDF"
            >
                {exporting === 'pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">PDF</span>
            </button>
        </div>
    );
}

// Dropdown version for compact UI
export function ExportDropdown({ data, columns, filename, title }: ExportButtonsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleExport = async (type: 'excel' | 'pdf') => {
        setExporting(true);
        setIsOpen(false);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (type === 'excel') {
                exportToExcel(data, columns, filename);
            } else {
                await exportToPDF(data, columns, title || filename, filename);
            }
        } finally {
            setExporting(false);
        }
    };

    if (data.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
                {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                Export
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20 overflow-hidden">
                        <button
                            onClick={() => handleExport('excel')}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-t"
                        >
                            <FileText className="w-5 h-5 text-red-600" />
                            <span>Export PDF</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
