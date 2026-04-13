'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Star } from 'lucide-react';

import {
    getCustomerRepairFeedbackContext,
    submitCustomerRepairFeedback,
} from '@/actions/maintenanceActions';

type FeedbackContext = {
    request_id: number;
    request_number: string;
    title: string;
    room_display: string;
    already_rated: boolean;
};

export default function LineRepairFeedbackClient() {
    const searchParams = useSearchParams();
    const requestId = Number(searchParams.get('request_id') || '');
    const lineUserId = (searchParams.get('line_user_id') || '').trim();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [context, setContext] = useState<FeedbackContext | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const canSubmit = useMemo(() => {
        return !loading && !submitting && Boolean(context) && !context?.already_rated && rating >= 1 && rating <= 5;
    }, [context, loading, rating, submitting]);

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            setLoading(true);
            setError(null);
            setSuccess(null);

            if (!Number.isFinite(requestId) || requestId <= 0 || !lineUserId) {
                setError('ลิงก์ไม่ถูกต้อง กรุณาเปิดจากข้อความแจ้งเตือนอีกครั้ง');
                setLoading(false);
                return;
            }

            const result = await getCustomerRepairFeedbackContext(requestId, lineUserId);
            if (!mounted) return;

            if (!result.success || !result.data) {
                setError(result.error || 'ไม่สามารถเปิดแบบประเมินได้');
                setLoading(false);
                return;
            }

            setContext(result.data as FeedbackContext);
            if ((result.data as FeedbackContext).already_rated) {
                setSuccess('คุณได้ส่งแบบประเมินรายการนี้แล้ว ขอบคุณครับ');
            }
            setLoading(false);
        };

        run();
        return () => {
            mounted = false;
        };
    }, [lineUserId, requestId]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!canSubmit || !context) return;

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.set('request_id', String(context.request_id));
        formData.set('line_user_id', lineUserId);
        formData.set('rating', String(rating));
        formData.set('comment', comment.trim());

        const result = await submitCustomerRepairFeedback(formData);
        if (!result.success) {
            setError(result.error || 'ส่งแบบประเมินไม่สำเร็จ');
            setSubmitting(false);
            return;
        }

        setSuccess('ขอบคุณสำหรับคะแนนและความคิดเห็นของคุณ');
        setSubmitting(false);
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-100 p-4">
            <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-lg">
                <h1 className="text-xl font-bold text-slate-900">ประเมินความพึงพอใจงานซ่อม</h1>
                <p className="mt-1 text-sm text-slate-600">คะแนนของคุณจะถูกใช้เพื่อวัดคุณภาพการบริการ (KPI)</p>

                {loading && (
                    <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
                    </div>
                )}

                {!loading && context && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <div><span className="font-semibold">เลขที่:</span> {context.request_number}</div>
                        <div className="mt-1"><span className="font-semibold">ห้อง:</span> {context.room_display}</div>
                        <div className="mt-1"><span className="font-semibold">หัวข้อ:</span> {context.title}</div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4" />
                        <span>{success}</span>
                    </div>
                )}

                {!loading && context && !context.already_rated && (
                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">ให้คะแนนบริการ</label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((score) => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => setRating(score)}
                                        className="rounded-full p-1 transition hover:scale-105"
                                        aria-label={`Rate ${score}`}
                                    >
                                        <Star
                                            className={`h-8 w-8 ${score <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(event) => setComment(event.target.value)}
                                rows={4}
                                maxLength={1000}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                placeholder="พิมพ์ข้อเสนอแนะเพิ่มเติม..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            ส่งแบบประเมิน
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}

