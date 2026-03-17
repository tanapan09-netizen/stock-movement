'use client';

function isBrowser() {
    return typeof window !== 'undefined';
}

export function getReadNotificationsKey(userId?: string | null, userName?: string | null) {
    return `read_notifications_${userId || userName || 'anonymous'}`;
}

export function getStoredReadNotificationIds(storageKey: string): Set<string> {
    if (!isBrowser()) return new Set<string>();

    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return Array.isArray(stored) ? new Set<string>(stored.filter((value): value is string => typeof value === 'string')) : new Set<string>();
    } catch {
        return new Set<string>();
    }
}

export function storeReadNotificationIds(storageKey: string, notificationIds: Iterable<string>) {
    if (!isBrowser()) return;

    const existing = getStoredReadNotificationIds(storageKey);
    for (const notificationId of notificationIds) {
        existing.add(notificationId);
    }

    localStorage.setItem(storageKey, JSON.stringify([...existing]));
}
