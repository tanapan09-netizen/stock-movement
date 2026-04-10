'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
            <Printer className="h-4 w-4" />
            พิมพ์รายงาน
        </button>
    );
}
