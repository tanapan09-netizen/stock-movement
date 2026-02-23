'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
    onClose: () => void;
}

export default function ToastNotification({ message, type, isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const bgColors = {
        success: 'bg-white border-green-500',
        error: 'bg-white border-red-500',
        info: 'bg-white border-blue-500'
    };

    const icons = {
        success: <CheckCircle className="w-6 h-6 text-green-500" />,
        error: <XCircle className="w-6 h-6 text-red-500" />,
        info: <Info className="w-6 h-6 text-blue-500" />
    };

    return (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center p-4 rounded-xl shadow-2xl border-l-4 ${bgColors[type]} animate-in slide-in-from-top-5 duration-300 max-w-sm w-full`}>
            <div className="mr-3 flex-shrink-0">
                {icons[type]}
            </div>
            <div className="flex-1 mr-2">
                <p className="text-gray-800 font-medium text-sm">{message}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
