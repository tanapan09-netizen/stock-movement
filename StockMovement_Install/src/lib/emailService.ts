// Email service configuration
// Note: Requires nodemailer to be installed: npm install nodemailer

import nodemailer from 'nodemailer';

// Email configuration (should be in .env)
const EMAIL_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
};

const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Email templates
const templates = {
    lowStock: (productName: string, currentStock: number, safetyStock: number) => ({
        subject: `⚠️ แจ้งเตือนสต็อกต่ำ: ${productName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">⚠️ แจ้งเตือนสต็อกต่ำ</h1>
                </div>
                <div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                    <p>สินค้า <strong>${productName}</strong> มีจำนวนต่ำกว่า Safety Stock</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 10px; background: #f9f9f9;">จำนวนคงเหลือ</td>
                            <td style="padding: 10px; background: #f9f9f9; color: #dc2626; font-weight: bold;">${currentStock}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;">Safety Stock</td>
                            <td style="padding: 10px;">${safetyStock}</td>
                        </tr>
                    </table>
                    <p>กรุณาดำเนินการสั่งซื้อเพิ่มเติม</p>
                    <a href="${process.env.NEXTAUTH_URL}/products" 
                       style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                        ดูรายละเอียด
                    </a>
                </div>
                <div style="padding: 10px; text-align: center; color: #999; font-size: 12px;">
                    Stock Movement System
                </div>
            </div>
        `
    }),

    poApproved: (poNumber: string, items: { name: string; qty: number }[], total: number) => ({
        subject: `✅ ใบสั่งซื้อ ${poNumber} ได้รับการอนุมัติ`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">✅ ใบสั่งซื้อได้รับการอนุมัติ</h1>
                </div>
                <div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                    <p>ใบสั่งซื้อหมายเลข <strong>${poNumber}</strong> ได้รับการอนุมัติแล้ว</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">สินค้า</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">จำนวน</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.qty}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="font-size: 18px; text-align: right;">
                        ยอดรวม: <strong style="color: #059669;">${total.toLocaleString('th-TH')} บาท</strong>
                    </p>
                    <a href="${process.env.NEXTAUTH_URL}/purchase-orders" 
                       style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                        ดูใบสั่งซื้อ
                    </a>
                </div>
            </div>
        `
    }),

    borrowReminder: (borrowerName: string, items: string[], daysBorrowed: number) => ({
        subject: `📦 แจ้งเตือนการยืมสินค้า - ${borrowerName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">📦 แจ้งเตือนการยืมสินค้า</h1>
                </div>
                <div style="padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                    <p>คุณ <strong>${borrowerName}</strong> ยืมสินค้ามาแล้ว <strong>${daysBorrowed}</strong> วัน</p>
                    <p>รายการที่ยืม:</p>
                    <ul style="margin: 20px 0;">
                        ${items.map(item => `<li style="padding: 5px 0;">${item}</li>`).join('')}
                    </ul>
                    <p>กรุณาติดต่อผู้ยืมเพื่อติดตามการคืนสินค้า</p>
                    <a href="${process.env.NEXTAUTH_URL}/borrow" 
                       style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                        ดูรายการยืม
                    </a>
                </div>
            </div>
        `
    })
};

// Send email function
export async function sendEmail(to: string, template: keyof typeof templates, ...args: Parameters<(typeof templates)[typeof template]>) {
    if (!EMAIL_CONFIG.auth.user) {
        console.log('Email not configured, skipping send');
        return { success: false, error: 'Email not configured' };
    }

    try {
        const { subject, html } = (templates[template] as (...args: unknown[]) => { subject: string; html: string })(...args);

        await transporter.sendMail({
            from: `"Stock System" <${EMAIL_CONFIG.auth.user}>`,
            to,
            subject,
            html
        });

        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: String(error) };
    }
}

// Check and send low stock alerts
export async function checkAndSendLowStockAlerts() {
    // This would be called by a cron job or scheduled task
    // Implementation would query products and send emails for those below safety stock
    console.log('Checking low stock alerts...');
}
