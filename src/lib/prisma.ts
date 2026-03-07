import { PrismaClient } from '@prisma/client'

// Tables that support soft delete
const SOFT_DELETE_MODELS = ['tbl_products', 'tbl_users', 'tbl_maintenance_requests', 'tbl_rooms'];

const prismaClientSingleton = () => {
    const client = new PrismaClient();

    // ── Soft-delete middleware ──────────────────────────────────
    // 1. Convert `delete` → `update { deleted_at: now() }`
    client.$use(async (params: any, next: any) => {
        if (SOFT_DELETE_MODELS.includes(params.model || '')) {
            if (params.action === 'delete') {
                params.action = 'update';
                params.args.data = { deleted_at: new Date() };
            }
            if (params.action === 'deleteMany') {
                params.action = 'updateMany';
                if (params.args.data) {
                    params.args.data.deleted_at = new Date();
                } else {
                    params.args.data = { deleted_at: new Date() };
                }
            }
        }
        return next(params);
    });

    // 2. Auto-filter deleted rows on reads (unless caller explicitly queries deleted_at)
    client.$use(async (params: any, next: any) => {
        if (SOFT_DELETE_MODELS.includes(params.model || '')) {
            const readActions = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];
            if (readActions.includes(params.action)) {
                // Only add filter if caller hasn't touched deleted_at
                if (!params.args) params.args = {};
                if (!params.args.where) params.args.where = {};
                if (params.args.where.deleted_at === undefined) {
                    params.args.where.deleted_at = null;
                }
            }
        }
        return next(params);
    });

    return client;
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
