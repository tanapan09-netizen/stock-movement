'use client';

import { useEffect } from 'react';

type ErrorWithDigest = Error & { digest?: string };

export default function ImportPageError({
    error,
    reset,
}: {
    error: ErrorWithDigest;
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Products import page error:', error);
    }, [error]);

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
                <h2 className="text-lg font-semibold">หน้า Import มีข้อผิดพลาด</h2>
                <p className="mt-2 text-sm">
                    ลองกดปุ่มด้านล่างเพื่อโหลดใหม่ หากยังไม่หายให้ส่งรหัส Digest ให้ทีมพัฒนา
                </p>
                <div className="mt-3 rounded border border-red-200 bg-white p-3 text-xs">
                    <div><strong>Message:</strong> {error?.message || 'Unknown error'}</div>
                    <div className="mt-1"><strong>Digest:</strong> {error?.digest || '-'}</div>
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    ลองโหลดหน้าใหม่
                </button>
            </div>
        </div>
    );
}
