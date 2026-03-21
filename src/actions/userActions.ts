'use server';

import { auth } from '@/auth';
import { logSystemAction } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { isAdminRole, isManagerRole } from '@/lib/roles';
import { updateUserSchema, validateData } from '@/lib/validation';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

async function resolveRoleMetadata(role: string, requestedApprover: boolean) {
    const roleRecord = await prisma.tbl_roles.findUnique({
        where: { role_name: role },
        select: { role_id: true },
    });

    if (!roleRecord) {
        throw new Error(`Role "${role}" not found`);
    }

    return {
        role_id: roleRecord.role_id,
        is_approver: isManagerRole(role) ? true : requestedApprover,
    };
}

export async function createUser(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    const email = formData.get('email') as string;
    const line_user_id = formData.get('line_user_id') as string;
    const is_approver_form = formData.get('is_approver') === 'true';

    if (!username || !password || !role) {
        return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    const session = await auth();
    if (!session || !isAdminRole((session.user as { role?: string })?.role)) {
        return { error: 'Unauthorized: Admin access required' };
    }

    const rawData = {
        username: username.trim(),
        role,
        email: email?.trim() === '' ? null : email?.trim(),
        line_user_id: line_user_id?.trim() === '' ? null : line_user_id?.trim(),
    };

    try {
        const validData = validateData(updateUserSchema, rawData, 'User');
        const hashedPassword = await bcrypt.hash(password, 10);
        const { role_id, is_approver } = await resolveRoleMetadata(validData.role, is_approver_form);

        await prisma.tbl_users.create({
            data: {
                username: validData.username,
                password: hashedPassword,
                role: validData.role,
                role_id,
                email: validData.email || null,
                line_user_id: validData.line_user_id || null,
                is_approver,
            },
        });

        await logSystemAction(
            'CREATE',
            'User',
            validData.username,
            `Created user: ${validData.username} (Role: ${validData.role})`,
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'unknown',
        );
    } catch (error: unknown) {
        console.error('Create user failed:', error);
        if ((error as { code?: string }).code === 'P2002') {
            return { error: 'Username นี้มีอยู่ในระบบแล้ว' };
        }
        if (error instanceof Error && error.message.includes('Validation Error')) {
            return { error: error.message };
        }
        return { error: `เพิ่มผู้ใช้งานล้มเหลว: ${error instanceof Error ? error.message : 'Error'}` };
    }

    revalidatePath('/roles');
    return { success: true };
}

export async function updateUser(formData: FormData) {
    const p_id = parseInt(formData.get('p_id') as string, 10);
    const role = formData.get('role') as string;
    const password = formData.get('password') as string;
    const rawEmail = formData.get('email') as string;
    const rawLineId = formData.get('line_user_id') as string;
    const isApproverVal = formData.get('is_approver');

    if (!p_id || !role) {
        return { error: 'ข้อมูลไม่ถูกต้อง' };
    }

    const session = await auth();
    if (!session || !isAdminRole((session.user as { role?: string })?.role)) {
        return { error: 'Unauthorized: Admin access required' };
    }

    try {
        const { role_id, is_approver } = await resolveRoleMetadata(
            role,
            isApproverVal === 'true' || isApproverVal === 'on',
        );

        const data: Record<string, unknown> = {
            role,
            role_id,
            email: rawEmail?.trim() === '' ? null : rawEmail?.trim(),
            line_user_id: rawLineId?.trim() === '' ? null : rawLineId?.trim(),
            is_approver,
        };

        if (password?.trim()) {
            data.password = await bcrypt.hash(password, 10);
        }

        await prisma.tbl_users.update({
            where: { p_id },
            data,
        });

        await logSystemAction(
            'UPDATE',
            'User',
            p_id,
            `Updated user ID: ${p_id} (Role: ${role})`,
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'unknown',
        );
    } catch (error) {
        console.error('Update user failed:', error);
        return { error: 'อัปเดตข้อมูลล้มเหลว' };
    }

    revalidatePath('/roles');
    return { success: true };
}

export async function deleteUser(p_id: number) {
    try {
        const session = await auth();
        if (!session || !isAdminRole((session.user as { role?: string })?.role)) {
            return { error: 'Unauthorized: Admin access required' };
        }

        await prisma.tbl_users.delete({
            where: { p_id },
        });

        await logSystemAction(
            'DELETE',
            'User',
            p_id,
            `Deleted user ID: ${p_id}`,
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'unknown',
        );
    } catch {
        return { error: 'ลบผู้ใช้งานล้มเหลว' };
    }
    revalidatePath('/roles');
}

export async function unlockUser(p_id: number) {
    try {
        const session = await auth();
        if (!session || !isAdminRole((session.user as { role?: string })?.role)) {
            return { error: 'Unauthorized: Admin access required' };
        }

        const user = await prisma.tbl_users.update({
            where: { p_id },
            data: {
                failed_attempts: 0,
                locked_until: null,
            },
        });

        await logSystemAction(
            'UPDATE',
            'User',
            p_id,
            `Unlocked user ID: ${p_id} (${user.username})`,
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'user_management',
        );

        revalidatePath('/roles');
        return { success: true };
    } catch (error) {
        console.error('Unlock user failed:', error);
        return { error: 'ปลดล็อคผู้ใช้งานล้มเหลว' };
    }
}

export async function updateUserPermissions(p_id: number, permissions: Record<string, boolean>) {
    try {
        const session = await auth();
        if (!session || !isAdminRole((session.user as { role?: string })?.role)) {
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        const user = await prisma.tbl_users.update({
            where: { p_id },
            data: {
                custom_permissions: JSON.stringify(permissions),
            },
        });

        await logSystemAction(
            'แก้ไขสิทธิ์',
            'User',
            p_id,
            `แก้ไขสิทธิ์รายบุคคลของ User: ${user.username} | แก้ไขโดย: ${session.user.name}`,
            session.user.id ? (parseInt(session.user.id as string, 10) || 0) : 0,
            session.user.name || 'Unknown',
            'user_management',
        );

        revalidatePath('/roles');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Error updating user permissions:', error);
        return { success: false, error: 'Failed to update user permissions' };
    }
}
