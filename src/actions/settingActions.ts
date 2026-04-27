'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { canManageAdminSecurity } from '@/lib/rbac';
import { getUserPermissionContext } from '@/lib/server/permission-service';

async function getSettingsAuthContext() {
    const session = await auth();
    if (!session?.user) {
        return null;
    }

    const permissionContext = await getUserPermissionContext(session.user);

    return {
        session,
        ...permissionContext,
    };
}

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
        const authContext = await getSettingsAuthContext();
        const session = authContext?.session;

        if (!authContext || !canManageAdminSecurity(authContext.role, authContext.permissions)) {
            return { success: false, error: 'Unauthorized' };
        }

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
                'SETTINGS_UPDATE',
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
        const authContext = await getSettingsAuthContext();
        if (!authContext || !canManageAdminSecurity(authContext.role, authContext.permissions)) {
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

export async function sendTestLineGroupNotification() {
    try {
        const authContext = await getSettingsAuthContext();
        if (!authContext || !canManageAdminSecurity(authContext.role, authContext.permissions)) {
            return { success: false, message: 'Unauthorized: Admin access required' };
        }

        const { sendConfiguredLineGroupTextNotification } = await import('@/lib/notifications/lineGroup');
        const result = await sendConfiguredLineGroupTextNotification(
            `🧪 ทดสอบการแจ้งเตือนเข้ากลุ่ม LINE\nระบบส่งข้อความทำงานปกติ\nเวลา: ${new Date().toLocaleString('th-TH')}`,
        );

        if (result.success) {
            return {
                success: true,
                message: `ส่งทดสอบสำเร็จ (push ${result.pushSuccess}/${result.pushTargets}${result.notifyUsed ? ` | notify ${result.notifySuccess ? 'ok' : 'fail'}` : ''})`,
            };
        }

        return {
            success: false,
            message: result.errorMessages[0] || 'ยังไม่สามารถส่งเข้ากลุ่ม LINE ได้',
        };
    } catch (error: any) {
        console.error('Error sending LINE group test notification:', error);
        return { success: false, message: 'Error sending LINE group test notification: ' + error.message };
    }
}
