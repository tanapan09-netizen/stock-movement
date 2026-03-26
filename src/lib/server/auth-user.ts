import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { normalizeRole, SYSTEM_ROLES } from '@/lib/roles';

export interface AuthSessionLike {
    id?: string | null;
    name?: string | null;
    role?: string | null;
    is_approver?: boolean | null;
}

const PROVISIONABLE_LINE_ROLES = new Set<string>(SYSTEM_ROLES);

function sanitizeUsernameCandidate(value: string) {
    return value
        .normalize('NFKC')
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}._-]/gu, '')
        .replace(/^[_\-.]+|[_\-.]+$/g, '')
        .slice(0, 50);
}

async function createLinkedUserForLineAccount(lineUser: {
    id: number;
    line_user_id: string;
    display_name: string | null;
    full_name: string | null;
    role: string;
    is_approver: boolean;
}) {
    const normalizedRole = normalizeRole(lineUser.role) || 'employee';
    const preferredName = lineUser.full_name?.trim() || lineUser.display_name?.trim() || `line_user_${lineUser.id}`;
    const baseUsername = sanitizeUsernameCandidate(preferredName) || `line_user_${lineUser.id}`;
    const suffix = `_line${lineUser.id}`;

    return prisma.$transaction(async (tx) => {
        const currentLineUser = await tx.tbl_line_users.findUnique({
            where: { id: lineUser.id },
            select: { user_id: true },
        });

        if (currentLineUser?.user_id) {
            const existingLinkedUser = await tx.tbl_users.findUnique({
                where: { p_id: currentLineUser.user_id },
                select: { p_id: true },
            });
            if (existingLinkedUser?.p_id) {
                return existingLinkedUser.p_id;
            }
        }

        let username = baseUsername;
        let attempt = 0;

        while (true) {
            const existingUser = await tx.tbl_users.findUnique({
                where: { username },
                select: { p_id: true },
            });

            if (!existingUser) {
                break;
            }

            attempt += 1;
            const indexedSuffix = `${suffix}_${attempt}`;
            username = `${baseUsername.slice(0, Math.max(1, 50 - indexedSuffix.length))}${indexedSuffix}`;
        }

        const roleRecord = await tx.tbl_roles.findUnique({
            where: { role_name: normalizedRole },
            select: { role_id: true },
        });

        const hashedPassword = await bcrypt.hash(`line-only:${lineUser.line_user_id}:${randomUUID()}`, 10);
        const createdUser = await tx.tbl_users.create({
            data: {
                username,
                password: hashedPassword,
                role: normalizedRole,
                role_id: roleRecord?.role_id ?? undefined,
                line_user_id: lineUser.line_user_id,
                is_approver: lineUser.is_approver,
            },
            select: { p_id: true },
        });

        await tx.tbl_line_users.update({
            where: { id: lineUser.id },
            data: { user_id: createdUser.p_id },
        });

        return createdUser.p_id;
    });
}

export async function provisionLineUserLinkByRowId(lineRowId: number) {
    const lineUser = await prisma.tbl_line_users.findUnique({
        where: { id: lineRowId },
        select: {
            id: true,
            user_id: true,
            line_user_id: true,
            display_name: true,
            full_name: true,
            role: true,
            is_approver: true,
        },
    });

    if (!lineUser) {
        return null;
    }

    if (lineUser.user_id) {
        const linkedUser = await prisma.tbl_users.findUnique({
            where: { p_id: lineUser.user_id },
            select: { p_id: true },
        });
        if (linkedUser?.p_id) {
            return linkedUser.p_id;
        }
    }

    const normalizedRole = normalizeRole(lineUser.role);
    if (!normalizedRole || !PROVISIONABLE_LINE_ROLES.has(normalizedRole)) {
        return null;
    }

    return createLinkedUserForLineAccount({
        id: lineUser.id,
        line_user_id: lineUser.line_user_id,
        display_name: lineUser.display_name,
        full_name: lineUser.full_name,
        role: normalizedRole,
        is_approver: lineUser.is_approver,
    });
}

export async function resolveAuthenticatedUserId(sessionUser?: AuthSessionLike | null): Promise<number | null> {
    const rawId = sessionUser?.id?.trim();
    if (!rawId) {
        return null;
    }

    const directUserId = Number(rawId);
    if (Number.isInteger(directUserId) && directUserId > 0) {
        const directUser = await prisma.tbl_users.findUnique({
            where: { p_id: directUserId },
            select: { p_id: true },
        });
        if (directUser?.p_id) {
            return directUser.p_id;
        }
    }

    if (rawId.startsWith('line_')) {
        const lineRowId = Number(rawId.slice(5));
        if (Number.isInteger(lineRowId) && lineRowId > 0) {
            const lineUser = await prisma.tbl_line_users.findUnique({
                where: { id: lineRowId },
                select: {
                    id: true,
                    user_id: true,
                    line_user_id: true,
                    display_name: true,
                    full_name: true,
                    role: true,
                    is_approver: true,
                },
            });

            if (lineUser?.user_id) {
                const linkedUser = await prisma.tbl_users.findUnique({
                    where: { p_id: lineUser.user_id },
                    select: { p_id: true },
                });
                if (linkedUser?.p_id) {
                    return linkedUser.p_id;
                }
            }

            const normalizedRole = normalizeRole(lineUser?.role || sessionUser?.role);
            if (
                lineUser &&
                normalizedRole &&
                PROVISIONABLE_LINE_ROLES.has(normalizedRole)
            ) {
                return provisionLineUserLinkByRowId(lineUser.id);
            }
        }
    }

    const username = sessionUser?.name?.trim();
    if (!username) {
        return null;
    }

    const userByUsername = await prisma.tbl_users.findUnique({
        where: { username },
        select: { p_id: true },
    });

    return userByUsername?.p_id ?? null;
}

export async function hasAuthenticatedUserLink(sessionUser?: AuthSessionLike | null): Promise<boolean> {
    const userId = await resolveAuthenticatedUserId(sessionUser);
    return userId !== null;
}
