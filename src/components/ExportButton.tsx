'use client';

import { Download } from 'lucide-react';

type ExportButtonProps = {
    data: Record<string, unknown>[];
    filename: string;
    columns: { key: string; label: string }[];
};

export default function ExportButton({ data, filename, columns }: ExportButtonProps) {
    const exportToCSV = () => {
        // Create CSV header
        const headers = columns.map(c => c.label).join(',');

        // Create CSV rows
        const rows = data.map(row =>
            columns.map(c => {
                const value = row[c.key];
                // Handle values that might contain commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            }).join(',')
        ).join('\n');

        // Combine with BOM for UTF-8
        const csvContent = '\uFEFF' + headers + '\n' + rows;

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
        >
            <Download className="w-4 h-4" />
            Export CSV
        </button>
    );
}
