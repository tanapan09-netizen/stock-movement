export type PurchaseOrderRequestReference = {
    requestId: number | null;
    requestNumber: string | null;
};

export function parsePurchaseOrderRequestReference(notes?: string | null): PurchaseOrderRequestReference {
    const normalized = notes || '';
    const requestIdMatch = normalized.match(/PR Request ID:\s*(\d+)/i);
    const requestNumberMatch = normalized.match(/อ้างอิงคำขอซื้อ:\s*(.+)/i);

    return {
        requestId: requestIdMatch ? Number(requestIdMatch[1]) : null,
        requestNumber: requestNumberMatch ? requestNumberMatch[1].trim() : null,
    };
}
