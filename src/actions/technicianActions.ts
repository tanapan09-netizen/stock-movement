'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canManageMaintenanceTechnicians, canViewMaintenanceTechnicians } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { revalidatePath } from 'next/cache';

async function getTechnicianAuthContext(level: 'read' | 'edit' = 'read') {
    const session = await auth();
    if (!session?.user) {
        return null;
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    const allowed = level === 'edit'
        ? canManageMaintenanceTechnicians(permissionContext.role, permissionContext.permissions)
        : canViewMaintenanceTechnicians(permissionContext.role, permissionContext.permissions, permissionContext.isApprover);

    if (!allowed) {
        return null;
    }

    return { session };
}

export async function getTechnicians() {
    try {
        const authContext = await getTechnicianAuthContext('read');
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const technicians = await prisma.tbl_technicians.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: technicians };
    } catch (error) {
        console.error('Error fetching technicians:', error);
        return { success: false, error: 'Failed to fetch technicians' };
    }
}

export async function getLineTechnicians() {
    try {
        const authContext = await getTechnicianAuthContext('read');
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const lineUsers = await prisma.tbl_line_users.findMany({
            where: { role: 'technician' },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: lineUsers };
    } catch (error) {
        console.error('Error fetching LINE technicians:', error);
        return { success: false, error: 'Failed to fetch LINE technicians' };
    }
}

export async function getActiveTechnicians() {
    try {
        const authContext = await getTechnicianAuthContext('read');
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const technicians = await prisma.tbl_technicians.findMany({
            where: { status: 'active' },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: technicians };
    } catch (error) {
        console.error('Error fetching active technicians:', error);
        return { success: false, error: 'Failed to fetch technicians' };
    }
}

export async function createTechnician(data: {
    name: string;
    phone?: string;
    email?: string;
    line_user_id?: string;
    specialty?: string;
    notes?: string;
}) {
    try {
        const authContext = await getTechnicianAuthContext('edit');
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const technician = await prisma.tbl_technicians.create({
            data: {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                line_user_id: data.line_user_id || null,
                specialty: data.specialty || null,
                notes: data.notes || null,
                status: 'active'
            }
        });
        revalidatePath('/maintenance/technicians');
        return { success: true, data: technician };
    } catch (error) {
        console.error('Error creating technician:', error);
        return { success: false, error: 'Failed to create technician' };
    }
}

export async function updateTechnician(tech_id: number, data: {
    name?: string;
    phone?: string;
    email?: string;
    line_user_id?: string;
    specialty?: string;
    status?: string;
    notes?: string;
}) {
    try {
        const authContext = await getTechnicianAuthContext('edit');
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        const technician = await prisma.tbl_technicians.update({
            where: { tech_id },
            data: {
                name: data.name,
                phone: data.phone,
                email: data.email,
                line_user_id: data.line_user_id,
                specialty: data.specialty,
                status: data.status,
                notes: data.notes
            }
        });
        revalidatePath('/maintenance/technicians');
        return { success: true, data: technician };
    } catch (error) {
        console.error('Error updating technician:', error);
        return { success: false, error: 'Failed to update technician' };
    }
}

export async function deleteTechnician(tech_id: number) {
    try {
        const authContext = await getTechnicianAuthContext('edit');
        if (!authContext) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.tbl_technicians.delete({
            where: { tech_id }
        });
        revalidatePath('/maintenance/technicians');
        return { success: true };
    } catch (error) {
        console.error('Error deleting technician:', error);
        return { success: false, error: 'Failed to delete technician' };
    }
}
