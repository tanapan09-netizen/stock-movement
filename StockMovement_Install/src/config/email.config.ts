/**
 * Email Configuration
 * ตั้งค่าการส่ง Email แจ้งเตือน
 */

export const emailConfig = {
    // SMTP Settings (configure in .env)
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
        },
    },

    // Default sender
    from: process.env.EMAIL_FROM || 'Stock Movement Pro <noreply@stockpro.local>',

    // Recipients for alerts
    alerts: {
        // Low stock alerts
        lowStock: {
            enabled: true,
            recipients: (process.env.ALERT_EMAILS_STOCK || 'admin@stockpro.local').split(','),
            threshold: 10, // Alert when stock < 10
        },

        // Security alerts
        security: {
            enabled: true,
            recipients: (process.env.ALERT_EMAILS_SECURITY || 'admin@stockpro.local').split(','),
            failedLoginThreshold: 5, // Alert after 5 failed logins
        },

        // Daily digest
        dailyDigest: {
            enabled: false,
            recipients: (process.env.ALERT_EMAILS_DIGEST || 'admin@stockpro.local').split(','),
            sendTime: '08:00', // 8 AM
        },
    },

    // Email templates
    templates: {
        lowStock: {
            subject: '⚠️ แจ้งเตือน: สินค้าใกล้หมด',
            body: `
                <h2>แจ้งเตือนสินค้าใกล้หมด</h2>
                <p>สินค้าต่อไปนี้มีจำนวนต่ำกว่าที่กำหนด:</p>
                {{products}}
                <p>กรุณาตรวจสอบและสั่งซื้อเพิ่ม</p>
            `,
        },

        securityAlert: {
            subject: '🔒 แจ้งเตือนความปลอดภัย',
            body: `
                <h2>แจ้งเตือนความปลอดภัย</h2>
                <p>ตรวจพบ: {{alertType}}</p>
                <p>รายละเอียด: {{details}}</p>
                <p>IP: {{ip}}</p>
                <p>เวลา: {{timestamp}}</p>
            `,
        },

        dailyDigest: {
            subject: '📊 สรุปรายวัน - Stock Movement Pro',
            body: `
                <h2>สรุปรายวัน</h2>
                <p>วันที่: {{date}}</p>
                <ul>
                    <li>สินค้าเข้า: {{stockIn}} รายการ</li>
                    <li>สินค้าออก: {{stockOut}} รายการ</li>
                    <li>สินค้าใกล้หมด: {{lowStock}} รายการ</li>
                </ul>
            `,
        },
    },
};

/**
 * Email utility functions
 */
export const emailUtils = {
    /**
     * ตรวจสอบว่า email config พร้อมใช้งาน
     */
    isConfigured: (): boolean => {
        return !!(emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass);
    },

    /**
     * Replace template placeholders
     */
    renderTemplate: (template: string, data: Record<string, string>): string => {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return result;
    },
};
