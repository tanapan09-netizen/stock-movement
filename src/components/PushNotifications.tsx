'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Smartphone } from 'lucide-react';

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(() => {
        if (typeof window !== 'undefined') {
            return 'Notification' in window;
        }
        return false;
    });
    const [permission, setPermission] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });

    const requestPermission = async () => {
        if (!isSupported) return false;

        const result = await Notification.requestPermission();
        setPermission(result);
        return result === 'granted';
    };

    const sendNotification = (title: string, options?: NotificationOptions) => {
        if (permission !== 'granted') return;

        new Notification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            ...options
        });
    };

    return { permission, isSupported, requestPermission, sendNotification };
}

export function PushNotificationToggle() {
    const { permission, isSupported, requestPermission } = usePushNotifications();

    if (!isSupported) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <BellOff className="w-4 h-4" />
                <span>เบราว์เซอร์ไม่รองรับ Push Notifications</span>
            </div>
        );
    }

    const handleToggle = async () => {
        if (permission === 'default') {
            await requestPermission();
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
                {permission === 'granted' ? (
                    <Bell className="w-5 h-5 text-green-500" />
                ) : (
                    <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">
                        {permission === 'granted' ? 'เปิดใช้งานแล้ว' :
                            permission === 'denied' ? 'ถูกปิดกั้น' :
                                'ยังไม่ได้เปิดใช้งาน'}
                    </p>
                </div>
            </div>

            {permission === 'default' && (
                <button
                    onClick={handleToggle}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                    เปิดใช้งาน
                </button>
            )}

            {permission === 'granted' && (
                <span className="flex items-center gap-1 text-green-500">
                    <Check className="w-4 h-4" /> เปิดอยู่
                </span>
            )}

            {permission === 'denied' && (
                <span className="text-sm text-red-500">
                    กรุณาเปิดในการตั้งค่าเบราว์เซอร์
                </span>
            )}
        </div>
    );
}

// Session management component
interface Session {
    id: string;
    device: string;
    browser: string;
    location: string;
    lastActive: Date;
    isCurrent: boolean;
}

export function SessionManagement() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch sessions from API
        const fetchSessions = async () => {
            try {
                const res = await fetch('/api/sessions');
                if (res.ok) {
                    const data = await res.json();
                    setSessions(data);
                }
            } catch {
                // Mock data
                setSessions([
                    { id: '1', device: 'Windows PC', browser: 'Chrome 120', location: 'Bangkok, TH', lastActive: new Date(), isCurrent: true },
                    { id: '2', device: 'iPhone 15', browser: 'Safari', location: 'Bangkok, TH', lastActive: new Date(Date.now() - 3600000), isCurrent: false },
                    { id: '3', device: 'MacBook Pro', browser: 'Firefox', location: 'Chiang Mai, TH', lastActive: new Date(Date.now() - 86400000), isCurrent: false },
                ]);
            }
            setLoading(false);
        };

        fetchSessions();
    }, []);

    const revokeSession = async (id: string) => {
        if (!confirm('ต้องการยกเลิก session นี้?')) return;

        // Call API to revoke session
        setSessions(prev => prev.filter(s => s.id !== id));
    };

    const revokeAll = async () => {
        if (!confirm('ต้องการยกเลิกทุก session ยกเว้นปัจจุบัน?')) return;

        setSessions(prev => prev.filter(s => s.isCurrent));
    };

    const formatLastActive = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) return 'ออนไลน์';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        return d.toLocaleDateString('th-TH');
    };

    if (loading) {
        return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h3 className="font-bold flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    อุปกรณ์ที่ Login
                </h3>
                {sessions.length > 1 && (
                    <button
                        onClick={revokeAll}
                        className="text-sm text-red-500 hover:text-red-700"
                    >
                        ยกเลิกทั้งหมด
                    </button>
                )}
            </div>

            <div className="divide-y dark:divide-gray-700">
                {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.isCurrent ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium flex items-center gap-2">
                                    {session.device}
                                    {session.isCurrent && (
                                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                            ปัจจุบัน
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {session.browser} • {session.location}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {formatLastActive(session.lastActive)}
                                </p>
                            </div>
                        </div>

                        {!session.isCurrent && (
                            <button
                                onClick={() => revokeSession(session.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="ยกเลิก session"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
