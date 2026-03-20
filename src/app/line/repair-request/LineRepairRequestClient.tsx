'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLineCustomerByLineId } from '@/actions/lineCustomerActions';
import { getRooms, submitCustomerRepairRequest } from '@/actions/maintenanceActions';
import { CheckCircle2, Loader2, MessageSquareText, Upload, AlertCircle, Image as ImageIcon, X, MapPin, Wrench, Languages } from 'lucide-react';


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


type Lang = 'th' | 'en' | 'jp';

const translations: Record<Lang, Record<string, string>> = {
    th: {
        pageTitle: 'แจ้งซ่อมออนไลน์ (ลูกค้า)',
        pageSubtitle: 'บริการรับแจ้งปัญหาเพื่อความสะดวกของท่าน',
        userStatus: 'สถานะผู้ใช้',
        checkingLine: 'ตรวจสอบ LINE...',
        fetchingData: 'ดึงข้อมูล...',
        verified: 'ยืนยันตัวตนแล้ว',
        notRegistered: 'ยังไม่ลงทะเบียน',
        name: 'ชื่อ',
        phone: 'เบอร์โทร',
        location: 'สถานที่',
        locationRequired: 'สถานที่ *',
        noLocation: 'ไม่ระบุสถานที่',
        locationNotFound: 'ไม่พบรหัสสถานที่นี้ในระบบ โปรดแจ้งธุรการ',
        issueTitle: 'หัวข้อปัญหา (แจ้งซ่อม) *',
        issuePlaceholder: 'เช่น แอร์ไม่เย็น, น้ำรั่ว',
        description: 'รายละเอียดเพิ่มเติม',
        descriptionPlaceholder: 'อธิบายอาการเบื้องต้น...',
        attachImage: 'แนบรูปภาพ (ถ้ามี)',
        addPhoto: 'เพิ่มรูป',
        submit: 'ส่งเรื่องรับแจ้งซ่อม',
        submitting: 'กำลังส่งข้อมูล...',
        backToHome: 'กลับสู่หน้าหลัก (ปิดหน้าต่าง)',
        successMsg: 'แจ้งซ่อมสำเร็จ! ทางเราจะรีบดำเนินการให้เร็วที่สุด',
        errNoUser: 'ไม่พบข้อมูลผู้ใช้ หรือท่านยังไม่ได้ลงทะเบียนลูกค้า',
        errNoRoom: 'กรุณาระบุสถานที่',
        errNoCustomer: 'ไม่พบข้อมูลลูกค้า กรุณาลงทะเบียนหรือติดต่อผู้ดูแลระบบ',
        errLineId: 'ไม่สามารถดึง LINE User ID อัตโนมัติได้ (แนะนำให้เปิดหน้านี้จากใน LINE)',
        errNoLiffId: 'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_LIFF_ID (จำเป็นสำหรับดึง LINE User ID อัตโนมัติ)',
        errSubmit: 'เกิดข้อผิดพลาดระหว่างส่งข้อมูล',
        errGeneric: 'แจ้งซ่อมไม่สำเร็จ',
        closeAlert: 'ปิดข้อความแจ้งเตือน',
    },
    en: {
        pageTitle: 'Online Repair Request',
        pageSubtitle: 'Submit your maintenance issue for prompt assistance',
        userStatus: 'User Status',
        checkingLine: 'Checking LINE...',
        fetchingData: 'Loading data...',
        verified: 'Verified',
        notRegistered: 'Not Registered',
        name: 'Name',
        phone: 'Phone',
        location: 'Location',
        locationRequired: 'Location *',
        noLocation: 'No location set',
        locationNotFound: 'This location code was not found. Please contact admin.',
        issueTitle: 'Issue Title (Repair Request) *',
        issuePlaceholder: 'e.g. Air conditioner not cooling, Water leak',
        description: 'Additional Details',
        descriptionPlaceholder: 'Describe the symptoms briefly...',
        attachImage: 'Attach Images (optional)',
        addPhoto: 'Add Photo',
        submit: 'Submit Repair Request',
        submitting: 'Submitting...',
        backToHome: 'Back to Home (Close Window)',
        successMsg: 'Request submitted! We will attend to it as soon as possible.',
        errNoUser: 'User not found or not yet registered as a customer.',
        errNoRoom: 'Please specify a location.',
        errNoCustomer: 'Customer not found. Please register or contact admin.',
        errLineId: 'Unable to retrieve LINE User ID automatically. Please open this page from within LINE.',
        errNoLiffId: 'NEXT_PUBLIC_LINE_LIFF_ID is not configured (required for automatic LINE User ID detection).',
        errSubmit: 'An error occurred while submitting.',
        errGeneric: 'Request submission failed.',
        closeAlert: 'Dismiss alert',
    },
    jp: {
        pageTitle: 'オンライン修理リクエスト',
        pageSubtitle: 'お問い合わせいただければ、迅速に対応いたします',
        userStatus: 'ユーザー状態',
        checkingLine: 'LINE確認中...',
        fetchingData: 'データ取得中...',
        verified: '確認済み',
        notRegistered: '未登録',
        name: '氏名',
        phone: '電話番号',
        location: '場所',
        locationRequired: '場所 *',
        noLocation: '場所未設定',
        locationNotFound: 'この場所コードはシステムに見つかりません。管理者にお知らせください。',
        issueTitle: '問題のタイトル（修理依頼） *',
        issuePlaceholder: '例：エアコンが冷えない、水漏れ',
        description: '詳細情報',
        descriptionPlaceholder: '症状を簡単に説明してください...',
        attachImage: '画像を添付（任意）',
        addPhoto: '写真を追加',
        submit: '修理リクエストを送信',
        submitting: '送信中...',
        backToHome: 'ホームに戻る（ウィンドウを閉じる）',
        successMsg: 'リクエストが送信されました！できる限り早急に対応いたします。',
        errNoUser: 'ユーザーが見つからないか、まだ顧客として登録されていません。',
        errNoRoom: '場所を指定してください。',
        errNoCustomer: '顧客が見つかりません。登録するか管理者にお問い合わせください。',
        errLineId: 'LINE User IDを自動取得できませんでした。LINEアプリ内からこのページを開いてください。',
        errNoLiffId: 'NEXT_PUBLIC_LINE_LIFF_IDが設定されていません（LINE User IDの自動取得に必要です）。',
        errSubmit: '送信中にエラーが発生しました。',
        errGeneric: 'リクエストの送信に失敗しました。',
        closeAlert: 'アラートを閉じる',
    },
};


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
type RoomOption = { room_id: number; room_code: string; room_name: string };



const LANG_LABELS: Record<Lang, string> = { th: 'ไทย', en: 'EN', jp: '日本語' };

function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
    return (
        <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg p-0.5">
            <Languages size={14} className="text-orange-400 ml-1.5 mr-0.5 shrink-0" />
            {(['th', 'en', 'jp'] as Lang[]).map((l) => (
                <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                        lang === l
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'text-orange-600 hover:bg-orange-100'
                    }`}
                >
                    {LANG_LABELS[l]}
                </button>
            ))}
        </div>
    );
}


function Alert({
    kind,
    children,
    onDismiss,
    closeLabel,
}: {
    kind: AlertKind;
    children: ReactNode;
    onDismiss?: () => void;
    closeLabel?: string;
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
                    {kind === 'error' && <AlertCircle size={16} />}
                    <div className="leading-5">{children}</div>
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="p-1 rounded-md hover:bg-black/5"
                        aria-label={closeLabel ?? 'Dismiss'}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}



export default function LineRepairRequestClient() {
    const searchParams = useSearchParams();
    const lineUserIdFromQuery = (searchParams.get('line_user_id') || '').trim();

    const [lang, setLangState] = useState<Lang>('th');
    const t = (key: string) => translations[lang][key] ?? key;

    const setLang = (l: Lang) => {
        setLangState(l);
        try { localStorage.setItem('repair_lang', l); } catch { /* ignore */ }
    };

    useEffect(() => {
        try {
            const saved = localStorage.getItem('repair_lang') as Lang | null;
            if (saved && ['th', 'en', 'jp'].includes(saved)) setLangState(saved);
        } catch { /* ignore */ }
    }, []);

    const [lineUserId, setLineUserId] = useState('');
    const [customerInfo, setCustomerInfo] = useState<{
        full_name: string; phone_number: string; room_number?: string;
    } | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [roomId, setRoomId] = useState<number>(0);
    const [category] = useState('general');
    const [priority] = useState('normal');

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(false);
    const [detectingLineId, setDetectingLineId] = useState(true);
    const [alert, setAlert] = useState<{ kind: AlertKind; text: string } | null>(null);

    
    useEffect(() => {
        let cancelled = false;

        async function resolveLineUserId() {
            if (lineUserIdFromQuery) {
                if (!cancelled) { setLineUserId(lineUserIdFromQuery); setDetectingLineId(false); }
                return;
            }

            const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
            if (!liffId) {
                if (!cancelled) {
                    setDetectingLineId(false);
                    setAlert({ kind: 'info', text: t('errNoLiffId') });
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
                if (!cancelled && profile?.userId) setLineUserId(profile.userId);
            } catch (error) {
                console.error('Failed to detect LINE user id:', error);
                if (!cancelled) setAlert({ kind: 'error', text: t('errLineId') });
            } finally {
                if (!cancelled) setDetectingLineId(false);
            }
        }

        void resolveLineUserId();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineUserIdFromQuery]);

   
    useEffect(() => {
        let cancelled = false;

        async function hydrate() {
            if (!lineUserId) return;
            setHydrating(true);
            try {
                const [customerResult, roomsResult] = await Promise.all([
                    getLineCustomerByLineId(lineUserId),
                    getRooms()
                ]);
                if (cancelled) return;

                if (customerResult.success && customerResult.data) {
                    setCustomerInfo({
                        full_name: customerResult.data.full_name || '',
                        phone_number: customerResult.data.phone_number || '',
                        room_number: customerResult.data.room_number || ''
                    });

                    if (roomsResult.success && roomsResult.data && customerResult.data.room_number) {
                        const savedRoom = customerResult.data.room_number.trim().toLowerCase();
                        const roomList = roomsResult.data as RoomOption[];
                        const match = roomList.find((r) =>
                            r.room_code?.toLowerCase() === savedRoom ||
                            r.room_name?.toLowerCase() === savedRoom
                        );
                        if (match) setRoomId(match.room_id);
                    }
                } else if (!customerResult.success) {
                    setAlert({ kind: 'error', text: t('errNoCustomer') });
                }
            } catch (e) {
                console.error('Hydrate error:', e);
            } finally {
                if (!cancelled) setHydrating(false);
            }
        }

        void hydrate();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineUserId]);

 
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        const newFiles = [...selectedFiles]; newFiles.splice(index, 1); setSelectedFiles(newFiles);
        const newPreviews = [...previews]; newPreviews.splice(index, 1); setPreviews(newPreviews);
    };

    
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setAlert(null);

        if (!lineUserId || !customerInfo) {
            setAlert({ kind: 'error', text: t('errNoUser') });
            setLoading(false);
            return;
        }
        if (roomId === 0) {
            setAlert({ kind: 'error', text: t('errNoRoom') });
            setLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('line_user_id', lineUserId);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('room_id', roomId.toString());
            formData.append('category', category);
            formData.append('priority', priority);
            formData.append('tags', 'ลูกค้า');
            selectedFiles.forEach((file) => formData.append('images', file));

            const result = await submitCustomerRepairRequest(formData);

            if (result.success) {
                setAlert({ kind: 'success', text: t('successMsg') });
                setTitle(''); setDescription(''); setRoomId(0);
                setSelectedFiles([]); setPreviews([]);
            } else {
                setAlert({ kind: 'error', text: result.error || t('errGeneric') });
            }
        } catch (error) {
            console.error('submitCustomerRepairRequest failed:', error);
            setAlert({ kind: 'error', text: t('errSubmit') });
        } finally {
            setLoading(false);
        }
    }

    const canSubmit =
        !!customerInfo && title.trim().length > 0 && roomId !== 0 && !loading && !detectingLineId && !hydrating;

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-10">
            <div className="max-w-lg mx-auto bg-white border border-orange-100 rounded-2xl shadow-sm p-6">

              
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{t('pageTitle')}</h1>
                            <p className="text-xs text-gray-500">{t('pageSubtitle')}</p>
                        </div>
                    </div>
                    <LangSwitcher lang={lang} setLang={setLang} />
                </div>

              
                <div className="rounded-xl border bg-gray-50 px-4 py-3 mb-5 mt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-800">{t('userStatus')}</div>
                        <div className="text-xs text-gray-600">
                            {detectingLineId
                                ? t('checkingLine')
                                : hydrating
                                    ? t('fetchingData')
                                    : customerInfo
                                        ? <span className="text-green-600 font-bold">{t('verified')}</span>
                                        : <span className="text-red-600">{t('notRegistered')}</span>
                            }
                        </div>
                    </div>
                    {customerInfo && (
                        <div className="mt-2 text-xs text-gray-600 flex flex-col gap-1">
                            <div><strong>{t('name')}:</strong> {customerInfo.full_name}</div>
                            <div><strong>{t('phone')}:</strong> {customerInfo.phone_number}</div>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <MapPin size={14} /> {t('locationRequired')}
                    </label>
                    <input
                        type="text"
                        value={customerInfo?.room_number || t('noLocation')}
                        disabled
                        className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    {roomId === 0 && customerInfo?.room_number && (
                        <p className="text-xs text-red-500 mt-1">{t('locationNotFound')}</p>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <MessageSquareText size={14} /> {t('issueTitle')}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2 bg-white"
                            placeholder={t('issuePlaceholder')}
                            disabled={!customerInfo}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            {t('description')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 bg-white"
                            rows={3}
                            placeholder={t('descriptionPlaceholder')}
                            disabled={!customerInfo}
                        />
                    </div>
                   
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <ImageIcon size={14} /> {t('attachImage')}
                        </label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden bg-gray-50 group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {previews.length < 4 && customerInfo && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors"
                                >
                                    <Upload size={18} />
                                    <span className="text-[10px] font-medium">{t('addPhoto')}</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg px-4 py-2.5 disabled:opacity-60 disabled:hover:bg-orange-600 transition-colors shadow-sm mt-4"
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? t('submitting') : t('submit')}
                        </span>
                    </button>
                   
                    {alert?.kind === 'success' && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.liff?.closeWindow) { window.liff.closeWindow(); return; }
                                window.close();
                            }}
                            className="w-full border rounded-lg px-4 py-2.5 hover:bg-gray-50 font-medium text-gray-700"
                        >
                            {t('backToHome')}
                        </button>
                    )}
                </form>
              
                {alert && (
                    <Alert kind={alert.kind} onDismiss={() => setAlert(null)} closeLabel={t('closeAlert')}>
                        {alert.text}
                    </Alert>
                )}
            </div>
        </div>
    );
}