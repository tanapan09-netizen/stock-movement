'use client';

import { useState, useEffect } from 'react';
import {
    DoorOpen, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
    Building, Layers, X, Check, RefreshCw
} from 'lucide-react';
import {
    getAllRooms, createRoom, updateRoom, deleteRoom, toggleRoomActive
} from '@/actions/maintenanceActions';

interface Room {
    room_id: number;
    room_code: string;
    room_name: string;
    building: string | null;
    floor: string | null;
    active: boolean;
    created_at: Date;
}

export default function RoomClient() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState({
        room_code: '',
        room_name: '',
        building: '',
        floor: ''
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const result = await getAllRooms();
        if (result.success && result.data) {
            setRooms(result.data);
        }
        setLoading(false);
    };

    const filteredRooms = rooms.filter(room => {
        const matchesSearch =
            room.room_code.toLowerCase().includes(search.toLowerCase()) ||
            room.room_name.toLowerCase().includes(search.toLowerCase()) ||
            (room.building?.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = showInactive || room.active;
        return matchesSearch && matchesStatus;
    });

    const openCreateModal = () => {
        setEditingRoom(null);
        setFormData({ room_code: '', room_name: '', building: '', floor: '' });
        setShowModal(true);
    };

    const openEditModal = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            room_code: room.room_code,
            room_name: room.room_name,
            building: room.building || '',
            floor: room.floor || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            if (editingRoom) {
                const result = await updateRoom(editingRoom.room_id, {
                    room_code: formData.room_code,
                    room_name: formData.room_name,
                    building: formData.building || null,
                    floor: formData.floor || null
                });
                if (result.success) {
                    setMessage({ type: 'success', text: 'บันทึกการแก้ไขเรียบร้อย' });
                    loadRooms();
                    setShowModal(false);
                } else {
                    setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' });
                }
            } else {
                const result = await createRoom({
                    room_code: formData.room_code,
                    room_name: formData.room_name,
                    building: formData.building || undefined,
                    floor: formData.floor || undefined
                });
                if (result.success) {
                    setMessage({ type: 'success', text: 'เพิ่มห้องใหม่เรียบร้อย' });
                    loadRooms();
                    setShowModal(false);
                } else {
                    setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' });
                }
            }
        } catch {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (room_id: number) => {
        if (!confirm('ต้องการปิดใช้งานห้องนี้?')) return;
        const result = await deleteRoom(room_id);
        if (result.success) {
            setMessage({ type: 'success', text: 'ปิดใช้งานห้องเรียบร้อย' });
            loadRooms();
        } else {
            setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' });
        }
    };

    const handleToggle = async (room_id: number) => {
        const result = await toggleRoomActive(room_id);
        if (result.success) {
            loadRooms();
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DoorOpen className="w-8 h-8 text-blue-600" />
                        จัดการห้อง
                    </h1>
                    <p className="text-gray-500">เพิ่ม แก้ไข และจัดการห้องในระบบ</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> เพิ่มห้องใหม่
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหารหัสห้อง, ชื่อห้อง, อาคาร..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-sm text-gray-600">แสดงห้องที่ปิดใช้งาน</span>
                </label>
                <button
                    onClick={loadRooms}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="รีโหลด"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12">กำลังโหลด...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">รหัสห้อง</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ชื่อห้อง</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">อาคาร</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ชั้น</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">สถานะ</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredRooms.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        ไม่พบห้อง
                                    </td>
                                </tr>
                            ) : (
                                filteredRooms.map(room => (
                                    <tr key={room.room_id} className={`hover:bg-gray-50 ${!room.active ? 'bg-gray-100 opacity-60' : ''}`}>
                                        <td className="px-4 py-3 font-mono text-sm">{room.room_code}</td>
                                        <td className="px-4 py-3 font-medium">{room.room_name}</td>
                                        <td className="px-4 py-3 text-gray-600 flex items-center gap-1">
                                            <Building className="w-4 h-4" />
                                            {room.building || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <Layers className="w-4 h-4" />
                                                {room.floor || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full ${room.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                {room.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(room)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="แก้ไข"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggle(room.room_id)}
                                                    className={`p-1.5 rounded ${room.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                                                    title={room.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                                >
                                                    {room.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                {room.active && (
                                                    <button
                                                        onClick={() => handleDelete(room.room_id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="text-sm text-gray-500">
                แสดง {filteredRooms.length} จาก {rooms.length} ห้อง
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">
                            {editingRoom ? 'แก้ไขห้อง' : 'เพิ่มห้องใหม่'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">รหัสห้อง *</label>
                                <input
                                    type="text"
                                    value={formData.room_code}
                                    onChange={(e) => setFormData({ ...formData, room_code: e.target.value })}
                                    required
                                    placeholder="เช่น A101, B202"
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อห้อง *</label>
                                <input
                                    type="text"
                                    value={formData.room_name}
                                    onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                                    required
                                    placeholder="เช่น ห้องประชุมใหญ่"
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">อาคาร</label>
                                <input
                                    type="text"
                                    value={formData.building}
                                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                                    placeholder="เช่น อาคาร A"
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">ชั้น</label>
                                <input
                                    type="text"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                    placeholder="เช่น 1, 2, ชั้นใต้ดิน"
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
