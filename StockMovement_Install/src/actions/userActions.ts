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

    if (!username || !password || !role) {
        return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Map role to role_id ideally, but for now just saving string role is key for NextAuth
        // Legacy might use role_id. 
        // admin=1, manager=2, employee=3 ?
        let role_id = 3;
        if (role === 'admin') role_id = 1;
        if (role === 'manager') role_id = 2;

        await prisma.tbl_users.create({
            data: {
                username,
                password: hashedPassword,
                role,
                role_id,
            },
        });

        const session = await auth();
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

    if (!p_id || !role) {
        return { error: 'ข้อมูลไม่ถูกต้อง' };
    }

    let role_id = 3;
    if (role === 'admin') role_id = 1;
    if (role === 'manager') role_id = 2;

    const data: any = { role, role_id };

    if (password && password.trim() !== '') {
        data.password = await bcrypt.hash(password, 10);
    }

    try {
        await prisma.tbl_users.update({
            where: { p_id },
            data,
        });

        const session = await auth();
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
        await prisma.tbl_users.delete({
            where: { p_id },
        });

        const session = await auth();
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
