import { Suspense } from 'react';
import MaintenanceClient from './MaintenanceClient';

export const metadata = {
    title: 'แจ้งซ่อม | Stock Movement',
    description: 'ระบบแจ้งซ่อม'
};

export default function MaintenancePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>}>
            <MaintenanceClient />
        </Suspense>
    );
}
