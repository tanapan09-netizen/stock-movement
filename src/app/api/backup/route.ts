/**
 * Backup API
 * GET - สร้าง database backup และ download
 * POST - Restore จาก backup file
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { canManageAdminSecurity } from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';

export async function GET() {
    try {
        const session = await auth();
        const permissionContext = await getUserPermissionContext(session?.user);
        if (!session || !canManageAdminSecurity(permissionContext.role, permissionContext.permissions)) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Export main data from database
        const [products, categories, users, suppliers] = await Promise.all([
            prisma.tbl_products.findMany(),
            prisma.tbl_categories.findMany(),
            prisma.tbl_users.findMany({ select: { p_id: true, username: true, role: true, created_at: true } }),
            prisma.tbl_suppliers.findMany(),
        ]);

        const backup = {
            version: '1.0',
            createdAt: new Date().toISOString(),
            createdBy: 'admin',
            data: {
                products,
                categories,
                users,
                suppliers,
            },
            stats: {
                products: products.length,
                categories: categories.length,
                users: users.length,
                suppliers: suppliers.length,
            },
        };

        // Return as downloadable JSON file
        const dateStr = new Date().toISOString().split('T')[0];
        return new NextResponse(JSON.stringify(backup, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename=stock_backup_${dateStr}.json`,
            },
        });
    } catch (error) {
        console.error('Backup error:', error);
        return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        const permissionContext = await getUserPermissionContext(session?.user);
        if (!session || !canManageAdminSecurity(permissionContext.role, permissionContext.permissions)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const backup = await request.json();

        if (!backup.version || !backup.data) {
            return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
        }

        // Restore data using transaction
        const result = await prisma.$transaction(async (tx) => {
            const restored = { products: 0, categories: 0, suppliers: 0 };

            // Restore categories first (foreign key dependency)
            if (backup.data.categories?.length) {
                for (const cat of backup.data.categories) {
                    await tx.tbl_categories.upsert({
                        where: { cat_id: cat.cat_id },
                        update: { cat_name: cat.cat_name },
                        create: cat,
                    });
                    restored.categories++;
                }
            }

            // Restore suppliers (using correct field names: id, name, email)
            if (backup.data.suppliers?.length) {
                for (const sup of backup.data.suppliers) {
                    await tx.tbl_suppliers.upsert({
                        where: { id: sup.id },
                        update: { name: sup.name, contact_name: sup.contact_name, email: sup.email },
                        create: sup,
                    });
                    restored.suppliers++;
                }
            }

            // Restore products
            if (backup.data.products?.length) {
                for (const prod of backup.data.products) {
                    await tx.tbl_products.upsert({
                        where: { p_id: prod.p_id },
                        update: prod,
                        create: prod,
                    });
                    restored.products++;
                }
            }

            return restored;
        });

        return NextResponse.json({
            success: true,
            message: 'Restore completed',
            restored: result,
        });
    } catch (error) {
        console.error('Restore error:', error);
        return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
    }
}
