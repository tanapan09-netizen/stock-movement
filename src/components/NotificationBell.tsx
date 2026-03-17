'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Package, AlertTriangle, FileText, Wrench, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useToast } from './ToastProvider';
import { getReadNotificationsKey, getStoredReadNotificationIds, storeReadNotificationIds } from '@/lib/notifications/clientReadState';

type Notification = {
    id: string;
    type: 'low_stock' | 'po_update' | 'borrow' | 'info' | 'maintenance' | 'part_request' | 'petty_cash';
    title: string;
    message: string;
    time: Date;
    read: boolean;
};

export default function NotificationBell() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const knownIdsRef = useRef<Set<string>>(new Set());
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });
    const readNotificationsKey = getReadNotificationsKey(session?.user?.id, session?.user?.name);

    const getNotificationHref = useCallback((notification: Notification) => {
        if (notification.id.startsWith('general_request_')) {
            const requestId = notification.id.replace('general_request_', '');
            return `/general-request?req=${requestId}`;
        }
        if (notification.id.startsWith('maintenance_request_')) {
            const requestId = notification.id.replace('maintenance_request_', '');
            return `/maintenance?req=${requestId}`;
        }
        if (notification.id.startsWith('maintenance_') || notification.type === 'maintenance') return '/maintenance';
        if (notification.id.startsWith('part_requests_') || notification.type === 'part_request') return '/maintenance/part-requests';
        if (notification.id.startsWith('petty_cash_') || notification.type === 'petty_cash') return '/petty-cash';
        if (notification.id.startsWith('borrow_') || notification.type === 'borrow') return '/borrow';
        if (notification.id.startsWith('po_') || notification.type === 'po_update') return '/purchase-orders';
        if (notification.id.startsWith('low_stock_') || notification.type === 'low_stock') return '/products?filter=low_stock';
        return '/dashboard';
    }, []);

    const requestBrowserPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            showToast('เบราว์เซอร์นี้ไม่รองรับ web notification', 'warning');
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === 'granted') {
            showToast('เปิดการแจ้งเตือนบนเว็บแล้ว', 'success');
            return;
        }

        showToast('ยังไม่ได้อนุญาตการแจ้งเตือนบนเว็บ', 'warning');
    };

    const playNotificationSound = useCallback(() => {
        if (typeof window === 'undefined') return;

        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            const context = new AudioContextClass();
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.18);
            gain.gain.setValueAtTime(0.0001, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.22);
            oscillator.onended = () => {
                void context.close();
            };
        } catch (error) {
            console.error('Failed to play notification sound', error);
        }
    }, []);

    const markAsRead = useCallback(async (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        storeReadNotificationIds(readNotificationsKey, [id]);
        // Optionally call API to mark as read
    }, [readNotificationsKey]);

    const openNotificationTarget = useCallback((notification: Notification) => {
        setIsOpen(false);
        void markAsRead(notification.id);
        router.push(getNotificationHref(notification));
    }, [getNotificationHref, markAsRead, router]);

    const showBrowserNotification = useCallback((notification: Notification) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        try {
            const browserNotification = new Notification(notification.title, {
                body: notification.message,
                icon: '/icons/icon-192x192.png',
                tag: notification.id,
            });
            browserNotification.onclick = () => {
                window.focus();
                openNotificationTarget(notification);
                browserNotification.close();
            };
        } catch (error) {
            console.error('Failed to show browser notification', error);
        }
    }, [openNotificationTarget]);

    useEffect(() => {
        // Fetch notifications
        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const storedReadIds = getStoredReadNotificationIds(readNotificationsKey);
                    const data: Notification[] = (await res.json()).map((notification: Notification) => ({
                        ...notification,
                        read: notification.read || storedReadIds.has(notification.id),
                    }));
                    const latestIds = new Set(data.map(notification => notification.id));

                    if (knownIdsRef.current.size > 0) {
                        const newNotifications = data.filter(notification =>
                            !knownIdsRef.current.has(notification.id) && !storedReadIds.has(notification.id)
                        );
                        if (newNotifications.length > 0) {
                            newNotifications.slice(0, 3).forEach(notification => {
                                showToast(notification.title, 'info');
                                showBrowserNotification(notification);
                            });
                            playNotificationSound();
                        }
                    }

                    knownIdsRef.current = latestIds;
                    setNotifications(data);
                }
            } catch {
                console.error('Failed to fetch notifications');
            }
            setLoading(false);
        };

        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [playNotificationSound, readNotificationsKey, showBrowserNotification, showToast]);

    useEffect(() => {
        knownIdsRef.current = new Set();
    }, [readNotificationsKey]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        storeReadNotificationIds(readNotificationsKey, notifications.map(notification => notification.id));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'low_stock':
                return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case 'po_update':
                return <FileText className="w-4 h-4 text-blue-500" />;
            case 'borrow':
                return <Package className="w-4 h-4 text-purple-500" />;
            case 'maintenance':
                return <Wrench className="w-4 h-4 text-cyan-600" />;
            case 'petty_cash':
                return <Wallet className="w-4 h-4 text-emerald-600" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatTime = (date: Date) => {
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition"
                title="การแจ้งเตือน"
            >
                <Bell className="w-6 h-6 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">การแจ้งเตือน</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                อ่านทั้งหมด
                            </button>
                        )}
                    </div>

                    {notificationPermission !== 'granted' && (
                        <div className="px-4 py-3 border-b bg-blue-50 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-blue-900">เปิดการแจ้งเตือนบนเว็บ</p>
                                <p className="text-xs text-blue-700">
                                    {notificationPermission === 'denied'
                                        ? 'เบราว์เซอร์บล็อกการแจ้งเตือน ต้องเปิดสิทธิ์ใน browser settings'
                                        : 'อนุญาตเพื่อรับ popup แจ้งเตือนเมื่อมีรายการใหม่'}
                                </p>
                            </div>
                            {notificationPermission === 'default' && (
                                <button
                                    onClick={requestBrowserPermission}
                                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    เปิดใช้งาน
                                </button>
                            )}
                        </div>
                    )}

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                กำลังโหลด...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                ไม่มีการแจ้งเตือน
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    onClick={() => openNotificationTarget(notification)}
                                    className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition ${!notification.read ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-gray-800 truncate">
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-gray-500 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatTime(notification.time)}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t text-center">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    router.push('/dashboard');
                                }}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                ดูทั้งหมด
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
