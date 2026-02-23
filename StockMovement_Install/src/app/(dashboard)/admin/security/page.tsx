'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Globe, AlertTriangle, Save, RefreshCw, Trash2, Key, List, Clock, History } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cleanupAuditLogs } from '@/actions/securityActions';

export default function SecurityPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [csrfEnabled, setCsrfEnabled] = useState(true);
    const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
    const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
    const [allowedIPs, setAllowedIPs] = useState<string[]>([]);

    // Rate Limit Config
    const [maxRequests, setMaxRequests] = useState(100);
    const [windowWindow, setWindowWindow] = useState(60000);

    // Login Protection Config
    const [loginProtectionEnabled, setLoginProtectionEnabled] = useState(true);
    const [maxAttempts, setMaxAttempts] = useState(5);
    const [lockoutDuration, setLockoutDuration] = useState(5);

    // Log Retention Config
    const [logRetentionDays, setLogRetentionDays] = useState(90);
    const [cleaningLogs, setCleaningLogs] = useState(false);

    // UI State
    const [newIP, setNewIP] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [csrfToken, setCsrfToken] = useState('');

    // Initial Load
    useEffect(() => {
        fetchSettings();
        fetchCsrfToken();
    }, []);

    const fetchCsrfToken = async () => {
        try {
            const res = await fetch('/api/security/csrf');
            if (res.ok) {
                const data = await res.json();
                setCsrfToken(data.token);
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token', error);
        }
    };

    const safeParseInt = (val: any, def: number) => {
        const parsed = parseInt(String(val));
        return isNaN(parsed) ? def : parsed;
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/security');
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();

            setCsrfEnabled(data.csrfEnabled);
            setRateLimitEnabled(data.rateLimitEnabled);
            setIpWhitelistEnabled(data.ipWhitelistEnabled);
            setAllowedIPs(data.allowedIPs || []);

            setMaxRequests(safeParseInt(data.maxRequests, 100));
            setWindowWindow(safeParseInt(data.windowWindow, 60000));

            // New Settings (Direct boolean assignment since API parses them)
            setLoginProtectionEnabled(data.loginProtectionEnabled);
            setMaxAttempts(safeParseInt(data.security_max_attempts, 5));
            setLockoutDuration(safeParseInt(data.security_lockout_duration, 5));
            setLogRetentionDays(safeParseInt(data.security_log_retention_days, 90));
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'ไม่สามารถโหลดการตั้งค่าได้' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            const settings = {
                csrfEnabled,
                rateLimitEnabled,
                ipWhitelistEnabled,
                allowedIPs,
                maxRequests,
                windowWindow,
                loginProtectionEnabled,
                security_max_attempts: maxAttempts.toString(),
                security_lockout_duration: lockoutDuration.toString(),
                security_log_retention_days: logRetentionDays.toString()
            };

            const res = await fetch('/api/settings/security', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify(settings)
            });

            const result = await res.json();

            if (!res.ok) {
                const errorText = result.error || 'Failed to save settings';
                const details = result.details || (result.failedKeys ? JSON.stringify(result.failedKeys) : '');
                throw new Error(`${errorText} ${details ? `(${details})` : ''}`);
            }

            setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว (มีผลทันที)' });
        } catch (error: any) {
            console.error('Save error detailed:', error);
            setMessage({ type: 'error', text: error.message || 'บันทึกไม่สำเร็จ' });
        } finally {
            setSaving(false);
        }
    };

    const addIP = () => {
        if (newIP && !allowedIPs.includes(newIP)) {
            setAllowedIPs([...allowedIPs, newIP]);
            setNewIP('');
        }
    };

    const removeIP = (ip: string) => {
        setAllowedIPs(allowedIPs.filter(i => i !== ip));
    };

    const handleCleanupLogs = async () => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ Log ที่เก่ากว่า ${logRetentionDays} วัน?`)) return;

        try {
            setCleaningLogs(true);
            const result = await cleanupAuditLogs(logRetentionDays);
            if (result.success) {
                setMessage({ type: 'success', text: result.message || 'ลบ Log เรียบร้อยแล้ว' });
            } else {
                setMessage({ type: 'error', text: result.error || 'ลบ Log ไม่สำเร็จ' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบ Log' });
        } finally {
            setCleaningLogs(false);
        }
    };

    const handleNumberChange = (value: string, setter: (val: number) => void) => {
        const parsed = parseInt(value);
        if (isNaN(parsed)) {
            setter(0); // or handle empty string if needed, but 0 is safer for number type
        } else {
            setter(parsed);
        }
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-8 h-8 text-blue-600" />
                        Security Management
                    </h1>
                    <p className="text-gray-500">จัดการความปลอดภัยของระบบ (Persistence Mode)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchSettings}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> รีโหลด
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {saving ? 'saving...' : 'บันทึกการตั้งค่า'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <AlertTriangle className="w-5 h-5" />
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CSRF Protection */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Lock className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">CSRF Protection</h3>
                                <p className="text-sm text-gray-500">ป้องกันการปลอมแปลงคำขอ</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={csrfEnabled}
                                onChange={(e) => setCsrfEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* Rate Limiting */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Rate Limiting</h3>
                                <p className="text-sm text-gray-500">จำกัดจำนวนคำขอต่อนาที</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rateLimitEnabled}
                                onChange={(e) => setRateLimitEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    {rateLimitEnabled && (
                        <div className="space-y-3 mt-4 pt-4 border-t">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Max Requests / Window</label>
                                <input
                                    type="number"
                                    value={maxRequests}
                                    onChange={(e) => handleNumberChange(e.target.value, setMaxRequests)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Login Protection */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Key className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Login Protection</h3>
                                <p className="text-sm text-gray-500">ป้องกันการเดารหัสผ่าน</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={loginProtectionEnabled}
                                onChange={(e) => setLoginProtectionEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    {loginProtectionEnabled && (
                        <div className="space-y-4 mt-4 pt-4 border-t">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Max Failed Attempts (จำนวนครั้งที่ผิดได้)</label>
                                <input
                                    type="number"
                                    value={maxAttempts}
                                    onChange={(e) => handleNumberChange(e.target.value, setMaxAttempts)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Lockout Duration (นาทีห้ามเข้า)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        value={lockoutDuration}
                                        onChange={(e) => handleNumberChange(e.target.value, setLockoutDuration)}
                                        className="mt-1 w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Audit Log Retention */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <History className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Audit Log Retention</h3>
                                <p className="text-sm text-gray-500">การจัดการ Log ระบบ</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Retention Period (เก็บย้อนหลังกี่วัน)</label>
                            <input
                                type="number"
                                value={logRetentionDays}
                                onChange={(e) => handleNumberChange(e.target.value, setLogRetentionDays)}
                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                                min={1}
                            />
                        </div>
                        <button
                            onClick={handleCleanupLogs}
                            disabled={cleaningLogs}
                            className="w-full mt-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {cleaningLogs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Clean Old Logs Now
                        </button>
                    </div>
                </div>

                {/* IP Whitelist */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Globe className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">IP Whitelist</h3>
                                <p className="text-sm text-gray-500">อนุญาตเฉพาะ IP ที่กำหนด (ปัจจุบัน: {ipWhitelistEnabled ? 'เปิด' : 'ปิด'})</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ipWhitelistEnabled}
                                onChange={(e) => setIpWhitelistEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {ipWhitelistEnabled && (
                        <div className="mt-4">
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Enter IP address (e.g., 192.168.1.100)"
                                    value={newIP}
                                    onChange={(e) => setNewIP(e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-2"
                                />
                                <button
                                    onClick={addIP}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Add IP
                                </button>
                            </div>
                            <div className="space-y-2">
                                {allowedIPs.map(ip => (
                                    <div key={ip} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="font-mono text-sm">{ip}</span>
                                        <button
                                            onClick={() => removeIP(ip)}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {allowedIPs.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No IPs whitelisted yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
