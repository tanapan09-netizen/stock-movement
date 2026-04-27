'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Settings, Save, Bell, RefreshCw, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import { getSystemSettings, sendTestLineGroupNotification, updateSystemSetting } from '@/actions/settingActions';
import { performBackup, restoreDatabase, getBackupsList } from '@/actions/backupActions';
import { ROLE_OPTIONS } from '@/lib/roles';

interface BackupFile {
    name: string;
    size: string;
    date: string | Date;
}

type ManagerSummaryTopic = 'maintenance_pending' | 'part_requests_pending' | 'low_stock';
type ManagerSummaryRole = string;
type DiscoveredLineGroup = {
    id: string;
    name: string | null;
    sourceType: 'group' | 'room';
    lastEventAt: string;
};

const MANAGER_SUMMARY_ROLE_OPTIONS = ROLE_OPTIONS.map((role) => ({
    value: role.value,
    label: role.label.split('(')[0].trim() || role.value,
}));

const MANAGER_SUMMARY_TOPIC_OPTIONS: Array<{
    key: ManagerSummaryTopic;
    label: string;
    description: string;
}> = [
    {
        key: 'maintenance_pending',
        label: 'งานซ่อมค้างคิว',
        description: 'จำนวนงานแจ้งซ่อมที่ยังรอดำเนินการ',
    },
    {
        key: 'part_requests_pending',
        label: 'คำขอเบิก/สั่งซื้อรออนุมัติ',
        description: 'จำนวนรายการขอเบิกอะไหล่/สั่งซื้อที่ยังไม่อนุมัติ',
    },
    {
        key: 'low_stock',
        label: 'สินค้าเหลือน้อย',
        description: 'จำนวนสินค้าที่ต่ำกว่าหรือเท่ากับ Safety Stock',
    },
];

function parseManagerSummaryTopics(rawValue?: string): Set<ManagerSummaryTopic> {
    if (!rawValue || rawValue.trim() === '') {
        return new Set(MANAGER_SUMMARY_TOPIC_OPTIONS.map((topic) => topic.key));
    }

    const allowed = new Set<ManagerSummaryTopic>(MANAGER_SUMMARY_TOPIC_OPTIONS.map((topic) => topic.key));
    const topics = rawValue
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is ManagerSummaryTopic => allowed.has(value as ManagerSummaryTopic));

    return new Set(topics);
}

function parseManagerSummaryRoles(rawValue?: string): Set<ManagerSummaryRole> {
    const allowedRoleSet = new Set<string>(MANAGER_SUMMARY_ROLE_OPTIONS.map((role) => role.value));
    const defaultRoles = ['manager'];

    if (!rawValue || rawValue.trim() === '') {
        return new Set(defaultRoles);
    }

    const roles = rawValue
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => allowedRoleSet.has(value));

    return new Set(roles.length > 0 ? roles : defaultRoles);
}

function parseLineGroupTargetIds(rawValue?: string): string[] {
    if (!rawValue || rawValue.trim() === '') return [];

    return Array.from(
        new Set(
            rawValue
                .split(/[\n,]+/)
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
}

function parseDiscoveredLineGroups(rawValue?: string): DiscoveredLineGroup[] {
    if (!rawValue || rawValue.trim() === '') return [];

    try {
        const parsed = JSON.parse(rawValue) as Array<Partial<DiscoveredLineGroup>>;
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry) => ({
                id: String(entry.id || '').trim(),
                name: entry.name ? String(entry.name) : null,
                sourceType: (entry.sourceType === 'room' ? 'room' : 'group') as 'group' | 'room',
                lastEventAt: String(entry.lastEventAt || ''),
            }))
            .filter((entry) => entry.id.length > 0);
    } catch (error) {
        console.error('Failed to parse discovered LINE groups:', error);
        return [];
    }
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

type ToggleSwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel: string;
};

function ToggleSwitch({ checked, onChange, ariaLabel }: ToggleSwitchProps) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                aria-label={ariaLabel}
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:border-gray-600 dark:peer-focus:ring-blue-800" />
        </label>
    );
}

type QuickAccessCardProps = {
    title: string;
    description: string;
    href: string;
    badge?: string;
};

function QuickAccessCard({ title, description, href, badge }: QuickAccessCardProps) {
    return (
        <button
            type="button"
            onClick={() => {
                window.location.href = href;
            }}
            className="group flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="text-base font-semibold text-slate-900">{title}</div>
                <span className="text-sm font-medium text-blue-600 transition-transform duration-200 group-hover:translate-x-1">Go</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            {badge ? (
                <span className="mt-4 inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {badge}
                </span>
            ) : null}
        </button>
    );
}

type SettingsSectionCardProps = {
    id?: string;
    title: string;
    description: string;
    icon: ReactNode;
    children: ReactNode;
};

function SettingsSectionCard({ id, title, description, icon, children }: SettingsSectionCardProps) {
    return (
        <section id={id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                            <p className="mt-1 text-sm text-slate-500">{description}</p>
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </section>
    );
}

export default function SettingsClient() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [testingLineGroup, setTestingLineGroup] = useState(false);

    // Modal States
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; filename: string }>({ isOpen: false, filename: '' });
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; message: string }>({ isOpen: false, type: 'success', message: '' });
    const customerRegisterLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_CUSTOMER_REGISTER_ID || '';
    const customerRegisterPublicUrl = customerRegisterLiffId
        ? `https://liff.line.me/${customerRegisterLiffId}`
        : (typeof window !== 'undefined' ? `${window.location.origin}/line/customer-register` : '/line/customer-register');
    const repairRequestLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_REPAIR_REQUEST_ID || '';
    const repairRequestPublicUrl = repairRequestLiffId
        ? `https://liff.line.me/${repairRequestLiffId}`
        : (typeof window !== 'undefined' ? `${window.location.origin}/line/repair-request` : '/line/repair-request');

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

    const managerSummaryEnabled = settings['manager_line_summary_enabled'] !== 'false';
    const managerSummarySendTime = settings['manager_line_summary_time'] || '09:00';
    const selectedManagerSummaryTopics = parseManagerSummaryTopics(settings['manager_line_summary_topics']);
    const selectedManagerSummaryRoles = parseManagerSummaryRoles(settings['manager_line_summary_roles']);
    const customerRegisterEnabled = settings['customer_register_enabled'] === 'true';
    const customerRepairRequestEnabled = settings['customer_repair_request_enabled'] === 'true';
    const activeCustomerServiceCount = Number(customerRegisterEnabled) + Number(customerRepairRequestEnabled);
    const lineGroupNotificationsEnabled = settings['line_group_notifications_enabled'] === 'true';
    const lineGroupNotifyEnabled = settings['line_group_notify_enabled'] === 'true';
    const lineGroupTargetIds = parseLineGroupTargetIds(settings['line_group_target_ids']);
    const discoveredLineGroups = parseDiscoveredLineGroups(settings['line_group_registry_json']);

    function scrollToSection(sectionId: string) {
        document.getElementById(sectionId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }

    async function saveLineGroupTargetIds(nextIds: string[]) {
        const normalized = Array.from(
            new Set(
                nextIds
                    .map((value) => value.trim())
                    .filter((value) => value.length > 0),
            ),
        );
        const nextValue = normalized.join('\n');
        setSettings((prev) => ({ ...prev, line_group_target_ids: nextValue }));
        await handleSave('line_group_target_ids', nextValue);
    }

    function toggleLineGroupTarget(targetId: string) {
        const nextIds = lineGroupTargetIds.includes(targetId)
            ? lineGroupTargetIds.filter((id) => id !== targetId)
            : [...lineGroupTargetIds, targetId];

        void saveLineGroupTargetIds(nextIds);
    }

    async function handleTestLineGroup() {
        setTestingLineGroup(true);
        const result = await sendTestLineGroupNotification();
        setTestingLineGroup(false);

        setStatusModal({
            isOpen: true,
            type: result.success ? 'success' : 'error',
            message: result.message || (result.success ? 'ส่งทดสอบสำเร็จ' : 'ส่งทดสอบไม่สำเร็จ'),
        });
    }

    async function saveManagerSummaryTopics(nextTopics: Set<ManagerSummaryTopic>) {
        const orderedTopics = MANAGER_SUMMARY_TOPIC_OPTIONS
            .map((topic) => topic.key)
            .filter((topic) => nextTopics.has(topic));

        if (orderedTopics.length === 0) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                message: 'กรุณาเลือกอย่างน้อย 1 หัวข้อรายงาน',
            });
            return;
        }

        await handleSave('manager_line_summary_topics', orderedTopics.join(','));
    }

    function handleToggleManagerSummaryTopic(topicKey: ManagerSummaryTopic) {
        const nextTopics = new Set(selectedManagerSummaryTopics);
        if (nextTopics.has(topicKey)) {
            if (nextTopics.size === 1) {
                setStatusModal({
                    isOpen: true,
                    type: 'error',
                    message: 'ต้องมีหัวข้อรายงานอย่างน้อย 1 รายการ',
                });
                return;
            }
            nextTopics.delete(topicKey);
        } else {
            nextTopics.add(topicKey);
        }

        void saveManagerSummaryTopics(nextTopics);
    }

    async function saveManagerSummaryRoles(nextRoles: Set<ManagerSummaryRole>) {
        const orderedRoles = MANAGER_SUMMARY_ROLE_OPTIONS
            .map((role) => role.value)
            .filter((role) => nextRoles.has(role));

        if (orderedRoles.length === 0) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                message: 'กรุณาเลือก role ผู้รับอย่างน้อย 1 role',
            });
            return;
        }

        await handleSave('manager_line_summary_roles', orderedRoles.join(','));
    }

    function handleToggleManagerSummaryRole(role: ManagerSummaryRole) {
        const nextRoles = new Set(selectedManagerSummaryRoles);
        if (nextRoles.has(role)) {
            if (nextRoles.size === 1) {
                setStatusModal({
                    isOpen: true,
                    type: 'error',
                    message: 'ต้องมี role ผู้รับอย่างน้อย 1 role',
                });
                return;
            }
            nextRoles.delete(role);
        } else {
            nextRoles.add(role);
        }

        void saveManagerSummaryRoles(nextRoles);
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

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 shadow-sm shadow-cyan-100/60">
                <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr] lg:p-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">System Settings</h2>
                        <p className="mt-2 text-sm text-slate-500">จัดหมวดการตั้งค่าใหม่ให้หาง่ายขึ้น และควบคุมบริการที่หน้าเข้าสู่ระบบได้จากจุดเดียว</p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => scrollToSection('customer-services-section')}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                            >
                                บริการลูกค้า
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection('company-section')}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                            >
                                ข้อมูลบริษัท
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection('notification-section')}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                            >
                                การแจ้งเตือน
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToSection('database-section')}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                            >
                                ฐานข้อมูล
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
                            <div className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">Customer Services</div>
                            <div className="mt-2 text-3xl font-bold text-slate-900">{activeCustomerServiceCount}/2</div>
                            <div className="mt-1 text-sm text-slate-500">ปุ่มที่เปิดใช้งานบนหน้าเข้าสู่ระบบ</div>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-white/90 p-4">
                            <div className="text-xs font-medium uppercase tracking-[0.2em] text-blue-600">Line Summary</div>
                            <div className="mt-2 text-xl font-bold text-slate-900">{managerSummaryEnabled ? 'ON' : 'OFF'}</div>
                            <div className="mt-1 text-sm text-slate-500">เวลาที่ตั้งไว้ {managerSummarySendTime}</div>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-white/90 p-4">
                            <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600">Backups</div>
                            <div className="mt-2 text-3xl font-bold text-slate-900">{backups.length}</div>
                            <div className="mt-1 text-sm text-slate-500">ไฟล์สำรองข้อมูลพร้อมใช้งาน</div>
                        </div>
                    </div>
                </div>
            </section>

            <SettingsSectionCard
                id="customer-services-section"
                title="บริการลูกค้าบนหน้าเข้าสู่ระบบ"
                description="เปิดหรือปิด 2 ปุ่มสำหรับลูกค้าที่แสดงในหน้า Login ได้จากที่นี่"
                icon={<Settings size={20} />}
            >
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">ลงทะเบียนลูกค้า</h3>
                                <p className="mt-1 text-sm text-slate-600">ควบคุมปุ่มลงทะเบียนสำหรับลูกค้าที่หน้าเข้าสู่ระบบ</p>
                            </div>
                            <ToggleSwitch
                                checked={customerRegisterEnabled}
                                ariaLabel="Toggle customer register button"
                                onChange={(checked) => void handleSave('customer_register_enabled', checked ? 'true' : 'false')}
                            />
                        </div>
                        <div className="mt-4 rounded-xl border border-white/80 bg-white/80 p-3 text-sm text-slate-600">
                            <div className="font-medium text-slate-800">URL</div>
                            <div className="mt-1 break-all font-mono text-xs">{customerRegisterPublicUrl}</div>
                        </div>
                        <div className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium text-slate-700">
                            สถานะ: {customerRegisterEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">แจ้งซ่อมออนไลน์</h3>
                                <p className="mt-1 text-sm text-slate-600">ควบคุมปุ่มแจ้งซ่อมออนไลน์สำหรับลูกค้าที่หน้าเข้าสู่ระบบ</p>
                            </div>
                            <ToggleSwitch
                                checked={customerRepairRequestEnabled}
                                ariaLabel="Toggle customer repair request button"
                                onChange={(checked) => void handleSave('customer_repair_request_enabled', checked ? 'true' : 'false')}
                            />
                        </div>
                        <div className="mt-4 rounded-xl border border-white/80 bg-white/80 p-3 text-sm text-slate-600">
                            <div className="font-medium text-slate-800">URL</div>
                            <div className="mt-1 break-all font-mono text-xs">{repairRequestPublicUrl}</div>
                        </div>
                        <div className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium text-slate-700">
                            สถานะ: {customerRepairRequestEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </div>
                    </div>
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                id="quick-tools-section"
                title="ทางลัดการตั้งค่า"
                description="รวมเมนูที่ใช้บ่อยไว้เป็นกลุ่มเดียวเพื่อเข้าไปจัดการต่อได้เร็วขึ้น"
                icon={<Bell size={20} />}
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <QuickAccessCard
                        title="LINE Messaging Users"
                        description="จัดการผู้ใช้ LINE ภายในระบบและผู้อนุมัติ"
                        href="/settings/line-users"
                        badge="Users"
                    />
                    <QuickAccessCard
                        title="LINE Customers"
                        description="ดูรายการลูกค้าที่ลงทะเบียนผ่าน LINE และข้อมูลอ้างอิง"
                        href="/settings/line-customers"
                        badge="Customers"
                    />
                    <QuickAccessCard
                        title="LINE Group Notifications"
                        description="จัดการกลุ่ม LINE ที่ระบบตรวจพบ ตั้งค่าปลายทางการแจ้งเตือน และทดสอบการส่ง"
                        href="/settings/line-groups"
                        badge="LINE Groups"
                    />
                    <QuickAccessCard
                        title="Asset Policy"
                        description="ตั้งค่าหมวดทรัพย์สินและนโยบายที่ใช้ในหน้า Assets"
                        href="/settings/asset-policy"
                        badge="Assets"
                    />
                    <QuickAccessCard
                        title="Storage Cleanup"
                        description="สแกนและจัดการไฟล์รูปที่ไม่ได้อ้างอิงในระบบ"
                        href="/settings/storage-cleanup"
                        badge="Storage"
                    />
                </div>
            </SettingsSectionCard>

            <div id="company-section" className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 space-y-6">
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

                <div id="notification-section" className="flex items-center gap-2 mb-4 pt-4 border-t dark:border-slate-700">
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

                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">สรุปรายงานส่งผ่าน LINE</div>
                            <div className="text-sm text-gray-500">
                                เปิด/ปิด การส่งรายงานรายวัน และกำหนด role ผู้รับ
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                aria-label="Toggle manager line summary"
                                className="sr-only peer"
                                checked={managerSummaryEnabled}
                                onChange={(e) => handleSave('manager_line_summary_enabled', e.target.checked ? 'true' : 'false')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {managerSummaryEnabled && (
                        <div className="space-y-4 pt-4 border-t dark:border-slate-600">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        เวลาในการส่งรายงาน (รายวัน)
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600"
                                        value={managerSummarySendTime}
                                        onChange={(e) => {
                                            const nextTime = e.target.value || '09:00';
                                            setSettings((prev) => ({ ...prev, manager_line_summary_time: nextTime }));
                                            void handleSave('manager_line_summary_time', nextTime);
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        ใช้เวลาไทย (Asia/Bangkok) เช่น 09:00
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    ส่งให้ role
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {MANAGER_SUMMARY_ROLE_OPTIONS.map((role) => {
                                        const checked = selectedManagerSummaryRoles.has(role.value);
                                        return (
                                            <label key={role.value} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1"
                                                    checked={checked}
                                                    onChange={() => handleToggleManagerSummaryRole(role.value)}
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-200">{role.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    หัวข้อที่ต้องการส่ง
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {MANAGER_SUMMARY_TOPIC_OPTIONS.map((topic) => {
                                        const checked = selectedManagerSummaryTopics.has(topic.key);
                                        return (
                                            <label key={topic.key} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1"
                                                    checked={checked}
                                                    onChange={() => handleToggleManagerSummaryTopic(topic.key)}
                                                />
                                                <span>
                                                    <span className="block text-sm text-gray-700 dark:text-gray-200 font-medium">{topic.label}</span>
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400">{topic.description}</span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="font-medium text-slate-900">แจ้งเตือนเข้ากลุ่ม LINE</div>
                            <div className="mt-1 text-sm text-slate-500">
                                ใช้ส่งข้อความแจ้งเตือนภาพรวมของระบบไปยังกลุ่มหรือห้องแชต LINE โดยรองรับ Group ID / Room ID และ LINE Notify token แบบเสริม
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = '/settings/line-groups';
                                }}
                                className="inline-flex items-center rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                            >
                                เปิดหน้าจัดการกลุ่ม
                            </button>
                            <span className="text-sm font-medium text-slate-600">
                                {lineGroupNotificationsEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                            <ToggleSwitch
                                checked={lineGroupNotificationsEnabled}
                                ariaLabel="Toggle LINE group notifications"
                                onChange={(checked) => void handleSave('line_group_notifications_enabled', checked ? 'true' : 'false')}
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
                        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-medium text-slate-800">ปลายทาง Group ID / Room ID</div>
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                    {lineGroupTargetIds.length} ปลายทาง
                                </span>
                            </div>
                            <textarea
                                rows={5}
                                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={settings['line_group_target_ids'] || ''}
                                onChange={(e) => setSettings((prev) => ({ ...prev, line_group_target_ids: e.target.value }))}
                                onBlur={(e) => void handleSave('line_group_target_ids', e.target.value)}
                                placeholder={'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                            />
                            <p className="mt-2 text-xs text-slate-500">
                                กรอกได้หลายรายการ โดยคั่นด้วยขึ้นบรรทัดใหม่ หรือเครื่องหมายคอมมา
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                            <div className="text-sm font-medium text-slate-800">ทดสอบการส่งข้อความ</div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                ใช้ตรวจสอบว่าบอทมีสิทธิ์ส่งข้อความเข้ากลุ่มปลายทางที่ตั้งค่าไว้แล้ว
                            </p>
                            <button
                                type="button"
                                onClick={() => void handleTestLineGroup()}
                                disabled={testingLineGroup || !lineGroupNotificationsEnabled}
                                className="mt-4 inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {testingLineGroup ? 'กำลังส่งทดสอบ...' : 'ส่งข้อความทดสอบเข้ากลุ่ม'}
                            </button>

                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                วิธีใช้งาน:
                                <div className="mt-1">1. เชิญ LINE Bot ของระบบเข้ากลุ่ม</div>
                                <div className="mt-1">2. ส่งข้อความในกลุ่มอย่างน้อย 1 ครั้ง</div>
                                <div className="mt-1">3. นำ Group ID / Room ID ที่ระบบเจอมาใส่เป็นปลายทาง</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-slate-800">LINE Notify token (เสริม)</div>
                                    <p className="mt-1 text-xs text-slate-500">ใช้เป็นช่องทางสำรอง หากต้องการส่งเข้ากลุ่มผ่าน token ด้วย</p>
                                </div>
                                <ToggleSwitch
                                    checked={lineGroupNotifyEnabled}
                                    ariaLabel="Toggle LINE Notify fallback"
                                    onChange={(checked) => void handleSave('line_group_notify_enabled', checked ? 'true' : 'false')}
                                />
                            </div>
                            <input
                                type="text"
                                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={settings['line_group_notify_token'] || ''}
                                onChange={(e) => setSettings((prev) => ({ ...prev, line_group_notify_token: e.target.value }))}
                                onBlur={(e) => void handleSave('line_group_notify_token', e.target.value)}
                                placeholder="LINE Notify token (optional)"
                            />
                        </div>

                        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-slate-800">กลุ่มที่ระบบตรวจพบจาก Webhook</div>
                                    <p className="mt-1 text-xs text-slate-500">รายการนี้จะเพิ่มอัตโนมัติเมื่อบอทอยู่ในกลุ่ม/ห้อง และมี event เข้ามา</p>
                                </div>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    {discoveredLineGroups.length} รายการ
                                </span>
                            </div>

                            <div className="mt-3 space-y-2">
                                {discoveredLineGroups.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                        ยังไม่พบ group/room จาก webhook
                                    </div>
                                ) : (
                                    discoveredLineGroups.map((group) => {
                                        const isSelected = lineGroupTargetIds.includes(group.id);
                                        return (
                                            <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-800">
                                                        {group.name || '(ไม่มีชื่อกลุ่ม)'}
                                                    </div>
                                                    <div className="mt-1 font-mono text-xs text-slate-500">{group.id}</div>
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {group.sourceType} • ล่าสุด {group.lastEventAt ? new Date(group.lastEventAt).toLocaleString('th-TH') : '-'}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLineGroupTarget(group.id)}
                                                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${isSelected
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'
                                                        }`}
                                                >
                                                    {isSelected ? 'เลือกเป็นปลายทางแล้ว' : 'ใช้เป็นปลายทาง'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden" onClick={() => window.location.href = '/settings/line-users'}>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            LINE Messaging API Users <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-200">New</span>
                        </div>
                        <div className="text-sm text-gray-500">จัดการผู้ใช้ LINE และตั้งค่าผู้อนุมัติ (Approvers) และแผนก</div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">Manage &rarr;</div>
                </div>

                <div className="hidden" onClick={() => window.location.href = '/settings/line-customers'}>
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

                <div
                    className="hidden"
                    onClick={() => window.location.href = '/settings/asset-policy'}
                >
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            Asset Category Settings
                            <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 border border-indigo-200">
                                New
                            </span>
                        </div>
                        <div className="text-sm text-gray-500">
                            จัดการหมวดหมู่สินทรัพย์ที่ใช้ในทะเบียนทรัพย์สินและฟอร์มเพิ่มทรัพย์สิน
                        </div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">Manage &rarr;</div>
                </div>

                <div
                    className="hidden"
                    onClick={() => window.location.href = '/settings/storage-cleanup'}
                >
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            Storage Cleanup
                            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 border border-amber-200">
                                New
                            </span>
                        </div>
                        <div className="text-sm text-gray-500">
                            สแกนไฟล์รูปค้างใน uploads และลบไฟล์ที่ไม่ถูกอ้างอิงจากฐานข้อมูล
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
            <div id="database-section" className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
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
                            <li><strong>Apr 2026 - Customer Completion Notification:</strong> เมื่อปิดงานซ่อมสำเร็จ ระบบสามารถส่งข้อความแจ้งผลไปยังลูกค้าทาง LINE ได้อัตโนมัติ.</li>
                            <li><strong>Apr 2026 - Customer Rating for KPI (Optional):</strong> เพิ่มระบบให้ลูกค้าประเมินงานหลังจบงาน (1-5 ดาว + ความคิดเห็น) และสามารถเปิด/ปิดได้ใน Settings.</li>
                            <li><strong>Mar 2026 - Maintenance Reports:</strong> เพิ่ม Consumption / Scrap / Technician Usage, Daily Trend, Pareto 80/20 และ Drilldown.</li>
                            <li><strong>Mar 2026 - Workflow & Navigation:</strong> ปรับปรุงการเปิดงานซ่อมซ้ำ (Reopened) และการเปิดงานผ่าน Deep Link จาก Reports.</li>
                            <li><strong>General:</strong> ปรับปรุงความเสถียรและประสบการณ์ใช้งานต่อเนื่องในหน้าซ่อมบำรุง.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}


