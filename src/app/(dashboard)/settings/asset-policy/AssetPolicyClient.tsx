'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Settings2, ShieldCheck } from 'lucide-react';
import { getAssetPolicySettings, updateAssetPolicySettings } from '@/actions/assetPolicyActions';
import { ASSET_POLICY_DEFAULTS, type AssetPolicy, type AssetPolicyKey } from '@/lib/asset-policy';

type AlertState = {
    type: 'success' | 'error';
    text: string;
} | null;

const BOOLEAN_FIELDS: Array<{ key: AssetPolicyKey; label: string; hint: string }> = [
    {
        key: 'require_serial',
        label: 'บังคับกรอก Serial Number',
        hint: 'ไม่อนุญาตให้สร้างทรัพย์สินหากไม่ได้กรอก Serial Number',
    },
    {
        key: 'require_custodian_on_in_use',
        label: 'บังคับผู้รับผิดชอบเมื่อเริ่มใช้งาน',
        hint: 'ไม่สามารถเปลี่ยนสถานะเป็นใช้งานได้ หากยังไม่ระบุผู้รับผิดชอบ',
    },
    {
        key: 'transfer_requires_approval',
        label: 'การโอนย้ายต้องได้รับอนุมัติ',
        hint: 'ทุกการโอนย้ายต้องผ่านการอนุมัติก่อนเสร็จสิ้น',
    },
    {
        key: 'disposal_requires_dual_approval',
        label: 'การจำหน่ายต้องอนุมัติ 2 ชั้น',
        hint: 'ต้องมีผู้อนุมัติ 2 คนก่อนจำหน่ายทรัพย์สิน',
    },
];

const SLA_FIELDS: Array<{ key: AssetPolicyKey; label: string; suffix: string; min: number; step: number }> = [
    { key: 'approval_sla_hours', label: 'SLA การอนุมัติ', suffix: 'ชั่วโมง', min: 1, step: 1 },
    { key: 'transfer_sla_hours', label: 'SLA การโอนย้าย', suffix: 'ชั่วโมง', min: 1, step: 1 },
    { key: 'repair_sla_critical_hours', label: 'SLA งานซ่อมเร่งด่วน', suffix: 'ชั่วโมง', min: 1, step: 1 },
    { key: 'repair_sla_normal_hours', label: 'SLA งานซ่อมปกติ', suffix: 'ชั่วโมง', min: 1, step: 1 },
];

const ALERT_FIELDS: Array<{ key: AssetPolicyKey; label: string; suffix: string; min: number; step: number }> = [
    { key: 'scrap_rate_threshold_pct', label: 'เกณฑ์อัตราของเสีย', suffix: '%', min: 0, step: 0.1 },
    { key: 'repair_frequency_threshold', label: 'เกณฑ์ความถี่การซ่อม', suffix: 'ครั้ง', min: 1, step: 1 },
    { key: 'warranty_expiry_alert_days', label: 'แจ้งเตือนก่อนหมดประกัน', suffix: 'วัน', min: 1, step: 1 },
    { key: 'stocktake_accuracy_min_pct', label: 'ความแม่นยำขั้นต่ำของการตรวจนับ', suffix: '%', min: 0, step: 0.1 },
];

export default function AssetPolicyClient() {
    const [form, setForm] = useState<AssetPolicy>(ASSET_POLICY_DEFAULTS);
    const [initialForm, setInitialForm] = useState<AssetPolicy>(ASSET_POLICY_DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState<AlertState>(null);

    useEffect(() => {
        void loadPolicy();
    }, []);

    const hasChanges = useMemo(() => {
        return JSON.stringify(form) !== JSON.stringify(initialForm);
    }, [form, initialForm]);

    const setField = <K extends AssetPolicyKey>(key: K, value: AssetPolicy[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    async function loadPolicy() {
        setLoading(true);
        setAlert(null);
        const result = await getAssetPolicySettings();

        if (result.success && result.data) {
            setForm(result.data);
            setInitialForm(result.data);
        } else {
            setAlert({ type: 'error', text: result.error || 'ไม่สามารถโหลดการตั้งค่านโยบายทรัพย์สินได้' });
        }

        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        setAlert(null);

        const result = await updateAssetPolicySettings(form);

        if (result.success && result.data) {
            setForm(result.data);
            setInitialForm(result.data);
            setAlert({ type: 'success', text: 'บันทึกนโยบายทรัพย์สินเรียบร้อยแล้ว' });
        } else {
            setAlert({ type: 'error', text: result.error || 'ไม่สามารถบันทึกการตั้งค่านโยบายทรัพย์สินได้' });
        }

        setSaving(false);
    }

    function handleResetDefault() {
        setForm(ASSET_POLICY_DEFAULTS);
        setAlert(null);
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    กำลังโหลดการตั้งค่านโยบายทรัพย์สิน...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                        <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">นโยบายทรัพย์สิน</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            กำหนดนโยบายพื้นฐานสำหรับการลงทะเบียน วงจรชีวิต SLA และเกณฑ์การแจ้งเตือนของทรัพย์สิน
                        </p>
                    </div>
                </div>

                {alert && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${alert.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                    >
                        {alert.text}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        บันทึกนโยบาย
                    </button>
                    <button
                        type="button"
                        onClick={handleResetDefault}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        รีเซ็ตค่าเริ่มต้น
                    </button>
                    <button
                        type="button"
                        onClick={() => void loadPolicy()}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        โหลดใหม่
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {hasChanges ? 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก' : 'แบบฟอร์มตรงกับค่าพื้นฐานล่าสุด'}
                    </span>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">การลงทะเบียนและการควบคุม</h2>
                    </div>

                    <div className="space-y-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">รูปแบบรหัสทรัพย์สิน</span>
                            <input
                                type="text"
                                value={form.asset_code_format}
                                onChange={(event) => setField('asset_code_format', event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                placeholder="AST-{YYYY}-{00000}"
                            />
                        </label>

                        {BOOLEAN_FIELDS.map((field) => (
                            <label key={field.key} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                <div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{field.label}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{field.hint}</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={Boolean(form[field.key])}
                                    onChange={(event) => setField(field.key, event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </label>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">ระดับการให้บริการ (SLA)</h2>
                    <div className="space-y-4">
                        {SLA_FIELDS.map((field) => (
                            <label key={field.key} className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</span>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        min={field.min}
                                        step={field.step}
                                        value={Number(form[field.key])}
                                        onChange={(event) =>
                                            setField(field.key, Number(event.target.value || 0))
                                        }
                                        className="w-full rounded-l-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                    />
                                    <span className="rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                        {field.suffix}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">เกณฑ์การแจ้งเตือน</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {ALERT_FIELDS.map((field) => (
                        <label key={field.key} className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</span>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    min={field.min}
                                    step={field.step}
                                    value={Number(form[field.key])}
                                    onChange={(event) =>
                                        setField(field.key, Number(event.target.value || 0))
                                    }
                                    className="w-full rounded-l-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                />
                                <span className="rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {field.suffix}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </section>
        </div>
    );
}
