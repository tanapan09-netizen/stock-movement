'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { registerLineCustomer, getLineCustomerByLineId } from '@/actions/lineCustomerActions';
import { CheckCircle2, Copy, House, Loader2, MessageSquareText, Phone, UserRound, X } from 'lucide-react';
import { translations, LANGS, type Lang } from './translations';

declare global {
    interface Window {
        liff?: {
            init: (config: { liffId: string }) => Promise<void>;
            isLoggedIn: () => boolean;
            login: (config?: { redirectUri?: string }) => void;
            getProfile: () => Promise<{ userId: string; displayName?: string }>;
            closeWindow?: () => void;
        };
    }
}

let liffSdkPromise: Promise<void> | null = null;

async function loadLiffSdk(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (window.liff) return;
    if (liffSdkPromise) return liffSdkPromise;

    liffSdkPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-liff-sdk="true"]');

        const resolveIfReady = () => {
            if (window.liff) { resolve(); return true; }
            if (existing?.dataset?.loaded === 'true') { resolve(); return true; }
            return false;
        };

        if (resolveIfReady()) return;

        const timeoutId = window.setTimeout(() => {
            reject(new Error('Timed out while loading LIFF SDK'));
        }, 15000);

        const cleanup = () => {
            window.clearTimeout(timeoutId);
            if (existing) {
                existing.removeEventListener('load', onLoad);
                existing.removeEventListener('error', onError);
            }
        };

        const onLoad = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Failed to load LIFF SDK')); };

        if (existing) {
            existing.addEventListener('load', onLoad, { once: true });
            existing.addEventListener('error', onError, { once: true });
            queueMicrotask(() => { if (resolveIfReady()) cleanup(); });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
        script.async = true;
        script.dataset.liffSdk = 'true';
        script.onload = () => { script.dataset.loaded = 'true'; onLoad(); };
        script.onerror = onError;
        document.head.appendChild(script);
    }).finally(() => {
        if (!window.liff) liffSdkPromise = null;
    });

    return liffSdkPromise;
}

type AlertKind = 'success' | 'error' | 'info';

function Alert({
    kind,
    children,
    onDismiss,
}: {
    kind: AlertKind;
    children: ReactNode;
    onDismiss?: () => void;
}) {
    const styles =
        kind === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : kind === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-red-50 text-red-800 border-red-200';

    return (
        <div role="alert" className={`mt-4 text-sm rounded-lg px-3 py-2 border ${styles}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    {kind === 'success' && <CheckCircle2 size={16} />}
                    <div className="leading-5">{children}</div>
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="p-1 rounded-md hover:bg-black/5"
                        aria-label="close"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

// Language switcher pill component
function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
    return (
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit ml-auto mb-4">
            {LANGS.map((l) => (
                <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        lang === l.code
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                </button>
            ))}
        </div>
    );
}

export default function LineCustomerRegisterClient() {
    const searchParams = useSearchParams();
    const lineUserIdFromQuery = (searchParams.get('line_user_id') || '').trim();

    // Language state — default from query param or 'th'
    const initialLang = (['th'].includes(searchParams.get('lang') ?? '') 
        ? searchParams.get('lang') 
        : 'th') as Lang;
    const [lang, setLang] = useState<Lang>(initialLang);
    const t = translations[lang];

    const [lineUserId, setLineUserId] = useState('');
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(false);
    const [detectingLineId, setDetectingLineId] = useState(true);
    const [alert, setAlert] = useState<{ kind: AlertKind; text: string } | null>(null);
    const [copied, setCopied] = useState<'lineUserId' | 'url' | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function resolveLineUserId() {
            if (lineUserIdFromQuery) {
                if (!cancelled) {
                    setLineUserId(lineUserIdFromQuery);
                    setDetectingLineId(false);
                }
                return;
            }

            const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
            if (!liffId) {
                if (!cancelled) {
                    setDetectingLineId(false);
                    setAlert({ kind: 'info', text: translations.th.liffEnvMissing });
                }
                return;
            }

            try {
                await loadLiffSdk();
                if (!window.liff) throw new Error('LIFF SDK unavailable');

                await window.liff.init({ liffId });

                if (!window.liff.isLoggedIn()) {
                    window.liff.login({ redirectUri: window.location.href });
                    return;
                }

                const profile = await window.liff.getProfile();
                if (!cancelled && profile?.userId) {
                    setLineUserId(profile.userId);
                    if (profile.displayName) setFullName((prev) => prev || profile.displayName || '');
                }
            } catch (error) {
                console.error('Failed to detect LINE user id:', error);
                if (!cancelled) setAlert({ kind: 'error', text: translations.th.liffFetchError });
            } finally {
                if (!cancelled) setDetectingLineId(false);
            }
        }

        void resolveLineUserId();
        return () => { cancelled = true; };
    }, [lineUserIdFromQuery]);

    useEffect(() => {
        let cancelled = false;

        async function hydrate() {
            if (!lineUserId) return;
            setHydrating(true);
            try {
                const result = await getLineCustomerByLineId(lineUserId);
                if (cancelled) return;
                if (result.success && result.data) {
                    setLineUserId(result.data.line_user_id);
                    setFullName(result.data.full_name || '');
                    setPhoneNumber(result.data.phone_number || '');
                    setRoomNumber(result.data.room_number || '');
                    setNotes(result.data.notes || '');
                } else if (!result.success && result.error) {
                    setAlert({ kind: 'error', text: result.error });
                }
            } finally {
                if (!cancelled) setHydrating(false);
            }
        }

        void hydrate();
        return () => { cancelled = true; };
    }, [lineUserId]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        if (!lineUserId) {
            setAlert({ kind: 'error', text: t.errorNoLineId });
            setLoading(false);
            return;
        }

        try {
            const result = await registerLineCustomer({
                line_user_id: lineUserId,
                full_name: fullName,
                phone_number: phoneNumber,
                room_number: roomNumber,
                notes
            });

            if (result.success) {
                setAlert({ kind: 'success', text: t.successText });
            } else {
                setAlert({ kind: 'error', text: result.error || t.errorSave });
            }
        } catch (error) {
            console.error('registerLineCustomer failed:', error);
            setAlert({ kind: 'error', text: t.errorGeneral });
        } finally {
            setLoading(false);
        }
    }

    const phoneDigits = phoneNumber.replace(/[^\d]/g, '');
    const phoneLooksValid = phoneDigits.length === 9 || phoneDigits.length === 10;

    const canSubmit =
        !!lineUserId &&
        fullName.trim().length > 0 &&
        phoneNumber.trim().length > 0 &&
        agreedToTerms &&
        !loading &&
        !detectingLineId;

    const termsHref = `/line/customer-register/terms?lang=${lang}`;

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-10">
            <div className="max-w-lg mx-auto bg-white border border-green-100 rounded-2xl shadow-sm p-6">

                {/* Language switcher */}
                <LangSwitcher lang={lang} setLang={setLang} />

                <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.pageTitle}</h1>
                <p className="text-sm text-gray-500 mb-6">{t.pageSubtitle}</p>

                {/* Status card */}
                <div className="rounded-xl border bg-gray-50 px-4 py-3 mb-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-800">{t.statusLabel}</div>
                        <div className="text-xs text-gray-600">
                            {detectingLineId ? t.statusChecking : lineUserId ? t.statusReady : t.statusNeedLine}
                        </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className={`rounded-lg px-2 py-1 ${lineUserId ? 'bg-green-100 text-green-800' : 'bg-white text-gray-600 border'}`}>
                            {t.step1}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${fullName.trim() && phoneNumber.trim() ? 'bg-green-100 text-green-800' : 'bg-white text-gray-600 border'}`}>
                            {t.step2}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${alert?.kind === 'success' ? 'bg-green-100 text-green-800' : 'bg-white text-gray-600 border'}`}>
                            {t.step3}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* LINE User ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.lineIdLabel}</label>
                        <div className="flex items-stretch gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={lineUserId}
                                    readOnly
                                    className="w-full border rounded-lg pl-3 pr-10 py-2 bg-gray-50 text-gray-700"
                                    placeholder={t.lineIdPlaceholder}
                                />
                                {(detectingLineId || hydrating) && (
                                    <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                                        <Loader2 size={16} className="animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!lineUserId) return;
                                    const ok = await copyToClipboard(lineUserId);
                                    if (!ok) { setAlert({ kind: 'error', text: t.copyError }); return; }
                                    setCopied('lineUserId');
                                    window.setTimeout(() => setCopied(null), 1500);
                                }}
                                disabled={!lineUserId}
                                className="shrink-0 inline-flex items-center justify-center gap-2 px-3 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60"
                            >
                                <Copy size={16} />
                                <span className="text-sm">{copied === 'lineUserId' ? t.copiedBtn : t.copyBtn}</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {detectingLineId
                                ? t.lineIdHelperChecking
                                : lineUserId
                                    ? t.lineIdHelperReady
                                    : t.lineIdHelperMissing}
                        </p>
                        {!detectingLineId && !lineUserId && (
                            <div className="mt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const ok = await copyToClipboard(window.location.href);
                                        if (!ok) { setAlert({ kind: 'error', text: t.copyLinkError }); return; }
                                        setCopied('url');
                                        window.setTimeout(() => setCopied(null), 1500);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                                >
                                    <Copy size={16} />
                                    <span className="text-sm">{copied === 'url' ? t.copiedBtn : t.copyLinkBtn}</span>
                                </button>
                                <div className="text-xs text-gray-500">{t.copyLinkHint}</div>
                            </div>
                        )}
                    </div>

                    {/* Full name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <UserRound size={14} /> {t.fullNameLabel}
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder={t.fullNamePlaceholder}
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Phone size={14} /> {t.phoneLabel}
                        </label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                            inputMode="tel"
                            className={`w-full border rounded-lg px-3 py-2 ${phoneNumber && !phoneLooksValid ? 'border-red-300' : ''}`}
                            placeholder={t.phonePlaceholder}
                        />
                        {!!phoneNumber && !phoneLooksValid && (
                            <p className="text-xs text-red-600 mt-1">{t.phoneError}</p>
                        )}
                    </div>

                    {/* Room */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <House size={14} /> {t.roomLabel}
                        </label>
                        <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder={t.roomPlaceholder}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <MessageSquareText size={14} /> {t.notesLabel}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                            rows={3}
                            placeholder={t.notesPlaceholder}
                        />
                    </div>

                    {/* Terms checkbox */}
                    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <input
                            id="terms-checkbox"
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 accent-green-600 cursor-pointer"
                        />
                        <label htmlFor="terms-checkbox" className="text-sm text-gray-700 cursor-pointer leading-snug">
                            {t.termsCheckboxPre && <span>{t.termsCheckboxPre} </span>}
                            <a
                                href={termsHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 underline underline-offset-2 hover:text-green-700 font-medium"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {t.termsLinkText}
                            </a>
                            {t.termsCheckboxPost && <span> {t.termsCheckboxPost}</span>}
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!canSubmit || (!phoneLooksValid && phoneNumber.trim().length > 0)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2.5 disabled:opacity-60 disabled:hover:bg-green-600 transition-colors font-medium"
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? t.submittingBtn : t.submitBtn}
                        </span>
                    </button>

                    {alert?.kind === 'success' && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.liff?.closeWindow) {
                                    window.liff.closeWindow();
                                    return;
                                }
                                window.close();
                            }}
                            className="w-full border rounded-lg px-4 py-2.5 hover:bg-gray-50 font-medium text-gray-700"
                        >
                            {t.closeBtn}
                        </button>
                    )}
                </form>

                {alert && (
                    <Alert kind={alert.kind} onDismiss={() => setAlert(null)}>
                        {alert.text}
                    </Alert>
                )}
            </div>
        </div>
    );
}
