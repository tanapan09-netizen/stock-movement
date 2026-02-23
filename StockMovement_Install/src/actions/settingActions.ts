'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSystemSettings() {
    try {
        const settings = await prisma.tbl_system_settings.findMany();
        // Convert array to object for easier consumption
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
            settingsMap[s.setting_key] = s.setting_value;
        });
        return { success: true, data: settingsMap };
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

export async function updateSystemSetting(key: string, value: string, description?: string) {
    try {
        await prisma.tbl_system_settings.upsert({
            where: { setting_key: key },
            update: { setting_value: value, description, updated_at: new Date() },
            create: { setting_key: key, setting_value: value, description }
        });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Error updating setting:', error);
        return { success: false, error: 'Failed to update setting' };
    }
}
