'use client';

import { useState, useRef, useEffect } from 'react';
import { Pen, X, Check, RotateCcw, Download } from 'lucide-react';

interface DigitalSignatureProps {
    onSign: (signatureData: string) => void;
    onCancel: () => void;
    title?: string;
}

export default function DigitalSignature({ onSign, onCancel, title = 'ลงนามอิเล็กทรอนิกส์' }: DigitalSignatureProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Set drawing style
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignature) return;

        const signatureData = canvas.toDataURL('image/png');
        onSign(signatureData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Pen className="w-5 h-5 text-blue-500" />
                        {title}
                    </h2>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="ปิด">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Canvas */}
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-3">ใช้เมาส์หรือนิ้วเพื่อเซ็นลายเซ็นของคุณ</p>

                    <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-48 cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />

                        {/* Signature line hint */}
                        <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300 pointer-events-none" />
                        <span className="absolute bottom-2 left-8 text-xs text-gray-400 pointer-events-none">ลายเซ็น</span>
                    </div>

                    {/* Clear button */}
                    {hasSignature && (
                        <button
                            onClick={clearSignature}
                            className="mt-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                        >
                            <RotateCcw className="w-4 h-4" />
                            ล้างและเริ่มใหม่
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!hasSignature}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="w-4 h-4" />
                        ยืนยันลายเซ็น
                    </button>
                </div>
            </div>
        </div>
    );
}

// Signature display component
export function SignatureDisplay({ signatureData, name, date }: { signatureData: string; name: string; date: Date }) {
    return (
        <div className="inline-block p-3 border rounded-lg bg-gray-50">
            <img src={signatureData} alt="Signature" className="h-16 mb-2" />
            <div className="text-xs text-gray-600 border-t pt-2">
                <p className="font-medium">{name}</p>
                <p>{new Date(date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
            </div>
        </div>
    );
}

// Trigger button
export function SignatureButton({ onSign }: { onSign: (data: string) => void }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
            >
                <Pen className="w-4 h-4" />
                ลงนาม
            </button>

            {showModal && (
                <DigitalSignature
                    onSign={(data) => {
                        onSign(data);
                        setShowModal(false);
                    }}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </>
    );
}
