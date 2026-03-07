'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Search, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess?: (decodedText: string) => void;
}

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            // Delay slightly to ensure DOM element is ready before attaching scanner
            const timer = setTimeout(() => {
                startScanner();
            }, 100);
            return () => clearTimeout(timer);
        } else {
            stopScanner();
        }

        // Cleanup on unmount
        return () => {
            stopScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const startScanner = () => {
        // Prevent multiple instances
        if (scannerRef.current) {
            try {
                scannerRef.current.clear().catch(console.error);
            } catch (e) { }
        }

        setError('');

        try {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                /* verbose= */ false
            );

            scannerRef.current.render(
                (decodedText) => {
                    // Stop scanning after success to prevent multiple triggers
                    stopScanner();

                    if (onScanSuccess) {
                        onScanSuccess(decodedText);
                    } else {
                        handleDefaultScan(decodedText);
                    }
                },
                (errorMessage) => {
                    // Ignore stream warnings
                }
            );
        } catch (err: any) {
            console.error("Scanner init error:", err);
            setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งาน และเข้าผ่าน HTTPS");
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            } catch (e) { }
        }
    };

    const handleDefaultScan = (text: string) => {
        // Smart routing based on scanned value
        // Room codes usually start with R or have specific format
        if (text.startsWith('RM-') || text.match(/^[A-Z]\d{3}$/i)) {
            onClose();
            router.push(`/maintenance?room=${text}`);
        }
        // Product codes like P001, PRD-...
        else if (text.startsWith('P') || text.length === 13) {
            onClose();
            router.push(`/products?search=${text}`);
        }
        // Generic search fallback
        else {
            onClose();
            router.push(`/products?search=${text}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <Search className="w-5 h-5 text-blue-500" />
                        สแกน QR / Barcode
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error ? (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg flex flex-col items-center justify-center text-center gap-2">
                            <AlertCircle className="w-8 h-8" />
                            <p>{error}</p>
                            <button
                                onClick={() => { startScanner(); }}
                                className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-500/20 rounded font-medium hover:bg-red-200"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex justify-center w-full">
                            <div id="reader" className="w-[300px] h-[300px] rounded-lg overflow-hidden border-2 border-dashed border-blue-500/50 bg-slate-100 dark:bg-slate-900">
                                <div className="animate-pulse flex items-center justify-center h-full text-slate-500">
                                    กำลังเปิดกล้อง...
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                        จัดบาร์โค้ดให้อยู่ในกรอบเพื่อสแกน<br />
                        (รองรับรหัสสินค้า และห้องซ่อม)
                    </p>
                </div>
            </div>
        </div>
    );
}
