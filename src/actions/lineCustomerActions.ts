'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { logSystemAction } from '@/lib/logger';
import { canManageLineCustomers, canViewLineCustomers } from '@/lib/rbac';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { COMMON_ACTION_MESSAGES, LINE_CUSTOMER_ACTION_MESSAGES } from '@/lib/action-messages';
import { maskPII } from '@/lib/security';

function normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '').trim();
}

function normalizeRoomLookupValue(value: string | null | undefined): string {
    return (value || '')
        .normalize('NFKC')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[-_/]/g, '');
}

type RoomResolution =
    | { status: 'missing' }
    | { status: 'not_found' }
    | { status: 'resolved'; roomCode: string };

async function resolveCustomerRoomNumber(inputRoomNumber: string | null | undefined): Promise<RoomResolution> {
    const rawInput = (inputRoomNumber || '').trim();
    if (!rawInput) return { status: 'missing' };

    const normalizedInput = normalizeRoomLookupValue(rawInput);
    if (!normalizedInput) return { status: 'missing' };

    const rooms = await prisma.tbl_rooms.findMany({
        where: { active: true },
        select: { room_code: true },
        orderBy: { room_code: 'asc' },
    });

    if (rooms.length === 0) {
        return { status: 'not_found' };
    }

    const normalizedRoomRows = rooms.map((room) => ({
        roomCode: room.room_code,
        normalized: normalizeRoomLookupValue(room.room_code),
    }));

    // 1) Exact normalized match, e.g. A-201 -> A201
    const exact = normalizedRoomRows.find((row) => row.normalized === normalizedInput);
    if (exact) {
        return { status: 'resolved', roomCode: exact.roomCode };
    }

    // 2) Numeric fallback, e.g. 201 -> A201
    if (/^\d+$/.test(normalizedInput)) {
        const tailMatches = normalizedRoomRows.filter((row) => row.normalized.endsWith(normalizedInput));
        if (tailMatches.length > 0) {
            // Prefer shortest code first (A201 over TOWERA201), then alphabetical.
            tailMatches.sort((left, right) => {
                if (left.normalized.length !== right.normalized.length) {
                    return left.normalized.length - right.normalized.length;
                }
                return left.normalized.localeCompare(right.normalized);
            });
            return { status: 'resolved', roomCode: tailMatches[0].roomCode };
        }
    }

    // 3) No match in master room list -> reject to keep customer room references canonical
    return { status: 'not_found' };
}

async function getLineCustomerAuthContext(level: 'read' | 'edit' = 'read') {
    const session = await auth();
    if (!session?.user) {
        return null;
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser);
    const allowed = level === 'edit'
        ? canManageLineCustomers(permissionContext.role, permissionContext.permissions)
        : canViewLineCustomers(permissionContext.role, permissionContext.permissions);

    if (!allowed) {
        return null;
    }

    return { session };
}

export async function registerLineCustomer(input: {
    line_user_id: string;
    full_name: string;
    phone_number: string;
    room_number: string;
    display_name?: string | null;
    picture_url?: string | null;
    notes?: string | null;
}) {
    try {
        const lineUserId = input.line_user_id.trim();
        const fullName = input.full_name.trim();
        const phone = normalizePhone(input.phone_number);
        const roomResolution = await resolveCustomerRoomNumber(input.room_number);

        if (!lineUserId) return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requireLineUserId };
        if (!fullName) return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requireFullName };
        if (!phone) return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requirePhoneNumber };
        if (roomResolution.status === 'missing') return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requireRoomNumber };
        if (roomResolution.status === 'not_found') return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.roomNumberNotFound };

        const roomNumber = roomResolution.roomCode;

        const customer = await prisma.tbl_line_customers.upsert({
            where: { line_user_id: lineUserId },
            update: {
                full_name: fullName,
                phone_number: phone,
                room_number: roomNumber,
                display_name: input.display_name ?? undefined,
                picture_url: input.picture_url ?? undefined,
                notes: input.notes ?? undefined,
                is_active: true,
                last_interaction: new Date(),
            },
            create: {
                line_user_id: lineUserId,
                full_name: fullName,
                phone_number: phone,
                room_number: roomNumber,
                display_name: input.display_name ?? null,
                picture_url: input.picture_url ?? null,
                notes: input.notes ?? null,
                is_active: true,
                registered_at: new Date(),
                last_interaction: new Date(),
            },
        });

        revalidatePath('/settings/line-customers');
        return { success: true, data: customer };
    } catch (error) {
        console.error('registerLineCustomer error:', error);
        return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.registerFailed };
    }
}

export async function getLineCustomerByLineId(line_user_id: string) {
    try {
        if (!line_user_id?.trim()) return { success: true, data: null };

        const customer = await prisma.tbl_line_customers.findUnique({
            where: { line_user_id: line_user_id.trim() },
        });

        return { success: true, data: customer };
    } catch (error) {
        console.error('getLineCustomerByLineId error:', error);
        return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.loadCustomerFailed };
    }
}

export async function getLineCustomers() {
    try {
        const authContext = await getLineCustomerAuthContext('read');
        if (!authContext) return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };

        // Show only true "customer registrations" and exclude internal LINE users.
        // 1) Must have phone number and room number (required from customer-register flow)
        // 2) Must not be mapped as internal staff user (role assigned or linked user_id)
        const [customers, internalLineUsers] = await Promise.all([
            prisma.tbl_line_customers.findMany({
                where: {
                    AND: [
                        { phone_number: { not: null } },
                        { phone_number: { not: '' } },
                        { room_number: { not: null } },
                        { room_number: { not: '' } },
                    ],
                },
                orderBy: [
                    { is_active: 'desc' },
                    { updated_at: 'desc' },
                ],
            }),
            prisma.tbl_line_users.findMany({
                where: {
                    OR: [
                        { role: { not: 'pending' } },
                        { user_id: { not: null } },
                    ],
                },
                select: { line_user_id: true },
            }),
        ]);

        const internalLineIdSet = new Set(internalLineUsers.map((row) => row.line_user_id));
        const filteredCustomers = customers.filter((customer) => {
            if (internalLineIdSet.has(customer.line_user_id)) return false;
            if (!customer.phone_number?.trim()) return false;
            if (!customer.room_number?.trim()) return false;
            return true;
        });

        return { success: true, data: filteredCustomers };
    } catch (error) {
        console.error('getLineCustomers error:', error);
        return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.loadCustomersFailed };
    }
}

export async function updateLineCustomer(data: {
    id: number;
    full_name: string;
    phone_number: string;
    room_number: string;
    notes?: string | null;
}) {
    try {
        const authContext = await getLineCustomerAuthContext('edit');
        if (!authContext) return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        const { session } = authContext;

        const fullName = data.full_name.trim();
        const phone = normalizePhone(data.phone_number);
        const roomResolution = await resolveCustomerRoomNumber(data.room_number);

        if (!fullName) return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requireFullName };
        if (!phone) return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requirePhoneNumber };
        if (roomResolution.status === 'missing') return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.requireRoomNumber };
        if (roomResolution.status === 'not_found') return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.roomNumberNotFound };

        const roomNumber = roomResolution.roomCode;

        const updated = await prisma.tbl_line_customers.update({
            where: { id: data.id },
            data: {
                full_name: fullName,
                phone_number: phone,
                room_number: roomNumber,
                notes: data.notes ?? null,
            },
        });

        await logSystemAction(
            'UPDATE',
            'LineCustomer',
            data.id,
            `${LINE_CUSTOMER_ACTION_MESSAGES.updatedLogPrefix} ${maskPII.name(fullName)}`,
            parseInt(session.user.id as string) || 0,
            maskPII.name(session.user.name || COMMON_ACTION_MESSAGES.systemUser),
            COMMON_ACTION_MESSAGES.unknownSource,
        );

        revalidatePath('/settings/line-customers');
        return { success: true, data: updated };
    } catch (error) {
        console.error('updateLineCustomer error:', error);
        return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.updateFailed };
    }
}

export async function toggleLineCustomerActive(id: number, isActive: boolean) {
    try {
        const authContext = await getLineCustomerAuthContext('edit');
        if (!authContext) return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        const { session } = authContext;

        const updated = await prisma.tbl_line_customers.update({
            where: { id },
            data: { is_active: isActive },
        });

        await logSystemAction(
            'UPDATE',
            'LineCustomer',
            id,
            isActive ? LINE_CUSTOMER_ACTION_MESSAGES.activatedLog : LINE_CUSTOMER_ACTION_MESSAGES.deactivatedLog,
            parseInt(session.user.id as string) || 0,
            maskPII.name(session.user.name || COMMON_ACTION_MESSAGES.systemUser),
            COMMON_ACTION_MESSAGES.unknownSource,
        );

        revalidatePath('/settings/line-customers');
        return { success: true, data: updated };
    } catch (error) {
        console.error('toggleLineCustomerActive error:', error);
        return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.toggleStatusFailed };
    }
}

export async function deleteLineCustomer(id: number) {
    try {
        const authContext = await getLineCustomerAuthContext('edit');
        if (!authContext) return { success: false, error: COMMON_ACTION_MESSAGES.unauthorized };
        const { session } = authContext;

        await prisma.tbl_line_customers.delete({ where: { id } });

        await logSystemAction(
            'DELETE',
            'LineCustomer',
            id,
            LINE_CUSTOMER_ACTION_MESSAGES.deletedLog,
            parseInt(session.user.id as string) || 0,
            session.user.name || COMMON_ACTION_MESSAGES.systemUser,
            COMMON_ACTION_MESSAGES.unknownSource,
        );

        revalidatePath('/settings/line-customers');
        return { success: true };
    } catch (error) {
        console.error('deleteLineCustomer error:', error);
        return { success: false, error: LINE_CUSTOMER_ACTION_MESSAGES.deleteFailed };
    }
}
