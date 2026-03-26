import { prisma } from '@/lib/prisma';

export interface AuthSessionLike {
    id?: string | null;
    name?: string | null;
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
                select: { user_id: true },
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
