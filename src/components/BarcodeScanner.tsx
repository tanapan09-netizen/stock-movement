'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, QrCode, Barcode, Loader2 } from 'lucide-react';

interface BarcodeResult {
    code: string;
    format: string;
}

interface BarcodeScannerProps {
    onScan: (result: BarcodeResult) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasCamera, setHasCamera] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setIsLoading(false);
        } catch (err) {
            console.error('Camera error:', err);
            setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง');
            setHasCamera(false);
            setIsLoading(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    // Simulate barcode detection (in real app, use a library like @zxing/browser)
    const simulateScan = () => {
        // This is a placeholder - in production, integrate with BarcodeDetector API or zxing
        const mockCodes = ['P001', 'P002', 'A001', 'A002'];
        const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
        onScan({ code: randomCode, format: 'QR_CODE' });
    };

    const handleManualInput = () => {
        const code = prompt('ใส่รหัสสินค้า:');
        if (code) {
            onScan({ code, format: 'MANUAL' });
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    สแกน Barcode / QR Code
                </h2>
                <button
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    title="ปิด"
                    aria-label="ปิดหน้าสแกน"
                    className="p-2 hover:bg-gray-700 rounded-full transition"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Camera View */}
            <div className="flex-1 relative overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <div className="text-white text-center">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                            <p>กำลังเปิดกล้อง...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <div className="text-white text-center p-8">
                            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg mb-4">{error}</p>
                            <button
                                onClick={startCamera}
                                className="px-6 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                            >
                                ลองอีกครั้ง
                            </button>
                        </div>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* Scan Frame Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-white rounded-2xl relative">
                        {/* Corner markers */}
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />

                        {/* Scanning line animation */}
                        <div className="absolute inset-x-4 h-0.5 bg-green-400 animate-pulse top-1/2" />
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom Actions */}
            <div className="bg-gray-900 p-4 space-y-3">
                <p className="text-gray-400 text-center text-sm">
                    วาง Barcode หรือ QR Code ให้อยู่ในกรอบ
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={handleManualInput}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                        <Barcode className="w-5 h-5" />
                        ใส่รหัสเอง
                    </button>

                    {/* Demo button - remove in production */}
                    <button
                        onClick={simulateScan}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition"
                    >
                        <QrCode className="w-5 h-5" />
                        ทดสอบ (Demo)
                    </button>
                </div>
            </div>
        </div>
    );
}

// Scan button to trigger scanner
export function ScanButton({ onScan }: { onScan: (result: BarcodeResult) => void }) {
    const [showScanner, setShowScanner] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
                title="สแกน Barcode"
            >
                <QrCode className="w-5 h-5" />
                <span className="hidden sm:inline">สแกน</span>
            </button>

            {showScanner && (
                <BarcodeScanner
                    onScan={(result) => {
                        onScan(result);
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </>
    );
}
