'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Bell, RefreshCw, AlertTriangle, CheckCircle, XCircle, X, Download } from 'lucide-react';
import { getSystemSettings, updateSystemSetting } from '@/actions/settingActions';
import { performBackup, restoreDatabase, getBackupsList } from '@/actions/backupActions';

interface BackupFile {
    name: string;
    size: string;
    date: string | Date;
}

// Modal Components
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, filename }: any) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear(); // Thai Buddhist year is not requested so assuming AD. Wait, previous context "sm" + ddmmyyyy was AD.
        // User said "current date month year". Usually AD.
        const correctPassword = `${d}${m}${y}`;

        if (password === correctPassword) {
            onConfirm();
        } else {
            setError('รหัสผ่านไม่ถูกต้อง (Invalid Password)');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 opacity-100">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {message}
                        <br />
                        <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded mt-2 inline-block break-all">
                            {filename}
                        </span>
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            กรุณากรอกรหัสยืนยัน
                        </label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            placeholder=""
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none dark:bg-slate-700 dark:text-white text-center tracking-widest"
                        />
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            ยกเลิก (Cancel)
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all hover:shadow-red-600/40"
                        >
                            ยืนยัน (Restore)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusModal = ({ isOpen, onClose, type, message }: any) => {
    if (!isOpen) return null;
    const isSuccess = type === 'success';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isSuccess ? (
                            <CheckCircle className={`w-8 h-8 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
                        ) : (
                            <XCircle className={`w-8 h-8 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} />
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {isSuccess ? 'สำเร็จ (Success)' : 'ผิดพลาด (Error)'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                        {message}
                    </p>
                    <button
                        onClick={onClose}
                        className={`w-full py-3 rounded-xl font-medium text-white shadow-lg transition-all ${isSuccess
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-600/30 hover:shadow-green-600/40'
                            : 'bg-red-600 hover:bg-red-700 shadow-red-600/30 hover:shadow-red-600/40'
                            }`}
                    >
                        ตกลง (OK)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SettingsClient() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [restoring, setRestoring] = useState(false);

    // Modal States
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; filename: string }>({ isOpen: false, filename: '' });
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; message: string }>({ isOpen: false, type: 'success', message: '' });
    const customerRegisterLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_CUSTOMER_REGISTER_ID || '';
    const customerRegisterPublicUrl = customerRegisterLiffId
        ? `https://liff.line.me/${customerRegisterLiffId}`
        : (typeof window !== 'undefined' ? `${window.location.origin}/line/customer-register` : '/line/customer-register');

    async function loadData() {
        setLoading(true);
        const result = await getSystemSettings();
        if (result.success && result.data) {
            setSettings(result.data);
        }
        await loadBackups();
        setLoading(false);
    }

    async function loadBackups() {
        const result = await getBackupsList();
        if (result.success && result.data) {
            setBackups(result.data);
        }
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
            // alert('Failed to save setting');
            setStatusModal({ isOpen: true, type: 'error', message: 'Failed to save setting' });
        }
        setSaving(false);
    }

    async function handleBackup() {
        setBackingUp(true);
        const result = await performBackup();
        if (result.success) {
            // alert('Backup created successfully!');
            setStatusModal({ isOpen: true, type: 'success', message: 'Backup created successfully!' });
            await loadBackups();
        } else {
            // alert('Backup failed: ' + result.message);
            setStatusModal({ isOpen: true, type: 'error', message: 'Backup failed: ' + result.message });
        }
        setBackingUp(false);
    }

    function requestRestore(filename: string) {
        setConfirmModal({ isOpen: true, filename });
    }

    async function executeRestore() {
        const filename = confirmModal.filename;
        setConfirmModal({ isOpen: false, filename: '' });

        if (!filename) return;

        setRestoring(true);
        const result = await restoreDatabase(filename);
        if (result.success) {
            setStatusModal({
                isOpen: true,
                type: 'success',
                message: 'Database restored successfully! The system will reload.'
            });
            // Reload after user closes modal or short delay - actually let's do it on modal close
        } else {
            setStatusModal({
                isOpen: true,
                type: 'error',
                message: result.message
            });
        }
        setRestoring(false);
    }

    function handleStatusClose() {
        if (statusModal.type === 'success' && statusModal.message.includes('restored')) {
            window.location.reload();
        }
        setStatusModal({ ...statusModal, isOpen: false });
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6 relative">
            {/* Modals */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={executeRestore}
                title="ยืนยันการกู้คืนข้อมูล (Confirm Restore)"
                message="คำเตือน: การกู้คืนข้อมูลจะทับข้อมูลปัจจุบันทั้งหมดด้วยไฟล์สำรองนี้ การกระทำนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่?"
                filename={confirmModal.filename}
            />

            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={handleStatusClose}
                type={statusModal.type}
                message={statusModal.message}
            />

            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="text-gray-600" /> ตั้งค่าระบบ
            </h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Save className="text-gray-500" />
                    <h2 className="text-xl font-semibold">ข้อมูลบริษัท (Company Information)</h2>
                </div>

                <div className="grid gap-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ชื่อบริษัท (Company Name)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                value={settings['company_name'] || ''}
                                onChange={(e) => handleSave('company_name', e.target.value)}
                                placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                เลขประจำตัวผู้เสียภาษี (Tax ID)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                value={settings['company_tax_id'] || ''}
                                onChange={(e) => handleSave('company_tax_id', e.target.value)}
                                placeholder="เช่น 0123456789000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ที่อยู่ (Address)
                        </label>
                        <textarea
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                            value={settings['company_address'] || ''}
                            onChange={(e) => handleSave('company_address', e.target.value)}
                            placeholder="ที่อยู่บริษัท..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                เบอร์โทรศัพท์ (Phone)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                value={settings['company_phone'] || ''}
                                onChange={(e) => handleSave('company_phone', e.target.value)}
                                placeholder="เช่น 02-123-4567"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                อีเมล (Email)
                            </label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                value={settings['company_email'] || ''}
                                onChange={(e) => handleSave('company_email', e.target.value)}
                                placeholder="admin@example.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4 pt-4 border-t dark:border-slate-700">
                    <Bell className="text-yellow-500" />
                    <h2 className="text-xl font-semibold">การแจ้งเตือน (Notifications)</h2>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
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
                    {settings['overdue_alerts_enabled'] === 'true' && (
                        <div className="flex items-center justify-between pt-4 border-t dark:border-slate-600">
                            <div>
                                <div className="font-medium text-sm">ระยะเวลา Cooldown แจ้งซ้ำ (นาที)</div>
                                <div className="text-xs text-gray-500">จำนวนนาทีขั้นต่ำก่อนที่จะสามารถกดส่งแจ้งเตือนซ้ำได้อีกครั้ง (ค่าเริ่มต้น 30 นาที)</div>
                            </div>
                            <div className="flex max-w-[120px] items-center">
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full px-3 py-1.5 border rounded-l-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600 text-sm"
                                    value={settings['overdue_alerts_cooldown_minutes'] || '30'}
                                    onChange={(e) => setSettings({ ...settings, overdue_alerts_cooldown_minutes: e.target.value })}
                                    onBlur={(e) => handleSave('overdue_alerts_cooldown_minutes', e.target.value)}
                                    placeholder="30"
                                />
                                <div className="bg-gray-100 border border-l-0 dark:border-slate-600 dark:bg-slate-600 px-2 py-1.5 rounded-r-lg text-sm text-gray-600 dark:text-gray-300">
                                    นาที
                                </div>
                            </div>
                        </div>
                    )}
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
                        <div className="text-sm text-gray-500">จัดการผู้ใช้ LINE และตั้งค่าผู้อนุมัติ (Approvers) และแผนก</div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">Manage &rarr;</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors" onClick={() => window.location.href = '/settings/line-customers'}>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            LINE Customers
                        </div>
                        <div className="text-sm text-gray-500">จัดการรายชื่อลูกค้าที่สมัครผ่าน LINE แยกจากผู้ใช้ภายในระบบ</div>
                        <div className="text-xs text-gray-400 mt-1">
                            หน้าสมัครลูกค้า: <span className="font-mono">{customerRegisterPublicUrl}</span>
                        </div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">Manage &rarr;</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex-1 mr-4">
                        <div className="font-medium mb-1">สิทธิ์การอนุมัติ (Manager Approval Limit)</div>
                        <div className="text-sm text-gray-500 mb-2">กำหนดยอดขอเบิกขั้นต่ำที่ต้องให้ตำแหน่ง Manager (ผู้จัดการ) เป็นคนอนุมัติ (ถ้าต่ำกว่านี้ หัวหน้าช่างอนุมัติได้)</div>
                        <div className="flex max-w-xs items-center">
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-l-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                value={settings['manager_approval_limit'] || '5000'}
                                onChange={(e) => setSettings({ ...settings, manager_approval_limit: e.target.value })}
                                onBlur={(e) => handleSave('manager_approval_limit', e.target.value)}
                                placeholder="5000"
                            />
                            <div className="bg-gray-100 border border-l-0 dark:border-slate-600 dark:bg-slate-600 px-3 py-2 rounded-r-lg text-sm text-gray-600 dark:text-gray-300">
                                THB
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg mt-4">
                    <div className="font-medium mb-3">ทดสอบส่งอีเมล (Test Email Connection)</div>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="ระบุอีเมลผู้รับ (Recipient Email)"
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                            id="test-email-recipient"
                        />
                        <button
                            onClick={async () => {
                                const input = document.getElementById('test-email-recipient') as HTMLInputElement;
                                const email = input.value;
                                if (!email) {
                                    setStatusModal({ isOpen: true, type: 'error', message: 'กรุณาระบุอีเมล' });
                                    return;
                                }
                                // Import action locally to avoid client-side issues with server actions if not handled right?
                                // actually we imported it at top but let's use it
                                const { sendTestEmail } = await import('@/actions/settingActions');
                                setSaving(true);
                                const result = await sendTestEmail(email);
                                setSaving(false);

                                if (result.success) {
                                    setStatusModal({ isOpen: true, type: 'success', message: 'ส่งอีเมลทดสอบเรียบร้อยแล้ว (Check your inbox)' });
                                } else {
                                    setStatusModal({ isOpen: true, type: 'error', message: result.message || 'ส่งอีเมลไม่สำเร็จ' });
                                }
                            }}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Sending...' : 'Send Test App Email'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        ระบบจะส่งอีเมลทดสอบไปยังที่อยู่ที่ระบุ เพื่อตรวจสอบการตั้งค่า SMTP
                    </p>
                </div>
            </div>

            {/* Database Maintenance Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Save className="text-blue-600" size={20} />
                        Database Maintenance
                    </h2>
                    <button
                        onClick={() => loadBackups()}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-slate-700/50 rounded-lg border border-blue-100 dark:border-slate-600">
                        <div>
                            <h3 className="font-medium text-blue-900 dark:text-blue-100">Create Backup</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Create a new manual backup of the database.</p>
                        </div>
                        <button
                            onClick={handleBackup}
                            disabled={backingUp}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {backingUp ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                            Backup Now
                        </button>
                    </div>

                    <div className="mt-6">
                        <h3 className="font-medium mb-3">Available Backups</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">Filename</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Size</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No backups found</td>
                                        </tr>
                                    ) : (
                                        backups.map((backup) => (
                                            <tr key={backup.name} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 font-medium">{backup.name}</td>
                                                <td className="px-4 py-3">{new Date(backup.date).toLocaleString()}</td>
                                                <td className="px-4 py-3">{backup.size}</td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <a
                                                        href={`/api/backups/download/${backup.name}`}
                                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors flex items-center gap-1"
                                                    >
                                                        <Download size={14} /> Download
                                                    </a>
                                                    <button
                                                        onClick={() => requestRestore(backup.name)}
                                                        disabled={restoring}
                                                        className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition-colors"
                                                    >
                                                        {restoring ? 'Restoring...' : 'Restore'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                            <li><strong>Mar 2026 - Maintenance Reports:</strong> เพิ่ม Consumption / Scrap / Technician Usage, Daily Trend, Pareto 80/20 และ Drilldown.</li>
                            <li><strong>Mar 2026 - CSV Export:</strong> รองรับ Export CSV สำหรับ Reopened jobs, Filtered requests, Pareto และ Drilldown.</li>
                            <li><strong>Mar 2026 - Workflow:</strong> ผู้จัดการสามารถแก้ไข/เปิดงานที่ปิดแล้วใหม่ได้ โดยต้องระบุเหตุผล และมี Reopened badge/filter ครบ.</li>
                            <li><strong>Mar 2026 - Navigation:</strong> เพิ่ม Deep Link เปิดงานตรงจาก <code>/maintenance?req=...</code> และลิงก์ลัดจากหน้า Reports.</li>
                            <li><strong>General:</strong> ปรับปรุงความเสถียรและประสบการณ์ใช้งานในหน้าซ่อมบำรุงอย่างต่อเนื่อง.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
