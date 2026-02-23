'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions | null;
        resolve: ((value: boolean) => void) | null;
    }>({ isOpen: false, options: null, resolve: null });

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);

    const handleConfirm = (result: boolean) => {
        if (confirmState.resolve) {
            confirmState.resolve(result);
        }
        setConfirmState({ isOpen: false, options: null, resolve: null });
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5" />;
            case 'error': return <XCircle className="w-5 h-5" />;
            case 'warning': return <AlertTriangle className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
            case 'error': return 'bg-gradient-to-r from-red-500 to-rose-600 text-white';
            case 'warning': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
            default: return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
        }
    };

    const getConfirmButtonStyles = (type?: 'danger' | 'warning' | 'info') => {
        switch (type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
            default: return 'bg-blue-600 hover:bg-blue-700';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Toast Container - Fixed at top right */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            ${getStyles(toast.type)} 
                            pointer-events-auto
                            px-4 py-3.5 rounded-2xl shadow-2xl 
                            flex items-center gap-3 
                            min-w-[320px] max-w-md 
                            animate-toast-in
                            backdrop-blur-sm
                        `}
                        style={{
                            boxShadow: '0 10px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset',
                        }}
                    >
                        <div className="flex-shrink-0">
                            {getIcon(toast.type)}
                        </div>
                        <span className="flex-1 text-sm font-semibold drop-shadow-sm">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-full transition-all duration-200"
                            title="ปิด"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmState.isOpen && confirmState.options && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        style={{ animation: 'scaleIn 0.2s ease-out' }}
                    >
                        <div className={`p-6 ${confirmState.options.type === 'danger' ? 'bg-red-50' : confirmState.options.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                            <div className="flex items-center gap-3">
                                {confirmState.options.type === 'danger' ? (
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                ) : confirmState.options.type === 'warning' ? (
                                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Info className="w-6 h-6 text-blue-600" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{confirmState.options.title}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-6 whitespace-pre-line">{confirmState.options.message}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleConfirm(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
                                >
                                    {confirmState.options.cancelText || 'ยกเลิก'}
                                </button>
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className={`flex-1 py-2.5 text-white rounded-xl font-medium transition ${getConfirmButtonStyles(confirmState.options.type)}`}
                                >
                                    {confirmState.options.confirmText || 'ยืนยัน'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes toast-in {
                    from {
                        opacity: 0;
                        transform: translateX(100%) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-toast-in {
                    animation: toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </ToastContext.Provider>
    );
}
