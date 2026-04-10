'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import {
    createAssetCategoryForSettings,
    deleteAssetCategoryForSettings,
    listAssetCategoriesForSettings,
    updateAssetCategoryForSettings,
} from '@/actions/assetCategorySettingsActions';

type AlertState =
    | {
        type: 'success' | 'error';
        text: string;
    }
    | null;

type AssetCategory = {
    cat_id: number;
    cat_name: string;
    description: string;
    asset_count: number;
    product_count: number;
};

type EditState = {
    catId: number;
    name: string;
    description: string;
    syncAssets: boolean;
} | null;

export default function AssetPolicyClient() {
    const [rows, setRows] = useState<AssetCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState<AlertState>(null);

    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [editState, setEditState] = useState<EditState>(null);

    useEffect(() => {
        void loadRows();
    }, []);

    const totalAssetUsage = useMemo(
        () => rows.reduce((sum, row) => sum + row.asset_count, 0),
        [rows],
    );

    const totalLinkedProducts = useMemo(
        () => rows.reduce((sum, row) => sum + row.product_count, 0),
        [rows],
    );

    async function loadRows() {
        setLoading(true);
        setAlert(null);
        const result = await listAssetCategoriesForSettings();
        if (result.success) {
            setRows(result.data);
        } else {
            setAlert({ type: 'error', text: result.error });
        }
        setLoading(false);
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        setSubmitting(true);
        setAlert(null);

        const result = await createAssetCategoryForSettings({
            name: newName,
            description: newDescription,
        });

        if (result.success) {
            setNewName('');
            setNewDescription('');
            setAlert({ type: 'success', text: 'เพิ่มหมวดหมู่สินทรัพย์เรียบร้อยแล้ว' });
            await loadRows();
        } else {
            setAlert({ type: 'error', text: result.error });
        }

        setSubmitting(false);
    }

    async function handleUpdate() {
        if (!editState) return;
        setSubmitting(true);
        setAlert(null);

        const result = await updateAssetCategoryForSettings({
            catId: editState.catId,
            name: editState.name,
            description: editState.description,
            syncAssets: editState.syncAssets,
        });

        if (result.success) {
            setEditState(null);
            setAlert({ type: 'success', text: 'บันทึกการแก้ไขหมวดหมู่สินทรัพย์เรียบร้อยแล้ว' });
            await loadRows();
        } else {
            setAlert({ type: 'error', text: result.error });
        }

        setSubmitting(false);
    }

    async function handleDelete(row: AssetCategory) {
        const confirmed = window.confirm(
            `ยืนยันการลบหมวดหมู่ "${row.cat_name}" ?\n\nระบบจะลบได้เฉพาะหมวดหมู่ที่ไม่มีสินทรัพย์หรือสินค้าเชื่อมอยู่เท่านั้น`,
        );
        if (!confirmed) return;

        setSubmitting(true);
        setAlert(null);
        const result = await deleteAssetCategoryForSettings(row.cat_id);

        if (result.success) {
            setAlert({ type: 'success', text: 'ลบหมวดหมู่สินทรัพย์เรียบร้อยแล้ว' });
            await loadRows();
        } else {
            setAlert({ type: 'error', text: result.error });
        }

        setSubmitting(false);
    }

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                กำลังโหลดข้อมูลหมวดหมู่สินทรัพย์...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-sky-50 p-5 shadow-sm">
                <h1 className="text-xl font-semibold text-slate-900">ตั้งค่าหมวดหมู่สินทรัพย์</h1>
                <p className="mt-1 text-sm text-slate-600">
                    จัดการหมวดหมู่ที่ใช้ในทะเบียนทรัพย์สินและฟอร์มเพิ่มทรัพย์สิน
                </p>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">จำนวนหมวดหมู่</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">{rows.length.toLocaleString('th-TH')}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">สินทรัพย์ที่อ้างอิงทั้งหมด</div>
                    <div className="mt-1 text-xl font-bold text-cyan-700">{totalAssetUsage.toLocaleString('th-TH')}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">สินค้าที่เชื่อมหมวดหมู่</div>
                    <div className="mt-1 text-xl font-bold text-amber-700">{totalLinkedProducts.toLocaleString('th-TH')}</div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-800">เพิ่มหมวดหมู่สินทรัพย์ใหม่</h2>
                    <button
                        type="button"
                        onClick={() => void loadRows()}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        โหลดใหม่
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder="ชื่อหมวดหมู่ เช่น คอมพิวเตอร์"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                        type="text"
                        value={newDescription}
                        onChange={(event) => setNewDescription(event.target.value)}
                        placeholder="คำอธิบาย (ไม่บังคับ)"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => void handleCreate()}
                        disabled={submitting || !newName.trim()}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                    >
                        <Plus className="h-4 w-4" />
                        เพิ่มหมวดหมู่
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                        <tr>
                            <th className="px-4 py-3">ชื่อหมวดหมู่</th>
                            <th className="px-4 py-3">คำอธิบาย</th>
                            <th className="px-4 py-3 text-right">สินทรัพย์</th>
                            <th className="px-4 py-3 text-right">สินค้า</th>
                            <th className="px-4 py-3 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rows.map((row) => {
                            const isEditing = editState?.catId === row.cat_id;
                            return (
                                <tr key={row.cat_id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        {isEditing ? (
                                            <input
                                                value={editState.name}
                                                onChange={(event) =>
                                                    setEditState((prev) =>
                                                        prev ? { ...prev, name: event.target.value } : prev,
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                            />
                                        ) : (
                                            <span className="font-medium text-slate-900">{row.cat_name}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input
                                                    value={editState.description}
                                                    onChange={(event) =>
                                                        setEditState((prev) =>
                                                            prev ? { ...prev, description: event.target.value } : prev,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                                />
                                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={editState.syncAssets}
                                                        onChange={(event) =>
                                                            setEditState((prev) =>
                                                                prev ? { ...prev, syncAssets: event.target.checked } : prev,
                                                            )
                                                        }
                                                        className="h-4 w-4"
                                                    />
                                                    อัปเดตชื่อหมวดหมู่ในข้อมูลสินทรัพย์เดิมด้วย
                                                </label>
                                            </div>
                                        ) : (
                                            <span>{row.description || '-'}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-cyan-700">
                                        {row.asset_count.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-amber-700">
                                        {row.product_count.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleUpdate()}
                                                        disabled={submitting || !editState.name.trim()}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                                                    >
                                                        <Save className="h-3.5 w-3.5" />
                                                        บันทึก
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditState(null)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                        ยกเลิก
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditState({
                                                                catId: row.cat_id,
                                                                name: row.cat_name,
                                                                description: row.description || '',
                                                                syncAssets: true,
                                                            })
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        แก้ไข
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(row)}
                                                        disabled={submitting}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        ลบ
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                                    ยังไม่มีหมวดหมู่สินทรัพย์
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
