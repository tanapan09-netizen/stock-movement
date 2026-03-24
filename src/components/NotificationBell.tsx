'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Package,
  AlertTriangle,
  FileText,
  Wrench,
  Wallet,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useToast } from './ToastProvider';
import {
  getReadNotificationsKey,
  getStoredReadNotificationIds,
  storeReadNotificationIds,
} from '@/lib/notifications/clientReadState';

type NotificationModule =
  | 'all'
  | 'products'
  | 'purchase_orders'
  | 'borrow'
  | 'maintenance'
  | 'part_requests'
  | 'petty_cash'
  | 'approvals'
  | 'dashboard';

type AppNotification = {
  id: string;
  type:
    | 'low_stock'
    | 'po_update'
    | 'borrow'
    | 'info'
    | 'maintenance'
    | 'part_request'
    | 'petty_cash';
  module?: Exclude<NotificationModule, 'all'>;
  title: string;
  message: string;
  time: Date | string;
  read: boolean;
};

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const readNotificationsKey = getReadNotificationsKey(session?.user?.id, session?.user?.name);

  const moduleFromPathname = useCallback((path: string): NotificationModule => {
    if (path.startsWith('/products')) return 'products';
    if (path.startsWith('/purchase-orders') || path.startsWith('/purchase-request')) {
      return 'purchase_orders';
    }
    if (path.startsWith('/borrow')) return 'borrow';
    if (path.startsWith('/maintenance/part-requests')) return 'part_requests';
    if (path.startsWith('/maintenance')) return 'maintenance';
    if (path.startsWith('/petty-cash')) return 'petty_cash';
    if (path.startsWith('/approvals')) return 'approvals';
    return 'all';
  }, []);

  const userSelectedModuleRef = useRef(false);
  const [selectedModule, setSelectedModule] = useState<NotificationModule>(() =>
    moduleFromPathname(pathname),
  );

  useEffect(() => {
    if (userSelectedModuleRef.current) return;
    setSelectedModule(moduleFromPathname(pathname));
  }, [moduleFromPathname, pathname]);

  const getNotificationHref = useCallback((notification: AppNotification) => {
    if (notification.id.startsWith('general_request_')) {
      const requestId = notification.id.replace('general_request_', '');
      return `/general-request?req=${requestId}`;
    }
    if (notification.id.startsWith('maintenance_request_')) {
      const requestId = notification.id.replace('maintenance_request_', '');
      return `/maintenance?req=${requestId}`;
    }
    if (notification.id.startsWith('maintenance_') || notification.type === 'maintenance') {
      return '/maintenance';
    }
    if (notification.id.startsWith('part_requests_') || notification.type === 'part_request') {
      return '/maintenance/part-requests';
    }
    if (notification.id.startsWith('petty_cash_') || notification.type === 'petty_cash') {
      return '/petty-cash';
    }
    if (notification.id.startsWith('borrow_') || notification.type === 'borrow') {
      return '/borrow';
    }
    if (notification.id.startsWith('po_') || notification.type === 'po_update') {
      return '/purchase-orders';
    }
    if (notification.id.startsWith('low_stock_') || notification.type === 'low_stock') {
      return '/products?filter=low_stock';
    }
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

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

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

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      storeReadNotificationIds(readNotificationsKey, [id]);

      try {
        await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      } catch (error) {
        console.error('Failed to mark notification as read', error);
      }
    },
    [readNotificationsKey],
  );

  const openNotificationTarget = useCallback(
    (notification: AppNotification) => {
      setIsOpen(false);
      void markAsRead(notification.id);
      router.push(getNotificationHref(notification));
    },
    [getNotificationHref, markAsRead, router],
  );

  const showBrowserNotification = useCallback(
    (notification: AppNotification) => {
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
    },
    [openNotificationTarget],
  );

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const query =
          selectedModule === 'all' ? '' : `?module=${encodeURIComponent(selectedModule)}`;
        const res = await fetch(`/api/notifications${query}`, { cache: 'no-store' });

        if (res.ok) {
          const storedReadIds = getStoredReadNotificationIds(readNotificationsKey);

          const data: AppNotification[] = (await res.json()).map((notification: AppNotification) => ({
            ...notification,
            read: notification.read || storedReadIds.has(notification.id),
          }));

          const latestIds = new Set(data.map(notification => notification.id));

          let notificationsToAnnounce: AppNotification[] = [];

          if (!hasInitializedRef.current) {
            notificationsToAnnounce = data.filter(
              notification =>
                !notification.read && !toastedIdsRef.current.has(notification.id),
            );
            hasInitializedRef.current = true;
          } else {
            notificationsToAnnounce = data.filter(
              notification =>
                !knownIdsRef.current.has(notification.id) &&
                !storedReadIds.has(notification.id) &&
                !toastedIdsRef.current.has(notification.id),
            );
          }

          if (notificationsToAnnounce.length > 0) {
            notificationsToAnnounce.slice(0, 3).forEach(notification => {
              showToast(notification.title, 'info');
              showBrowserNotification(notification);
              toastedIdsRef.current.add(notification.id);
            });

            playNotificationSound();
          }

          knownIdsRef.current = latestIds;
          setNotifications(data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [
    playNotificationSound,
    readNotificationsKey,
    selectedModule,
    showBrowserNotification,
    showToast,
  ]);

  useEffect(() => {
    knownIdsRef.current = new Set();
    toastedIdsRef.current = new Set();
    hasInitializedRef.current = false;
  }, [readNotificationsKey]);

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

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    storeReadNotificationIds(readNotificationsKey, unreadIds);

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'po_update':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'borrow':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-cyan-600" />;
      case 'petty_cash':
        return <Wallet className="h-4 w-4 text-emerald-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 transition hover:bg-gray-100"
        title="การแจ้งเตือน"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:w-80">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">การแจ้งเตือน</h3>
              <button
                onClick={requestBrowserPermission}
                className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {notificationPermission === 'granted' ? 'Web On' : 'เปิด Web แจ้งเตือน'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={selectedModule}
                onChange={e => {
                  userSelectedModuleRef.current = true;
                  setSelectedModule(e.target.value as NotificationModule);
                }}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 outline-none"
              >
                <option value="all">ทั้งหมด</option>
                <option value="products">สินค้า</option>
                <option value="purchase_orders">จัดซื้อ</option>
                <option value="borrow">ยืม-คืน</option>
                <option value="maintenance">ซ่อมบำรุง</option>
                <option value="part_requests">เบิกอะไหล่</option>
                <option value="petty_cash">Petty Cash</option>
                <option value="approvals">อนุมัติ</option>
              </select>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  อ่านทั้งหมดแล้ว
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400">กำลังโหลด...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">ไม่มีการแจ้งเตือน</div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => openNotificationTarget(notification)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    !notification.read ? 'bg-indigo-50/40' : 'bg-white'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(notification.type)}</div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-medium text-gray-800">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {notification.message}
                    </p>

                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatTime(notification.time)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}