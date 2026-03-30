import { Metadata } from 'next';
import { Suspense } from 'react';
import LineRepairRequestClient from './LineRepairRequestClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: 'แจ้งซ่อม - Stock Movement',
    description: 'หน้าสำหรับแจ้งซ่อมผ่านระบบ LINE สำหรับลูกค้า',
};

export default function LineRepairRequestPage() {
    const repairRequestLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_REPAIR_REQUEST_ID?.trim() || '2008227129-RRioS2SM';

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LineRepairRequestClient repairRequestLiffId={repairRequestLiffId} />
        </Suspense>
    );
}
