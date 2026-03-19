import { Suspense } from 'react';
import LineCustomerRegisterClient from './LineCustomerRegisterClient';

export const metadata = {
    title: 'สมัครลูกค้า LINE',
    description: 'ลงทะเบียนข้อมูลลูกค้าเพื่อรับบริการผ่าน LINE'
};

export default function LineCustomerRegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen p-6">Loading...</div>}>
            <LineCustomerRegisterClient />
        </Suspense>
    );
}
