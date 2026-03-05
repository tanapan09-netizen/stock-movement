import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/emailService';
import { emailConfig } from '@/config/email.config';

export async function GET(request: NextRequest) {
    try {
        // Verify Cron Secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');

        if (!process.env.CRON_SECRET) {
            console.warn('[Cron] CRON_SECRET is not set in environment variables');
        } else if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get Low Stock Items
        const allProducts = await prisma.tbl_products.findMany({
            where: {
                safety_stock: { gt: 0 },
                active: true
            },
            select: {
                p_id: true,
                p_name: true,
                p_count: true,
                safety_stock: true
            }
        });
        const lowStockItems = allProducts.filter(item => item.p_count <= item.safety_stock);

        // 2. Get Pending Requests
        const pendingPO = await prisma.tbl_purchase_orders.count({ where: { status: 'pending' } });
        const pendingBorrow = await prisma.tbl_borrow_requests.count({ where: { status: 'pending' } });

        console.log(`Daily Digest: ${lowStockItems.length} low stock, ${pendingPO} POs, ${pendingBorrow} Borrows`);

        // 3. Send Low Stock Email if there are items
        let emailResult = { sent: false, error: '' };

        if (lowStockItems.length > 0 && emailConfig.alerts.lowStock.enabled) {
            // Send individual email for each low stock item (or batch)
            const recipients = emailConfig.alerts.lowStock.recipients;

            if (recipients.length > 0 && recipients[0] !== 'admin@stockpro.local') {
                // Build product list HTML
                const productsHtml = lowStockItems.map(p => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${p.p_name}</td>
                        <td style="padding: 10px; text-align: center; color: ${p.p_count <= 0 ? '#dc2626' : '#f59e0b'}; font-weight: bold;">
                            ${p.p_count} ชิ้น
                        </td>
                        <td style="padding: 10px; text-align: center;">${p.safety_stock} ชิ้น</td>
                    </tr>
                `).join('');

                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 24px; text-align: center; }
                            .header h1 { margin: 0; font-size: 24px; }
                            .content { padding: 24px; }
                            .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 4px; }
                            table { width: 100%; border-collapse: collapse; }
                            th { background: #f3f4f6; padding: 12px 10px; text-align: left; font-weight: 600; }
                            .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
                            .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>⚠️ แจ้งเตือนสินค้าใกล้หมด</h1>
                            </div>
                            <div class="content">
                                <div class="alert-box">
                                    พบสินค้า <strong>${lowStockItems.length} รายการ</strong> ที่มีจำนวนต่ำกว่าที่กำหนด กรุณาตรวจสอบและสั่งซื้อเพิ่มเติม
                                </div>
                                
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ชื่อสินค้า</th>
                                            <th style="text-align: center;">คงเหลือ</th>
                                            <th style="text-align: center;">ขั้นต่ำ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${productsHtml}
                                    </tbody>
                                </table>
                                
                                <div style="text-align: center;">
                                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/products" class="btn">
                                        ดูรายการสินค้าทั้งหมด
                                    </a>
                                </div>
                            </div>
                            <div class="footer">
                                ส่งอัตโนมัติจากระบบ Stock Movement Pro<br>
                                ${new Date().toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' })}
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                try {
                    const result = await sendEmail(
                        recipients[0],
                        'lowStock',
                        lowStockItems[0].p_name,
                        lowStockItems[0].p_count,
                        lowStockItems[0].safety_stock
                    );
                    emailResult = { sent: result.success, error: result.error || '' };
                } catch (err) {
                    emailResult = { sent: false, error: String(err) };
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Digest processed',
            data: {
                lowStockCount: lowStockItems.length,
                lowStockItems: lowStockItems.map(p => ({
                    name: p.p_name,
                    current: p.p_count,
                    minimum: p.safety_stock
                })),
                pendingPO,
                pendingBorrow,
                emailSent: emailResult.sent,
                emailError: emailResult.error
            }
        });

    } catch (error) {
        console.error('Daily digest error:', error);
        return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 });
    }
}

