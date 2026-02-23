'use client';

import { useState } from 'react';
import { QrCode, X, Printer } from 'lucide-react';

type QRCodeModalProps = {
    code: string;
    name: string;
    type: 'product' | 'asset';
};

export default function QRCodeModal({ code, name, type }: QRCodeModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${code}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 20px; 
                    }
                    .qr-container {
                        display: inline-block;
                        border: 2px solid #333;
                        padding: 20px;
                        border-radius: 10px;
                    }
                    .qr-code { margin-bottom: 15px; }
                    .code { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .name { font-size: 16px; color: #666; }
                    .type { font-size: 12px; color: #999; margin-top: 10px; }
                    @media print {
                        body { margin: 0; padding: 10px; }
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <img src="${qrUrl}" class="qr-code" alt="QR Code" />
                    <div class="code">${code}</div>
                    <div class="name">${name}</div>
                    <div class="type">${type === 'product' ? 'สินค้า' : 'ทรัพย์สิน'}</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="แสดง QR Code"
            >
                <QrCode className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">QR Code</h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-center">
                            <img
                                src={qrUrl}
                                alt="QR Code"
                                className="mx-auto mb-4 border rounded-lg p-2"
                            />
                            <div className="text-xl font-bold text-gray-800">{code}</div>
                            <div className="text-gray-500 mb-4">{name}</div>

                            <button
                                onClick={handlePrint}
                                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                พิมพ์ QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
