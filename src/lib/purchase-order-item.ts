export type PurchaseOrderItemKind = 'stock' | 'non_stock';

const PURCHASE_ORDER_ITEM_NOTE_PREFIX = 'item_meta:';

type PurchaseOrderItemNotePayload = {
    kind: PurchaseOrderItemKind;
    name?: string;
};

export function buildPurchaseOrderItemNote(input: {
    item_type?: PurchaseOrderItemKind;
    p_name?: string;
}) {
    if (input.item_type !== 'non_stock') return null;

    const payload: PurchaseOrderItemNotePayload = {
        kind: 'non_stock',
        name: (input.p_name || '').trim().slice(0, 180),
    };

    return `${PURCHASE_ORDER_ITEM_NOTE_PREFIX}${JSON.stringify(payload)}`;
}

export function parsePurchaseOrderItemNote(notes?: string | null, pId?: string | null) {
    if (notes?.startsWith(PURCHASE_ORDER_ITEM_NOTE_PREFIX)) {
        try {
            const payload = JSON.parse(notes.slice(PURCHASE_ORDER_ITEM_NOTE_PREFIX.length)) as PurchaseOrderItemNotePayload;
            return {
                kind: payload.kind === 'non_stock' ? 'non_stock' as const : 'stock' as const,
                displayName: payload.name?.trim() || pId || '-',
            };
        } catch {
            // fall through to legacy detection
        }
    }

    const legacyNonStock = Boolean(pId && /^NON-STOCK-/i.test(pId));
    return {
        kind: legacyNonStock ? 'non_stock' as const : 'stock' as const,
        displayName: null,
    };
}

export function isNonStockPurchaseOrderItem(notes?: string | null, pId?: string | null) {
    return parsePurchaseOrderItemNote(notes, pId).kind === 'non_stock';
}
