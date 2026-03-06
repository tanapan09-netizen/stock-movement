'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { logSystemAction } from '@/lib/logger';
import { auth } from '@/auth';

export async function createUser(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    const email = formData.get('email') as string | null;
    const line_user_id = formData.get('line_user_id') as string | null;
    const is_approver_form = formData.get('is_approver') === 'true';

    if (!username || !password || !role) {
        return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== 'admin') {
        return { error: 'Unauthorized: Admin access required' };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Map role to role_id
        let role_id = 3;
        let is_approver = is_approver_form;

        if (role === 'admin') { role_id = 1; is_approver = true; }
        if (role === 'manager') { role_id = 2; is_approver = true; }
        if (role === 'technician') role_id = 4; // Assuming IDs
        if (role === 'accounting') role_id = 5;
        if (role === 'purchasing') role_id = 6;
        if (role === 'operation') role_id = 7;

        await prisma.tbl_users.create({
            data: {
                username,
                password: hashedPassword,
                role,
                role_id,
                email: email || null,
                line_user_id: line_user_id || null,
                is_approver
            },
        });

        // const session = await auth();
        await logSystemAction(
            'CREATE',
            'User',
            username,
            `Created user: ${username} (Role: ${role})`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error: any) {
        console.error('Create user failed:', error);
        if (error.code === 'P2002') {
            return { error: 'Username นี้มีอยู่ในระบบแล้ว' };
        }
        return { error: 'เพิ่มผู้ใช้งานล้มเหลว' };
    }

    revalidatePath('/roles');
    return { success: true };
}

export async function updateUser(formData: FormData) {
    const p_id = parseInt(formData.get('p_id') as string);
    const role = formData.get('role') as string;
    const password = formData.get('password') as string; // Optional
    const email = formData.get('email') as string | null;
    const line_user_id = formData.get('line_user_id') as string | null;
    const isApproverVal = formData.get('is_approver');
    const is_approver_form = isApproverVal === 'true' || isApproverVal === 'on';

    if (!p_id || !role) {
        return { error: 'ข้อมูลไม่ถูกต้อง' };
    }

    let role_id = 3;
    let is_approver = is_approver_form;

    if (role === 'admin') { role_id = 1; is_approver = true; }
    if (role === 'manager') { role_id = 2; is_approver = true; }
    if (role === 'technician') role_id = 4;
    if (role === 'accounting') role_id = 5;
    if (role === 'purchasing') role_id = 6;
    if (role === 'operation') role_id = 7;

    const data: any = {
        role,
        role_id,
        email: email || null,
        line_user_id: line_user_id || null,
        is_approver
    };

    if (password && password.trim() !== '') {
        data.password = await bcrypt.hash(password, 10);
    }

    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== 'admin') {
        return { error: 'Unauthorized: Admin access required' };
    }

    try {
        await prisma.tbl_users.update({
            where: { p_id },
            data,
        });

        // const session = await auth();
        await logSystemAction(
            'UPDATE',
            'User',
            p_id,
            `Updated user ID: ${p_id} (Role: ${role})`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        return { error: 'อัปเดตข้อมูลล้มเหลว' };
    }

    revalidatePath('/roles');
    return { success: true };
}

export async function deleteUser(p_id: number) {
    // Prevent deleting self? or last admin?
    // For now simple delete
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || (session.user as any).role !== 'admin') {
            return { error: 'Unauthorized: Admin access required' };
        }

        await prisma.tbl_users.delete({
            where: { p_id },
        });

        // const session = await auth();
        await logSystemAction(
            'DELETE',
            'User',
            p_id,
            `Deleted user ID: ${p_id}`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'unknown'
        );
    } catch (error) {
        return { error: 'ลบผู้ใช้งานล้มเหลว' };
    }
    revalidatePath('/roles');
}

export async function unlockUser(p_id: number) {
    try {
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || (session.user as any).role !== 'admin') {
            return { error: 'Unauthorized: Admin access required' };
        }

        const user = await prisma.tbl_users.update({
            where: { p_id },
            data: {
                failed_attempts: 0,
                locked_until: null
            }
        });

        // const session = await auth();
        await logSystemAction(
            'UPDATE',
            'User',
            p_id,
            `Unlocked user ID: ${p_id} (${user.username})`,
            session?.user?.id ? parseInt(session.user.id) : 0,
            session?.user?.name || 'Unknown',
            'user_management' // Updated category to be more specific if possible, or keep 'unknown' if schema restricts
        );

        revalidatePath('/roles');
        return { success: true };
    } catch (error) {
        console.error('Unlock user failed:', error);
        return { error: 'ปลดล็อคผู้ใช้งานล้มเหลว' };
    }
}
