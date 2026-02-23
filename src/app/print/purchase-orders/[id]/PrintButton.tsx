'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 shadow-md transition-all"
        >
            <Printer className="w-4 h-4 mr-2" /> Print This Page
        </button>
    );
}
