'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { registerLineCustomer, getLineCustomerByLineId } from '@/actions/lineCustomerActions';
import { CheckCircle2, UserRound, Phone, MessageSquareText } from 'lucide-react';

export default function LineCustomerRegisterClient() {
    const searchParams = useSearchParams();
    const lineUserIdFromQuery = (searchParams.get('line_user_id') || '').trim();

    const [lineUserId, setLineUserId] = useState(lineUserIdFromQuery);
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        async function hydrate() {
            if (!lineUserIdFromQuery) return;
            const result = await getLineCustomerByLineId(lineUserIdFromQuery);
            if (result.success && result.data) {
                setLineUserId(result.data.line_user_id);
                setFullName(result.data.full_name || '');
                setPhoneNumber(result.data.phone_number || '');
                setNotes(result.data.notes || '');
            }
        }
        hydrate();
    }, [lineUserIdFromQuery]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSaved(false);
        setLoading(true);
        setMessage('');

        const result = await registerLineCustomer({
            line_user_id: lineUserId,
            full_name: fullName,
            phone_number: phoneNumber,
            notes
        });

        if (result.success) {
            setSaved(true);
            setMessage('บันทึกข้อมูลสำเร็จ สามารถปิดหน้านี้และใช้งาน LINE ได้ทันที');
        } else {
            setMessage(result.error || 'บันทึกข้อมูลไม่สำเร็จ');
        }

        setLoading(false);
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-10">
            <div className="max-w-lg mx-auto bg-white border border-green-100 rounded-2xl shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">สมัครลูกค้า LINE</h1>
                <p className="text-sm text-gray-500 mb-6">กรอกชื่อและเบอร์โทรสำหรับลงทะเบียนลูกค้า</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LINE User ID *</label>
                        <input
                            type="text"
                            value={lineUserId}
                            onChange={(e) => setLineUserId(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="เช่น U1234567890..."
                        />
                        <p className="text-xs text-gray-400 mt-1">หากเข้าเว็บจากลิงก์ใน LINE ระบบจะกรอกค่าให้อัตโนมัติ</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <UserRound size={14} /> ชื่อ-นามสกุล *
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="ระบุชื่อผู้ติดต่อ"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Phone size={14} /> เบอร์โทร *
                        </label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="08xxxxxxxx"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <MessageSquareText size={14} /> หมายเหตุ
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            rows={3}
                            placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2.5 disabled:opacity-60"
                    >
                        {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลลูกค้า'}
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 text-sm rounded-lg px-3 py-2 ${saved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        <div className="flex items-center gap-2">
                            {saved && <CheckCircle2 size={16} />}
                            <span>{message}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
