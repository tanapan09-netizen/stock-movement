'use client';

import { useParams } from 'next/navigation';
import PettyCashPrintClient from './PettyCashPrintClient';

export default function PettyCashPrintPage() {
    const params = useParams();
    const id = params?.id;

    if (!id) {
        return <div className="p-8 text-center text-red-500">ไม่พบรหัสคำขอ</div>;
    }

    return <PettyCashPrintClient requestId={Number(id)} />;
}
