import { Suspense } from 'react';
import LineCustomerRegisterClient from './LineCustomerRegisterClient';

export const metadata = {
    title: 'สมัครลูกค้า LINE | LINE Customer Registration | LINE会員登録',
    description: 'ลงทะเบียนข้อมูลลูกค้าเพื่อรับบริการผ่าน LINE | Register as a LINE customer | LINE会員登録フォーム'
};

export default function LineCustomerRegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen p-6">Loading...</div>}>
            <LineCustomerRegisterClient />
        </Suspense>
    );
}
