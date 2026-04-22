'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canManageMaintenanceTechnicians, canViewMaintenanceTechnicians } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { revalidatePath } from 'next/cache';

const MAINTENANCE_LINE_TECH_ROLES = ['technician', 'leader_technician', 'head_technician'] as const;

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
            where: {
                role: {
                    in: [...MAINTENANCE_LINE_TECH_ROLES],
                },
            },
            orderBy: { created_at: 'desc' }
        });

        if (lineUsers.length === 0) {
            return { success: true, data: lineUsers };
        }

        const lineUserIds = lineUsers.map((user) => user.line_user_id).filter(Boolean);
        const linkedUsers = await prisma.tbl_users.findMany({
            where: {
                line_user_id: {
                    in: lineUserIds,
                },
            },
            select: {
                p_id: true,
                line_user_id: true,
                username: true,
            },
        });

        const userIdByLineId = new Map<string, number>();
        const usernameByLineId = new Map<string, string>();

        for (const lineUser of lineUsers) {
            if (typeof lineUser.user_id === 'number') {
                userIdByLineId.set(lineUser.line_user_id, lineUser.user_id);
            }
        }

        for (const linkedUser of linkedUsers) {
            if (!linkedUser.line_user_id) continue;
            if (!userIdByLineId.has(linkedUser.line_user_id)) {
                userIdByLineId.set(linkedUser.line_user_id, linkedUser.p_id);
            }
            if (linkedUser.username) {
                usernameByLineId.set(linkedUser.line_user_id, linkedUser.username);
            }
        }

        const linkedUserIds = Array.from(new Set(Array.from(userIdByLineId.values())));
        const linkedUsernames = Array.from(
            new Set(
                Array.from(usernameByLineId.values())
                    .map((username) => (username || '').trim())
                    .filter(Boolean),
            ),
        );

        const latestLogByUserId = new Map<number, Date>();
        if (linkedUserIds.length > 0) {
            const groupedByUserId = await prisma.tbl_system_logs.groupBy({
                by: ['user_id'],
                where: {
                    user_id: {
                        in: linkedUserIds,
                    },
                },
                _max: {
                    created_at: true,
                },
            });

            groupedByUserId.forEach((row) => {
                if (typeof row.user_id === 'number' && row._max.created_at) {
                    latestLogByUserId.set(row.user_id, row._max.created_at);
                }
            });
        }

        const latestLogByUsername = new Map<string, Date>();
        if (linkedUsernames.length > 0) {
            const groupedByUsername = await prisma.tbl_system_logs.groupBy({
                by: ['username'],
                where: {
                    user_id: null,
                    username: {
                        in: linkedUsernames,
                    },
                },
                _max: {
                    created_at: true,
                },
            });

            groupedByUsername.forEach((row) => {
                if (row.username && row._max.created_at) {
                    latestLogByUsername.set(row.username, row._max.created_at);
                }
            });
        }

        const enrichedLineUsers = lineUsers.map((lineUser) => {
            const linkedUserId = userIdByLineId.get(lineUser.line_user_id);
            const linkedUsername = usernameByLineId.get(lineUser.line_user_id);
            const systemLastByUserId = typeof linkedUserId === 'number' ? latestLogByUserId.get(linkedUserId) : undefined;
            const systemLastByUsername = linkedUsername ? latestLogByUsername.get(linkedUsername) : undefined;

            const timestamps = [lineUser.last_interaction, systemLastByUserId, systemLastByUsername]
                .filter((value): value is Date => value instanceof Date);

            const latestInteraction = timestamps.length > 0
                ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
                : null;

            return {
                ...lineUser,
                last_interaction: latestInteraction,
            };
        });

        return { success: true, data: enrichedLineUsers };
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
