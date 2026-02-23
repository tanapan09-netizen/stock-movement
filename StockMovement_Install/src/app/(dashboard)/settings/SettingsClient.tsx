'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Bell, RefreshCw } from 'lucide-react';
import { getSystemSettings, updateSystemSetting } from '@/actions/settingActions';

export default function SettingsClient() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    async function loadData() {
        setLoading(true);
        const result = await getSystemSettings();
        if (result.success && result.data) {
            setSettings(result.data);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleSave(key: string, value: string) {
        setSaving(true);
        const result = await updateSystemSetting(key, value);
        if (result.success) {
            setSettings(prev => ({ ...prev, [key]: value }));
        } else {
            alert('Failed to save setting');
        }
        setSaving(false);
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="text-gray-600" /> ตั้งค่าระบบ
            </h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Bell className="text-yellow-500" />
                    <h2 className="text-xl font-semibold">การแจ้งเตือน (Notifications)</h2>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                        <div className="font-medium">แจ้งเตือนงานล่าช้า (Overdue Alerts)</div>
                        <div className="text-sm text-gray-500">เปิด/ปิด การแจ้งเตือนเมื่อมีงานซ่อมเกินกำหนด</div>
                    </div>
                    <div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                aria-label="Toggle overdue alerts"
                                className="sr-only peer"
                                checked={settings['overdue_alerts_enabled'] === 'true'}
                                onChange={(e) => handleSave('overdue_alerts_enabled', e.target.checked ? 'true' : 'false')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                        <div className="font-medium">แจ้งเตือนผ่าน LINE Notify (Group)</div>
                        <div className="text-sm text-gray-500">ใช้สำหรับแจ้งเตือนภาพรวมไปยังกลุ่ม LINE</div>
                    </div>
                    <div className="text-sm text-gray-400">
                        {process.env.NEXT_PUBLIC_LINE_NOTIFY_TOKEN ? 'Configured (Env)' : 'Not Configured'}
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors" onClick={() => window.location.href = '/settings/line-users'}>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            LINE Messaging API Users <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-200">New</span>
                        </div>
                        <div className="text-sm text-gray-500">จัดการผู้ใช้ LINE และตั้งค่าผู้อนุมัติ (Approvers)</div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">Manage &rarr;</div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><RefreshCw size={20} /> System Info</h2>
                <div className="space-y-2">
                    <p className="text-sm text-gray-500 font-medium">Version: 1.1.0</p>
                    <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>
                    <div className="mt-4 pt-4 border-t dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Updates:</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li><strong>Audit Log Enforcement:</strong> Comprehensive system logging for all critical actions.</li>
                            <li><strong>Luxury Product Flag:</strong> Added "Luxury" status (Gem icon) for high-value items.</li>
                            <li><strong>Maintenance Reserved Stock:</strong> Implemented "Reserve &rarr; Deduct" flow with Daily Clear function.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
