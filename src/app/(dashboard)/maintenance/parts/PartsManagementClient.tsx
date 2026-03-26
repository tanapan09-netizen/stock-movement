'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Package, Plus, Search, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SearchableSelect from '@/components/SearchableSelect';
import { getPartRequests, updatePartRequestStatus } from '@/actions/partRequestActions';
import {
  clearAllReservedParts,
  completeMaintenanceWithParts,
  getMaintenanceRequests,
  getProducts,
  getWithdrawnPartsForMaintenance,
  requestMaintenancePartWithdrawal,
  returnPartToStock,
  withdrawPartForMaintenance,
} from '@/actions/maintenanceActions';

type Product = {
  p_id: string;
  p_name: string;
  p_unit: string | null;
  p_count: number;
  available_stock?: number;
};

type Room = {
  room_code: string;
  room_name: string;
};

type MaintenancePart = {
  part_id: number;
  request_id: number;
  p_id: string;
  quantity: number;
  unit: string | null;
  status: string;
  withdrawn_at: Date;
  returned_qty: number;
  withdrawn_by: string;
  product?: { p_name: string; p_unit: string | null; p_count?: number };
  request?: { request_number: string; title: string; tbl_rooms: Room };
};

type MaintenanceRequestItem = {
  request_id: number;
  request_number: string;
  title: string;
  status: string;
  tbl_rooms: Room;
};

type PartRequestItem = {
  request_id: number;
  request_number?: string | null;
  item_name: string;
  quantity: number;
  status: string;
  priority: string;
  requested_by: string;
  description?: string | null;
  request_type?: string | null;
  tbl_maintenance_requests?: {
    request_number: string;
    title: string;
    tbl_rooms: Room;
  } | null;
};

type Props = {
  canManageParts?: boolean;
  canRespondPartAvailability?: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  withdrawn: 'bg-yellow-100 text-yellow-700',
  used: 'bg-blue-100 text-blue-700',
  pending_verification: 'bg-amber-100 text-amber-700',
  verified: 'bg-emerald-100 text-emerald-700',
  verification_failed: 'bg-red-100 text-red-700',
  defective: 'bg-rose-100 text-rose-700',
  completed: 'bg-green-100 text-green-700',
  returned: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  withdrawn: 'เบิกแล้ว',
  used: 'ใช้งานแล้ว',
  pending_verification: 'รอตรวจนับ',
  verified: 'ตรวจแล้ว',
  verification_failed: 'ตรวจนับไม่ตรง',
  defective: 'ของเสีย',
  completed: 'ตัดสต็อกแล้ว',
  returned: 'คืนแล้ว',
};

const PART_REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const PART_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'รอคลังยืนยัน',
  approved: 'พร้อมจ่ายแล้ว',
  rejected: 'ไม่พร้อมจ่าย',
};

export default function PartsManagementClient({
  canManageParts = false,
  canRespondPartAvailability = false,
}: Props) {
  const { data: session } = useSession();
  const loggedInRole = String((session?.user as { role?: string } | undefined)?.role || '')
    .trim()
    .toLowerCase();
  const canDirectWithdraw =
    ['store', 'leader_store', 'manager', 'admin', 'owner'].includes(loggedInRole) ||
    canRespondPartAvailability;

  const [withdrawnParts, setWithdrawnParts] = useState<MaintenancePart[]>([]);
  const [maintenancePartRequests, setMaintenancePartRequests] = useState<PartRequestItem[]>([]);
  const [pendingPartRequests, setPendingPartRequests] = useState<PartRequestItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState<MaintenancePart | null>(null);
  const [returnQty, setReturnQty] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({
    request_id: 0,
    p_id: '',
    quantity: 1,
    withdrawn_by: '',
  });

  async function loadData() {
    setLoading(true);
    try {
      const [partsResult, productsResult, requestsResult, partRequestsResult] = await Promise.all([
        getWithdrawnPartsForMaintenance(),
        getProducts(),
        getMaintenanceRequests({ status: ['in_progress', 'confirmed'] }),
        getPartRequests({ request_type: 'maintenance_withdrawal' }),
      ]);

      if (partsResult.success) setWithdrawnParts(partsResult.data as MaintenancePart[]);
      if (productsResult.success) setProducts(productsResult.data as Product[]);
      if (requestsResult.success) setRequests(requestsResult.data as MaintenanceRequestItem[]);
      if (partRequestsResult.success) {
        const requestItems = partRequestsResult.data as PartRequestItem[];
        setMaintenancePartRequests(requestItems);
        setPendingPartRequests(requestItems.filter((item) => item.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find((product) => product.p_id === withdrawForm.p_id);
  const availableStock = selectedProduct?.available_stock ?? selectedProduct?.p_count ?? 0;
  const withdrawDialogTitle = canDirectWithdraw ? 'เบิกอะไหล่' : 'ส่งคำขอเบิกให้คลัง';
  const withdrawDialogDescription = canDirectWithdraw
    ? 'เบิกอะไหล่จาก WH-01 เพื่อจ่ายให้ใบงานซ่อมโดยตรง'
    : 'ส่งคำขอไปที่ role store ก่อน เพื่อยืนยันการเบิกและพร้อมส่งมอบให้ช่าง';
  const withdrawSubmitLabel = canDirectWithdraw ? 'ยืนยันเบิก' : 'ส่งคำขอ';
  const recentPartRequests = maintenancePartRequests.slice(0, 8);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();

    if (!withdrawForm.request_id || !withdrawForm.p_id || !withdrawForm.quantity) {
      return alert('กรุณากรอกข้อมูลการเบิกอะไหล่ให้ครบถ้วน');
    }

    if (availableStock <= 0) {
      return alert('อะไหล่นี้ไม่มีคงเหลือใน WH-01');
    }

    if (withdrawForm.quantity > availableStock) {
      return alert(`จำนวนเกินสต็อกคงเหลือใน WH-01 (${availableStock} ${selectedProduct?.p_unit || 'ชิ้น'})`);
    }

    const result = canDirectWithdraw
      ? await withdrawPartForMaintenance({
          ...withdrawForm,
          withdrawn_by: session?.user?.name || 'System',
        })
      : await requestMaintenancePartWithdrawal({
          request_id: withdrawForm.request_id,
          p_id: withdrawForm.p_id,
          quantity: withdrawForm.quantity,
          requested_by: session?.user?.name || 'System',
        });

    if (!result.success) {
      return alert(`เกิดข้อผิดพลาด: ${result.error}`);
    }

    setShowWithdrawForm(false);
    setWithdrawForm({ request_id: 0, p_id: '', quantity: 1, withdrawn_by: '' });
    await loadData();
    alert(
      canDirectWithdraw
        ? 'เบิกอะไหล่เรียบร้อยแล้ว'
        : 'ส่งคำขอเบิกไปที่คลังแล้ว รอคลังยืนยันและพร้อมส่งมอบให้ช่าง',
    );
  }

  async function handleReturn() {
    if (!selectedPart || !returnQty) return;

    const result = await returnPartToStock({
      part_id: selectedPart.part_id,
      returned_qty: returnQty,
      returned_by: session?.user?.name || 'System',
    });

    if (!result.success) {
      return alert(`เกิดข้อผิดพลาด: ${result.error}`);
    }

    setSelectedPart(null);
    setReturnQty(0);
    loadData();
  }

  async function handleCompleteWithParts(requestId: number) {
    if (!confirm('ยืนยันตัดสต็อกอะไหล่ของใบงานนี้?')) return;

    const result = await completeMaintenanceWithParts(requestId, session?.user?.name || 'System');
    if (!result.success) {
      return alert(`เกิดข้อผิดพลาด: ${result.error}`);
    }

    loadData();
    alert('ตัดสต็อกเรียบร้อย โดยยังไม่ปิดงาน');
  }

  async function handleClearReserved() {
    if (!confirm('ต้องการเคลียร์อะไหล่ที่ค้างในระบบทั้งหมดและคืนเข้าสู่สต็อกหรือไม่?')) return;

    setLoading(true);
    const result = await clearAllReservedParts(session?.user?.name || 'System');
    if (!result.success) {
      setLoading(false);
      return alert(`เกิดข้อผิดพลาด: ${result.error}`);
    }

    loadData();
    alert(`เคลียร์ข้อมูลเรียบร้อย (${result.count || 0} รายการ)`);
  }

  async function handlePartAvailability(requestId: number, nextStatus: 'approved' | 'rejected') {
    const actionLabel = nextStatus === 'approved' ? 'พร้อมจ่าย' : 'ไม่พร้อมจ่าย';
    if (!confirm(`ยืนยันการอัปเดตสถานะเป็น "${actionLabel}" ?`)) return;

    const result = await updatePartRequestStatus(requestId, nextStatus);
    if (!result.success) {
      return alert(`เกิดข้อผิดพลาด: ${result.error}`);
    }

    loadData();
  }

  const filteredParts = withdrawnParts.filter((part) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      part.product?.p_name?.toLowerCase().includes(search) ||
      part.request?.request_number?.toLowerCase().includes(search) ||
      part.request?.title?.toLowerCase().includes(search)
    );
  });

  const filteredPartGroups = Object.values(
    filteredParts.reduce<
      Record<
        number,
        {
          requestId: number;
          requestNumber: string;
          title: string;
          roomCode: string;
          roomName: string;
          parts: MaintenancePart[];
        }
      >
    >((groups, part) => {
      const requestId = part.request_id;

      if (!groups[requestId]) {
        groups[requestId] = {
          requestId,
          requestNumber: part.request?.request_number || `REQ-${requestId}`,
          title: part.request?.title || '-',
          roomCode: part.request?.tbl_rooms?.room_code || '-',
          roomName: part.request?.tbl_rooms?.room_name || '-',
          parts: [],
        };
      }

      groups[requestId].parts.push(part);
      return groups;
    }, {}),
  ).sort((a, b) =>
    a.requestNumber.localeCompare(b.requestNumber, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Package className="text-orange-500" />
            จัดการอะไหล่งานซ่อม
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            เบิก จ่าย คืน และตัดสต็อกอะไหล่ของงานซ่อม โดยแยกตามเลขแจ้งซ่อมแต่ละใบงาน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/maintenance"
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            กลับหน้าแจ้งซ่อม
          </Link>
          {canManageParts ? (
            <button
              onClick={() => {
                setWithdrawForm((prev) => ({ ...prev, withdrawn_by: session?.user?.name || '' }));
                setShowWithdrawForm(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              <Plus size={18} />
              {canDirectWithdraw ? 'เบิกอะไหล่' : 'ทำเรื่องเบิกอะไหล่'}
            </button>
          ) : null}
          {canManageParts ? (
            <button
              onClick={handleClearReserved}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              <Undo2 size={18} />
              เคลียร์รายการค้าง
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3 text-sm text-blue-700 dark:text-blue-300">
          <AlertTriangle className="mt-0.5 text-blue-500" size={20} />
          <div className="space-y-1">
            <p>ช่างทำเรื่องเบิกอะไหล่ได้จากหน้านี้ และระบบจะแจ้งไปที่ role store ก่อนทุกครั้ง</p>
            <p>เมื่อคลังยืนยันว่า "พร้อมจ่าย" ระบบจะบันทึกการเบิกจริงและย้ายอะไหล่ไปใช้งานในใบงานนั้น</p>
            <p>รายการที่ยืนยันแล้วจะแสดงในส่วน "รายการอะไหล่ที่เบิกไปซ่อม" ด้านล่างเพื่อคืนของหรือตัดสต็อกต่อไป</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาอะไหล่, เลขที่แจ้งซ่อม, ชื่อใบงาน..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-lg border py-2 pl-10 pr-4 dark:border-slate-600 dark:bg-slate-700"
            aria-label="ค้นหา"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
        <div className="flex items-center justify-between border-b p-4 dark:border-slate-700">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <CheckCircle size={18} />
              คำขอเบิกอะไหล่รอคลังยืนยัน
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              ให้คลังตรวจสอบสต็อกและตอบกลับว่า "พร้อมจ่าย" หรือ "ไม่พร้อมจ่าย" ก่อนส่งมอบให้ช่าง
            </p>
          </div>
          <span className="text-sm text-gray-500">{pendingPartRequests.length} รายการ</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : pendingPartRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ไม่มีคำขอเบิกอะไหล่ที่รอคลังยืนยัน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    รายการ
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    ใบงาน
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    จำนวน
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    ผู้ขอ
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    ความเร่งด่วน
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                    คลังตอบกลับ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {pendingPartRequests.map((request) => (
                  <tr key={request.request_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{request.item_name}</div>
                      <div className="text-xs text-gray-500">
                        {request.request_number || `REQ-${request.request_id}`}
                      </div>
                      {request.description ? (
                        <div className="mt-1 text-xs text-gray-400">{request.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {request.tbl_maintenance_requests ? (
                        <>
                          <div className="font-mono text-blue-600">
                            {request.tbl_maintenance_requests.request_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            {request.tbl_maintenance_requests.tbl_rooms?.room_code} -{' '}
                            {request.tbl_maintenance_requests.title}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{request.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{request.requested_by}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          request.priority === 'urgent'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {request.priority === 'urgent' ? 'ด่วน' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRespondPartAvailability ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handlePartAvailability(request.request_id, 'approved')}
                            className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                          >
                            พร้อมจ่าย
                          </button>
                          <button
                            onClick={() => handlePartAvailability(request.request_id, 'rejected')}
                            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            ไม่พร้อมจ่าย
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">รอคลังยืนยัน</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
        <div className="flex items-center justify-between border-b p-4 dark:border-slate-700">
          <div>
            <h2 className="font-semibold">สถานะคำขอเบิกล่าสุด</h2>
            <p className="mt-1 text-sm text-gray-500">
              ดูย้อนหลังได้ว่าแต่ละคำขอถูกยืนยันจ่ายแล้วหรือถูกปฏิเสธ
            </p>
          </div>
          <span className="text-sm text-gray-500">{recentPartRequests.length} รายการล่าสุด</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : recentPartRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ยังไม่มีประวัติคำขอเบิกอะไหล่</div>
        ) : (
          <div className="divide-y dark:divide-slate-700">
            {recentPartRequests.map((request) => (
              <div
                key={`history-${request.request_id}`}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {request.item_name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        PART_REQUEST_STATUS_STYLES[request.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {PART_REQUEST_STATUS_LABELS[request.status] || request.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {request.tbl_maintenance_requests ? (
                      <>
                        {request.tbl_maintenance_requests.request_number} •{' '}
                        {request.tbl_maintenance_requests.tbl_rooms.room_code} •{' '}
                        {request.tbl_maintenance_requests.title}
                      </>
                    ) : (
                      request.request_number || `REQ-${request.request_id}`
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    ผู้ขอ {request.requested_by} • จำนวน {request.quantity}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {request.status === 'approved'
                    ? 'คลังยืนยันพร้อมจ่ายแล้ว'
                    : request.status === 'rejected'
                      ? 'คลังแจ้งว่ายังไม่พร้อมจ่าย'
                      : 'กำลังรอคลังตรวจสอบ'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
        <div className="flex items-center justify-between border-b p-4 dark:border-slate-700">
          <h2 className="flex items-center gap-2 font-semibold">
            <Package size={18} />
            รายการอะไหล่ที่เบิกไปซ่อม
          </h2>
          <span className="text-sm text-gray-500">
            {filteredPartGroups.length} ใบงาน / {filteredParts.length} รายการ
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : filteredParts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ยังไม่มีรายการอะไหล่ที่ยืนยันจ่ายแล้ว</div>
        ) : (
          <div className="space-y-6 p-4">
            {filteredPartGroups.map((group) => {
              const hasUsedParts = group.parts.some((part) => part.status === 'used');
              const hasBlockingParts = group.parts.some((part) =>
                ['withdrawn', 'pending_verification'].includes(part.status),
              );

              return (
                <div
                  key={group.requestId}
                  className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {group.requestNumber}
                        </span>
                        <span className="text-sm text-slate-500">
                          {group.roomCode} - {group.roomName}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{group.title}</h3>
                      <p className="text-sm text-slate-500">
                        {group.parts.length} รายการอะไหล่ในใบงานนี้
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      {canManageParts && hasUsedParts && !hasBlockingParts ? (
                        <button
                          onClick={() => handleCompleteWithParts(group.requestId)}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          ยืนยันตัดสต็อก
                        </button>
                      ) : null}
                      {hasBlockingParts ? (
                        <span className="text-xs text-amber-600">
                          ยังมีอะไหล่ค้างคืนหรือค้างตรวจนับในใบงานนี้
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                            สินค้า/อะไหล่
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                            ห้อง
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
                            จำนวน
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                            สถานะ
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                            ผู้เบิก
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                            จัดการ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {group.parts.map((part) => (
                          <tr key={part.part_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{part.product?.p_name || part.p_id}</div>
                              <div className="text-xs text-gray-500">{part.p_id}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{part.request?.tbl_rooms.room_code}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium">{part.quantity - part.returned_qty}</span>
                              <span className="text-gray-500"> / {part.quantity}</span>
                              <span className="ml-1 text-xs text-gray-400">{part.unit || 'ชิ้น'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded px-2 py-1 text-xs ${
                                  STATUS_COLORS[part.status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {STATUS_LABELS[part.status] || part.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{part.withdrawn_by}</td>
                            <td className="px-4 py-3 text-right">
                              {part.status === 'withdrawn' && canManageParts ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPart(part);
                                      setReturnQty(part.quantity - part.returned_qty);
                                    }}
                                    className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                                  >
                                    <Undo2 size={12} />
                                    คืน
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showWithdrawForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 dark:bg-slate-800">
            <div className="mb-4 space-y-1">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Package className="text-orange-500" />
                {withdrawDialogTitle}
              </h2>
              <p className="text-sm text-gray-500">{withdrawDialogDescription}</p>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">งานซ่อม *</label>
                <select
                  value={withdrawForm.request_id}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, request_id: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
                  required
                >
                  <option value={0}>เลือกงานซ่อม</option>
                  {requests.map((request) => (
                    <option key={request.request_id} value={request.request_id}>
                      {request.request_number} - {request.tbl_rooms.room_code}: {request.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">สินค้า/อะไหล่ *</label>
                <SearchableSelect
                  options={products.map((product) => {
                    const stock = product.available_stock ?? product.p_count;
                    const unit = product.p_unit || 'ชิ้น';
                    return {
                      value: product.p_id,
                      label:
                        stock > 0
                          ? `${product.p_name} (คงเหลือ WH-01: ${stock} ${unit})`
                          : `${product.p_name} (WH-01 หมด)`,
                    };
                  })}
                  value={withdrawForm.p_id}
                  onChange={(value: string) =>
                    setWithdrawForm((prev) => ({ ...prev, p_id: value, quantity: 1 }))
                  }
                  placeholder="เลือกสินค้า"
                  required
                />
                {selectedProduct && availableStock < 5 ? (
                  <div className="mt-1 text-xs text-orange-600">สต็อกใกล้หมด</div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">จำนวน *</label>
                <input
                  type="number"
                  value={withdrawForm.quantity}
                  onChange={(e) => {
                    const nextQty = Number(e.target.value);
                    const safeQty = Math.max(
                      1,
                      availableStock > 0 ? Math.min(nextQty, availableStock) : nextQty,
                    );
                    setWithdrawForm({ ...withdrawForm, quantity: safeQty });
                  }}
                  className="w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
                  min="1"
                  max={availableStock}
                  required
                />
                {selectedProduct ? (
                  <div className="mt-1 text-right text-xs text-gray-500">
                    คงเหลือใน WH-01 สูงสุด: {availableStock}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {canDirectWithdraw ? 'ผู้เบิก *' : 'ผู้ขอเบิก *'}
                </label>
                <input
                  type="text"
                  value={session?.user?.name || ''}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border bg-gray-100 px-3 py-2 text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400"
                  placeholder={canDirectWithdraw ? 'ชื่อผู้เบิก' : 'ชื่อผู้ขอเบิก'}
                />
                {!canDirectWithdraw ? (
                  <p className="mt-1 text-xs text-blue-600">
                    ระบบจะแจ้ง role store ก่อนยืนยันการจ่ายอะไหล่
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawForm(false)}
                  className="flex-1 rounded-lg border px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={availableStock <= 0}
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawSubmitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedPart ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Undo2 className="text-gray-500" />
              คืนอะไหล่
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">สินค้า</div>
                <div className="font-medium">{selectedPart.product?.p_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">เบิกไป</div>
                <div className="font-medium">
                  {selectedPart.quantity} {selectedPart.unit || 'ชิ้น'}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">จำนวนที่จะคืน</label>
                <input
                  type="number"
                  value={returnQty}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
                  min="1"
                  max={selectedPart.quantity - selectedPart.returned_qty}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setSelectedPart(null)}
                  className="flex-1 rounded-lg border px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReturn}
                  className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                >
                  คืน
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
