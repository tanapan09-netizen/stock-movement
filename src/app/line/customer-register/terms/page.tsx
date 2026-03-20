import { Suspense } from 'react';
import TermsClient from './TermsClient';

export const metadata = {
    title: 'Data Collection Policy | นโยบายข้อมูล | 個人情報方針',
    description: 'Personal data collection and privacy policy for LINE customer registration.',
};

export default function TermsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen p-6">Loading...</div>}>
            <TermsClient />
        </Suspense>
    );
}
