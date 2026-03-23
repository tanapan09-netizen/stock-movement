'use client';

/**
 * InventoryAuditPage — Production-grade with full anti-fraud controls
 *
 * Security layers:
 * 1. Role-based access guard (auditor/supervisor/admin roles via Server Action)
 * 2. Dual-control: auditor name locked from session; approver verified via PIN from DB
 * 3. Edit tracking: first_entered_at, last_edited_at, edit_count, prev_count per item
 * 4. Immutable save: write-once; is_locked flag set server-side after save
 * 5. High-variance threshold alerts (absolute + percentage)
 * 6. Session auto-lock after inactivity
 * 7. Audit Trail tab: read-only log of every action with IP + timestamp
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ClipboardCheck, Search, AlertTriangle, Save,
    Loader2, Printer, History, Lock, Shield, Eye, EyeOff,
    AlertCircle, Clock, User, X, RefreshCw, FileWarning,
    ShieldCheck, Activity,
} from 'lucide-react';
import {
    saveInventoryAudit,
    getInventoryAuditHistory,
    getProductsForAudit,
    getAuditTrailLog,
    verifyApproverPin,
    getCurrentUserRole,
} from '@/actions/inventoryAuditActions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type UserRole = 'auditor' | 'supervisor' | 'admin' | 'viewer';

interface CurrentUser {
    user_id: string;
    name: string;
    role: UserRole;
    employee_id: string;
}

interface Product {
    p_id: string;
    p_name: string;
    system_count: number;
    actual_count: number | null;
    variance: number;
    status: 'pending' | 'matched' | 'variance';
    first_entered_at: string | null;
    last_edited_at: string | null;
    edit_count: number;
    prev_count: number | null;
}

interface AuditRecord {
    audit_id: number;
    audit_number: string | null;
    audit_date: Date | null;
    total_items: number | null;
    total_discrepancy: number | null;
    completed_by: string | null;
    approved_by: string | null;
    created_at: Date;
    is_locked: boolean;
}

interface TrailEntry {
    trail_id: number;
    action: 'enter' | 'edit' | 'save' | 'approve' | 'view';
    p_id: string | null;
    p_name: string | null;
    old_value: number | null;
    new_value: number | null;
    performed_by: string;
    performed_at: string;
    ip_address: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const HIGH_VARIANCE_ABS  = 10;
const HIGH_VARIANCE_PCT  = 20;
const SESSION_TIMEOUT_MIN = 30;
const ALLOWED_ROLES: UserRole[] = ['auditor', 'supervisor', 'admin'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtThai = (d: Date | string | null) =>
    d ? new Date(d).toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }) : '—';

const isHighRisk = (p: Product) => {
    if (p.actual_count === null) return false;
    const abs = Math.abs(p.variance);
    const pct = p.system_count > 0 ? (abs / p.system_count) * 100 : 0;
    return abs >= HIGH_VARIANCE_ABS || pct >= HIGH_VARIANCE_PCT;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-gray-500 text-sm max-w-xs">
                คุณไม่มีสิทธิ์ใช้งานหน้าตรวจนับสต็อก<br />
                กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์
            </p>
        </div>
    );
}

function SessionLockOverlay({ onUnlock }: { onUnlock: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-gray-900/85 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Session หมดอายุ</h2>
                <p className="text-gray-500 text-sm mb-6">
                    ระบบล็อกอัตโนมัติหลังจากไม่มีการใช้งาน {SESSION_TIMEOUT_MIN} นาที<br />
                    ข้อมูลที่กรอกไว้ยังคงอยู่
                </p>
                <button onClick={onUnlock}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
                    ปลดล็อกและดำเนินการต่อ
                </button>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
        </div>
    );
}

function ConfirmSaveDialog({
    open, auditor, approver, approverPin, setApproverPin,
    stats, editedItems,
    onConfirm, onCancel, verifying,
}: {
    open: boolean;
    auditor: string;
    approver: string;
    approverPin: string;
    setApproverPin: (v: string) => void;
    stats: { counted: number; total: number };
    editedItems: Product[];
    onConfirm: () => void;
    onCancel: () => void;
    verifying: boolean;
}) {
    const [showPin, setShowPin] = useState(false);
    if (!open) return null;
    const highRiskItems: Product[] = [];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-5 border-b bg-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">ยืนยันบันทึกผลตรวจนับ</h3>
                            <p className="text-gray-500 text-xs mt-0.5">
                                ข้อมูลจะถูก lock และไม่สามารถแก้ไขได้ภายหลัง
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                        <Row label="ผู้ตรวจนับ"       value={auditor} />
                        <Row label="ผู้อนุมัติ"        value={approver} />
                        <Row label="รายการที่ตรวจ"     value={`${stats.counted}/${stats.total} รายการ`} />
                        {editedItems.length > 0 && (
                            <div className="flex justify-between text-amber-700 pt-1 border-t border-amber-100">
                                <span className="flex items-center gap-1">
                                    <FileWarning className="w-3.5 h-3.5" /> รายการที่แก้ไข
                                </span>
                                <span className="font-bold">{editedItems.length} รายการ</span>
                            </div>
                        )}
                    </div>

                    {/* High-risk list */}
                    {false && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-red-700 font-bold text-sm mb-2">
                                ⚠ พบรายการความเสี่ยงสูง {highRiskItems.length} รายการ
                            </p>
                            <ul className="text-red-600 text-xs space-y-1">
                                {highRiskItems.slice(0, 6).map(p => (
                                    <li key={p.p_id} className="flex justify-between">
                                        <span className="truncate max-w-[60%]">{p.p_name}</span>
                                        <span className="font-semibold">
                                            {p.variance > 0 ? '+' : ''}{p.variance}
                                            {p.system_count > 0 &&
                                                ` (${Math.round(Math.abs(p.variance) / p.system_count * 100)}%)`}
                                        </span>
                                    </li>
                                ))}
                                {highRiskItems.length > 6 &&
                                    <li className="text-red-400">และอีก {highRiskItems.length - 6} รายการ</li>}
                            </ul>
                        </div>
                    )}

                    {/* PIN input */}
                    <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                        <p className="text-green-800 text-sm font-semibold mb-1 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> ยืนยันตัวตนผู้อนุมัติ
                        </p>
                        <p className="text-green-700 text-xs mb-3">
                            ผู้อนุมัติ <strong>{approver}</strong> กรุณาใส่ PIN เพื่อลงนามอนุมัติ
                        </p>
                        <div className="relative">
                            <input
                                type={showPin ? 'text' : 'password'}
                                value={approverPin}
                                onChange={e => setApproverPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="PIN ผู้อนุมัติ (4–8 หลัก)"
                                autoFocus
                                className="w-full p-2.5 pr-10 border border-green-300 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none bg-white"
                            />
                            <button type="button" onClick={() => setShowPin(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <p className="text-gray-400 text-xs text-center">
                        การบันทึกนี้จะถูก log พร้อม IP address, timestamp และ checksum — ไม่สามารถย้อนกลับได้
                    </p>
                </div>

                <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                    <button onClick={onCancel} disabled={verifying}
                        className="px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-100 font-medium transition text-sm">
                        ยกเลิก
                    </button>
                    <button onClick={onConfirm}
                        disabled={approverPin.length < 4 || verifying}
                        className="px-6 py-2 rounded-xl text-white font-bold transition text-sm flex items-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700">
                        {verifying
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังยืนยัน...</>
                            : <><Save className="w-4 h-4" /> อนุมัติและบันทึก</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ActionBadge({ action }: { action: TrailEntry['action'] }) {
    const map: Record<TrailEntry['action'], { label: string; cls: string }> = {
        enter:   { label: 'กรอกข้อมูล', cls: 'bg-blue-100 text-blue-700' },
        edit:    { label: 'แก้ไข',       cls: 'bg-amber-100 text-amber-700' },
        save:    { label: 'บันทึก',      cls: 'bg-emerald-100 text-emerald-700' },
        approve: { label: 'อนุมัติ',     cls: 'bg-purple-100 text-purple-700' },
        view:    { label: 'ดูข้อมูล',   cls: 'bg-gray-100 text-gray-500' },
    };
    const { label, cls } = map[action] ?? { label: action, cls: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryAuditPage() {

    // Auth
    const [currentUser, setCurrentUser]   = useState<CurrentUser | null>(null);
    const [authLoading, setAuthLoading]   = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [history, setHistory]   = useState<AuditRecord[]>([]);
    const [trailLog, setTrailLog] = useState<TrailEntry[]>([]);
    const [loading, setLoading]   = useState(true);

    // UI
    const [search, setSearch]       = useState('');
    const [filter, setFilter]       = useState<'all' | 'pending' | 'counted'>('all');
    const [activeTab, setActiveTab] = useState<'audit' | 'history' | 'trail'>('audit');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg]     = useState('');
    const [lastSavedReport, setLastSavedReport] = useState<{
        auditNumber: string;
        auditDate: string;
        auditorName: string;
        auditorEmployeeId: string;
        approverName: string;
        savedAt: string;
        items: Product[];
    } | null>(null);

    // Form
    const [auditDate, setAuditDate]   = useState(new Date().toISOString().split('T')[0]);
    const [approver, setApprover]     = useState('');
    const [approverPin, setApproverPin] = useState('');

    // Dialog / save
    const [showConfirm, setShowConfirm] = useState(false);
    const [verifying, setVerifying]     = useState(false);
    const [saving, setSaving]           = useState(false);

    // Session
    const [sessionStart]                    = useState(new Date());
    const [sessionLocked, setSessionLocked] = useState(false);
    const [sessionWarning, setSessionWarning] = useState(false);
    const lastActivityRef                   = useRef(Date.now());

    // ── Auth check ──────────────────────────────────────────────────────────
    useEffect(() => {
        getCurrentUserRole().then((res: Awaited<ReturnType<typeof getCurrentUserRole>>) => {
            if (!res.success || !res.user) {
                setAccessDenied(true);
            } else if (!ALLOWED_ROLES.includes(res.user.role as UserRole)) {
                setAccessDenied(true);
            } else {
                setCurrentUser(res.user as CurrentUser);
            }
            setAuthLoading(false);
        });
    }, []);

    // ── Load products ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;
        getProductsForAudit()
            .then(res => {
                setProducts((res.data || []).map(p => ({
                    p_id: p.p_id,
                    p_name: p.p_name,
                    system_count: p.p_count ?? 0,
                    actual_count: null,
                    variance: 0,
                    status: 'pending',
                    first_entered_at: null,
                    last_edited_at: null,
                    edit_count: 0,
                    prev_count: null,
                })));
            })
            .catch(() => setErrorMsg('ไม่สามารถโหลดข้อมูลสินค้าได้'))
            .finally(() => setLoading(false));
    }, [currentUser]);

    // ── Load history / trail on tab switch ──────────────────────────────────
    useEffect(() => {
        if (activeTab === 'history')
            getInventoryAuditHistory(20).then((r: Awaited<ReturnType<typeof getInventoryAuditHistory>>) => { if (r.success) setHistory(r.data); });
        if (activeTab === 'trail')
            getAuditTrailLog(50).then((r: Awaited<ReturnType<typeof getAuditTrailLog>>) => { if (r.success) setTrailLog(r.data); });
    }, [activeTab]);

    // ── Session timeout ──────────────────────────────────────────────────────
    useEffect(() => {
        const tick = setInterval(() => {
            const idle = (Date.now() - lastActivityRef.current) / 60000;
            if (idle >= SESSION_TIMEOUT_MIN)           setSessionLocked(true);
            else if (idle >= SESSION_TIMEOUT_MIN - 5)  setSessionWarning(true);
            else                                       setSessionWarning(false);
        }, 30_000);
        return () => clearInterval(tick);
    }, []);

    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        setSessionWarning(false);
    }, []);

    // ── Update count with full edit tracking ────────────────────────────────
    const updateCount = useCallback((id: string, raw: string) => {
        if (sessionLocked) return;
        resetActivity();
        const count = parseInt(raw);
        setProducts(prev => prev.map(p => {
            if (p.p_id !== id) return p;
            if (isNaN(count) || raw === '')
                return { ...p, actual_count: null, variance: 0, status: 'pending' };
            const variance = count - p.system_count;
            const isFirst  = p.actual_count === null;
            const now      = new Date().toISOString();
            return {
                ...p,
                actual_count:     count,
                variance,
                status:           variance === 0 ? 'matched' : 'variance',
                first_entered_at: isFirst ? now : p.first_entered_at,
                last_edited_at:   now,
                edit_count:       isFirst ? 0 : p.edit_count + 1,
                prev_count:       isFirst ? null : p.actual_count,
            };
        }));
    }, [sessionLocked, resetActivity]);

    // ── Stats ──────────────────────────────────────────────────────────────
    const stats = {
        total:         products.length,
        pending:       products.filter(p => p.status === 'pending').length,
        matched:       products.filter(p => p.status === 'matched').length,
        variance:      products.filter(p => p.status === 'variance').length,
        highRisk:      products.filter(isHighRisk).length,
        totalVariance: products.reduce((s, p) => s + Math.abs(p.variance), 0),
        editedItems:   products.filter(p => p.edit_count > 0),
        counted:       products.filter(p => p.actual_count !== null).length,
    };

    // ── Validate & open confirm ──────────────────────────────────────────────
    const handleSaveClick = () => {
        setSuccessMsg(''); setErrorMsg('');
        if (!currentUser) return;
        if (!ALLOWED_ROLES.includes(currentUser.role)) {
            setErrorMsg('คุณไม่มีสิทธิ์บันทึกผลตรวจนับ'); return;
        }
        if (!approver.trim()) {
            setErrorMsg('กรุณาระบุชื่อผู้อนุมัติ (Supervisor)'); return;
        }
        // Dual control guard
        if (currentUser.name.toLowerCase() === approver.trim().toLowerCase() ||
            currentUser.employee_id.toLowerCase() === approver.trim().toLowerCase()) {
            setErrorMsg('ผู้ตรวจนับและผู้อนุมัติต้องเป็นคนละคน (Dual Control)'); return;
        }
        if (stats.counted === 0) {
            setErrorMsg('ยังไม่มีรายการที่ตรวจนับ'); return;
        }
        setApproverPin('');
        setShowConfirm(true);
    };

    // ── Verify PIN → Save ────────────────────────────────────────────────────
    const handleConfirmSave = async () => {
        if (!currentUser) return;
        setVerifying(true); setErrorMsg('');
        try {
            // 1. Verify approver PIN server-side (bcrypt comparison in Server Action)
            const pinResult = await verifyApproverPin({
                approver_name: approver.trim(),
                pin: approverPin,
            });
            if (!pinResult.success) {
                setErrorMsg(pinResult.error || 'PIN ผู้อนุมัติไม่ถูกต้อง');
                setVerifying(false); return;
            }

            setVerifying(false); setShowConfirm(false); setSaving(true);

            // 2. Write-once save with full audit metadata
            const result = await saveInventoryAudit({
                audit_date:    auditDate,
                auditor_id:    currentUser.employee_id,
                auditor_name:  currentUser.name,
                approver_name: approver.trim(),
                approver_id:   pinResult.approver_id,
                session_start: sessionStart.toISOString(),
                items: products.map(p => ({
                    p_id:             p.p_id,
                    system_qty:       p.system_count,
                    counted_qty:      p.actual_count,
                    first_entered_at: p.first_entered_at,
                    last_edited_at:   p.last_edited_at,
                    edit_count:       p.edit_count,
                    prev_count:       p.prev_count,
                })),
            });

            if (result.success) {
                const snapshotItems = products.map(p => ({ ...p }));
                setLastSavedReport({
                    auditNumber: result.auditNumber || '',
                    auditDate,
                    auditorName: currentUser.name,
                    auditorEmployeeId: currentUser.employee_id,
                    approverName: approver.trim(),
                    savedAt: new Date().toISOString(),
                    items: snapshotItems,
                });
                setSuccessMsg(`✓ บันทึกสำเร็จ เลขที่ ${result.auditNumber} — ข้อมูลถูก lock แล้ว`);
                setProducts(prev => prev.map(p => ({
                    ...p, actual_count: null, variance: 0, status: 'pending',
                    first_entered_at: null, last_edited_at: null,
                    edit_count: 0, prev_count: null,
                })));
                setApprover(''); setApproverPin('');
            } else {
                setErrorMsg(result.error || 'บันทึกไม่สำเร็จ');
            }
        } catch {
            setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setVerifying(false); setSaving(false);
        }
    };

    // ── Print report ─────────────────────────────────────────────────────────
    const printReport = () => {
        if (!lastSavedReport) {
            setErrorMsg('กรุณาบันทึกผลตรวจนับก่อน เพื่อดูรายงาน');
            return;
        }
        const done = lastSavedReport.items.filter(p => p.actual_count !== null);
        const w = window.open('', '_blank');
        if (!w) return;
        const { auditDate: reportDate, auditNumber, auditorName, auditorEmployeeId, approverName } = lastSavedReport;
        w.document.write(`<!DOCTYPE html><html><head><title>รายงานตรวจนับสต็อก</title>
        <style>
          body{font-family:sans-serif;padding:20px;font-size:12px}
          h1{text-align:center;color:#1e3a8a;margin-bottom:4px}
          .sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:16px}
          table{width:100%;border-collapse:collapse}
          th{background:#1e3a8a;color:#fff;padding:6px 8px;font-size:11px}
          td{border:1px solid #e2e8f0;padding:5px 8px}
          .risk{background:#fef2f2}.warn{background:#fffbeb}
          .ok{color:#16a34a}.bad{color:#dc2626}.bold{font-weight:700}
          .footer{margin-top:16px;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:8px}
          @media print{button{display:none}}
        </style></head><body>
        <h1>รายงานผลการตรวจนับสต็อก</h1>
        <div class="sub">
          เลขที่: ${auditNumber || '—'} | วันที่: ${fmtThai(reportDate)} | ผู้ตรวจนับ: ${auditorName} (${auditorEmployeeId}) | ผู้อนุมัติ: ${approverName || '—'}<br>
          พิมพ์เมื่อ: ${fmtThai(new Date())}
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>รหัส</th><th>ชื่อสินค้า</th>
            <th>ในระบบ</th><th>นับจริง</th><th>ผลต่าง</th>
            <th>แก้ไข</th><th>เวลากรอกแรก</th><th>สถานะ</th>
          </tr></thead><tbody>
          ${done.map((p, i) => `
            <tr class="${isHighRisk(p) ? 'risk' : p.edit_count > 0 ? 'warn' : ''}">
              <td>${i + 1}</td><td>${p.p_id}</td><td>${p.p_name}</td>
              <td style="text-align:right">${p.system_count}</td>
              <td style="text-align:right">${p.actual_count}</td>
              <td class="${p.variance === 0 ? 'ok' : 'bad'} bold" style="text-align:right">
                ${p.variance > 0 ? '+' : ''}${p.variance}
              </td>
              <td style="text-align:center">${p.edit_count > 0 ? `⚠ ${p.edit_count}ครั้ง` : '—'}</td>
              <td style="font-size:10px">${fmtThai(p.first_entered_at)}</td>
              <td class="${p.variance === 0 ? 'ok' : 'bad'}">${p.variance === 0 ? '✓ ตรงกัน' : isHighRisk(p) ? '✗ เสี่ยงสูง' : '✗ มีผลต่าง'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          🟡 สีเหลือง = มีการแก้ไขหลังกรอกครั้งแรก | 🔴 สีแดง = ผลต่าง ≥${HIGH_VARIANCE_ABS} หน่วย หรือ ≥${HIGH_VARIANCE_PCT}%<br>
          เอกสารนี้ถูกสร้างโดยระบบอัตโนมัติ — ห้ามแก้ไข
        </div>
        <script>window.onload=()=>window.print()</script></body></html>`);
        w.document.close();
    };

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = p.p_id.toLowerCase().includes(q) || p.p_name.toLowerCase().includes(q);
        const matchFilter =
            filter === 'all'      ? true :
            filter === 'pending'  ? p.actual_count === null :
            filter === 'counted'  ? p.actual_count !== null : true;
        return matchSearch && matchFilter;
    });

    // ── Guards ────────────────────────────────────────────────────────────────
    if (authLoading) return (
        <div className="flex items-center justify-center h-64 gap-3 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">กำลังตรวจสอบสิทธิ์...</span>
        </div>
    );
    if (accessDenied) return <AccessDenied />;
    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">กำลังโหลดข้อมูล...</span>
        </div>
    );

    const highRiskItems = products.filter(isHighRisk);
    const progress = stats.total > 0 ? (stats.counted / stats.total) * 100 : 0;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5" onMouseMove={resetActivity} onKeyDown={resetActivity}>

            {/* Overlays */}
            {sessionLocked && (
                <SessionLockOverlay onUnlock={() => { resetActivity(); setSessionLocked(false); }} />
            )}
            <ConfirmSaveDialog
                open={showConfirm}
                auditor={currentUser?.name ?? ''}
                approver={approver}
                approverPin={approverPin}
                setApproverPin={setApproverPin}
                stats={{ counted: stats.counted, total: stats.total }}
                editedItems={stats.editedItems}
                onConfirm={handleConfirmSave}
                onCancel={() => setShowConfirm(false)}
                verifying={verifying}
            />

            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <ClipboardCheck className="w-7 h-7 text-blue-600" />
                        ตรวจนับสต็อก
                    </h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> session: {fmtThai(sessionStart)}
                        </span>
                        {currentUser && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {currentUser.name} · {currentUser.role}
                            </span>
                        )}
                        {sessionWarning && !sessionLocked && (
                            <span className="text-xs text-amber-600 font-semibold animate-pulse">
                                ⚠ session ใกล้หมดอายุ
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={printReport}
                        disabled={!lastSavedReport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Printer className="w-4 h-4" /> พิมพ์รายงานล่าสุด
                    </button>
                    <button onClick={handleSaveClick}
                        disabled={saving || stats.counted === 0 || sessionLocked}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow disabled:opacity-50 transition text-sm">
                        {saving
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Save className="w-4 h-4" />}
                        บันทึกผลตรวจนับ
                    </button>
                </div>
            </div>

            {/* ── Alerts ── */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
                    <ShieldCheck className="w-5 h-5 shrink-0" /> {successMsg}
                    <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}
            {errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {errorMsg}
                    <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}
            {lastSavedReport && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-gray-400">รายงานล่าสุด</p>
                        <p className="font-semibold text-gray-800">
                            เลขที่ {lastSavedReport.auditNumber || '—'} • วันที่ {fmtThai(lastSavedReport.auditDate)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            นับแล้ว {lastSavedReport.items.filter(i => i.actual_count !== null).length} รายการ • มีผลต่าง {lastSavedReport.items.filter(i => i.actual_count !== null && i.variance !== 0).length} รายการ
                        </p>
                    </div>
                    <button onClick={printReport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition text-sm">
                        <Printer className="w-4 h-4" /> พิมพ์รายงานล่าสุด
                    </button>
                </div>
            )}
            {false && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-300 text-red-800 rounded-xl text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                    <span>
                        <strong>พบ {highRiskItems.length} รายการความเสี่ยงสูง</strong>
                        {' '}— ผลต่าง ≥{HIGH_VARIANCE_ABS} หน่วย หรือ ≥{HIGH_VARIANCE_PCT}%
                    </span>
                    <button onClick={() => setFilter('counted')}
                        className="ml-auto text-xs underline font-semibold whitespace-nowrap">
                        ดูรายการ
                    </button>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex gap-1 border-b border-gray-200">
                {([
                    { key: 'audit',   label: 'ตรวจนับสต็อก',       icon: <ClipboardCheck className="w-4 h-4" /> },
                    { key: 'history', label: 'ประวัติการตรวจนับ',   icon: <History className="w-4 h-4" /> },
                    { key: 'trail',   label: 'Audit Trail',          icon: <Activity className="w-4 h-4" /> },
                ] as const).map(({ key, label, icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition border-b-2 -mb-px
                            ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {icon} {label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════ TAB — AUDIT ══════════════════════ */}
            {activeTab === 'audit' && (
                <>
                    {/* Audit info panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <h2 className="font-semibold text-gray-700">ข้อมูลการตรวจนับ</h2>
                            <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Dual Control บังคับใช้
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                                    วันที่ตรวจนับ
                                </label>
                                <input type="date" value={auditDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={e => setAuditDate(e.target.value)}
                                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                                    ผู้ตรวจนับ <span className="text-blue-500 normal-case font-normal">(จาก session)</span>
                                </label>
                                <div className="w-full p-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                                    {currentUser?.name}
                                    <span className="text-gray-400 text-xs">({currentUser?.employee_id})</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                                    ผู้อนุมัติ (Supervisor) <span className="text-red-500">*</span>
                                </label>
                                <input type="text" value={approver}
                                    onChange={e => setApprover(e.target.value)}
                                    placeholder="ชื่อ หรือ รหัสพนักงาน"
                                    className={`w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:outline-none transition
                                        ${approver && approver.toLowerCase() === currentUser?.name.toLowerCase()
                                            ? 'border-red-400 bg-red-50 focus:ring-red-300'
                                            : 'border-gray-200 focus:ring-blue-400'}`} />
                                {approver && approver.toLowerCase() === currentUser?.name.toLowerCase()
                                    ? <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> ต้องเป็นคนละคนกับผู้ตรวจนับ
                                      </p>
                                    : <p className="text-gray-400 text-xs mt-1">PIN จะถูกขอเมื่อกด &quot;บันทึก&quot;</p>
                                }
                            </div>
                        </div>
                        {/* Progress */}
                        <div className="mt-5 flex items-center gap-4">
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                                ความคืบหน้า: <strong className="text-blue-600">{stats.counted}</strong>/{stats.total}
                            </span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-sm font-bold text-gray-700 w-10 text-right">
                                {Math.round(progress)}%
                            </span>
                        </div>
                    </div>

                    {/* Stats cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { label: 'รอตรวจนับ',        value: stats.pending,       color: 'text-gray-500',    bg: 'bg-gray-50'    },
                            { label: 'นับแล้ว',           value: stats.counted,       color: 'text-blue-600',    bg: 'bg-blue-50'    },
                            { label: 'รายการที่แก้ไข',      value: stats.editedItems.length, color: 'text-amber-700',   bg: 'bg-amber-50'   },
                        ].map(({ label, value, color, bg }) => (
                            <div key={label} className={`${bg} rounded-xl p-4 shadow-sm`}>
                                <p className="text-xs text-gray-400 mb-1">{label}</p>
                                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Edit-tracking warning */}
                    {stats.editedItems.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                            <FileWarning className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">
                                    ตรวจพบการแก้ไขใน {stats.editedItems.length} รายการ
                                </p>
                                <p className="text-amber-700 text-xs mt-0.5">
                                    แถวสีเหลืองในตาราง = มีการแก้ไขหลังกรอกครั้งแรก
                                    ข้อมูลทุก version จะถูกบันทึกลง audit trail
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Search & filter */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="ค้นหารหัสหรือชื่อสินค้า..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {([
                                { key: 'all',      label: 'ทั้งหมด' },
                                { key: 'pending',  label: 'รอตรวจ' },
                                { key: 'counted',  label: 'นับแล้ว' },
                            ] as const).map(({ key, label }) => (
                                <button key={key} onClick={() => setFilter(key)}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition
                                        ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {['รหัส', 'ชื่อสินค้า', 'นับจริง', 'แก้ไข', 'เวลากรอกแรก'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(product => (
                                    <tr key={product.p_id}
                                        className={`transition ${lastSavedReport && isHighRisk(product) ? 'bg-red-50 hover:bg-red-100' : product.edit_count > 0 ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{product.p_id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{product.p_name}</td>
                                        <td className="px-4 py-3">
                                            <input type="number" min="0"
                                                value={product.actual_count ?? ''}
                                                onChange={e => updateCount(product.p_id, e.target.value)}
                                                placeholder="—"
                                                disabled={sessionLocked}
                                                className="w-24 mx-auto block text-center p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed text-sm" />
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs">
                                            {product.edit_count > 0
                                                ? <span className="text-amber-600 font-bold" title={`ค่าก่อนแก้: ${product.prev_count}`}>
                                                    ⚠ {product.edit_count}ครั้ง
                                                  </span>
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                            {fmtThai(product.first_entered_at)}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-300">
                                            <Search className="w-8 h-8 mx-auto mb-2" />
                                            ไม่พบรายการ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ══════════════════════ TAB — HISTORY ══════════════════════ */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-600" /> ประวัติการตรวจนับ (20 รายการล่าสุด)
                        </h2>
                        <button onClick={() => getInventoryAuditHistory(20).then(r => r.success && setHistory(r.data as AuditRecord[]))}
                            className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1 transition">
                            <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {['เลขที่', 'วันที่', 'รายการ', 'ผลต่าง', 'ผู้ตรวจนับ', 'ผู้อนุมัติ', 'สถานะ'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {history.length === 0
                                ? <tr><td colSpan={7} className="text-center py-16 text-gray-300">ยังไม่มีประวัติ</td></tr>
                                : history.map(h => (
                                    <tr key={h.audit_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono font-semibold text-blue-600 text-xs">{h.audit_number ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtThai(h.audit_date)}</td>
                                        <td className="px-4 py-3 text-right">{h.total_items ?? 0}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${(h.total_discrepancy ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {h.total_discrepancy ?? 0}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{h.completed_by ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-700 flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            {h.approved_by ?? <span className="text-gray-300 text-xs">ไม่มีข้อมูล</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">สำเร็จ</span>
                                                {h.is_locked && (
                                                    <span title="ข้อมูลถูก lock">
                                                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════════════════════ TAB — AUDIT TRAIL ══════════════════════ */}
            {activeTab === 'trail' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" /> Audit Trail (50 รายการล่าสุด)
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">บันทึกทุก action — อ่านได้อย่างเดียว</p>
                        </div>
                        <button onClick={() => getAuditTrailLog(50).then((r: Awaited<ReturnType<typeof getAuditTrailLog>>) => r.success && setTrailLog(r.data))}
                            className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1 transition">
                            <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['เวลา', 'Action', 'สินค้า', 'ค่าเดิม → ใหม่', 'ผู้ดำเนินการ', 'IP Address'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-400 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {trailLog.length === 0
                                    ? <tr><td colSpan={6} className="text-center py-16 text-gray-300">ยังไม่มีข้อมูล</td></tr>
                                    : trailLog.map(t => (
                                        <tr key={t.trail_id} className={`hover:bg-gray-50 ${t.action === 'edit' ? 'bg-amber-50/40' : ''}`}>
                                            <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">{fmtThai(t.performed_at)}</td>
                                            <td className="px-4 py-3"><ActionBadge action={t.action} /></td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {t.p_id
                                                    ? <><span className="font-mono text-gray-400 mr-1">{t.p_id}</span>{t.p_name}</>
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 font-mono">
                                                {(t.old_value !== null || t.new_value !== null)
                                                    ? <>
                                                        <span className="text-red-400">{t.old_value ?? '—'}</span>
                                                        <span className="text-gray-300 mx-1">→</span>
                                                        <span className="text-emerald-600 font-semibold">{t.new_value ?? '—'}</span>
                                                      </>
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 font-medium">{t.performed_by}</td>
                                            <td className="px-4 py-3 font-mono text-gray-400">{t.ip_address ?? '—'}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
