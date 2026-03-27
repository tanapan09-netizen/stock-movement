export interface ApprovalUser {
    username?: string | null;
    p_id?: number | null;
}

export interface ApprovalApprover {
    username?: string | null;
}

export interface LinkedPurchaseOrderSummary {
    po_id: number;
    po_number: string;
    status?: string | null;
}

export interface ApprovalStepLog {
    id: number;
    step_order: number;
    action: string;
    acted_at?: string | Date | null;
    comment?: string | null;
    actor?: {
        username?: string | null;
    } | null;
}

export interface ApprovalRequest {
    request_id: number;
    request_number: string;
    request_type: string;
    status: string;
    requested_by?: number | null;
    request_date?: string | Date | null;
    reason?: string | null;
    reference_job?: string | null;
    rejection_reason?: string | null;
    amount?: unknown;
    start_time?: string | Date | null;
    end_time?: string | Date | null;
    created_at?: string | Date | null;
    approved_at?: string | Date | null;
    current_step?: number | null;
    total_steps?: number | null;
    can_approve?: boolean;
    tbl_users?: ApprovalUser | null;
    tbl_approver?: ApprovalApprover | null;
    linked_purchase_orders?: LinkedPurchaseOrderSummary[];
    step_logs?: ApprovalStepLog[];
}

export interface ActiveJob {
    request_number: string;
    title?: string | null;
    tbl_rooms?: {
        room_code?: string | null;
    } | null;
}

export interface ApprovalFormData {
    request_type: string;
    request_date: string;
    start_time: string;
    end_time: string;
    amount: string;
    reason: string;
    reference_job: string;
}
