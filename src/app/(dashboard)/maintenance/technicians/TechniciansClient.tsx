'use client';

import { useState, useEffect, useCallback } from 'react';
import { FloatingSearchInput } from '@/components/FloatingField';
import { UserCog, Plus, Edit2, Trash2, Phone, Mail, X, Users } from 'lucide-react';
import Link from 'next/link';
import {
    getTechnicians,
    getLineTechnicians,
    createTechnician,
    updateTechnician,
    deleteTechnician
} from '@/actions/technicianActions';
import { TECHNICIAN_STATUS_OPTIONS } from '@/lib/maintenance-options';

interface Technician {
    tech_id: number;
    name: string;
    phone: string | null;
    email: string | null;
    line_user_id: string | null;
    specialty: string | null;
    status: string;
    notes: string | null;
    created_at: Date;
}

interface LineTechnician {
    id: number;
    line_user_id: string;
    display_name: string | null;
    full_name: string | null;
    picture_url: string | null;
    role: string;
    is_active: boolean;
    is_approver: boolean;
    last_interaction: Date | null;
    created_at: Date;
}

interface Props {
    canEdit: boolean;
}

type TechnicianTab = 'technician' | 'leader_technician';

export default function TechniciansClient({ canEdit }: Props) {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [lineTechnicians, setLineTechnicians] = useState<LineTechnician[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTech, setEditingTech] = useState<Technician | null>(null);
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState<TechnicianTab>('technician');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        line_user_id: '',
        specialty: '',
        status: 'active',
        notes: ''
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        const [techResult, lineResult] = await Promise.all([
            getTechnicians(),
            getLineTechnicians()
        ]);
        if (techResult.success) {
            setTechnicians(techResult.data as Technician[]);
        }
        if (lineResult.success) {
            setLineTechnicians(lineResult.data as LineTechnician[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    function openForm(tech?: Technician) {
        if (!canEdit) {
            return;
        }

        if (tech) {
            setEditingTech(tech);
            setFormData({
                name: tech.name,
                phone: tech.phone || '',
                email: tech.email || '',
                line_user_id: tech.line_user_id || '',
                specialty: tech.specialty || '',
                status: tech.status,
                notes: tech.notes || ''
            });
        } else {
            setEditingTech(null);
            setFormData({ name: '', phone: '', email: '', line_user_id: '', specialty: '', status: 'active', notes: '' });
        }
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canEdit) {
            return;
        }

        if (!formData.name) {
            alert('กรุณากรอกชื่อช่าง');
            return;
        }

        let result;
        if (editingTech) {
            result = await updateTechnician(editingTech.tech_id, formData);
        } else {
            result = await createTechnician(formData);
        }

        if (result.success) {
            setShowForm(false);
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    async function handleDelete(tech_id: number) {
        if (!canEdit) {
            return;
        }

        if (!confirm('ต้องการลบช่างคนนี้หรือไม่?')) return;
        const result = await deleteTechnician(tech_id);
        if (result.success) {
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    }

    const filteredTechnicians = technicians.filter(tech => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        return (
            tech.name.toLowerCase().includes(search) ||
            tech.phone?.toLowerCase().includes(search) ||
            tech.specialty?.toLowerCase().includes(search)
        );
    });

    const filteredLineTechnicians = lineTechnicians.filter(lt => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        return (
            lt.display_name?.toLowerCase().includes(search) ||
            lt.full_name?.toLowerCase().includes(search) ||
            lt.line_user_id.toLowerCase().includes(search)
        );
    });

    const totalCount = lineTechnicians.length + technicians.length;
    const activeCount = lineTechnicians.filter(lt => lt.is_active).length + technicians.filter(t => t.status === 'active').length;
    const isLineHeadTechnician = (role?: string | null) =>
        ['leader_technician', 'head_technician'].includes((role || '').toLowerCase());
    const getLineRoleLabel = (role?: string | null) =>
        isLineHeadTechnician(role) ? 'หัวหน้าช่าง' : 'ช่าง';

    const activeTabLabel = activeTab === 'leader_technician' ? 'หัวหน้าช่าง' : 'ช่าง';
    const activeTabDescription = activeTab === 'leader_technician'
        ? 'จัดกลุ่มหัวหน้าช่างทีม / ผู้ควบคุมงาน'
        : 'จัดกลุ่มช่างซ่อมทั่วไป';

    const normalizeValue = (value?: string | null) => (value || '').trim().toLowerCase();
    const isManualHeadTechnician = (tech: Technician) => {
        const normalizedLineId = normalizeValue(tech.line_user_id);
        const hasLeaderLineRole = lineTechnicians.some((lt) =>
            isLineHeadTechnician(lt.role) && normalizeValue(lt.line_user_id) === normalizedLineId
        );
        if (hasLeaderLineRole) return true;

        const nameMatchesLeader = lineTechnicians.some((lt) => {
            if (!isLineHeadTechnician(lt.role)) return false;
            const normalizedTechName = normalizeValue(tech.name);
            return (
                normalizedTechName !== '' &&
                (normalizedTechName === normalizeValue(lt.full_name) || normalizedTechName === normalizeValue(lt.display_name))
            );
        });
        if (nameMatchesLeader) return true;

        const specialtyText = normalizeValue(tech.specialty);
        const noteText = normalizeValue(tech.notes);
        return (
            specialtyText.includes('หัวหน้าช่าง')
            || noteText.includes('หัวหน้าช่าง')
            || specialtyText.includes('leader technician')
            || noteText.includes('leader technician')
            || specialtyText.includes('head technician')
            || noteText.includes('head technician')
        );
    };

    const lineTechniciansInTab = filteredLineTechnicians.filter((lt) =>
        activeTab === 'leader_technician' ? isLineHeadTechnician(lt.role) : !isLineHeadTechnician(lt.role)
    );
    const manualTechniciansInTab = filteredTechnicians.filter((tech) =>
        activeTab === 'leader_technician' ? isManualHeadTechnician(tech) : !isManualHeadTechnician(tech)
    );
    const getManualRoleLabel = (tech: Technician) =>
        isManualHeadTechnician(tech) ? 'หัวหน้าช่าง' : 'ช่าง';
    const getManualRoleBadgeClass = (tech: Technician) =>
        isManualHeadTechnician(tech)
            ? 'bg-blue-100 text-blue-700'
            : 'bg-green-100 text-green-700';

    const headCountAll = lineTechnicians.filter((lt) => isLineHeadTechnician(lt.role)).length
        + technicians.filter((tech) => isManualHeadTechnician(tech)).length;
    const technicianCountAll = Math.max(totalCount - headCountAll, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserCog className="text-blue-500" /> จัดการช่างซ่อม
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">เพิ่ม แก้ไข และจัดการข้อมูลช่าง</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/maintenance" className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                        กลับหน้าแจ้งซ่อม
                    </Link>
                    {canEdit && (
                        <button
                            onClick={() => openForm()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus size={18} /> เพิ่มช่าง
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">ช่างทั้งหมด</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    <div className="text-green-600 text-sm">พร้อมปฏิบัติงาน</div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <div>
                    <FloatingSearchInput
                        label="ค้นหาชื่อ, เบอร์โทร, ความเชี่ยวชาญ"
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-700"
                        labelClassName="text-slate-500 dark:text-slate-400"
                        aria-label="ค้นหาช่าง"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">ประเภทบุคลากร</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{activeTabDescription}</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('technician')}
                        aria-pressed={activeTab === 'technician'}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'technician'
                                ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span>ช่าง</span>
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                {technicianCountAll}
                            </span>
                        </div>
                        <div className="mt-0.5 text-left text-[11px] font-normal opacity-90">
                            ช่างซ่อมทั่วไป
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('leader_technician')}
                        aria-pressed={activeTab === 'leader_technician'}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'leader_technician'
                                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span>หัวหน้าช่าง</span>
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                {headCountAll}
                            </span>
                        </div>
                        <div className="mt-0.5 text-left text-[11px] font-normal opacity-90">
                            หัวหน้าทีม / ผู้ควบคุมงาน
                        </div>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
            ) : (
                <>
                    {lineTechniciansInTab.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-green-500" />
                                {activeTabLabel}จาก LINE ({lineTechniciansInTab.length})
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {lineTechniciansInTab.map(lt => (
                                    <div key={lt.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-green-400">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                {lt.picture_url ? (
                                                    <img
                                                        src={lt.picture_url}
                                                        alt={lt.display_name || 'LINE user'}
                                                        className="h-12 w-12 rounded-full object-cover ring-2 ring-green-200"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold text-white bg-green-500">
                                                        {(lt.display_name || lt.full_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {lt.full_name || lt.display_name || 'ไม่ระบุชื่อ'}
                                                    </div>
                                                    {lt.display_name && lt.full_name && (
                                                        <div className="text-xs text-gray-500">LINE: {lt.display_name}</div>
                                                    )}
                                                    <div className="mt-1">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                isLineHeadTechnician(lt.role)
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-green-100 text-green-700'
                                                            }`}
                                                        >
                                                            {getLineRoleLabel(lt.role)}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">{lt.line_user_id.slice(0, 12)}...</div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs ${lt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {lt.is_active ? 'พร้อมปฏิบัติงาน' : 'ไม่พร้อม/พักงาน'}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-xs text-gray-500">
                                            {lt.last_interaction && (
                                                <span>ใช้งานล่าสุด: {new Date(lt.last_interaction).toLocaleDateString('th-TH')}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {manualTechniciansInTab.length > 0 && (
                        <div className="space-y-4">
                            {lineTechniciansInTab.length > 0 && (
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                    <UserCog size={20} className="text-blue-500" />
                                    {activeTabLabel}ที่เพิ่มด้วยตนเอง ({manualTechniciansInTab.length})
                                </h2>
                            )}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {manualTechniciansInTab.map(tech => (
                                    <div key={tech.tech_id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${tech.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                                    {tech.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">{tech.name}</div>
                                                    {tech.specialty && (
                                                        <div className="text-sm text-gray-500">{tech.specialty}</div>
                                                    )}
                                                    <div className="mt-1">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getManualRoleBadgeClass(tech)}`}>
                                                            {getManualRoleLabel(tech)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs ${tech.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {tech.status === 'active' ? 'พร้อมปฏิบัติงาน' : 'ไม่พร้อม/พักงาน'}
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm">
                                            {tech.phone && (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <Phone size={14} /> {tech.phone}
                                                </div>
                                            )}
                                            {tech.email && (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <Mail size={14} /> {tech.email}
                                                </div>
                                            )}
                                        </div>

                                        {canEdit && (
                                            <div className="mt-4 pt-3 border-t flex gap-2">
                                                <button
                                                    onClick={() => openForm(tech)}
                                                    className="flex-1 text-sm py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1"
                                                >
                                                    <Edit2 size={14} /> แก้ไข
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tech.tech_id)}
                                                    className="text-sm py-1.5 px-3 border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lineTechniciansInTab.length === 0 && manualTechniciansInTab.length === 0 && (
                        <div className="text-center text-gray-500 py-8">ไม่พบข้อมูล{activeTabLabel}</div>
                    )}
                </>
            )}

            {showForm && canEdit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingTech ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างใหม่'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700" aria-label="ปิด">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อ-นามสกุล *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="ชื่อช่าง"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">เบอร์โทร</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        placeholder="08X-XXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">อีเมล</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ความเชี่ยวชาญ</label>
                                <input
                                    type="text"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น แอร์, ไฟฟ้า, ประปา"
                                />
                            </div>
                            {editingTech && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">สถานะ</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                        aria-label="สถานะช่าง"
                                    >
                                        {TECHNICIAN_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    rows={2}
                                    placeholder="บันทึกเพิ่มเติม"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingTech ? 'บันทึก' : 'เพิ่ม'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
