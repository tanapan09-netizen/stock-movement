'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Package, Plus, Search, ShieldCheck, Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SearchableSelect from '@/components/SearchableSelect';
import { useToast } from '@/components/ToastProvider';
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
  canDirectStockActions?: boolean;
};

type ActionDialogState =
  | {
      mode: 'availability';
      requestId: number;
      nextStatus: 'approved' | 'rejected';
      itemName: string;
      requestNumber: string;
      requestedBy: string;
      quantity: number;
      confirmedQuantity: string;
    }
  | {
      mode: 'complete';
      requestId: number;
      requestNumber: string;
      title: string;
    }
  | {
      mode: 'clearReserved';
      reason: string;
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
  canDirectStockActions = false,
}: Props) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const canDirectWithdraw = canDirectStockActions;

  const [withdrawnParts, setWithdrawnParts] = useState<MaintenancePart[]>([]);
  const [maintenancePartRequests, setMaintenancePartRequests] = useState<PartRequestItem[]>([]);
  const [pendingPartRequests, setPendingPartRequests] = useState<PartRequestItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [selectedPart, setSelectedPart] = useState<MaintenancePart | null>(null);
  const [returnQty, setReturnQty] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [partStatusFilter, setPartStatusFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
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
  const withdrawSubmitLabel = canDirectWithdraw ? 'ยืนยันเบิก' : 'ส่งคำขอไปคลัง';
  const withdrawHeaderButtonLabel = canDirectWithdraw ? 'เบิกอะไหล่' : 'ส่งคำขอเบิกไปคลัง';
  const normalizedSearchText = searchText.trim().toLowerCase();

  const matchesPartRequestSearch = (request: PartRequestItem) => {
    if (!normalizedSearchText) return true;

    return [
      request.item_name,
      request.request_number,
      request.requested_by,
      request.description,
      request.tbl_maintenance_requests?.request_number,
      request.tbl_maintenance_requests?.title,
      request.tbl_maintenance_requests?.tbl_rooms?.room_code,
      request.tbl_maintenance_requests?.tbl_rooms?.room_name,
    ].some((value) => (value || '').toLowerCase().includes(normalizedSearchText));
  };

  const filteredPendingPartRequests = pendingPartRequests.filter(matchesPartRequestSearch);
  const filteredRecentPartRequests = maintenancePartRequests
    .filter(matchesPartRequestSearch)
    .slice(0, 8);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();

    if (!withdrawForm.request_id || !withdrawForm.p_id || !withdrawForm.quantity) {
      showToast('กรุณากรอกข้อมูลการเบิกอะไหล่ให้ครบถ้วน', 'warning');
      return;
    }

    if (availableStock <= 0) {
      showToast('อะไหล่นี้ไม่มีคงเหลือใน WH-01', 'warning');
      return;
    }

    if (withdrawForm.quantity > availableStock) {
      showToast(`จำนวนเกินสต็อกคงเหลือใน WH-01 (${availableStock} ${selectedProduct?.p_unit || 'ชิ้น'})`, 'warning');
      return;
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
      showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
      return;
    }

    setShowWithdrawForm(false);
    setWithdrawForm({ request_id: 0, p_id: '', quantity: 1, withdrawn_by: '' });
    await loadData();
    showToast(
      canDirectWithdraw
        ? 'เบิกอะไหล่เรียบร้อยแล้ว'
        : 'ส่งคำขอเบิกไปที่คลังแล้ว รอคลังยืนยันและพร้อมส่งมอบให้ช่าง',
      'success',
    );
  }

  async function handleReturn() {
    if (!selectedPart || !returnQty) return;

    const maxReturnableQty = selectedPart.quantity - selectedPart.returned_qty;
    if (returnQty < 1 || returnQty > maxReturnableQty) {
      showToast(`จำนวนคืนต้องอยู่ระหว่าง 1 ถึง ${maxReturnableQty}`, 'warning');
      return;
    }

    const result = await returnPartToStock({
      part_id: selectedPart.part_id,
      returned_qty: returnQty,
      returned_by: session?.user?.name || 'System',
    });

    if (!result.success) {
      showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
      return;
    }

    setSelectedPart(null);
    setReturnQty(0);
    await loadData();
    showToast('คืนอะไหล่เข้าสต็อกเรียบร้อยแล้ว', 'success');
  }

  function handleCompleteWithParts(requestId: number, requestNumber: string, title: string) {
    setActionDialog({
      mode: 'complete',
      requestId,
      requestNumber,
      title,
    });
  }

  function handleClearReserved() {
    setActionDialog({
      mode: 'clearReserved',
      reason: '',
    });
  }

  function handlePartAvailability(
    requestId: number,
    nextStatus: 'approved' | 'rejected',
    itemName: string,
    requestNumber: string,
    requestedBy: string,
    quantity: number,
  ) {
    setActionDialog({
      mode: 'availability',
      requestId,
      nextStatus,
      itemName,
      requestNumber,
      requestedBy,
      quantity,
      confirmedQuantity: nextStatus === 'approved' ? '' : String(quantity),
    });
  }

  async function handleActionDialogConfirm() {
    if (!actionDialog) return;

    setDialogSubmitting(true);

    try {
      if (actionDialog.mode === 'availability') {
        if (actionDialog.nextStatus === 'approved') {
          const confirmedQty = Number(actionDialog.confirmedQuantity);
          if (!Number.isFinite(confirmedQty) || confirmedQty <= 0) {
            showToast('กรุณายืนยันจำนวนที่จะจ่าย', 'warning');
            return;
          }

          if (confirmedQty !== actionDialog.quantity) {
            showToast(`จำนวนที่ยืนยันต้องตรงกับจำนวนที่ขอ (${actionDialog.quantity})`, 'warning');
            return;
          }
        }

        const result = await updatePartRequestStatus(actionDialog.requestId, actionDialog.nextStatus);
        if (!result.success) {
          showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
          return;
        }

        await loadData();
        showToast(
          actionDialog.nextStatus === 'approved'
            ? 'อัปเดตเป็นพร้อมจ่ายแล้ว'
            : 'อัปเดตเป็นไม่พร้อมจ่ายแล้ว',
          'success',
        );
      }

      if (actionDialog.mode === 'complete') {
        const result = await completeMaintenanceWithParts(
          actionDialog.requestId,
          session?.user?.name || 'System',
        );
        if (!result.success) {
          showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
          return;
        }

        await loadData();
        showToast('ตัดสต็อกเรียบร้อย โดยยังไม่ปิดงาน', 'success');
      }

      if (actionDialog.mode === 'clearReserved') {
        const reason = actionDialog.reason.trim();
        if (reason.length < 8) {
          showToast('กรุณาระบุเหตุผลอย่างน้อย 8 ตัวอักษร', 'warning');
          return;
        }

        setLoading(true);
        const result = await clearAllReservedParts(session?.user?.name || 'System', reason);
        if (!result.success) {
          setLoading(false);
          showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
          return;
        }

        await loadData();
        showToast(`เคลียร์ข้อมูลเรียบร้อย (${result.count || 0} รายการ)`, 'success');
      }

      setActionDialog(null);
    } finally {
      setDialogSubmitting(false);
    }
  }

  const filteredParts = withdrawnParts.filter((part) => {
    const matchesSearch = !normalizedSearchText || [
      part.product?.p_name,
      part.p_id,
      part.withdrawn_by,
      part.request?.request_number,
      part.request?.title,
      part.request?.tbl_rooms?.room_code,
      part.request?.tbl_rooms?.room_name,
    ].some((value) => (value || '').toLowerCase().includes(normalizedSearchText));

    const matchesStatus = partStatusFilter === 'all' || part.status === partStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = withdrawnParts.reduce<Record<string, number>>((acc, part) => {
    acc[part.status] = (acc[part.status] || 0) + 1;
    return acc;
  }, {});

  const partRequestSummary = {
    pending: pendingPartRequests.length,
    approved: maintenancePartRequests.filter((item) => item.status === 'approved').length,
    rejected: maintenancePartRequests.filter((item) => item.status === 'rejected').length,
    pendingVerification: statusCounts.pending_verification || 0,
    withdrawn: statusCounts.withdrawn || 0,
  };

  const hasActivePartsFilters = Boolean(normalizedSearchText) || partStatusFilter !== 'all';

  const clearPartsFilters = () => {
    setSearchText('');
    setPartStatusFilter('all');
  };

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
              {withdrawHeaderButtonLabel}
            </button>
          ) : null}
          {canDirectStockActions ? (
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
              <p>
                {canDirectWithdraw
                  ? 'หน้านี้รองรับการเบิกอะไหล่จากคลังโดยตรงและคืนเข้าสต็อก'
                  : 'ช่างทำเรื่องเบิกได้จากหน้านี้ โดยระบบจะส่งคำขอไปที่ store ก่อนทุกครั้ง'}
              </p>
              
            </div>
          </div>
        </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'รอคลังยืนยัน', value: partRequestSummary.pending, className: 'bg-amber-50 text-amber-700' },
          { label: 'พร้อมจ่ายแล้ว', value: partRequestSummary.approved, className: 'bg-emerald-50 text-emerald-700' },
          { label: 'ไม่พร้อมจ่าย', value: partRequestSummary.rejected, className: 'bg-rose-50 text-rose-700' },
          { label: 'รอตรวจนับ', value: partRequestSummary.pendingVerification, className: 'bg-blue-50 text-blue-700' },
          { label: 'ค้างคืน/รอใช้จริง', value: partRequestSummary.withdrawn, className: 'bg-slate-100 text-slate-700' },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-4 shadow-sm ${item.className}`}>
            <div className="text-2xl font-bold">{item.value}</div>
            <div className="text-sm">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาอะไหล่, เลขที่แจ้งซ่อม, ชื่อใบงาน, ผู้เบิก..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border py-2 pl-10 pr-4 dark:border-slate-600 dark:bg-slate-700"
              aria-label="ค้นหา"
            />
          </div>
          <select
            value={partStatusFilter}
            onChange={(e) => setPartStatusFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
            aria-label="กรองสถานะอะไหล่"
          >
            <option value="all">ทุกสถานะอะไหล่</option>
            <option value="withdrawn">เบิกแล้ว</option>
            <option value="used">ใช้งานแล้ว</option>
            <option value="pending_verification">รอตรวจนับ</option>
            <option value="verified">ตรวจแล้ว</option>
            <option value="verification_failed">ตรวจนับไม่ตรง</option>
            <option value="completed">ตัดสต็อกแล้ว</option>
            <option value="returned">คืนแล้ว</option>
          </select>
          {hasActivePartsFilters ? (
            <button
              type="button"
              onClick={clearPartsFilters}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              ล้างตัวกรอง
            </button>
          ) : null}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          คิวรอคลัง {filteredPendingPartRequests.length} รายการ • ประวัติล่าสุด {filteredRecentPartRequests.length} รายการ • อะไหล่ในใบงาน {filteredParts.length} รายการ
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
              ให้คลังตรวจสอบสต็อกและตอบกลับว่า &quot;พร้อมจ่าย&quot; หรือ &quot;ไม่พร้อมจ่าย&quot; ก่อนส่งมอบให้ช่าง
            </p>
          </div>
          <span className="text-sm text-gray-500">{filteredPendingPartRequests.length} รายการ</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : filteredPendingPartRequests.length === 0 ? (
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
                {filteredPendingPartRequests.map((request) => (
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
                      {canDirectStockActions ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              handlePartAvailability(
                                request.request_id,
                                'approved',
                                request.item_name,
                                request.tbl_maintenance_requests?.request_number || request.request_number || `REQ-${request.request_id}`,
                                request.requested_by,
                                request.quantity,
                              )
                            }
                            className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                          >
                            พร้อมจ่าย
                          </button>
                          <button
                            onClick={() =>
                              handlePartAvailability(
                                request.request_id,
                                'rejected',
                                request.item_name,
                                request.tbl_maintenance_requests?.request_number || request.request_number || `REQ-${request.request_id}`,
                                request.requested_by,
                                request.quantity,
                              )
                            }
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
          <span className="text-sm text-gray-500">{filteredRecentPartRequests.length} รายการล่าสุด</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : filteredRecentPartRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ยังไม่มีประวัติคำขอเบิกอะไหล่</div>
        ) : (
          <div className="divide-y dark:divide-slate-700">
            {filteredRecentPartRequests.map((request) => (
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
                      {canDirectStockActions && hasUsedParts && !hasBlockingParts ? (
                        <button
                          onClick={() => handleCompleteWithParts(group.requestId, group.requestNumber, group.title)}
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
                              {part.status === 'withdrawn' && canDirectStockActions ? (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800">
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 px-6 py-5 text-white">
              <button
                type="button"
                onClick={() => setShowWithdrawForm(false)}
                className="absolute right-4 top-4 rounded-full bg-white/20 p-2 transition hover:bg-white/30"
                title="ปิด"
              >
                <X size={16} />
              </button>
              <div className="space-y-2">
                <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                  Maintenance Parts
                </span>
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Package className="text-white" />
                  {withdrawDialogTitle}
                </h2>
                <p className="max-w-md text-sm text-white/85">{withdrawDialogDescription}</p>
              </div>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">ผู้ดำเนินการ</div>
                  <div className="mt-1 font-semibold">{session?.user?.name || '-'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:bg-slate-700/60 dark:text-slate-100">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">คงเหลือ WH-01</div>
                  <div className="mt-1 font-semibold">
                    {selectedProduct ? `${availableStock} ${selectedProduct.p_unit || 'ชิ้น'}` : '-'}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">งานซ่อม *</label>
                <select
                  value={withdrawForm.request_id}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, request_id: Number(e.target.value) })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-slate-600 dark:bg-slate-700"
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">สินค้า/อะไหล่ *</label>
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
                  <div className="mt-2 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    สต็อกใกล้หมด
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">จำนวน *</label>
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-slate-600 dark:bg-slate-700"
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

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-700/40">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {canDirectWithdraw ? 'ผู้เบิก *' : 'ผู้ขอเบิก *'}
                </label>
                <input
                  type="text"
                  value={session?.user?.name || ''}
                  readOnly
                  className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  placeholder={canDirectWithdraw ? 'ชื่อผู้เบิก' : 'ชื่อผู้ขอเบิก'}
                />
                {!canDirectWithdraw ? (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                    ระบบจะแจ้ง role store ก่อนยืนยันการจ่ายอะไหล่
                  </p>
                ) : null}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawForm(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={availableStock <= 0}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
                >
                  {withdrawSubmitLabel}
                </button>
              </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedPart ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800">
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 px-6 py-5 text-white">
              <button
                type="button"
                onClick={() => setSelectedPart(null)}
                className="absolute right-4 top-4 rounded-full bg-white/15 p-2 transition hover:bg-white/25"
                title="ปิด"
              >
                <X size={16} />
              </button>
              <div className="space-y-2">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
                  Return to Stock
                </span>
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Undo2 className="text-white" />
                  คืนอะไหล่
                </h2>
                <p className="text-sm text-white/80">คืนของที่ไม่ได้ใช้กลับเข้าสู่สต็อกพร้อมบันทึกประวัติการคืน</p>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">เบิกไป</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {selectedPart.quantity} {selectedPart.unit || 'ชิ้น'}
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">คืนได้สูงสุด</div>
                  <div className="mt-1 font-semibold text-emerald-900">
                    {selectedPart.quantity - selectedPart.returned_qty} {selectedPart.unit || 'ชิ้น'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">สินค้า</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{selectedPart.product?.p_name}</div>
                <div className="mt-1 text-xs text-slate-400">{selectedPart.p_id}</div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-700/40">
                <div className="text-sm text-gray-500">ผู้เบิก</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{selectedPart.withdrawn_by}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {new Date(selectedPart.withdrawn_at).toLocaleString('th-TH')}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">จำนวนที่จะคืน</label>
                <input
                  type="number"
                  value={returnQty}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-700"
                  min="1"
                  max={selectedPart.quantity - selectedPart.returned_qty}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedPart(null)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReturn}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-200 transition hover:brightness-110 dark:shadow-none"
                >
                  คืน
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {actionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800">
            <div className={`relative px-6 py-5 text-white ${
              actionDialog.mode === 'availability'
                ? actionDialog.nextStatus === 'approved'
                  ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-lime-400'
                  : 'bg-gradient-to-br from-rose-500 via-red-500 to-orange-400'
                : actionDialog.mode === 'complete'
                  ? 'bg-gradient-to-br from-blue-600 via-cyan-500 to-sky-400'
                  : 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-500'
            }`}>
              <button
                type="button"
                onClick={() => !dialogSubmitting && setActionDialog(null)}
                className="absolute right-4 top-4 rounded-full bg-white/15 p-2 transition hover:bg-white/25"
                title="ปิด"
              >
                <X size={16} />
              </button>
              <div className="space-y-2">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
                  {actionDialog.mode === 'availability'
                    ? 'Store Decision'
                    : actionDialog.mode === 'complete'
                      ? 'Stock Posting'
                      : 'Maintenance Cleanup'}
                </span>
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  {actionDialog.mode === 'availability' ? (
                    <CheckCircle className="text-white" />
                  ) : actionDialog.mode === 'complete' ? (
                    <ShieldCheck className="text-white" />
                  ) : (
                    <Undo2 className="text-white" />
                  )}
                  {actionDialog.mode === 'availability'
                    ? actionDialog.nextStatus === 'approved'
                      ? 'ยืนยันพร้อมจ่าย'
                      : 'ยืนยันไม่พร้อมจ่าย'
                    : actionDialog.mode === 'complete'
                      ? 'ยืนยันตัดสต็อก'
                      : 'เคลียร์รายการค้าง'}
                </h2>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {actionDialog.mode === 'availability' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">คำขอ</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{actionDialog.requestNumber}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">ผู้ขอ</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{actionDialog.requestedBy}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">จำนวนที่ขอ</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{actionDialog.quantity}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-600 dark:bg-slate-700/40">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">รายการอะไหล่</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{actionDialog.itemName}</div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                      ระบบจะส่งแจ้งเตือนกลับไปยังผู้เบิกทันทีหลังบันทึกสถานะนี้
                    </p>
                  </div>
                  {actionDialog.nextStatus === 'approved' ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        ยืนยันจำนวน *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={actionDialog.confirmedQuantity}
                        onChange={(e) =>
                          setActionDialog((prev) =>
                            prev && prev.mode === 'availability'
                              ? { ...prev, confirmedQuantity: e.target.value }
                              : prev
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-700"
                        placeholder={`กรอกจำนวน ${actionDialog.quantity}`}
                      />
                      <div className="mt-2 text-xs text-slate-400">
                        ระบบจะอนุมัติได้เมื่อจำนวนที่ยืนยันตรงกับจำนวนที่ขอไว้เท่านั้น
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {actionDialog.mode === 'complete' ? (
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-600 dark:bg-slate-700/40">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">ใบงาน</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{actionDialog.requestNumber}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-300">{actionDialog.title}</div>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    ใช้เมื่ออะไหล่ของใบงานนี้ถูกใช้จริงและตรวจครบแล้ว แต่ยังไม่ปิดงานซ่อม
                  </p>
                </div>
              ) : null}

              {actionDialog.mode === 'clearReserved' ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    การดำเนินการนี้จะคืนรายการอะไหล่ที่ค้างอยู่กลับเข้าสู่สต็อก และบันทึกเหตุผลลงประวัติระบบ
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">เหตุผลในการเคลียร์ *</label>
                    <textarea
                      value={actionDialog.reason}
                      onChange={(e) =>
                        setActionDialog((prev) =>
                          prev && prev.mode === 'clearReserved'
                            ? { ...prev, reason: e.target.value }
                            : prev
                        )
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-700"
                      placeholder="ระบุสาเหตุ เช่น เคสปิดไปแล้วแต่มีรายการค้างในระบบ..."
                    />
                    <div className="mt-2 text-xs text-slate-400">
                      อย่างน้อย 8 ตัวอักษร
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionDialog(null)}
                  disabled={dialogSubmitting}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleActionDialogConfirm}
                  disabled={
                    dialogSubmitting
                    || (
                      actionDialog.mode === 'availability'
                      && actionDialog.nextStatus === 'approved'
                      && Number(actionDialog.confirmedQuantity) !== actionDialog.quantity
                    )
                  }
                  className={`flex-1 rounded-2xl px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    actionDialog.mode === 'availability'
                      ? actionDialog.nextStatus === 'approved'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                        : 'bg-gradient-to-r from-rose-500 to-red-500'
                      : actionDialog.mode === 'complete'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500'
                        : 'bg-gradient-to-r from-slate-800 to-slate-600'
                  }`}
                >
                  {dialogSubmitting
                    ? 'กำลังบันทึก...'
                    : actionDialog.mode === 'availability'
                      ? actionDialog.nextStatus === 'approved'
                        ? 'ยืนยันพร้อมจ่าย'
                        : 'ยืนยันไม่พร้อมจ่าย'
                      : actionDialog.mode === 'complete'
                        ? 'ยืนยันตัดสต็อก'
                        : 'ยืนยันเคลียร์รายการ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
