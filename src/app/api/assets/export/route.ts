import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { canAccessDashboardPage } from '@/lib/rbac';
import {
    buildAssetRegistryOrderBy,
    buildAssetRegistryWhere,
    normalizeAssetRegistryFilters,
} from '@/lib/server/asset-registry-query';
import { getUserPermissionContext, type PermissionSessionUser } from '@/lib/server/permission-service';
import { prisma } from '@/lib/prisma';

function escapeCsv(value: unknown) {
    const text = String(value ?? '');
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionContext = await getUserPermissionContext(session.user as PermissionSessionUser | undefined);
    const canReadPage = canAccessDashboardPage(
        permissionContext.role,
        permissionContext.permissions,
        '/assets',
        { isApprover: permissionContext.isApprover, level: 'read' },
    );

    if (!canReadPage) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filters = normalizeAssetRegistryFilters(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const where = buildAssetRegistryWhere(filters);
    const orderBy = buildAssetRegistryOrderBy(filters.sort);

    const assets = await prisma.tbl_assets.findMany({
        where,
        orderBy,
        select: {
            asset_code: true,
            asset_name: true,
            category: true,
            status: true,
            location: true,
            room_section: true,
            serial_number: true,
            vendor: true,
            brand: true,
            model: true,
            purchase_date: true,
            purchase_price: true,
            useful_life_years: true,
            salvage_value: true,
            created_at: true,
        },
    });

    const headers = [
        'Asset Code',
        'Asset Name',
        'Category',
        'Status',
        'Location',
        'Room Section',
        'Serial Number',
        'Vendor',
        'Brand',
        'Model',
        'Purchase Date',
        'Purchase Price',
        'Useful Life (Years)',
        'Salvage Value',
        'Created At',
    ];

    const rows = assets.map((asset) => [
        asset.asset_code,
        asset.asset_name,
        asset.category,
        asset.status,
        asset.location || '',
        asset.room_section || '',
        asset.serial_number || '',
        asset.vendor || '',
        asset.brand || '',
        asset.model || '',
        asset.purchase_date.toISOString().slice(0, 10),
        Number(asset.purchase_price).toFixed(2),
        asset.useful_life_years,
        Number(asset.salvage_value).toFixed(2),
        asset.created_at.toISOString(),
    ]);

    const csvBody = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\r\n');
    const csv = `\uFEFF${csvBody}`;

    const datePart = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=\"asset-registry-${datePart}.csv\"`,
            'Cache-Control': 'no-store',
        },
    });
}
