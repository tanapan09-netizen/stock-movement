import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ImportClient from './ImportClient';

export default async function ImportPage() {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role || 'employee';

    if (userRole !== 'admin') {
        redirect('/products');
    }

    return <ImportClient />;
}
