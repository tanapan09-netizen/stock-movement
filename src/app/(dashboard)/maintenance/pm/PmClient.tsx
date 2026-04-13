'use client';

import { useState, useEffect } from 'react';
import { FloatingSearchInput } from '@/components/FloatingField';
import { Plus, CalendarCheck, Edit, Trash2, Calendar, CheckCircle, RefreshCw, X, Search } from 'lucide-react';
import { getPmPlans, createPmPlan, updatePmPlan, deletePmPlan, generatePmTasks } from '@/actions/pmActions';
import { getRooms } from '@/actions/maintenanceActions';
import { getTechnicians } from '@/actions/technicianActions';

interface PmPlanItem {
    pm_id: number;
    title: string;
    description: string | null;
    room_id: number;
    frequency_type: string;
    interval: number;
    assigned_to: string | null;
    active: boolean;
    next_run_date: Date;
    last_generated: Date | null;
    tbl_rooms: {
        room_code: string;
        room_name: string;
    };
}

export default function PmClient() {
    const [plans, setPlans] = useState<PmPlanItem[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        pm_id: 0,
        title: '',
        description: '',
        room_id: '',
        frequency_type: 'monthly',
        interval: 1,
        assigned_to: '',
        next_run_date: new Date().toISOString().split('T')[0],
        active: true
    });

    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const [plansRes, roomsRes, techsRes] = await Promise.all([
            getPmPlans(),
            getRooms(),
            getTechnicians()
        ]);

        if (plansRes.success) setPlans(plansRes.data as PmPlanItem[]);
        if (roomsRes.success) setRooms(roomsRes.data as any[]);
        if (techsRes.success) setTechnicians(techsRes.data as any[]);
        setLoading(false);
    }

    async function handleGenerateTasks() {
        if (!confirm('ต้องการสร้างใบงาน PM สำหรับรายการที่ถึงกำหนดหรือไม่?')) return;
        setProcessing(true);
        const result = await generatePmTasks();
        if (result.success) {
            alert(`สร้างใบงานเรียบร้อยแล้ว: ${result.count} รายการ`);
            loadData();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
        setProcessing(false);
    }

    function openCreate() {
        setFormData({
            pm_id: 0,
            title: '',
            description: '',
            room_id: '',
            frequency_type: 'monthly',
            interval: 1,
            assigned_to: '',
            next_run_date: new Date().toISOString().split('T')[0],
            active: true
        });
        setIsEditing(false);
        setShowForm(true);
    }

    function openEdit(plan: PmPlanItem) {
        setFormData({
            pm_id: plan.pm_id,
            title: plan.title,
            description: plan.description || '',
            room_id: plan.room_id.toString(),
            frequency_type: plan.frequency_type,
            interval: plan.interval,
            assigned_to: plan.assigned_to || '',
            next_run_date: new Date(plan.next_run_date).toISOString().split('T')[0],
            active: plan.active
        });
        setIsEditing(true);
        setShowForm(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);

        const data = {
            title: formData.title,
            description: formData.description,
            room_id: Number(formData.room_id),
            frequency_type: formData.frequency_type,
            interval: Number(formData.interval),
            assigned_to: formData.assigned_to || undefined,
            next_run_date: new Date(formData.next_run_date + 'T00:00:00'),
            active: formData.active
        };

        let result;
        if (isEditing) {
            result = await updatePmPlan(formData.pm_id, data);
        } else {
            result = await createPmPlan(data);
        }

        if (result.success) {
            setShowForm(false);
            loadData();
        } else {
            alert('บันทึกไม่สำเร็จ: ' + result.error);
        }
        setProcessing(false);
    }

    async function handleDelete(id: number) {
        if (!confirm('ยืนยันการลบแผน PM นี้?')) return;
        const result = await deletePmPlan(id);
        if (result.success) loadData();
    }

    const filteredPlans = plans.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tbl_rooms.room_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CalendarCheck className="text-purple-600" /> แผนบำรุงรักษา (PM)
                    </h1>
                    <p className="text-gray-500">จัดการตารางการบำรุงรักษาเชิงป้องกัน</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerateTasks}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={processing ? 'animate-spin' : ''} />
                        สร้างใบงาน (Auto)
                    </button>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus size={18} /> เพิ่มแผน PM
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex gap-4">
                <div className="flex-1">
                    <FloatingSearchInput
                        label="ค้นหาแผน PM"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-700"
                        labelClassName="text-slate-500 dark:text-slate-400"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left">สถานะ</th>
                            <th className="px-6 py-3 text-left">หัวข้อ</th>
                            <th className="px-6 py-3 text-left">ห้อง/สถานที่</th>
                            <th className="px-6 py-3 text-left">ความถี่</th>
                            <th className="px-6 py-3 text-left">รอบถัดไป</th>
                            <th className="px-6 py-3 text-left">ผู้รับผิดชอบ</th>
                            <th className="px-6 py-3 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr>
                        ) : filteredPlans.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
                        ) : (
                            filteredPlans.map(plan => (
                                <tr key={plan.pm_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4">
                                        {plan.active ?
                                            <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle size={14} /> Active</span> :
                                            <span className="text-gray-400 text-sm">Inactive</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 font-medium">{plan.title}</td>
                                    <td className="px-6 py-4">{plan.tbl_rooms.room_code} - {plan.tbl_rooms.room_name}</td>
                                    <td className="px-6 py-4 text-sm">
                                        ทุก {plan.interval} {plan.frequency_type}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-blue-600">
                                        {new Date(plan.next_run_date).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {plan.assigned_to || '-'}
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <button onClick={() => openEdit(plan)} className="text-blue-500 hover:bg-blue-50 p-1 rounded">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(plan.pm_id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{isEditing ? 'แก้ไขแผน PM' : 'สร้างแผน PM ใหม่'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">หัวข้อการบำรุงรักษา *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="เช่น ล้างแอร์ประจำเดือน"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">รายละเอียด</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ห้อง/สถานที่ *</label>
                                <select
                                    required
                                    value={formData.room_id}
                                    onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                                    className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                >
                                    <option value="">-- เลือกห้อง --</option>
                                    {rooms.map((r: any) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_code} - {r.room_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">ความถี่ (Frequency) *</label>
                                    <select
                                        value={formData.frequency_type}
                                        onChange={e => setFormData({ ...formData, frequency_type: e.target.value })}
                                        className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value="daily">รายวัน (Daily)</option>
                                        <option value="weekly">รายสัปดาห์ (Weekly)</option>
                                        <option value="monthly">รายเดือน (Monthly)</option>
                                        <option value="yearly">รายปี (Yearly)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ระยะห่าง (Interval) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.interval}
                                        onChange={e => setFormData({ ...formData, interval: Number(e.target.value) })}
                                        className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    />
                                    <span className="text-xs text-gray-500">เช่น ทุก 3 เดือน</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">วันที่เริ่ม/รอบถัดไป *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.next_run_date}
                                        onChange={e => setFormData({ ...formData, next_run_date: e.target.value })}
                                        className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ผู้รับผิดชอบ</label>
                                    <select
                                        value={formData.assigned_to}
                                        onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                        className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        <option value="">-- ไม่ระบุ --</option>
                                        {technicians.map((t: any) => (
                                            <option key={t.technician_id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-4 h-4 rounded"
                                />
                                <label htmlFor="active" className="text-sm font-medium">ใช้งานแผนนี้ (Active)</label>
                            </div>
                            <div className="flex gap-3 pt-4 border-t mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {processing ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
