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
        const { auth } = await import('@/auth');
        const session = await auth();

        // Get old value for logging
        const oldSetting = await prisma.tbl_system_settings.findUnique({
            where: { setting_key: key },
            select: { setting_value: true }
        });
        const oldValue = oldSetting?.setting_value || '(ไม่มี)';

        await prisma.tbl_system_settings.upsert({
            where: { setting_key: key },
            update: { setting_value: value, description, updated_at: new Date() },
            create: { setting_key: key, setting_value: value, description }
        });

        revalidatePath('/settings');

        // Non-blocking log
        if (session?.user) {
            const { logSystemAction } = await import('@/lib/logger');
            logSystemAction(
                'เปลี่ยนค่าระบบ',
                'Settings',
                key,
                `เปลี่ยนค่า "${key}" | เดิม: ${oldValue} → ใหม่: ${value} | โดย: ${session.user.name}${description ? ' | คำอธิบาย: ' + description : ''}`,
                session?.user?.id ? (parseInt(session.user.id as string) || 0) : null,
                session.user.name || 'Unknown',
                'unknown'
            ).catch(console.error);
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating setting:', error);
        return { success: false, error: 'Failed to update setting' };
    }
}

export async function sendTestEmail(recipientEmail: string) {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || (session.user as any).role !== 'admin') {
            return { success: false, message: 'Unauthorized: Admin access required' };
        }

        const { sendEmail } = await import('@/lib/notifications/emailService');

        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #2563eb;">Test Email / อีเมลทดสอบ</h2>
                <p>This is a test email from the Stock Movement System.</p>
                <p>หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่าอีเมลถูกต้อง</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
                <p style="color: #888; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
            </div>
        `;

        const result = await sendEmail(recipientEmail, 'Test Email Configuration - Stock Movement', html);

        if (result.success) {
            return { success: true, message: 'Test email sent successfully!' };
        } else {
            return { success: false, message: 'Failed to send email: ' + (result.error || 'Unknown error') };
        }
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return { success: false, message: 'Error sending test email: ' + error.message };
    }
}
