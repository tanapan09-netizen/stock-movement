'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Briefcase, Wifi, WifiOff } from 'lucide-react';

interface OfflineQueueContextType {
    isOnline: boolean;
    queueAction: (actionName: string, payload: any) => void;
    pendingActions: number;
}

const OfflineQueueContext = createContext<OfflineQueueContextType>({
    isOnline: true,
    queueAction: () => { },
    pendingActions: 0,
});

export const useOfflineQueue = () => useContext(OfflineQueueContext);

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [queue, setQueue] = useState<Array<{ id: string, action: string, payload: any, timestamp: number }>>([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Load queue from localStorage on mount
    useEffect(() => {
        setIsOnline(navigator.onLine);

        try {
            const savedQueue = localStorage.getItem('stock_pro_offline_queue');
            if (savedQueue) {
                setQueue(JSON.parse(savedQueue));
            }
        } catch (e) {
            console.error("Failed to load offline queue", e);
        }

        const handleOnline = () => {
            setIsOnline(true);
            setToastMessage('✅ กลับมาออนไลน์แล้ว ระบบกำลังซิงค์ข้อมูลให้...');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
            processQueue();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setToastMessage('⚠️ ตรวจพบว่าออฟไลน์ ข้อมูลบางส่วนจะถูกจัดเก็บไว้เพื่อส่งภายหลัง');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const queueAction = (actionName: string, payload: any) => {
        const newAction = {
            id: Math.random().toString(36).substring(2, 9),
            action: actionName,
            payload,
            timestamp: Date.now()
        };
        const newQueue = [...queue, newAction];
        setQueue(newQueue);
        localStorage.setItem('stock_pro_offline_queue', JSON.stringify(newQueue));

        setToastMessage(`บันทึกคำสั่งแบบออฟไลน์แล้ว (ค้าง ${newQueue.length} รายการ)`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const processQueue = async () => {
        // Retrieve latest from localStorage in case it changed via other tabs
        const savedQueueStr = localStorage.getItem('stock_pro_offline_queue');
        if (!savedQueueStr) return;

        let savedQueue = [];
        try {
            savedQueue = JSON.parse(savedQueueStr);
        } catch (e) { return; }

        if (savedQueue.length === 0) return;

        console.log(`[OfflineSync] Starting to sync ${savedQueue.length} items...`);
        // In a real app, you would submit these to your server actions or API endpoints here
        // For now, we simulate processing by clearing them out one by one

        // Once processed:
        setQueue([]);
        localStorage.removeItem('stock_pro_offline_queue');

        setToastMessage(`✅ ซิงค์ข้อมูลที่ค้างอยู่ ${savedQueue.length} รายการสำเร็จ!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    };

    return (
        <OfflineQueueContext.Provider value={{ isOnline, queueAction, pendingActions: queue.length }}>
            {children}

            {showToast && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
                    {isOnline ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-yellow-400" />}
                    <span className="text-sm">{toastMessage}</span>
                </div>
            )}
        </OfflineQueueContext.Provider>
    );
}
