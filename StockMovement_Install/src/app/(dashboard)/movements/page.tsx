import { auth } from '@/auth';
import MovementsClient from './MovementsClient';
import { getFilteredMovements } from '@/actions/movementActions';

export default async function MovementsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === 'admin';

    // Await searchParams (required in Next.js 16+)
    const params = await searchParams;

    const page = Number(params.page) || 1;
    const search = params.search as string || '';
    const startDate = params.startDate as string;
    const endDate = params.endDate as string;

    const { movements, total } = await getFilteredMovements({
        page,
        limit: 50,
        search,
        startDate,
        endDate
    });

    const totalPages = Math.ceil(total / 50);

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ประวัติการเคลื่อนไหวสินค้า</h1>
                    <p className="text-sm text-gray-500">บันทึกการเข้า-ออกของสินค้าทั้งหมด</p>
                </div>
                {isAdmin && (
                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                        Admin Mode: สามารถแก้ไข/ลบได้
                    </div>
                )}
            </div>

            <MovementsClient
                initialMovements={movements}
                total={total}
                isAdmin={isAdmin}
                currentPage={page}
                totalPages={totalPages}
            />
        </div>
    );
}
