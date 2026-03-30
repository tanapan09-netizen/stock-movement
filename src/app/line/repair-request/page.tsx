import { Metadata } from 'next';
import LineRepairRequestClient from './LineRepairRequestClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: 'แจ้งซ่อม - Stock Movement',
    description: 'หน้าสำหรับแจ้งซ่อมผ่านระบบ LINE สำหรับลูกค้า',
};

import { Suspense } from 'react';

export default function LineRepairRequestPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>}>
            <LineRepairRequestClient />
        </Suspense>
    );
}
