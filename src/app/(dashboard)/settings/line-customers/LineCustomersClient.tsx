'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, UserCheck, UserX, Search, Copy } from 'lucide-react';
import {
    deleteLineCustomer,
    getLineCustomers,
    toggleLineCustomerActive,
    updateLineCustomer
} from '@/actions/lineCustomerActions';

interface LineCustomer {
    id: number;
    line_user_id: string;
    display_name: string | null;
    full_name: string;
    phone_number: string | null;
    room_number: string | null;
    picture_url: string | null;
    notes: string | null;
    is_active: boolean;
    registered_at: Date;
    last_interaction: Date | null;
    created_at: Date;
    updated_at: Date;
}

interface Props {
    canEdit: boolean;
}

export default function LineCustomersClient({ canEdit }: Props) {
    const [customers, setCustomers] = useState<LineCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState(false);

    async function loadCustomers() {
        setLoading(true);
        const result = await getLineCustomers();
        if (result.success && result.data) {
            setCustomers(result.data as LineCustomer[]);
        }
        setLoading(false);
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadCustomers();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return customers;
        return customers.filter((c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.phone_number || '').toLowerCase().includes(q) ||
            (c.room_number || '').toLowerCase().includes(q) ||
            c.line_user_id.toLowerCase().includes(q) ||
            (c.display_name || '').toLowerCase().includes(q)
        );
    }, [customers, search]);

    async function handleSave(c: LineCustomer) {
        if (!canEdit) {
            return;
        }

        const result = await updateLineCustomer({
            id: c.id,
            full_name: c.full_name,
            phone_number: c.phone_number || '',
            room_number: c.room_number || '',
            notes: c.notes || null
        });
        if (!result.success) {
            alert(result.error || 'บันทึกไม่สำเร็จ');
            await loadCustomers();
        }
    }

    async function handleToggleActive(id: number, current: boolean) {
        if (!canEdit) {
            return;
        }

        const result = await toggleLineCustomerActive(id, !current);
        if (result.success) {
            setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
        } else {
            alert(result.error || 'เปลี่ยนสถานะไม่สำเร็จ');
        }
    }

    async function handleDelete(id: number) {
        if (!canEdit) {
            return;
        }

        if (!confirm('ยืนยันการลบลูกค้า LINE นี้?')) return;
        const result = await deleteLineCustomer(id);
        if (result.success) {
            setCustomers((prev) => prev.filter((c) => c.id !== id));
        } else {
            alert(result.error || 'ลบไม่สำเร็จ');
        }
    }

    async function handleCopyRegisterLink() {
        const registerLiffId =
            process.env.NEXT_PUBLIC_LINE_LIFF_CUSTOMER_REGISTER_ID
            || process.env.NEXT_PUBLIC_LINE_LIFF_ID
            || '';
        const url = registerLiffId
            ? `https://liff.line.me/${registerLiffId}`
            : `${window.location.origin}/line/customer-register`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">จัดการลูกค้า LINE</h1>
                        <p className="text-gray-500 dark:text-gray-400">จัดการรายชื่อลูกค้าที่ลงทะเบียนผ่าน LINE โดยเฉพาะ</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyRegisterLink}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                        <Copy size={14} />
                        {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์สมัครลูกค้า'}
                    </button>
                </div>
                <div className="mt-4 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาด้วยชื่อ, เบอร์, LINE User ID"
                        className="w-full border rounded-lg pl-9 pr-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">ไม่พบข้อมูลลูกค้า LINE</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">ชื่อบน LINE</th>
                                    <th className="px-4 py-3 text-left">ชื่อลูกค้า</th>
                                    <th className="px-4 py-3 text-left">เบอร์โทร</th>
                                    <th className="px-4 py-3 text-left">เบอร์ห้อง</th>
                                    <th className="px-4 py-3 text-left">บันทึก</th>
                                    <th className="px-4 py-3 text-left">สถานะ</th>
                                    <th className="px-4 py-3 text-left">แก้ไขล่าสุด</th>
                                    <th className="px-4 py-3 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {filtered.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{c.display_name || '-'}</div>
                                            <div className="text-xs text-gray-400 font-mono">{c.line_user_id}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={c.full_name}
                                                onChange={(e) =>
                                                    setCustomers((prev) =>
                                                        prev.map((row) => (row.id === c.id ? { ...row, full_name: e.target.value } : row))
                                                    )
                                                }
                                                onBlur={canEdit ? () => handleSave(c) : undefined}
                                                readOnly={!canEdit}
                                                className="w-full border rounded px-2 py-1 dark:bg-slate-700 dark:border-slate-600 read-only:bg-gray-50 read-only:text-gray-500 dark:read-only:bg-slate-800/60"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={c.phone_number || ''}
                                                onChange={(e) =>
                                                    setCustomers((prev) =>
                                                        prev.map((row) => (row.id === c.id ? { ...row, phone_number: e.target.value } : row))
                                                    )
                                                }
                                                onBlur={canEdit ? () => handleSave(c) : undefined}
                                                readOnly={!canEdit}
                                                className="w-full border rounded px-2 py-1 dark:bg-slate-700 dark:border-slate-600 read-only:bg-gray-50 read-only:text-gray-500 dark:read-only:bg-slate-800/60"
                                                placeholder="ระบุเบอร์โทร"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={c.room_number || ''}
                                                onChange={(e) =>
                                                    setCustomers((prev) =>
                                                        prev.map((row) => (row.id === c.id ? { ...row, room_number: e.target.value } : row))
                                                    )
                                                }
                                                onBlur={canEdit ? () => handleSave(c) : undefined}
                                                readOnly={!canEdit}
                                                className="w-full border rounded px-2 py-1 dark:bg-slate-700 dark:border-slate-600 read-only:bg-gray-50 read-only:text-gray-500 dark:read-only:bg-slate-800/60"
                                                placeholder="เช่น A-1205"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={c.notes || ''}
                                                onChange={(e) =>
                                                    setCustomers((prev) =>
                                                        prev.map((row) => (row.id === c.id ? { ...row, notes: e.target.value } : row))
                                                    )
                                                }
                                                onBlur={canEdit ? () => handleSave(c) : undefined}
                                                readOnly={!canEdit}
                                                className="w-full border rounded px-2 py-1 dark:bg-slate-700 dark:border-slate-600 read-only:bg-gray-50 read-only:text-gray-500 dark:read-only:bg-slate-800/60"
                                                placeholder="หมายเหตุ"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {canEdit ? (
                                                <button
                                                    onClick={() => handleToggleActive(c.id, c.is_active)}
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${c.is_active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}
                                                >
                                                    {c.is_active ? <UserCheck size={13} /> : <UserX size={13} />}
                                                    {c.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </button>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${c.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {c.is_active ? <UserCheck size={13} /> : <UserX size={13} />}
                                                    {c.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {new Date(c.updated_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="ลบข้อมูล"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
