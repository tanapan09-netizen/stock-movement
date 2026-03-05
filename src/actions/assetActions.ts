'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { uploadFile } from '@/lib/gcs';

const UPLOAD_DIR = 'assets';

export async function createAsset(formData: FormData) {
    const asset_code = formData.get('asset_code') as string;
    const asset_name = formData.get('asset_name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const purchase_date = new Date(formData.get('purchase_date') as string);
    const purchase_price = parseFloat(formData.get('purchase_price') as string) || 0;
    const useful_life_years = parseInt(formData.get('useful_life_years') as string) || 1;
    const salvage_value = parseFloat(formData.get('salvage_value') as string) || 0;
    const location = formData.get('location') as string;
    const status = formData.get('status') as string || 'Active';
    const vendor = formData.get('vendor') as string;
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const serial_number = formData.get('serial_number') as string;
    const imageFile = formData.get('image') as File;

    let image_url = '';

    if (imageFile && imageFile.size > 0) {
        try {
            image_url = await uploadFile(imageFile, UPLOAD_DIR);
        } catch (error) {
            console.error('Asset image upload failed:', error);
        }
    }

    try {
        const asset = await prisma.tbl_assets.create({
            data: {
                asset_code,
                asset_name,
                description,
                category,
                purchase_date,
                purchase_price,
                useful_life_years,
                salvage_value,
                location,
                status,
                vendor: vendor || null,
                brand: brand || null,
                model: model || null,
                serial_number: serial_number || null,
                image_url: image_url || null,
            },
        });

        // Add initial history
        await prisma.tbl_asset_history.create({
            data: {
                asset_id: asset.asset_id,
                action_type: 'Create',
                description: 'Asset registered in system',
                performed_by: 'System', // Could auth() user here
            }
        });

    } catch (error) {
        console.error('Failed to create asset:', error);
        throw new Error('Failed to create asset');
    }

    revalidatePath('/assets');
    // Return success - redirect handled by client to avoid NEXT_REDIRECT error
}

export async function updateAsset(formData: FormData) {
    const asset_id = parseInt(formData.get('asset_id') as string);
    const asset_name = formData.get('asset_name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const location = formData.get('location') as string;
    const status = formData.get('status') as string;

    // Note: Purchase details usually not edited often due to depreciation, allowing here though.
    const purchase_price = parseFloat(formData.get('purchase_price') as string);
    const useful_life_years = parseInt(formData.get('useful_life_years') as string);
    const salvage_value = parseFloat(formData.get('salvage_value') as string);
    const vendor = formData.get('vendor') as string;
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const serial_number = formData.get('serial_number') as string;

    const imageFile = formData.get('image') as File;

    const data: any = {
        asset_name,
        description,
        category,
        location,
        status,
        purchase_price,
        useful_life_years,
        salvage_value,
        vendor: vendor || null,
        brand: brand || null,
        model: model || null,
        serial_number: serial_number || null,
    };

    if (imageFile && imageFile.size > 0) {
        try {
            const imageName = await uploadFile(imageFile, UPLOAD_DIR);
            data.image_url = imageName;
        } catch (error) {
            console.error('Asset image upload failed:', error);
        }
    }

    try {
        // Fetch current asset to check for changes
        const currentAsset = await prisma.tbl_assets.findUnique({
            where: { asset_id },
            select: { location: true }
        });

        await prisma.tbl_assets.update({
            where: { asset_id },
            data,
        });

        // Log Update
        await prisma.tbl_asset_history.create({
            data: {
                asset_id,
                action_type: 'Update',
                description: 'Asset details updated',
                performed_by: 'System',
            }
        });

        // Check and Log Location Move
        if (currentAsset && currentAsset.location !== location) {
            await prisma.tbl_asset_history.create({
                data: {
                    asset_id,
                    action_type: 'Move',
                    description: `Moved from ${currentAsset.location || 'Unknown'} to ${location}`,
                    performed_by: 'System',
                }
            });
        }
    } catch (error) {
        throw new Error('Failed to update asset');
    }

    revalidatePath('/assets');
    revalidatePath(`/assets/${asset_id}`);
    // Redirect handled by client to avoid NEXT_REDIRECT error
}

export async function addAssetHistory(formData: FormData) {
    const asset_id = parseInt(formData.get('asset_id') as string);
    const action_type = formData.get('action_type') as string;
    const description = formData.get('description') as string;
    const cost = parseFloat(formData.get('cost') as string) || 0;
    const performed_by = formData.get('performed_by') as string;

    try {
        await prisma.tbl_asset_history.create({
            data: {
                asset_id,
                action_type,
                description,
                cost,
                performed_by
            }
        });

        // If status changes (e.g. disposed), update asset status
        if (action_type === 'Dispose') {
            await prisma.tbl_assets.update({
                where: { asset_id },
                data: { status: 'Disposed' }
            });
        }
    } catch (error) {
        throw new Error('Failed to add history');
    }

    revalidatePath(`/assets/${asset_id}`);
}

export async function deleteAsset(asset_id: number) {
    try {
        // Delete history first (foreign key constraint)
        await prisma.tbl_asset_history.deleteMany({
            where: { asset_id }
        });

        // Then delete the asset
        await prisma.tbl_assets.delete({
            where: { asset_id }
        });
    } catch (error) {
        console.error("Delete error", error);
        throw new Error('Failed to delete asset');
    }
    revalidatePath('/assets');
    // Note: redirect is handled by client component to avoid NEXT_REDIRECT error
}

export async function searchAssets(query: string) {
    try {
        const assets = await prisma.tbl_assets.findMany({
            where: {
                OR: [
                    { asset_code: { contains: query } },
                    { asset_name: { contains: query } },
                    { serial_number: { contains: query } },
                ],
                status: { not: 'Disposed' } // Only show active assets
            },
            select: {
                asset_id: true,
                asset_code: true,
                asset_name: true,
                serial_number: true,
                category: true,
                location: true,
            },
            take: 10, // Limit results for performance
            orderBy: { asset_code: 'asc' }
        });

        return {
            success: true,
            data: assets
        };
    } catch (error) {
        console.error('Failed to search assets:', error);
        return {
            success: false,
            error: 'Failed to search assets',
            data: []
        };
    }
}

export async function getAssetFinancialSummary() {
    try {
        const assets = await prisma.tbl_assets.findMany({
            where: { status: 'Active' },
            select: {
                purchase_price: true,
                salvage_value: true,
                useful_life_years: true,
                purchase_date: true
            }
        });

        let totalValue = 0;
        let totalAccumulatedDepreciation = 0;
        const now = new Date();

        // Exact same calculation logic as the detail page
        const msPerDay = 1000 * 60 * 60 * 24;

        assets.forEach(asset => {
            const cost = Number(asset.purchase_price);
            const salvage = Number(asset.salvage_value);
            const life = asset.useful_life_years;
            const purchaseDate = new Date(asset.purchase_date);
            const purchaseYear = purchaseDate.getFullYear();

            totalValue += cost;

            if (life > 0 && cost > salvage) {
                const totalDepreciable = cost - salvage;
                const annualDepreciation = totalDepreciable / life;

                const endOfLifeDate = new Date(purchaseDate);
                endOfLifeDate.setFullYear(purchaseDate.getFullYear() + life);

                let accumulatedDep = 0;

                // If we are past end of life, it's fully depreciated
                if (now.getTime() >= endOfLifeDate.getTime()) {
                    totalAccumulatedDepreciation += totalDepreciable;
                } else {
                    const currentYear = now.getFullYear();

                    // Loop through years since purchase up to current year
                    for (let i = 0; i <= (currentYear - purchaseYear); i++) {
                        const year = purchaseYear + i;

                        let expense = 0;
                        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                        const daysInThisYear = isLeapYear ? 366 : 365;
                        let daysUsed = daysInThisYear;

                        if (i === 0 && year === currentYear) {
                            // Bought this year -> run up to today
                            daysUsed = Math.floor((now.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else if (i === 0) {
                            // Year 1: from purchase date to Dec 31
                            const endOfYear = new Date(year, 11, 31);
                            daysUsed = Math.floor((endOfYear.getTime() - purchaseDate.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else if (year === currentYear) {
                            // Current year: from Jan 1 to today
                            const startOfYear = new Date(year, 0, 1);
                            daysUsed = Math.floor((now.getTime() - startOfYear.getTime()) / msPerDay) + 1;
                            expense = (annualDepreciation / daysInThisYear) * daysUsed;
                        } else {
                            // Full years in between
                            expense = annualDepreciation;
                        }

                        accumulatedDep += expense;
                    }

                    if (accumulatedDep > totalDepreciable) {
                        accumulatedDep = totalDepreciable;
                    }

                    totalAccumulatedDepreciation += accumulatedDep;
                }
            }
        });

        return {
            success: true,
            totalValue,
            totalAccumulatedDepreciation,
            netValue: totalValue - totalAccumulatedDepreciation
        };
    } catch (error) {
        console.error('Failed to get asset financial summary:', error);
        return {
            success: false,
            totalValue: 0,
            totalAccumulatedDepreciation: 0,
            netValue: 0
        };
    }
}

