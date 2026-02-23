'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const TOAST_ICONS = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const TOAST_STYLES = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
    error: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
    const Icon = TOAST_ICONS[toast.type];
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const duration = toast.duration || 4000;
        const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
        const closeTimer = setTimeout(() => onClose(toast.id), duration);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(closeTimer);
        };
    }, [toast.id, toast.duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(toast.id), 300);
    };

    return (
        <div
            className={`
                ${TOAST_STYLES[toast.type]}
                ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
                relative flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-sm
                min-w-[320px] max-w-[420px] overflow-hidden
            `}
            style={{
                boxShadow: '0 10px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />

            <div className="flex-shrink-0 mt-0.5">
                <Icon size={22} className="drop-shadow-sm" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm drop-shadow-sm">{toast.title}</p>
                {toast.message && (
                    <p className="text-sm opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
                )}
            </div>

            <button
                onClick={handleClose}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
                title="ปิด"
            >
                <X size={16} />
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { id, type, title, message, duration }]);
    }, []);

    const success = useCallback((title: string, message?: string) => {
        showToast('success', title, message);
    }, [showToast]);

    const error = useCallback((title: string, message?: string) => {
        showToast('error', title, message, 6000);
    }, [showToast]);

    const warning = useCallback((title: string, message?: string) => {
        showToast('warning', title, message, 5000);
    }, [showToast]);

    const info = useCallback((title: string, message?: string) => {
        showToast('info', title, message);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onClose={removeToast} />
                    </div>
                ))}
            </div>

            {/* Animation styles */}
            <style jsx global>{`
                @keyframes slide-in {
                    from {
                        opacity: 0;
                        transform: translateX(100%) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                
                @keyframes slide-out {
                    from {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%) scale(0.9);
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                
                .animate-slide-in {
                    animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                .animate-slide-out {
                    animation: slide-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                .animate-shimmer {
                    animation: shimmer 2s ease-in-out infinite;
                    animation-delay: 0.5s;
                }
            `}</style>
        </ToastContext.Provider>
    );
}
