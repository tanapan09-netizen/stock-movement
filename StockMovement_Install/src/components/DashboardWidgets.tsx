'use client';

import { useState, useEffect } from 'react';
import {
    LayoutGrid, Settings, X, GripVertical, Eye, EyeOff,
    Package, TrendingUp, FileText, AlertTriangle, Calendar, BarChart3
} from 'lucide-react';

interface Widget {
    id: string;
    title: string;
    type: 'stats' | 'chart' | 'list' | 'calendar';
    size: 'small' | 'medium' | 'large';
    visible: boolean;
    order: number;
}

const defaultWidgets: Widget[] = [
    { id: 'total-products', title: 'สินค้าทั้งหมด', type: 'stats', size: 'small', visible: true, order: 0 },
    { id: 'low-stock', title: 'สต็อกต่ำ', type: 'stats', size: 'small', visible: true, order: 1 },
    { id: 'pending-po', title: 'PO รอดำเนินการ', type: 'stats', size: 'small', visible: true, order: 2 },
    { id: 'total-value', title: 'มูลค่าสต็อก', type: 'stats', size: 'small', visible: true, order: 3 },
    { id: 'stock-chart', title: 'กราฟเคลื่อนไหว', type: 'chart', size: 'large', visible: true, order: 4 },
    { id: 'category-chart', title: 'สัดส่วนหมวดหมู่', type: 'chart', size: 'medium', visible: true, order: 5 },
    { id: 'recent-activity', title: 'กิจกรรมล่าสุด', type: 'list', size: 'medium', visible: true, order: 6 },
    { id: 'expiry-calendar', title: 'ปฏิทินหมดอายุ', type: 'calendar', size: 'medium', visible: false, order: 7 },
    { id: 'supplier-performance', title: 'ประสิทธิภาพผู้ขาย', type: 'list', size: 'medium', visible: false, order: 8 },
];

export function useDashboardWidgets() {
    const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);

    useEffect(() => {
        const saved = localStorage.getItem('dashboardWidgets');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new widgets
                const merged = defaultWidgets.map(dw => {
                    const saved = parsed.find((w: Widget) => w.id === dw.id);
                    return saved ? { ...dw, ...saved } : dw;
                });
                setWidgets(merged);
            } catch {
                // ignore
            }
        }
    }, []);

    const saveWidgets = (newWidgets: Widget[]) => {
        setWidgets(newWidgets);
        localStorage.setItem('dashboardWidgets', JSON.stringify(newWidgets));
    };

    const toggleWidget = (id: string) => {
        const updated = widgets.map(w =>
            w.id === id ? { ...w, visible: !w.visible } : w
        );
        saveWidgets(updated);
    };

    const reorderWidgets = (fromIndex: number, toIndex: number) => {
        const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
        const [moved] = visibleWidgets.splice(fromIndex, 1);
        visibleWidgets.splice(toIndex, 0, moved);

        const updated = widgets.map(w => ({
            ...w,
            order: visibleWidgets.findIndex(vw => vw.id === w.id)
        }));
        saveWidgets(updated);
    };

    const resetWidgets = () => {
        saveWidgets(defaultWidgets);
    };

    const visibleWidgets = widgets
        .filter(w => w.visible)
        .sort((a, b) => a.order - b.order);

    return { widgets, visibleWidgets, toggleWidget, reorderWidgets, resetWidgets };
}

export function DashboardCustomizer() {
    const { widgets, toggleWidget, resetWidgets } = useDashboardWidgets();
    const [isOpen, setIsOpen] = useState(false);

    const getWidgetIcon = (type: Widget['type']) => {
        switch (type) {
            case 'stats': return <Package className="w-4 h-4" />;
            case 'chart': return <BarChart3 className="w-4 h-4" />;
            case 'list': return <FileText className="w-4 h-4" />;
            case 'calendar': return <Calendar className="w-4 h-4" />;
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="ปรับแต่ง Dashboard"
            >
                <LayoutGrid className="w-4 h-4" />
                ปรับแต่ง
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5 text-purple-500" />
                                ปรับแต่ง Dashboard
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="ปิด">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Widget List */}
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <p className="text-sm text-gray-500 mb-4">เลือก widgets ที่ต้องการแสดงบน Dashboard</p>

                            <div className="space-y-2">
                                {widgets.map((widget) => (
                                    <div
                                        key={widget.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${widget.visible
                                                ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        onClick={() => toggleWidget(widget.id)}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${widget.visible ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'
                                            }`}>
                                            {getWidgetIcon(widget.type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{widget.title}</p>
                                            <p className="text-xs text-gray-500 capitalize">{widget.type} • {widget.size}</p>
                                        </div>
                                        {widget.visible ? (
                                            <Eye className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <EyeOff className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <button
                                onClick={resetWidgets}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                รีเซ็ตเป็นค่าเริ่มต้น
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                เสร็จสิ้น
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Widget container with size classes
export function WidgetContainer({
    widget,
    children
}: {
    widget: Widget;
    children: React.ReactNode
}) {
    const sizeClasses = {
        small: 'col-span-1',
        medium: 'col-span-1 md:col-span-2',
        large: 'col-span-1 md:col-span-2 lg:col-span-3'
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 ${sizeClasses[widget.size]}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800 dark:text-white">{widget.title}</h3>
            </div>
            {children}
        </div>
    );
}
