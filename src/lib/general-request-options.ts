import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from 'lucide-react';

export const GENERAL_REQUEST_STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    pending: { label: 'รอรับเรื่อง', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    approved: { label: 'รับเรื่องแล้ว', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    in_progress: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2 },
    confirmed: { label: 'ยืนยันงานเสร็จ', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2 },
    completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    verified: { label: 'ตรวจสอบแล้ว', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: ShieldCheck },
    urgent: { label: 'ด่วน', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
};

export const GENERAL_REQUEST_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    urgent: { label: 'เร่งด่วนมาก', color: 'bg-red-100 text-red-700' },
    high: { label: 'เร่งด่วน', color: 'bg-orange-100 text-orange-700' },
    normal: { label: 'ปกติ', color: 'bg-blue-100 text-blue-700' },
    low: { label: 'ไม่เร่งด่วน', color: 'bg-gray-100 text-gray-700' },
};

export const GENERAL_REQUEST_PRIORITY_OPTIONS = [
    { value: 'low', label: GENERAL_REQUEST_PRIORITY_CONFIG.low.label },
    { value: 'normal', label: GENERAL_REQUEST_PRIORITY_CONFIG.normal.label },
    { value: 'high', label: GENERAL_REQUEST_PRIORITY_CONFIG.high.label },
    { value: 'urgent', label: GENERAL_REQUEST_PRIORITY_CONFIG.urgent.label },
] as const;

export const GENERAL_REQUEST_CATEGORY_OPTIONS = [
    { value: 'general', label: 'ทั่วไป' },
    { value: 'electrical', label: 'ไฟฟ้า' },
    { value: 'plumbing', label: 'ประปา' },
    { value: 'air_conditioning', label: 'แอร์/ระบบปรับอากาศ' },
    { value: 'structural', label: 'โครงสร้าง/อาคาร' },
    { value: 'it', label: 'IT/คอมพิวเตอร์' },
    { value: 'furniture', label: 'เฟอร์นิเจอร์/ของตกแต่ง' },
    { value: 'other', label: 'อื่นๆ' },
] as const;
