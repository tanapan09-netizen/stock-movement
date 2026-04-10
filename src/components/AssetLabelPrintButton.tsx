'use client';

import { Tag } from 'lucide-react';

type AssetLabelPrintButtonProps = {
    assetCode: string;
    assetName: string;
    category?: string | null;
    location?: string | null;
    roomSection?: string | null;
};

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export default function AssetLabelPrintButton({
    assetCode,
    assetName,
    category,
    location,
    roomSection,
}: AssetLabelPrintButtonProps) {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            window.alert('กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้ แล้วลองพิมพ์อีกครั้ง');
            return;
        }

        const qrValue = encodeURIComponent(assetCode);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrValue}`;
        const placement = [location, roomSection].filter(Boolean).join(' / ');
        const nowText = new Date().toLocaleString('th-TH');

        const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>Asset Label - ${escapeHtml(assetCode)}</title>
  <style>
    @page { size: 70mm 40mm; margin: 2mm; }
    body { margin: 0; font-family: Arial, sans-serif; }
    .label {
      width: 66mm;
      min-height: 36mm;
      border: 1px solid #111827;
      border-radius: 2mm;
      box-sizing: border-box;
      padding: 2mm;
      display: grid;
      grid-template-columns: 18mm 1fr;
      gap: 2mm;
      align-items: start;
    }
    .qr-box { width: 18mm; height: 18mm; border: 1px solid #e5e7eb; display: grid; place-items: center; }
    .qr-box img { width: 16mm; height: 16mm; }
    .code { font-size: 10px; font-weight: 700; line-height: 1.2; }
    .name { font-size: 8px; line-height: 1.25; margin-top: 1mm; }
    .meta { font-size: 7px; color: #374151; margin-top: 0.6mm; line-height: 1.2; }
    .footer { margin-top: 1mm; font-size: 6px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="label">
    <div class="qr-box"><img src="${qrUrl}" alt="QR ${escapeHtml(assetCode)}" /></div>
    <div>
      <div class="code">${escapeHtml(assetCode)}</div>
      <div class="name">${escapeHtml(assetName)}</div>
      ${category ? `<div class="meta">หมวดหมู่: ${escapeHtml(category)}</div>` : ''}
      ${placement ? `<div class="meta">ตำแหน่ง: ${escapeHtml(placement)}</div>` : ''}
      <div class="footer">Printed ${escapeHtml(nowText)}</div>
    </div>
  </div>
</body>
</html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        const triggerPrint = () => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch {
                // ignore
            }
        };

        printWindow.addEventListener('load', triggerPrint, { once: true });
        setTimeout(triggerPrint, 450);
    };

    return (
        <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="พิมพ์ฉลากทรัพย์สิน"
        >
            <Tag className="mr-2 h-4 w-4" />
            พิมพ์ฉลาก
        </button>
    );
}
