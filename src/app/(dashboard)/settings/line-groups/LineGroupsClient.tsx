'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    BellRing,
    CheckCircle2,
    Copy,
    MessageCircleMore,
    RefreshCw,
    Send,
    Users,
} from 'lucide-react';
import { getSystemSettings, sendTestLineGroupNotification, updateSystemSetting } from '@/actions/settingActions';

type DiscoveredLineGroup = {
    id: string;
    name: string | null;
    sourceType: 'group' | 'room';
    lastEventAt: string;
};

type NoticeState = {
    type: 'success' | 'error';
    message: string;
} | null;

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

function ToggleSwitch({
    checked,
    onChange,
    ariaLabel,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel: string;
}) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                aria-label={ariaLabel}
                className="peer sr-only"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
        </label>
    );
}

function SummaryCard({
    title,
    value,
    helper,
    tone,
}: {
    title: string;
    value: string;
    helper: string;
    tone: string;
}) {
    return (
        <div className={`rounded-3xl border p-5 shadow-sm ${tone}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</div>
            <div className="mt-3 text-3xl font-bold">{value}</div>
            <div className="mt-2 text-sm opacity-80">{helper}</div>
        </div>
    );
}

export default function LineGroupsClient() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [notice, setNotice] = useState<NoticeState>(null);

    async function loadData() {
        setLoading(true);
        const result = await getSystemSettings();
        if (result.success && result.data) {
            setSettings(result.data);
        } else {
            setNotice({
                type: 'error',
                message: 'ยังโหลดค่าตั้งค่า LINE กลุ่มไม่สำเร็จ',
            });
        }
        setLoading(false);
    }

    useEffect(() => {
        void loadData();
    }, []);

    async function handleSave(key: string, value: string) {
        setSavingKey(key);
        const result = await updateSystemSetting(key, value);
        if (result.success) {
            setSettings((prev) => ({ ...prev, [key]: value }));
            setNotice({
                type: 'success',
                message: 'บันทึกค่าตั้งค่าเรียบร้อยแล้ว',
            });
        } else {
            setNotice({
                type: 'error',
                message: result.error || 'บันทึกค่าตั้งค่าไม่สำเร็จ',
            });
        }
        setSavingKey(null);
    }

    async function saveTargetIds(nextIds: string[]) {
        const normalized = Array.from(new Set(nextIds.map((value) => value.trim()).filter(Boolean)));
        await handleSave('line_group_target_ids', normalized.join('\n'));
    }

    async function handleToggleTarget(id: string) {
        const nextIds = selectedTargetIds.includes(id)
            ? selectedTargetIds.filter((value) => value !== id)
            : [...selectedTargetIds, id];

        setSettings((prev) => ({
            ...prev,
            line_group_target_ids: nextIds.join('\n'),
        }));
        await saveTargetIds(nextIds);
    }

    async function handleCopy(value: string) {
        try {
            await navigator.clipboard.writeText(value);
            setNotice({
                type: 'success',
                message: 'คัดลอก ID แล้ว',
            });
        } catch (error) {
            console.error('Copy failed:', error);
            setNotice({
                type: 'error',
                message: 'คัดลอก ID ไม่สำเร็จ',
            });
        }
    }

    async function handleTest() {
        setTesting(true);
        const result = await sendTestLineGroupNotification();
        setTesting(false);
        setNotice({
            type: result.success ? 'success' : 'error',
            message: result.message || (result.success ? 'ส่งข้อความทดสอบสำเร็จ' : 'ส่งข้อความทดสอบไม่สำเร็จ'),
        });
    }

    const notificationsEnabled = settings['line_group_notifications_enabled'] === 'true';
    const notifyFallbackEnabled = settings['line_group_notify_enabled'] === 'true';
    const selectedTargetIds = useMemo(
        () => parseLineGroupTargetIds(settings['line_group_target_ids']),
        [settings],
    );
    const discoveredGroups = useMemo(
        () => parseDiscoveredLineGroups(settings['line_group_registry_json']),
        [settings],
    );
    const selectedDiscoveredCount = discoveredGroups.filter((group) => selectedTargetIds.includes(group.id)).length;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-4">
                            <Link
                                href="/settings"
                                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-sky-700"
                            >
                                <ArrowLeft size={16} />
                                กลับไปหน้า Settings
                            </Link>
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
                                    <MessageCircleMore size={16} />
                                    LINE Group Control Center
                                </div>
                                <h1 className="mt-4 text-3xl font-bold text-slate-900">ตั้งค่าการแจ้งเตือนเข้ากลุ่ม LINE</h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                                    หน้านี้ใช้สำหรับจัดการปลายทางแจ้งเตือนของระบบทั้งหมดที่ส่งเข้ากลุ่มหรือห้องแชต LINE
                                    เลือกกลุ่มที่ระบบพบจาก webhook, ตั้งค่า Group ID / Room ID เอง, เปิดช่องทางสำรองด้วย LINE Notify และทดสอบส่งข้อความได้ในหน้าเดียว
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void loadData()}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                รีเฟรช
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleTest()}
                                disabled={testing || loading || !notificationsEnabled}
                                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send size={16} />
                                {testing ? 'กำลังส่งข้อความทดสอบ...' : 'ส่งข้อความทดสอบ'}
                            </button>
                        </div>
                    </div>
                </div>

                {notice ? (
                    <div
                        className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                            notice.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                    >
                        {notice.message}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="ปลายทางที่เลือก"
                        value={String(selectedTargetIds.length)}
                        helper="จำนวน Group ID / Room ID ที่จะรับแจ้งเตือน"
                        tone="border-sky-200 bg-sky-50 text-sky-900"
                    />
                    <SummaryCard
                        title="กลุ่มที่ระบบพบ"
                        value={String(discoveredGroups.length)}
                        helper="รายการที่บอทตรวจพบจาก webhook"
                        tone="border-violet-200 bg-violet-50 text-violet-900"
                    />
                    <SummaryCard
                        title="ระบบแจ้งเตือน"
                        value={notificationsEnabled ? 'เปิด' : 'ปิด'}
                        helper="สถานะ master switch ของการส่งเข้ากลุ่ม"
                        tone="border-emerald-200 bg-emerald-50 text-emerald-900"
                    />
                    <SummaryCard
                        title="Fallback"
                        value={notifyFallbackEnabled ? 'ON' : 'OFF'}
                        helper="สถานะส่งซ้ำผ่าน LINE Notify"
                        tone="border-amber-200 bg-amber-50 text-amber-900"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                                    <BellRing size={14} />
                                    Main Routing
                                </div>
                                <h2 className="mt-4 text-xl font-semibold text-slate-900">กำหนดปลายทางแจ้งเตือน</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    เปิดหรือปิดการแจ้งเตือนเข้ากลุ่ม LINE, ระบุปลายทางเองหลายรายการ และกำหนด fallback token ได้จากส่วนนี้
                                </p>
                            </div>
                            <ToggleSwitch
                                checked={notificationsEnabled}
                                ariaLabel="Toggle LINE group notifications"
                                onChange={(checked) => void handleSave('line_group_notifications_enabled', checked ? 'true' : 'false')}
                            />
                        </div>

                        <div className="mt-6 grid gap-5">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Group ID / Room ID</div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            ใส่ได้หลายรายการ แยกด้วยการขึ้นบรรทัดใหม่หรือเครื่องหมายคอมมา
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                        {selectedTargetIds.length} ปลายทาง
                                    </span>
                                </div>
                                <textarea
                                    rows={7}
                                    value={settings['line_group_target_ids'] || ''}
                                    onChange={(event) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            line_group_target_ids: event.target.value,
                                        }))
                                    }
                                    onBlur={(event) => void handleSave('line_group_target_ids', event.target.value)}
                                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                    placeholder={'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nRxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                                />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">LINE Notify fallback</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                ใช้เป็นช่องทางสำรองกรณีต้องการส่งผ่าน token เพิ่มเติม
                                            </div>
                                        </div>
                                        <ToggleSwitch
                                            checked={notifyFallbackEnabled}
                                            ariaLabel="Toggle LINE Notify fallback"
                                            onChange={(checked) => void handleSave('line_group_notify_enabled', checked ? 'true' : 'false')}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={settings['line_group_notify_token'] || ''}
                                        onChange={(event) =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                line_group_notify_token: event.target.value,
                                            }))
                                        }
                                        onBlur={(event) => void handleSave('line_group_notify_token', event.target.value)}
                                        placeholder="LINE Notify token (optional)"
                                        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                    />
                                </div>

                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                                    <div className="text-sm font-semibold text-slate-900">วิธีให้ระบบพบ Group ID อัตโนมัติ</div>
                                    <ol className="mt-3 space-y-2 text-sm text-slate-600">
                                        <li>1. เชิญ LINE Bot ของระบบเข้ากลุ่มหรือห้องแชต</li>
                                        <li>2. ส่งข้อความในกลุ่มนั้นอย่างน้อย 1 ครั้ง</li>
                                        <li>3. กลับมาหน้านี้แล้วกดรีเฟรช</li>
                                        <li>4. กดเลือกกลุ่มที่ต้องการเป็นปลายทางได้ทันที</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                                    <Users size={14} />
                                    Webhook Discovery
                                </div>
                                <h2 className="mt-4 text-xl font-semibold text-slate-900">กลุ่มที่ระบบตรวจพบ</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    ดึงจาก webhook ที่บอทเจอจริงในระบบ ช่วยลดการกรอก ID เองและทำให้เลือกปลายทางได้เร็วขึ้น
                                </p>
                            </div>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                เลือกแล้ว {selectedDiscoveredCount}/{discoveredGroups.length}
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {loading ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    กำลังโหลดข้อมูลกลุ่ม LINE...
                                </div>
                            ) : discoveredGroups.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    ยังไม่พบ group หรือ room จาก webhook
                                </div>
                            ) : (
                                discoveredGroups.map((group) => {
                                    const isSelected = selectedTargetIds.includes(group.id);

                                    return (
                                        <div
                                            key={group.id}
                                            className={`rounded-2xl border p-4 transition ${
                                                isSelected
                                                    ? 'border-emerald-200 bg-emerald-50/70'
                                                    : 'border-slate-200 bg-slate-50/70'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="text-base font-semibold text-slate-900">
                                                            {group.name || 'Unnamed LINE group'}
                                                        </div>
                                                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                                                            {group.sourceType}
                                                        </span>
                                                        {isSelected ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                                                <CheckCircle2 size={12} />
                                                                ใช้งานอยู่
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-3 rounded-xl border border-white bg-white px-3 py-2 font-mono text-xs text-slate-500">
                                                        {group.id}
                                                    </div>
                                                    <div className="mt-2 text-xs text-slate-400">
                                                        ล่าสุด {group.lastEventAt ? new Date(group.lastEventAt).toLocaleString('th-TH') : '-'}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleCopy(group.id)}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                                                    >
                                                        <Copy size={14} />
                                                        คัดลอก ID
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleToggleTarget(group.id)}
                                                        disabled={savingKey === 'line_group_target_ids'}
                                                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                                                            isSelected
                                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                                : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'
                                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                                    >
                                                        {isSelected ? 'ยกเลิกปลายทางนี้' : 'ใช้เป็นปลายทาง'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
