'use client';

import React, { useState, useEffect } from 'react';
import {
    Activity, Package, FileText, User, LogIn, LogOut,
    Edit, Trash2, Plus, Check, X, Clock, Filter, Download
} from 'lucide-react';

interface ActivityItem {
    id: number;
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject';
    entity: 'product' | 'po' | 'user' | 'borrow' | 'stock';
    entityId: string;
    entityName: string;
    userId: number;
    userName: string;
    details?: string;
    timestamp: Date;
}

const actionIcons: Record<string, React.ReactNode> = {
    create: <Plus className="w-4 h-4" />,
    update: <Edit className="w-4 h-4" />,
    delete: <Trash2 className="w-4 h-4" />,
    login: <LogIn className="w-4 h-4" />,
    logout: <LogOut className="w-4 h-4" />,
    approve: <Check className="w-4 h-4" />,
    reject: <X className="w-4 h-4" />
};

const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-600',
    update: 'bg-blue-100 text-blue-600',
    delete: 'bg-red-100 text-red-600',
    login: 'bg-purple-100 text-purple-600',
    logout: 'bg-gray-100 text-gray-600',
    approve: 'bg-emerald-100 text-emerald-600',
    reject: 'bg-orange-100 text-orange-600'
};

const actionLabels: Record<string, string> = {
    create: 'สร้าง',
    update: 'แก้ไข',
    delete: 'ลบ',
    login: 'เข้าสู่ระบบ',
    logout: 'ออกจากระบบ',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ'
};

const entityIcons: Record<string, React.ReactNode> = {
    product: <Package className="w-4 h-4" />,
    po: <FileText className="w-4 h-4" />,
    user: <User className="w-4 h-4" />,
    borrow: <Package className="w-4 h-4" />,
    stock: <Package className="w-4 h-4" />
};

export default function ActivityTimeline({ limit = 20 }: { limit?: number }) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await fetch('/api/activities?limit=' + limit);
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch {
                // Mock data for demo
                setActivities([
                    { id: 1, action: 'create', entity: 'product', entityId: 'P001', entityName: 'สินค้าใหม่ A', userId: 1, userName: 'Admin', timestamp: new Date(Date.now() - 300000) },
                    { id: 2, action: 'update', entity: 'stock', entityId: 'P002', entityName: 'สินค้า B', userId: 1, userName: 'Admin', details: 'เพิ่มสต็อก +50', timestamp: new Date(Date.now() - 600000) },
                    { id: 3, action: 'approve', entity: 'po', entityId: 'PO-2024-001', entityName: 'ใบสั่งซื้อ #001', userId: 1, userName: 'Admin', timestamp: new Date(Date.now() - 1800000) },
                    { id: 4, action: 'login', entity: 'user', entityId: '1', entityName: 'Admin', userId: 1, userName: 'Admin', timestamp: new Date(Date.now() - 3600000) },
                    { id: 5, action: 'delete', entity: 'product', entityId: 'P003', entityName: 'สินค้าเก่า', userId: 1, userName: 'Admin', timestamp: new Date(Date.now() - 7200000) },
                ]);
            }
            setLoading(false);
        };

        fetchActivities();
    }, [limit]);

    const formatTime = (date: Date) => {
        const now = new Date();
        const d = new Date(date);
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'เมื่อสักครู่';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        if (days < 7) return `${days} วันที่แล้ว`;
        return d.toLocaleDateString('th-TH');
    };

    const filteredActivities = filter === 'all'
        ? activities
        : activities.filter(a => a.action === filter);

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    Activity Timeline
                </h2>
                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-2 py-1 text-sm border rounded-lg"
                        title="Filter activities"
                    >
                        <option value="all">ทั้งหมด</option>
                        <option value="create">สร้าง</option>
                        <option value="update">แก้ไข</option>
                        <option value="delete">ลบ</option>
                        <option value="login">เข้าสู่ระบบ</option>
                    </select>
                </div>
            </div>

            {/* Timeline */}
            <div className="p-4">
                {filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>ไม่มีกิจกรรม</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                        <div className="space-y-4">
                            {filteredActivities.map((activity, idx) => (
                                <div key={activity.id} className="relative flex gap-4">
                                    {/* Icon */}
                                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${actionColors[activity.action]}`}>
                                        {actionIcons[activity.action]}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-800 dark:text-white">
                                                {activity.userName}
                                            </span>
                                            <span className="text-gray-500">
                                                {actionLabels[activity.action]}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                {entityIcons[activity.entity]}
                                                {activity.entityName}
                                            </span>
                                        </div>

                                        {activity.details && (
                                            <p className="text-sm text-gray-500 mb-1">{activity.details}</p>
                                        )}

                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(activity.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
