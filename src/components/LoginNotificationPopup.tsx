'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, Package, AlertTriangle, FileText, X, CheckCheck } from 'lucide-react';

type Notification = {
    id: string;
    type: 'low_stock' | 'po_update' | 'borrow' | 'info' | 'maintenance' | 'part_request' | 'petty_cash';
    title: string;
    message: string;
    time: Date | string;
    read: boolean;
};

type NotificationsApiResponse = {
    items: Notification[];
    unreadCount: number;
};

type LoginNotificationPopupUser = {
    id?: string | null;
    name?: string | null;
} | null;

function parseNotificationsResponse(payload: unknown): NotificationsApiResponse {
    if (Array.isArray(payload)) {
        const items = payload as Notification[];
        return {
            items,
            unreadCount: items.filter(item => !item.read).length,
        };
    }

    if (payload && typeof payload === 'object') {
        const candidate = payload as Partial<NotificationsApiResponse>;
        const items = Array.isArray(candidate.items) ? (candidate.items as Notification[]) : [];
        const unreadCount = Number.isFinite(candidate.unreadCount)
            ? Number(candidate.unreadCount)
            : items.filter(item => !item.read).length;

        return {
            items,
            unreadCount,
        };
    }

    return { items: [], unreadCount: 0 };
}

export default function LoginNotificationPopup({ user }: { user: LoginNotificationPopupUser }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const session = user ? { user } : null;
    const sessionKey = useMemo(() => `notif_popup_shown_${user?.id || user?.name || 'anonymous'}`, [user?.id, user?.name]);

    useEffect(() => {
        if (!user?.id && !user?.name) return;

        const alreadyShown = sessionStorage.getItem(sessionKey);
        if (alreadyShown) return;

        const fetchAndShow = async () => {
            try {
                const res = await fetch('/api/notifications', { cache: 'no-store' });
                if (res.ok) {
                    const payload = parseNotificationsResponse(await res.json());
                    const unread = payload.items.filter(item => !item.read);
                    if (unread.length > 0) {
                        setNotifications(unread);
                        setIsVisible(true);
                        sessionStorage.setItem(sessionKey, 'true');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch notification for popup', error);
            }
        };

        const timer = setTimeout(fetchAndShow, 1000);
        return () => clearTimeout(timer);
    }, [sessionKey, user]);

    const handleClose = async () => {
        if (notifications.length > 0) {
            const unreadIds = notifications.map(notification => notification.id);
            try {
                await fetch('/api/notifications/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: unreadIds }),
                });
            } catch (error) {
                console.error('Failed to mark popup notifications as read', error);
            }
        }
        setIsVisible(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'low_stock':
                return <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />;
            case 'po_update':
                return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
            case 'borrow':
                return <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500 flex-shrink-0" />;
        }
    };

    const formatTime = (date: Date | string) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'เมื่อสักครู่';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        return `${days} วันที่แล้ว`;
    };

    if (!isVisible || notifications.length === 0) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
                onClick={() => { void handleClose(); }}
            />

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-auto px-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Bell className="w-5 h-5" />
                            <h2 className="font-bold text-base">การแจ้งเตือน</h2>
                            <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {notifications.length} รายการใหม่
                            </span>
                        </div>
                        <button
                            onClick={() => { void handleClose(); }}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition"
                            title="ปิด"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                            ยินดีต้อนรับ, <strong>{session?.user?.name || 'ผู้ใช้'}</strong>! มีการแจ้งเตือนที่คุณยังไม่ได้อ่าน
                        </p>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                        {notifications.slice(0, 8).map(notification => (
                            <div
                                key={notification.id}
                                className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                            >
                                <div className="mt-0.5">{getIcon(notification.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{notification.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{formatTime(notification.time)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <p className="text-xs text-gray-400">
                            {notifications.length > 8 ? `+${notifications.length - 8} รายการอื่นๆ` : ''}
                        </p>
                        <button
                            onClick={() => { void handleClose(); }}
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition"
                        >
                            <CheckCheck className="w-4 h-4" />
                            รับทราบทั้งหมด
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

