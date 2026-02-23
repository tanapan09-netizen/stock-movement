'use client';

import { useState, useEffect } from 'react';
import { Mail, Calendar, Clock, Bell, Save, Loader2, Check } from 'lucide-react';

interface DigestSettings {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek: number; // 0-6 for weekly
    dayOfMonth: number; // 1-31 for monthly
    email: string;
    includeStockAlerts: boolean;
    includePOSummary: boolean;
    includeBorrowReminders: boolean;
    includeMovementSummary: boolean;
}

export default function EmailDigestSettings() {
    const [settings, setSettings] = useState<DigestSettings>({
        enabled: false,
        frequency: 'daily',
        time: '08:00',
        dayOfWeek: 1, // Monday
        dayOfMonth: 1,
        email: '',
        includeStockAlerts: true,
        includePOSummary: true,
        includeBorrowReminders: true,
        includeMovementSummary: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load settings from localStorage or API
        const savedSettings = localStorage.getItem('emailDigestSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const handleSave = async () => {
        setIsSaving(true);

        // Save to localStorage (in production, save to API)
        localStorage.setItem('emailDigestSettings', JSON.stringify(settings));

        // Simulate API call
        await new Promise(r => setTimeout(r, 500));

        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    Email Digest
                </h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saved ? 'บันทึกแล้ว!' : 'บันทึก'}
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                        <p className="font-medium">เปิดใช้งาน Email Digest</p>
                        <p className="text-sm text-gray-500">รับสรุปรายงานทางอีเมล</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {settings.enabled && (
                    <>
                        {/* Email Address */}
                        <div>
                            <label className="block text-sm font-medium mb-2">อีเมลที่รับ</label>
                            <input
                                type="email"
                                value={settings.email}
                                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="example@company.com"
                                className="w-full p-3 border rounded-lg"
                            />
                        </div>

                        {/* Frequency */}
                        <div>
                            <label className="block text-sm font-medium mb-2">ความถี่</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                                    <button
                                        key={freq}
                                        onClick={() => setSettings(prev => ({ ...prev, frequency: freq }))}
                                        className={`p-3 rounded-lg border transition ${settings.frequency === freq
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Calendar className="w-5 h-5 mx-auto mb-1" />
                                        <span className="text-sm">
                                            {freq === 'daily' ? 'รายวัน' : freq === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> เวลาส่ง
                                </label>
                                <input
                                    type="time"
                                    value={settings.time}
                                    onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value }))}
                                    className="w-full p-3 border rounded-lg"
                                />
                            </div>

                            {settings.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">วัน</label>
                                    <select
                                        value={settings.dayOfWeek}
                                        onChange={(e) => setSettings(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                                        className="w-full p-3 border rounded-lg"
                                        title="เลือกวัน"
                                    >
                                        {dayNames.map((day, idx) => (
                                            <option key={idx} value={idx}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {settings.frequency === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">วันที่</label>
                                    <select
                                        value={settings.dayOfMonth}
                                        onChange={(e) => setSettings(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                                        className="w-full p-3 border rounded-lg"
                                        title="เลือกวันที่"
                                    >
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>วันที่ {day}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Content Options */}
                        <div>
                            <label className="block text-sm font-medium mb-3">เนื้อหาที่รวม</label>
                            <div className="space-y-3">
                                {[
                                    { key: 'includeStockAlerts', label: 'แจ้งเตือนสต็อกต่ำ', desc: 'สินค้าที่ต่ำกว่า Safety Stock' },
                                    { key: 'includePOSummary', label: 'สรุปใบสั่งซื้อ', desc: 'PO ที่รอดำเนินการ' },
                                    { key: 'includeBorrowReminders', label: 'เตือนการยืม', desc: 'รายการยืมที่ใกล้ครบกำหนด' },
                                    { key: 'includeMovementSummary', label: 'สรุปเคลื่อนไหว', desc: 'รายงานเข้า-ออกสินค้า' },
                                ].map((item) => (
                                    <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings[item.key as keyof DigestSettings] as boolean}
                                            onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                            className="w-5 h-5 rounded"
                                        />
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            <p className="text-sm text-gray-500">{item.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
