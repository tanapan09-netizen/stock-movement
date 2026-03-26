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
            case 'success':
                return {
                    frame: 'border-emerald-200 bg-white/95 text-emerald-950',
                    iconWrap: 'bg-emerald-100 text-emerald-700',
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    progress: 'from-emerald-500 to-green-500',
                };
            case 'error':
                return {
                    frame: 'border-rose-200 bg-white/95 text-rose-950',
                    iconWrap: 'bg-rose-100 text-rose-700',
                    badge: 'bg-rose-50 text-rose-700 border-rose-200',
                    progress: 'from-rose-500 to-red-500',
                };
            case 'warning':
                return {
                    frame: 'border-amber-200 bg-white/95 text-amber-950',
                    iconWrap: 'bg-amber-100 text-amber-700',
                    badge: 'bg-amber-50 text-amber-700 border-amber-200',
                    progress: 'from-amber-500 to-orange-500',
                };
            default:
                return {
                    frame: 'border-blue-200 bg-white/95 text-blue-950',
                    iconWrap: 'bg-blue-100 text-blue-700',
                    badge: 'bg-blue-50 text-blue-700 border-blue-200',
                    progress: 'from-blue-500 to-indigo-500',
                };
        }
    };

    const getLabel = (type: ToastType) => {
        switch (type) {
            case 'success':
                return 'สำเร็จ';
            case 'error':
                return 'ข้อผิดพลาด';
            case 'warning':
                return 'แจ้งเตือน';
            default:
                return 'ข้อมูล';
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
                {toasts.map(toast => {
                    const styles = getStyles(toast.type);
                    return (
                        <div
                            key={toast.id}
                            className={`
                                pointer-events-auto relative overflow-hidden
                                min-w-[320px] max-w-md rounded-2xl border shadow-2xl
                                backdrop-blur-md animate-toast-in
                                ${styles.frame}
                            `}
                            style={{
                                boxShadow: '0 18px 50px rgba(15,23,42,0.18)',
                            }}
                        >
                            <div className="flex items-start gap-3 px-4 py-3.5">
                                <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconWrap}`}>
                                    {getIcon(toast.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${styles.badge}`}>
                                            {getLabel(toast.type)}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold leading-5 text-slate-900">{toast.message}</p>
                                </div>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="flex-shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    title="ปิด"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-4 pb-3">
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full animate-toast-progress rounded-full bg-gradient-to-r ${styles.progress}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                @keyframes toast-progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
                .animate-toast-progress {
                    animation: toast-progress 4s linear forwards;
                }
            `}</style>
        </ToastContext.Provider>
    );
}
