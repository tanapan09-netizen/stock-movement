'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Package,
  AlertTriangle,
  FileText,
  Wrench,
  Wallet,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useToast } from './ToastProvider';

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

type NotificationsApiResponse = {
  items: AppNotification[];
  unreadCount: number;
};

type SessionUserLike = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  is_approver?: boolean | null;
};

function parseNotificationsResponse(payload: unknown): NotificationsApiResponse {
  if (Array.isArray(payload)) {
    const items = payload as AppNotification[];
    return {
      items,
      unreadCount: items.filter(item => !item.read).length,
    };
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as Partial<NotificationsApiResponse>;
    const items = Array.isArray(candidate.items) ? (candidate.items as AppNotification[]) : [];
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

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const sessionUser = session?.user as SessionUserLike | undefined;
  const sessionUserKey = `${sessionUser?.id || sessionUser?.name || 'anonymous'}`;
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification_sound_enabled');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('notification_sound_enabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);
  const tabBaseTitleRef = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const normalizedRole = (sessionUser?.role || '').trim().toLowerCase();
  const isApprover = Boolean(sessionUser?.is_approver);

  useEffect(() => {
    return () => {
      if (audioCleanupTimeoutRef.current) {
        clearTimeout(audioCleanupTimeoutRef.current);
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

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

  const moduleOptions = useMemo(() => {
    const options: Array<{ value: NotificationModule; label: string }> = [
      { value: 'all', label: 'All' },
      { value: 'products', label: 'Products' },
      { value: 'purchase_orders', label: 'Purchasing' },
      { value: 'borrow', label: 'Borrow/Return' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'part_requests', label: 'Part Requests' },
      { value: 'petty_cash', label: 'Petty Cash' },
      { value: 'approvals', label: 'Approvals' },
    ];

    const isManager = ['owner', 'admin', 'manager'].includes(normalizedRole);
    if (isManager) return options;

    const allowed = new Set<NotificationModule>(['all']);
    const isOperation = ['operation', 'leader_operation'].includes(normalizedRole);
    const isPurchasing = ['purchasing', 'leader_purchasing'].includes(normalizedRole);
    const isAccounting = ['accounting', 'leader_accounting'].includes(normalizedRole);
    const isStore = ['store', 'leader_store'].includes(normalizedRole);
    const isTechnician = ['technician', 'leader_technician', 'head_technician'].includes(normalizedRole);
    const isGeneralRequester = ['general', 'leader_general', 'employee', 'leader_employee'].includes(normalizedRole);

    if (isOperation || isPurchasing || isStore) allowed.add('products');
    if (isPurchasing || isAccounting) allowed.add('purchase_orders');
    if (isOperation || isGeneralRequester) allowed.add('borrow');
    if (isTechnician || isGeneralRequester || isApprover) allowed.add('maintenance');
    if (isTechnician || isPurchasing || isApprover) allowed.add('part_requests');
    if (isAccounting) allowed.add('petty_cash');
    if (isApprover || isPurchasing) allowed.add('approvals');

    return options.filter(option => allowed.has(option.value));
  }, [isApprover, normalizedRole]);

  const effectiveSelectedModule = useMemo<NotificationModule>(() => {
    return moduleOptions.some(option => option.value === selectedModule) ? selectedModule : 'all';
  }, [moduleOptions, selectedModule]);

  useEffect(() => {
    if (userSelectedModuleRef.current) return;
    setSelectedModule(moduleFromPathname(pathname));
  }, [moduleFromPathname, pathname]);

  useEffect(() => {
    if (effectiveSelectedModule === selectedModule) return;
    setSelectedModule('all');
    userSelectedModuleRef.current = false;
  }, [effectiveSelectedModule, selectedModule]);

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
    if (notification.id.startsWith('part_requests_maintenance_')) {
      return '/maintenance/parts';
    }
    if (notification.id.startsWith('part_requests_purchase_')) {
      return '/maintenance/part-requests';
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
    if (!isSoundEnabled || typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    try {
      let context = audioContextRef.current;
      if (!context || context.state === 'closed') {
        context = new AudioContextClass();
        audioContextRef.current = context;
      }

      if (context.state === 'suspended') {
        void context.resume();
      }

      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.78, context.currentTime);

      const toneHighPass = context.createBiquadFilter();
      toneHighPass.type = 'highpass';
      toneHighPass.frequency.setValueAtTime(340, context.currentTime);
      toneHighPass.Q.setValueAtTime(0.6, context.currentTime);

      const toneHighShelf = context.createBiquadFilter();
      toneHighShelf.type = 'highshelf';
      toneHighShelf.frequency.setValueAtTime(2600, context.currentTime);
      toneHighShelf.gain.setValueAtTime(2.8, context.currentTime);

      masterGain.connect(toneHighPass);
      toneHighPass.connect(toneHighShelf);
      toneHighShelf.connect(context.destination);

      const playChimeTone = (frequency: number, startOffset: number, duration: number, volume: number) => {
        const oscMain = context.createOscillator();
        const oscBody = context.createOscillator();
        const oscSparkle = context.createOscillator();
        const bodyEnvelope = context.createGain();
        const sparkleEnvelope = context.createGain();
        const startAt = context.currentTime + startOffset;
        const endAt = startAt + duration;

        oscMain.type = 'sine';
        oscMain.frequency.setValueAtTime(frequency, startAt);

        oscBody.type = 'triangle';
        oscBody.frequency.setValueAtTime(frequency * 1.002, startAt);

        oscSparkle.type = 'sine';
        oscSparkle.frequency.setValueAtTime(frequency * 3.01, startAt);

        bodyEnvelope.gain.setValueAtTime(0.0001, startAt);
        bodyEnvelope.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
        bodyEnvelope.gain.exponentialRampToValueAtTime(volume * 0.38, startAt + 0.075);
        bodyEnvelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

        sparkleEnvelope.gain.setValueAtTime(0.0001, startAt);
        sparkleEnvelope.gain.exponentialRampToValueAtTime(volume * 0.55, startAt + 0.006);
        sparkleEnvelope.gain.exponentialRampToValueAtTime(0.0001, Math.min(endAt, startAt + 0.11));

        oscMain.connect(bodyEnvelope);
        oscBody.connect(bodyEnvelope);
        oscSparkle.connect(sparkleEnvelope);
        bodyEnvelope.connect(masterGain);
        sparkleEnvelope.connect(masterGain);

        oscMain.start(startAt);
        oscBody.start(startAt);
        oscSparkle.start(startAt);
        oscMain.stop(endAt);
        oscBody.stop(endAt);
        oscSparkle.stop(endAt);
      };

      // Crystal chime: C6 -> E6 -> G6
      playChimeTone(1046.5, 0.00, 0.22, 0.07);
      playChimeTone(1318.51, 0.08, 0.25, 0.063);
      playChimeTone(1567.98, 0.16, 0.30, 0.058);

      if (audioCleanupTimeoutRef.current) {
        clearTimeout(audioCleanupTimeoutRef.current);
      }

      audioCleanupTimeoutRef.current = setTimeout(() => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          void audioContextRef.current.close();
          audioContextRef.current = null;
        }
      }, 2200);
    } catch (error) {
      console.error('Failed to play notification sound', error);
    }
  }, [isSoundEnabled]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => {
      const target = prev.find(item => item.id === id);
      if (target && !target.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.map(n => (n.id === id ? { ...n, read: true } : n));
    });

    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error(`mark-read failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  }, []);

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

  const lastReminderTimeRef = useRef<number>(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const query =
        effectiveSelectedModule === 'all'
          ? ''
          : `?module=${encodeURIComponent(effectiveSelectedModule)}`;
      const res = await fetch(`/api/notifications${query}`, { cache: 'no-store' });

      if (!res.ok) return;

      const payload = parseNotificationsResponse(await res.json());
      const data = payload.items;
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
            !notification.read &&
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
        lastReminderTimeRef.current = Date.now();
      } else if (payload.unreadCount > 0 && Date.now() - lastReminderTimeRef.current >= 60000) {
        playNotificationSound();
        showToast(`แจ้งเตือน: คุณมีการแจ้งเตือนที่ยังไม่ได้อ่าน ${payload.unreadCount} รายการ`, 'info');
        lastReminderTimeRef.current = Date.now();
      }

      knownIdsRef.current = latestIds;
      setNotifications(data);
      setUnreadCount(payload.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }, [
    effectiveSelectedModule,
    playNotificationSound,
    showBrowserNotification,
    showToast,
  ]);

  useEffect(() => {
    void fetchNotifications();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
      const pollMs = visible ? 30000 : 120000;
      intervalId = setInterval(() => {
        void fetchNotifications();
      }, pollMs);
    };

    const handleVisibilityChange = () => {
      void fetchNotifications();
      startPolling();
    };

    startPolling();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [fetchNotifications]);

  useEffect(() => {
    knownIdsRef.current = new Set();
    toastedIdsRef.current = new Set();
    hasInitializedRef.current = false;
  }, [sessionUserKey]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!tabBaseTitleRef.current) {
      tabBaseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, '');
    }

    const baseTitle = tabBaseTitleRef.current;
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && tabBaseTitleRef.current) {
        document.title = tabBaseTitleRef.current;
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
      if (!response.ok) {
        throw new Error(`mark-read failed: ${response.status}`);
      }
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
              <div className="flex items-center gap-2">
                <select
                  value={effectiveSelectedModule}
                  onChange={e => {
                    const nextModule = e.target.value as NotificationModule;
                    const hasAccess = moduleOptions.some(option => option.value === nextModule);

                    if (!hasAccess) {
                      userSelectedModuleRef.current = false;
                      setSelectedModule('all');
                      return;
                    }

                    userSelectedModuleRef.current = true;
                    setSelectedModule(nextModule);
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 outline-none"
                >
                  {moduleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                    isSoundEnabled ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                  title={isSoundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
                >
                  {isSoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>
              </div>

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

