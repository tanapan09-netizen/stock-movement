import { Suspense } from 'react';
import LineCustomerRegisterClient from './LineCustomerRegisterClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
    title: 'สมัครลูกค้า LINE | LINE Customer Registration | LINE会員登録',
    description: 'ลงทะเบียนข้อมูลลูกค้าเพื่อรับบริการผ่าน LINE | Register as a LINE customer | LINE会員登録フォーム'
};

export default function LineCustomerRegisterPage() {
    const customerRegisterLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_CUSTOMER_REGISTER_ID?.trim() || '2008227129-YilYRFJv';

    return (
        <Suspense fallback={<div className="min-h-screen p-6">Loading...</div>}>
            <LineCustomerRegisterClient customerRegisterLiffId={customerRegisterLiffId} />
        </Suspense>
    );
}
