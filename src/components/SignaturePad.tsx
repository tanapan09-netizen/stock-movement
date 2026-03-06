'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onSignatureChange: (signature: string | null) => void;
    label?: string;
}

export default function SignaturePad({ onSignatureChange, label = "ลายเซ็น" }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Make canvas responsive
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                // save content before resize
                const dataUrl = !isEmpty ? canvas.toDataURL() : null;

                canvas.width = parent.clientWidth;
                canvas.height = 150; // Fixed height

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = 'black';
                }

                if (dataUrl) {
                    const img = new Image();
                    img.onload = () => {
                        ctx?.drawImage(img, 0, 0);
                    };
                    img.src = dataUrl;
                }
            }
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isEmpty]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();

        let clientX = 0, clientY = 0;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
            clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();

        let clientX = 0, clientY = 0;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
            clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        setIsEmpty(false);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        saveSignature();
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onSignatureChange(null);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (isEmpty) {
            onSignatureChange(null);
            return;
        }
        const dataUrl = canvas.toDataURL('image/png');
        onSignatureChange(dataUrl);
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600"
                >
                    <Eraser size={14} /> ล้างลายเซ็น
                </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden touch-none w-full bg-white">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair"
                    style={{ touchAction: 'none' }}
                />
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">เซ็นชื่อในกรอบด้านบน (เซ็นได้ทั้งเมาส์และนิ้วสัมผัส)</p>
        </div>
    );
}
