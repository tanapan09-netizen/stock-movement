'use client';

import { useEffect } from 'react';

type ErrorWithDigest = Error & { digest?: string };

export default function DashboardError({
    error,
    reset,
}: {
    error: ErrorWithDigest;
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Dashboard route error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h1 className="text-xl font-semibold text-gray-900">เกิดข้อผิดพลาดในการแสดงผลหน้า</h1>
                <p className="mt-2 text-sm text-gray-600">
                    กรุณาลองรีเฟรชหน้า หากยังไม่หายให้ส่งรหัสด้านล่างให้ทีมพัฒนา
                </p>
                <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700">
                    <div><strong>Message:</strong> {error?.message || 'Unknown error'}</div>
                    <div className="mt-1"><strong>Digest:</strong> {error?.digest || '-'}</div>
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    ลองใหม่
                </button>
            </div>
        </div>
    );
}
