'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    DoorOpen, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
    Building, Layers, X, Check, RefreshCw, ChevronRight, ChevronDown,
    FolderOpen, Folder, MapPin
} from 'lucide-react';
import {
    getAllRooms, createRoom, updateRoom, deleteRoom, toggleRoomActive
} from '@/actions/maintenanceActions';

interface Room {
    room_id: number;
    room_code: string;
    room_name: string;
    room_type: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
    active: boolean;
    created_at: Date;
}

// Tree structure types
interface TreeNode {
    label: string;
    level: number;
    children: TreeNode[];
    rooms: Room[];
    path: string[];
}

function buildTree(rooms: Room[]): TreeNode[] {
    const tree: TreeNode[] = [];
    const typeMap = new Map<string, TreeNode>();

    for (const room of rooms) {
        const roomType = room.room_type || 'ไม่ระบุประเภท';
        const floor = room.floor || 'ไม่ระบุชั้น';
        const roomName = room.room_name || room.room_code;
        const zone = room.zone || null;

        // Level 1: Room Type
        if (!typeMap.has(roomType)) {
            const node: TreeNode = { label: roomType, level: 1, children: [], rooms: [], path: [roomType] };
            typeMap.set(roomType, node);
            tree.push(node);
        }
        const typeNode = typeMap.get(roomType)!;

        // Level 2: Floor
        let floorNode = typeNode.children.find(c => c.label === floor);
        if (!floorNode) {
            floorNode = { label: floor, level: 2, children: [], rooms: [], path: [roomType, floor] };
            typeNode.children.push(floorNode);
        }

        // Level 3: Room Name (group by room_name for zones)
        if (zone) {
            let roomNode = floorNode.children.find(c => c.label === roomName);
            if (!roomNode) {
                roomNode = { label: roomName, level: 3, children: [], rooms: [], path: [roomType, floor, roomName] };
                floorNode.children.push(roomNode);
            }
            // Level 4: Zone — stored as a room entry
            roomNode.rooms.push(room);
        } else {
            // No zone — attach room directly at floor level
            floorNode.rooms.push(room);
        }
    }

    // Sort everything
    tree.sort((a, b) => a.label.localeCompare(b.label));
    for (const t of tree) {
        t.children.sort((a, b) => a.label.localeCompare(b.label));
        for (const f of t.children) {
            f.children.sort((a, b) => a.label.localeCompare(b.label));
        }
    }

    return tree;
}

export default function RoomClient() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Expanded nodes tracking
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState({
        room_code: '',
        room_name: '',
        room_type: '',
        building: '',
        floor: '',
        zone: ''
    });
    const [lockedFields, setLockedFields] = useState<{ room_type?: string; floor?: string; room_name?: string }>({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const result = await getAllRooms();
        if (result.success && result.data) {
            setRooms(result.data.map((r: any) => ({
                ...r,
                room_type: r.room_type ?? null,
                zone: r.zone ?? null,
                active: r.active ?? true,
                created_at: r.created_at ?? new Date()
            })));
        }
        setLoading(false);
    };

    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const matchesSearch = !search ||
                room.room_code.toLowerCase().includes(search.toLowerCase()) ||
                room.room_name.toLowerCase().includes(search.toLowerCase()) ||
                (room.room_type?.toLowerCase().includes(search.toLowerCase())) ||
                (room.building?.toLowerCase().includes(search.toLowerCase())) ||
                (room.zone?.toLowerCase().includes(search.toLowerCase()));
            const matchesStatus = showInactive || room.active;
            return matchesSearch && matchesStatus;
        });
    }, [rooms, search, showInactive]);

    const tree = useMemo(() => buildTree(filteredRooms), [filteredRooms]);

    // Auto-expand all when searching
    useEffect(() => {
        if (search) {
            const allPaths = new Set<string>();
            for (const r of filteredRooms) {
                const rt = r.room_type || 'ไม่ระบุประเภท';
                const fl = r.floor || 'ไม่ระบุชั้น';
                allPaths.add(rt);
                allPaths.add(`${rt}/${fl}`);
                if (r.zone) allPaths.add(`${rt}/${fl}/${r.room_name}`);
            }
            setExpanded(allPaths);
        }
    }, [search, filteredRooms]);

    const toggleExpand = (key: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const expandAll = () => {
        const allPaths = new Set<string>();
        for (const r of rooms) {
            const rt = r.room_type || 'ไม่ระบุประเภท';
            const fl = r.floor || 'ไม่ระบุชั้น';
            allPaths.add(rt);
            allPaths.add(`${rt}/${fl}`);
            if (r.zone) allPaths.add(`${rt}/${fl}/${r.room_name}`);
        }
        setExpanded(allPaths);
    };

    const collapseAll = () => setExpanded(new Set());

    // ─── Open modal with optional pre-filled/locked fields ───
    const openCreateModal = (context?: { room_type?: string; floor?: string; room_name?: string }) => {
        setEditingRoom(null);
        setFormData({
            room_code: '',
            room_name: context?.room_name || '',
            room_type: context?.room_type || '',
            building: '',
            floor: context?.floor || '',
            zone: ''
        });
        setLockedFields(context || {});
        setShowModal(true);
    };

    const openEditModal = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            room_code: room.room_code,
            room_name: room.room_name,
            room_type: room.room_type || '',
            building: room.building || '',
            floor: room.floor || '',
            zone: room.zone || ''
        });
        setLockedFields({});
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
                    room_type: formData.room_type || null,
                    building: formData.building || null,
                    floor: formData.floor || null,
                    zone: formData.zone || null
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
                    room_type: formData.room_type || undefined,
                    building: formData.building || undefined,
                    floor: formData.floor || undefined,
                    zone: formData.zone || undefined
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
        if (!confirm('ต้องการลบรายการนี้?')) return;
        const result = await deleteRoom(room_id);
        if (result.success) {
            setMessage({ type: 'success', text: 'ลบรายการเรียบร้อย' });
            loadRooms();
        } else {
            setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' });
        }
    };

    const handleToggle = async (room_id: number) => {
        const result = await toggleRoomActive(room_id);
        if (result.success) loadRooms();
    };

    // ─── Room row component ───
    const RoomRow = ({ room, indent }: { room: Room; indent: number }) => (
        <div
            className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all hover:bg-gray-50 group ${!room.active ? 'opacity-50' : ''}`}
            style={{ marginLeft: `${indent * 24}px` }}
        >
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{room.room_code}</span>
            <span className="text-sm font-medium text-gray-800 flex-1">
                {room.zone ? room.zone : room.room_name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${room.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                {room.active ? 'เปิด' : 'ปิด'}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(room)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไข">
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => handleToggle(room.room_id)}
                    className={`p-1 rounded ${room.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                    title={room.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                >
                    {room.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => handleDelete(room.room_id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="ลบ">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );

    // ─── Recursive tree node renderer ───
    const TreeNodeView = ({ node, indent = 0 }: { node: TreeNode; indent?: number }) => {
        const key = node.path.join('/');
        const isExpanded = expanded.has(key);
        const hasChildren = node.children.length > 0 || node.rooms.length > 0;

        const levelColors = [
            '', // unused
            'text-indigo-700 bg-indigo-50 border-indigo-200',  // L1: Room Type
            'text-teal-700 bg-teal-50 border-teal-200',        // L2: Floor
            'text-amber-700 bg-amber-50 border-amber-200',     // L3: Room Name
        ];
        const levelIcons = [
            null,
            <Building key="l1" className="w-4 h-4" />,
            <Layers key="l2" className="w-4 h-4" />,
            <DoorOpen key="l3" className="w-4 h-4" />,
        ];
        const addLabels = ['', '+ เพิ่มชั้น', '+ เพิ่มห้อง/โซน', '+ เพิ่มโซน'];

        const colorClass = levelColors[node.level] || 'text-gray-700 bg-gray-50 border-gray-200';

        return (
            <div className="mt-1">
                {/* Node header */}
                <div
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg border cursor-pointer select-none transition-all hover:shadow-sm ${colorClass}`}
                    style={{ marginLeft: `${indent * 24}px` }}
                    onClick={() => toggleExpand(key)}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <span className="w-4" />
                    )}
                    {isExpanded ? <FolderOpen className="w-4 h-4 flex-shrink-0" /> : <Folder className="w-4 h-4 flex-shrink-0" />}
                    {levelIcons[node.level]}
                    <span className="font-semibold text-sm flex-1">{node.label}</span>
                    <span className="text-xs opacity-60">
                        {node.rooms.length > 0 && `${node.rooms.length} รายการ`}
                        {node.children.length > 0 && ` ${node.children.length} กลุ่ม`}
                    </span>
                    {/* Contextual Add button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (node.level === 1) {
                                openCreateModal({ room_type: node.label !== 'ไม่ระบุประเภท' ? node.label : '' });
                            } else if (node.level === 2) {
                                openCreateModal({
                                    room_type: node.path[0] !== 'ไม่ระบุประเภท' ? node.path[0] : '',
                                    floor: node.label !== 'ไม่ระบุชั้น' ? node.label : ''
                                });
                            } else if (node.level === 3) {
                                openCreateModal({
                                    room_type: node.path[0] !== 'ไม่ระบุประเภท' ? node.path[0] : '',
                                    floor: node.path[1] !== 'ไม่ระบุชั้น' ? node.path[1] : '',
                                    room_name: node.label
                                });
                            }
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-white/80 hover:bg-white border shadow-sm font-medium transition-all"
                    >
                        {addLabels[node.level] || '+ เพิ่ม'}
                    </button>
                </div>

                {/* Children and rooms */}
                {isExpanded && (
                    <div className="transition-all">
                        {node.children.map((child) => (
                            <TreeNodeView key={child.path.join('/')} node={child} indent={indent + 1} />
                        ))}
                        {node.rooms.map((room) => (
                            <RoomRow key={room.room_id} room={room} indent={indent + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DoorOpen className="w-8 h-8 text-blue-600" />
                        จัดการห้อง
                    </h1>
                    <p className="text-gray-500 text-sm">จัดกลุ่มแบบ 4 ชั้น: ประเภท → ชั้น → ห้อง → โซน</p>
                </div>
                <button
                    onClick={() => openCreateModal()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> เพิ่มรายการใหม่
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหารหัส, ชื่อ, ประเภท, โซน..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-sm text-gray-600">แสดงรายการที่ปิด</span>
                </label>
                <div className="flex gap-1">
                    <button onClick={expandAll} className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg border" title="กางทั้งหมด">
                        กางทั้งหมด
                    </button>
                    <button onClick={collapseAll} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg border" title="พับทั้งหมด">
                        พับทั้งหมด
                    </button>
                    <button onClick={loadRooms} className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg border" title="รีโหลด">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tree View */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>
            ) : tree.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <DoorOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มีข้อมูลห้อง</p>
                    <button onClick={() => openCreateModal()} className="mt-3 text-blue-600 hover:underline text-sm">
                        + เพิ่มรายการแรก
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border p-4 space-y-1">
                    {tree.map((node) => (
                        <TreeNodeView key={node.path.join('/')} node={node} />
                    ))}
                </div>
            )}

            <div className="text-sm text-gray-500">
                แสดง {filteredRooms.length} จาก {rooms.length} รายการ
            </div>

            {/* ─── Modal ─── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            {editingRoom ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-green-600" />}
                            {editingRoom ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Room Type (Level 1) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">ประเภท (Level 1)</label>
                                <input
                                    type="text"
                                    value={formData.room_type}
                                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                                    disabled={!!lockedFields.room_type}
                                    placeholder="เช่น ห้องพัก, ส่วนกลาง"
                                    className={`w-full border rounded-lg px-3 py-2 text-sm ${lockedFields.room_type ? 'bg-gray-100 text-gray-500' : ''}`}
                                />
                            </div>

                            {/* Floor (Level 2) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">ชั้น (Level 2)</label>
                                <input
                                    type="text"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                    disabled={!!lockedFields.floor}
                                    placeholder="เช่น ชั้น 1, ชั้น 2"
                                    className={`w-full border rounded-lg px-3 py-2 text-sm ${lockedFields.floor ? 'bg-gray-100 text-gray-500' : ''}`}
                                />
                            </div>

                            {/* Room Code */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">รหัสห้อง *</label>
                                <input
                                    type="text"
                                    value={formData.room_code}
                                    onChange={(e) => setFormData({ ...formData, room_code: e.target.value })}
                                    required
                                    placeholder="เช่น A101, B202"
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>

                            {/* Room Name (Level 3) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">ชื่อห้อง / เบอร์ห้อง (Level 3) *</label>
                                <input
                                    type="text"
                                    value={formData.room_name}
                                    onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                                    disabled={!!lockedFields.room_name}
                                    required
                                    placeholder="เช่น ห้อง 101, โซนหลัก"
                                    className={`w-full border rounded-lg px-3 py-2 text-sm ${lockedFields.room_name ? 'bg-gray-100 text-gray-500' : ''}`}
                                />
                            </div>

                            {/* Zone (Level 4) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">โซน (Level 4) — ถ้ามี</label>
                                <input
                                    type="text"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                    placeholder="เช่น โซนในห้อง, โซนย่อย"
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>

                            {/* Building (Optional/Extra) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">อาคาร (ถ้ามี)</label>
                                <input
                                    type="text"
                                    value={formData.building}
                                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                                    placeholder="เช่น อาคาร A"
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
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
