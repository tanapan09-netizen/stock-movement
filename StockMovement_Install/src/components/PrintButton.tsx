'use client';

interface PrintButtonProps {
    assetName: string;
    assetCode: string;
    cost: number;
    salvage: number;
    life: number;
}

export default function PrintButton({ assetName, assetCode, cost, salvage, life }: PrintButtonProps) {
    const annualDep = (cost - salvage) / life;
    const printDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const handlePrint = () => {
        const printContent = document.getElementById('depreciation-printable');
        if (printContent) {
            const tableHTML = printContent.querySelector('table')?.outerHTML || '';
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <!DOCTYPE html>
                    <html lang="th">
                    <head>
                        <meta charset="UTF-8">
                        <title>รายงานค่าเสื่อมราคา - ${assetName}</title>
                        <style>
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            body { 
                                font-family: 'Sarabun', 'Segoe UI', sans-serif; 
                                padding: 40px; 
                                color: #333; 
                                line-height: 1.6;
                                background: #fff;
                            }
                            .report-container { max-width: 800px; margin: 0 auto; }
                            .header { 
                                text-align: center; 
                                border-bottom: 3px solid #2563eb; 
                                padding-bottom: 20px; 
                                margin-bottom: 30px;
                            }
                            .header h1 { 
                                font-size: 24px; 
                                color: #1e40af; 
                                margin-bottom: 8px;
                            }
                            .header h2 { 
                                font-size: 18px; 
                                color: #374151; 
                                font-weight: normal;
                            }
                            .header .date { 
                                font-size: 12px; 
                                color: #6b7280; 
                                margin-top: 10px;
                            }
                            .info-grid { 
                                display: grid; 
                                grid-template-columns: repeat(2, 1fr); 
                                gap: 15px; 
                                margin-bottom: 30px;
                                background: #f8fafc;
                                padding: 20px;
                                border-radius: 8px;
                                border: 1px solid #e2e8f0;
                            }
                            .info-item { 
                                display: flex; 
                                justify-content: space-between;
                                padding: 8px 12px;
                                background: white;
                                border-radius: 4px;
                            }
                            .info-label { color: #6b7280; font-size: 13px; }
                            .info-value { font-weight: 600; color: #1f2937; }
                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin-bottom: 30px;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                            }
                            thead th { 
                                background: linear-gradient(135deg, #2563eb, #1d4ed8); 
                                color: white; 
                                padding: 12px 8px; 
                                font-size: 13px;
                                font-weight: 600;
                                text-align: center;
                            }
                            tbody td { 
                                padding: 10px 8px; 
                                text-align: center; 
                                border-bottom: 1px solid #e5e7eb;
                                font-size: 13px;
                            }
                            tbody tr:nth-child(even) { background: #f9fafb; }
                            tbody tr:hover { background: #eff6ff; }
                            .highlight { background: #dbeafe !important; font-weight: 600; }
                            .text-red { color: #dc2626; }
                            .text-blue { color: #2563eb; font-weight: 600; }
                            .summary { 
                                background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
                                padding: 20px;
                                border-radius: 8px;
                                border-left: 4px solid #2563eb;
                            }
                            .summary h3 { 
                                color: #1e40af; 
                                margin-bottom: 12px;
                                font-size: 14px;
                            }
                            .summary-grid { 
                                display: grid; 
                                grid-template-columns: repeat(3, 1fr); 
                                gap: 15px; 
                            }
                            .summary-item { text-align: center; }
                            .summary-item .label { font-size: 11px; color: #6b7280; }
                            .summary-item .value { font-size: 18px; font-weight: 700; color: #1f2937; }
                            .footer { 
                                margin-top: 40px; 
                                text-align: center; 
                                font-size: 11px; 
                                color: #9ca3af;
                                border-top: 1px solid #e5e7eb;
                                padding-top: 20px;
                            }
                            @media print {
                                body { padding: 20px; }
                                .info-grid, .summary { break-inside: avoid; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="report-container">
                            <div class="header">
                                <h1>📊 รายงานค่าเสื่อมราคาทรัพย์สิน</h1>
                                <h2>${assetName} (${assetCode})</h2>
                                <div class="date">พิมพ์เมื่อ: ${printDate}</div>
                            </div>
                            
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">ราคาทุน:</span>
                                    <span class="info-value">${cost.toLocaleString()} บาท</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">มูลค่าซาก:</span>
                                    <span class="info-value">${salvage.toLocaleString()} บาท</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">อายุใช้งาน:</span>
                                    <span class="info-value">${life} ปี</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">ค่าเสื่อม/ปี:</span>
                                    <span class="info-value">${annualDep.toLocaleString(undefined, { maximumFractionDigits: 2 })} บาท</span>
                                </div>
                            </div>
                            
                            ${tableHTML}
                            
                            <div class="summary">
                                <h3>📋 สรุปข้อมูลค่าเสื่อมราคา</h3>
                                <div class="summary-grid">
                                    <div class="summary-item">
                                        <div class="label">จำนวนที่คิดค่าเสื่อมราคา</div>
                                        <div class="value">${(cost - salvage).toLocaleString()} บาท</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="label">วิธีการคำนวณ</div>
                                        <div class="value">Straight-Line</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="label">มาตรฐานอ้างอิง</div>
                                        <div class="value">TAS 16</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="footer">
                                เอกสารนี้สร้างโดยระบบ Stock Movement | ${printDate}
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                win.document.close();
                win.print();
            }
        }
    };

    return (
        <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-1 print:hidden"
        >
            🖨️ พิมพ์
        </button>
    );
}
