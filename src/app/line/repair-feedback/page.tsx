import { Metadata } from 'next';
import { Suspense } from 'react';
import LineRepairFeedbackClient from './LineRepairFeedbackClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
    title: 'ประเมินงานซ่อม - Stock Movement',
    description: 'หน้าประเมินความพึงพอใจหลังงานซ่อมเสร็จ',
};

export default function LineRepairFeedbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LineRepairFeedbackClient />
        </Suspense>
    );
}

