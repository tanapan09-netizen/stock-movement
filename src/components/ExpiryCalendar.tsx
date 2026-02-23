'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, Package } from 'lucide-react';

interface ExpiryItem {
    id: number;
    name: string;
    expiryDate: Date;
    quantity: number;
    daysUntilExpiry: number;
}

interface ExpiryCalendarProps {
    items?: ExpiryItem[];
}

export default function ExpiryCalendar({ items = [] }: ExpiryCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>(items);

    useEffect(() => {
        // Fetch expiry items from API
        const fetchExpiryItems = async () => {
            try {
                const res = await fetch('/api/products/expiry');
                if (res.ok) {
                    const data = await res.json();
                    setExpiryItems(data);
                }
            } catch {
                // Use mock data for demo
                setExpiryItems([
                    { id: 1, name: 'สินค้า A', expiryDate: new Date(Date.now() + 5 * 86400000), quantity: 10, daysUntilExpiry: 5 },
                    { id: 2, name: 'สินค้า B', expiryDate: new Date(Date.now() + 10 * 86400000), quantity: 25, daysUntilExpiry: 10 },
                    { id: 3, name: 'สินค้า C', expiryDate: new Date(Date.now() + 30 * 86400000), quantity: 50, daysUntilExpiry: 30 },
                ]);
            }
        };

        fetchExpiryItems();
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getItemsForDate = (date: Date) => {
        return expiryItems.filter(item => {
            const expiry = new Date(item.expiryDate);
            return expiry.getDate() === date.getDate() &&
                expiry.getMonth() === date.getMonth() &&
                expiry.getFullYear() === date.getFullYear();
        });
    };

    const getDateStatus = (date: Date) => {
        const items = getItemsForDate(date);
        if (items.length === 0) return null;

        const minDays = Math.min(...items.map(i => i.daysUntilExpiry));
        if (minDays <= 7) return 'danger';
        if (minDays <= 14) return 'warning';
        return 'normal';
    };

    const renderCalendarDays = () => {
        const days = [];

        // Empty cells before first day
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-12" />);
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const status = getDateStatus(date);
            const itemCount = getItemsForDate(date).length;

            days.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`h-12 flex flex-col items-center justify-center rounded-lg cursor-pointer transition
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                        ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                        ${status === 'danger' && !isSelected ? 'bg-red-100 text-red-700' : ''}
                        ${status === 'warning' && !isSelected ? 'bg-yellow-100 text-yellow-700' : ''}
                    `}
                >
                    <span className="text-sm font-medium">{day}</span>
                    {itemCount > 0 && (
                        <span className={`text-xs ${isSelected ? 'text-white/80' : ''}`}>
                            {itemCount} รายการ
                        </span>
                    )}
                </div>
            );
        }

        return days;
    };

    const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];
    const upcomingExpiry = expiryItems
        .filter(i => i.daysUntilExpiry <= 30)
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    ปฏิทินหมดอายุ
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="เดือนก่อนหน้า">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium min-w-[150px] text-center">
                        {monthNames[month]} {year + 543}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="เดือนถัดไป">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendarDays()}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-red-100 rounded" />
                            <span>≤7 วัน</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-yellow-100 rounded" />
                            <span>≤14 วัน</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 ring-2 ring-blue-500 rounded" />
                            <span>วันนี้</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Selected Date Items */}
                    {selectedDate && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 className="font-medium mb-3">
                                {selectedDate.toLocaleDateString('th-TH', { dateStyle: 'long' })}
                            </h3>
                            {selectedItems.length === 0 ? (
                                <p className="text-sm text-gray-500">ไม่มีสินค้าหมดอายุ</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedItems.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-600 rounded">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <span className="flex-1 text-sm">{item.name}</span>
                                            <span className="text-sm text-gray-500">{item.quantity} ชิ้น</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upcoming Expiry */}
                    <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            ใกล้หมดอายุ
                        </h3>
                        {upcomingExpiry.length === 0 ? (
                            <p className="text-sm text-gray-500">ไม่มีสินค้าใกล้หมดอายุ</p>
                        ) : (
                            <div className="space-y-2">
                                {upcomingExpiry.slice(0, 5).map(item => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-2 rounded ${item.daysUntilExpiry <= 7 ? 'bg-red-50 text-red-700' :
                                                item.daysUntilExpiry <= 14 ? 'bg-yellow-50 text-yellow-700' :
                                                    'bg-gray-50 dark:bg-gray-700'
                                            }`}
                                    >
                                        <span className="text-sm">{item.name}</span>
                                        <span className="text-xs font-medium">
                                            {item.daysUntilExpiry <= 0 ? 'หมดอายุแล้ว' : `อีก ${item.daysUntilExpiry} วัน`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
