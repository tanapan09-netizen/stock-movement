import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { canViewAdminRoles } from '@/lib/rbac';
import { isLockedPermissionRole } from '@/lib/roles';
import { getUserPermissionContext } from '@/lib/server/permission-service';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
        }

        const permissionContext = await getUserPermissionContext(session.user);
        if (!canViewAdminRoles(permissionContext.role, permissionContext.permissions)) {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้' }, { status: 403 });
        }

        const { id } = await params;
        const userId = parseInt(id, 10);

        if (Number.isNaN(userId)) {
            return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
        }

        const user = await prisma.tbl_users.findUnique({
            where: { p_id: userId },
            select: {
                p_id: true,
                username: true,
                role: true,
                email: true,
                line_user_id: true,
                is_approver: true,
                created_at: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
        }

        return NextResponse.json({
            ...user,
            is_current_user: Number(session.user.id) === user.p_id,
            is_role_locked: isLockedPermissionRole(user.role),
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
    }
}