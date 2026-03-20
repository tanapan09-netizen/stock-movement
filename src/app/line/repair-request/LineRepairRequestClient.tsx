'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLineCustomerByLineId } from '@/actions/lineCustomerActions';
import { getRooms, submitCustomerRepairRequest } from '@/actions/maintenanceActions';
import {
    CheckCircle2, Loader2, Upload, AlertCircle,
    X, MapPin, Wrench, User, Phone, Globe, Camera, ChevronRight
} from 'lucide-react';

const GLOBAL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=Sora:wght@600;700&display=swap');

.repair-root {
  font-family: 'DM Sans', sans-serif;
  --amber:        #e07b39;
  --amber-light:  #f5e6d8;
  --amber-dark:   #c4622a;
  --amber-glow:   rgba(224,123,57,0.15);
  --surface:      #fffaf6;
  --card:         #ffffff;
  --text-primary: #1a1209;
  --text-sec:     #6b5744;
  --text-muted:   #a8917e;
  --border:       #eeddd0;
  --success:      #2d8a5e;
  --success-bg:   #edfaf4;
  --error:        #c43b3b;
  --error-bg:     #fdf2f2;
  --info:         #2e6da4;
  --info-bg:      #eff6ff;
  --r-sm: 8px; --r-md: 14px; --r-lg: 22px;
  --shadow-card: 0 4px 32px rgba(186,120,70,0.10), 0 1px 4px rgba(186,120,70,0.06);
  --shadow-input: 0 1px 3px rgba(186,120,70,0.07);
  --t: all 0.18s cubic-bezier(0.4,0,0.2,1);
}

/* Card */
.rc { background: var(--card); border: 1.5px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-card); overflow: hidden; }

/* Header */
.rh { background: linear-gradient(130deg,#e07b39 0%,#c4622a 100%); padding: 22px 22px 20px; position: relative; overflow: hidden; }
.rh::before { content:''; position:absolute; top:-50px; right:-50px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.07); pointer-events:none; }
.rh::after  { content:''; position:absolute; bottom:-70px; left:25%; width:240px; height:240px; border-radius:50%; background:rgba(255,255,255,0.045); pointer-events:none; }
.rh-inner { position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.rh-icon { width:44px; height:44px; background:rgba(255,255,255,0.2); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rh-title { font-family:'Sora',sans-serif; font-size:1.18rem; font-weight:700; color:#fff; margin:0; line-height:1.2; }
.rh-sub { font-size:0.73rem; color:rgba(255,255,255,0.76); margin:3px 0 0; }

/* Lang */
.ls { display:flex; background:rgba(255,255,255,0.17); border:1px solid rgba(255,255,255,0.28); border-radius:9px; padding:3px; gap:2px; }
.lb { padding:5px 9px; border-radius:6px; border:none; font-size:11px; font-weight:600; cursor:pointer; transition:var(--t); background:transparent; color:rgba(255,255,255,0.82); font-family:inherit; }
.lb.on { background:#fff; color:var(--amber-dark); box-shadow:0 1px 4px rgba(0,0,0,0.14); }
.lb:not(.on):hover { background:rgba(255,255,255,0.22); color:#fff; }

/* Body */
.rb { padding:20px 20px 24px; display:flex; flex-direction:column; gap:15px; }

/* Status card */
.sc { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--r-md); padding:13px 15px; }
.sc-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.sc-label { font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; gap:5px; }
.badge { display:inline-flex; align-items:center; gap:5px; font-size:0.73rem; font-weight:600; padding:3px 10px; border-radius:20px; }
.badge.ok   { background:var(--success-bg); color:var(--success); }
.badge.no   { background:var(--error-bg);   color:var(--error); }
.badge.wait { background:var(--amber-light); color:var(--amber-dark); }
.sc-div { height:1px; background:var(--border); margin:10px 0; }
.cr { display:flex; align-items:center; gap:7px; font-size:0.78rem; color:var(--text-sec); }
.cr svg { color:var(--amber); flex-shrink:0; }
.cv { font-weight:500; color:var(--text-primary); }

/* Fields */
.fg { display:flex; flex-direction:column; gap:5px; }
.fl { display:flex; align-items:center; gap:5px; font-size:0.72rem; font-weight:700; color:var(--text-sec); text-transform:uppercase; letter-spacing:0.07em; }
.fl svg { color:var(--amber); }
.fl-tag { margin-left:auto; font-size:0.67rem; font-weight:500; text-transform:lowercase; letter-spacing:0.02em; }
.fl-tag.req { color:var(--amber); }
.fl-tag.opt { color:var(--text-muted); }
.fi, .ft {
  width:100%; border:1.5px solid var(--border); border-radius:var(--r-sm);
  padding:10px 13px; font-size:0.88rem; color:var(--text-primary);
  background:#fff; box-shadow:var(--shadow-input); transition:var(--t);
  outline:none; font-family:inherit;
}
.ft { resize:none; }
.fi:focus, .ft:focus { border-color:var(--amber); box-shadow:0 0 0 3px var(--amber-glow); }
.fi:disabled, .ft:disabled { background:var(--surface); color:var(--text-muted); cursor:not-allowed; box-shadow:none; }
.fi.ro { background:var(--surface); color:var(--text-sec); cursor:default; font-weight:500; }
.fhint { font-size:0.71rem; color:var(--error); display:flex; align-items:center; gap:3px; margin-top:2px; }

/* Divider */
.sec-div { display:flex; align-items:center; gap:10px; font-size:0.68rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em; }
.sec-div::before,.sec-div::after { content:''; flex:1; height:1px; background:var(--border); }

/* Image grid */
.ig { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }
.it { position:relative; aspect-ratio:1; border-radius:9px; border:1.5px solid var(--border); overflow:hidden; background:var(--surface); }
.it img { width:100%; height:100%; object-fit:cover; display:block; }
.ir { position:absolute; top:4px; right:4px; background:rgba(196,38,38,0.88); color:#fff; border:none; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transition:opacity 0.15s; }
.it:hover .ir { opacity:1; }
.ia { aspect-ratio:1; border-radius:9px; border:1.5px dashed var(--border); background:transparent; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; color:var(--text-muted); cursor:pointer; transition:var(--t); font-size:10px; font-weight:600; font-family:inherit; letter-spacing:0.03em; }
.ia:hover { border-color:var(--amber); background:var(--amber-light); color:var(--amber-dark); }
.ic { font-size:0.7rem; color:var(--text-muted); text-align:right; margin-top:3px; }

/* Submit btn */
.sb {
  width:100%; background:linear-gradient(130deg,#e07b39,#c4622a);
  color:#fff; border:none; border-radius:var(--r-md); padding:13px 20px;
  font-size:0.9rem; font-weight:600; font-family:inherit; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:8px;
  box-shadow:0 4px 14px rgba(224,123,57,0.32); transition:var(--t);
  letter-spacing:0.02em; position:relative; overflow:hidden;
}
.sb::after { content:''; position:absolute; inset:0; background:linear-gradient(130deg,rgba(255,255,255,0.12),transparent); opacity:0; transition:opacity 0.18s; }
.sb:hover:not(:disabled)::after { opacity:1; }
.sb:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 22px rgba(224,123,57,0.42); }
.sb:active:not(:disabled) { transform:translateY(0); }
.sb:disabled { opacity:0.48; cursor:not-allowed; box-shadow:none; transform:none; }
.sb .arr { transition:transform 0.18s; }
.sb:hover:not(:disabled) .arr { transform:translateX(3px); }

/* Back btn */
.bb { width:100%; background:transparent; color:var(--text-sec); border:1.5px solid var(--border); border-radius:var(--r-md); padding:11px 20px; font-size:0.86rem; font-weight:500; font-family:inherit; cursor:pointer; transition:var(--t); }
.bb:hover { background:var(--surface); border-color:var(--text-muted); color:var(--text-primary); }

/* Alert */
.al { border-radius:var(--r-sm); padding:11px 13px; font-size:0.81rem; display:flex; align-items:flex-start; justify-content:space-between; gap:10px; border:1.5px solid; }
.al.success { background:var(--success-bg); color:var(--success); border-color:#a7e3c8; }
.al.error   { background:var(--error-bg);   color:var(--error);   border-color:#f0b8b8; }
.al.info    { background:var(--info-bg);     color:var(--info);    border-color:#b3d4f5; }
.al-in { display:flex; align-items:flex-start; gap:7px; line-height:1.5; }
.al-x { background:transparent; border:none; cursor:pointer; padding:2px; border-radius:4px; display:flex; align-items:center; color:inherit; opacity:0.6; flex-shrink:0; transition:opacity 0.15s; }
.al-x:hover { opacity:1; }

/* Dots */
@keyframes dp { 0%,80%,100%{transform:scale(0.5);opacity:0.35} 40%{transform:scale(1);opacity:1} }
.d  { display:inline-block; width:5px; height:5px; border-radius:50%; background:currentColor; margin:0 1.5px; }
.d1 { animation:dp 1.2s ease-in-out infinite 0s; }
.d2 { animation:dp 1.2s ease-in-out infinite 0.2s; }
.d3 { animation:dp 1.2s ease-in-out infinite 0.4s; }

@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.spin { animation: spin 1s linear infinite; }
`;

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
        const resolveIfReady = () => { if (window.liff || existing?.dataset?.loaded === 'true') { resolve(); return true; } return false; };
        if (resolveIfReady()) return;
        const timeoutId = window.setTimeout(() => reject(new Error('Timed out')), 15000);
        const cleanup = () => { window.clearTimeout(timeoutId); existing?.removeEventListener('load', onLoad); existing?.removeEventListener('error', onError); };
        const onLoad = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('LIFF SDK load failed')); };
        if (existing) { existing.addEventListener('load', onLoad, { once: true }); existing.addEventListener('error', onError, { once: true }); queueMicrotask(() => { if (resolveIfReady()) cleanup(); }); return; }
        const s = document.createElement('script'); s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'; s.async = true; s.dataset.liffSdk = 'true';
        s.onload = () => { s.dataset.loaded = 'true'; onLoad(); }; s.onerror = onError; document.head.appendChild(s);
    }).finally(() => { if (!window.liff) liffSdkPromise = null; });
    return liffSdkPromise;
}


type Lang = 'th' | 'en' | 'jp';
const LANG_LABELS: Record<Lang, string> = { th: 'ไทย', en: 'EN', jp: '日本語' };

const T: Record<Lang, Record<string, string>> = {
    th: {
        pageTitle:'แจ้งซ่อมออนไลน์', pageSubtitle:'บริการรับแจ้งปัญหาเพื่อความสะดวกของท่าน',
        userStatus:'ข้อมูลผู้ใช้', checkingLine:'กำลังตรวจสอบ', fetchingData:'กำลังโหลด',
        verified:'ยืนยันแล้ว', notRegistered:'ยังไม่ลงทะเบียน',
        name:'ชื่อ-นามสกุล', phone:'เบอร์โทรศัพท์',
        locationRequired:'สถานที่', noLocation:'ไม่ระบุสถานที่',
        locationNotFound:'ไม่พบรหัสสถานที่นี้ โปรดแจ้งธุรการ',
        issueTitle:'หัวข้อปัญหา', issuePlaceholder:'เช่น แอร์ไม่เย็น, น้ำรั่ว, ไฟขัดข้อง',
        description:'รายละเอียดเพิ่มเติม', descriptionPlaceholder:'อธิบายอาการเบื้องต้น...',
        attachImage:'รูปภาพประกอบ', addPhoto:'เพิ่มรูป', imagesMax:'/ 4',
        submit:'ส่งเรื่องแจ้งซ่อม', submitting:'กำลังส่ง...',
        backToHome:'ปิดหน้าต่าง',
        successMsg:'แจ้งซ่อมสำเร็จ! ทางเราจะดำเนินการให้เร็วที่สุด',
        errNoUser:'ไม่พบข้อมูลผู้ใช้ หรือยังไม่ได้ลงทะเบียนลูกค้า',
        errNoRoom:'กรุณาระบุสถานที่',
        errNoCustomer:'ไม่พบข้อมูลลูกค้า กรุณาติดต่อผู้ดูแลระบบ',
        errLineId:'ไม่สามารถดึง LINE User ID ได้ กรุณาเปิดจากใน LINE',
        errNoLiffId:'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_LIFF_ID',
        errSubmit:'เกิดข้อผิดพลาดระหว่างส่งข้อมูล', errGeneric:'แจ้งซ่อมไม่สำเร็จ',
        closeAlert:'ปิด', required:'จำเป็น', optional:'ไม่บังคับ',
        detailSection:'รายละเอียดปัญหา', footer:'ข้อมูลของท่านปลอดภัยและเป็นความลับ',
    },
    en: {
        pageTitle:'Repair Request', pageSubtitle:'Submit your maintenance issue for prompt assistance',
        userStatus:'Account', checkingLine:'Checking', fetchingData:'Loading',
        verified:'Verified', notRegistered:'Not Registered',
        name:'Full Name', phone:'Phone Number',
        locationRequired:'Location', noLocation:'No location set',
        locationNotFound:'Location code not found. Please contact admin.',
        issueTitle:'Issue Title', issuePlaceholder:'e.g. AC not cooling, Water leak, Power outage',
        description:'Additional Details', descriptionPlaceholder:'Describe the problem briefly...',
        attachImage:'Photos', addPhoto:'Add', imagesMax:'/ 4',
        submit:'Submit Repair Request', submitting:'Submitting...',
        backToHome:'Close Window',
        successMsg:'Request submitted! We will attend to it as soon as possible.',
        errNoUser:'User not found or not registered as a customer.',
        errNoRoom:'Please specify a location.',
        errNoCustomer:'Customer not found. Please register or contact admin.',
        errLineId:'Unable to retrieve LINE User ID. Open from within LINE.',
        errNoLiffId:'NEXT_PUBLIC_LINE_LIFF_ID is not configured.',
        errSubmit:'An error occurred while submitting.', errGeneric:'Submission failed.',
        closeAlert:'Dismiss', required:'Required', optional:'Optional',
        detailSection:'Issue Details', footer:'Your information is safe and confidential.',
    },
    jp: {
        pageTitle:'修理リクエスト', pageSubtitle:'お問い合わせいただければ迅速に対応いたします',
        userStatus:'アカウント', checkingLine:'確認中', fetchingData:'読込中',
        verified:'確認済み', notRegistered:'未登録',
        name:'氏名', phone:'電話番号',
        locationRequired:'場所', noLocation:'場所未設定',
        locationNotFound:'この場所コードは見つかりません。管理者にお知らせください。',
        issueTitle:'問題のタイトル', issuePlaceholder:'例：エアコン不調、水漏れ、停電',
        description:'詳細情報', descriptionPlaceholder:'症状を簡単に説明してください...',
        attachImage:'写真', addPhoto:'追加', imagesMax:'/ 4枚',
        submit:'修理リクエストを送信', submitting:'送信中...',
        backToHome:'ウィンドウを閉じる',
        successMsg:'リクエストが送信されました！できる限り早急に対応いたします。',
        errNoUser:'ユーザーが見つかりません。顧客として未登録の可能性があります。',
        errNoRoom:'場所を指定してください。',
        errNoCustomer:'顧客が見つかりません。管理者にお問い合わせください。',
        errLineId:'LINE User IDを取得できませんでした。LINEから開いてください。',
        errNoLiffId:'NEXT_PUBLIC_LINE_LIFF_IDが設定されていません。',
        errSubmit:'送信中にエラーが発生しました。', errGeneric:'送信に失敗しました。',
        closeAlert:'閉じる', required:'必須', optional:'任意',
        detailSection:'問題の詳細', footer:'情報は安全に保護されます。',
    },
};


type AlertKind = 'success' | 'error' | 'info';
type RoomOption = { room_id: number; room_code: string; room_name: string };

function Dots() {
    return <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="d d1" /><span className="d d2" /><span className="d d3" /></span>;
}

function AlertBox({ kind, children, onDismiss, closeLabel }: { kind: AlertKind; children: ReactNode; onDismiss?: () => void; closeLabel?: string }) {
    return (
        <div role="alert" className={`al ${kind}`}>
            <div className="al-in">
                {kind === 'success' && <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                {kind === 'error' && <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                <span>{children}</span>
            </div>
            {onDismiss && <button type="button" onClick={onDismiss} className="al-x" aria-label={closeLabel ?? 'Dismiss'}><X size={14} /></button>}
        </div>
    );
}


export default function LineRepairRequestClient() {
    const searchParams = useSearchParams();
    const lineUserIdFromQuery = (searchParams.get('line_user_id') || '').trim();

    const [lang, setLangState] = useState<Lang>('th');
    const t = (k: string) => T[lang][k] ?? k;
    const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('repair_lang', l); } catch { /**/ } };
    useEffect(() => { try { const s = localStorage.getItem('repair_lang') as Lang | null; if (s && ['th','en','jp'].includes(s)) setLangState(s); } catch { /**/ } }, []);

    const [lineUserId, setLineUserId] = useState('');
    const [customerInfo, setCustomerInfo] = useState<{ full_name: string; phone_number: string; room_number?: string } | null>(null);
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
        async function run() {
            if (lineUserIdFromQuery) { if (!cancelled) { setLineUserId(lineUserIdFromQuery); setDetectingLineId(false); } return; }
            const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
            if (!liffId) { if (!cancelled) { setDetectingLineId(false); setAlert({ kind: 'info', text: t('errNoLiffId') }); } return; }
            try {
                await loadLiffSdk();
                if (!window.liff) throw new Error('LIFF unavailable');
                await window.liff.init({ liffId });
                if (!window.liff.isLoggedIn()) { window.liff.login({ redirectUri: window.location.href }); return; }
                const p = await window.liff.getProfile();
                if (!cancelled && p?.userId) setLineUserId(p.userId);
            } catch (e) { console.error(e); if (!cancelled) setAlert({ kind: 'error', text: t('errLineId') }); }
            finally { if (!cancelled) setDetectingLineId(false); }
        }
        void run(); return () => { cancelled = true; };
        
    }, [lineUserIdFromQuery]);

    useEffect(() => {
        let cancelled = false;
        async function hydrate() {
            if (!lineUserId) return; setHydrating(true);
            try {
                const [cr, rr] = await Promise.all([getLineCustomerByLineId(lineUserId), getRooms()]);
                if (cancelled) return;
                if (cr.success && cr.data) {
                    setCustomerInfo({ full_name: cr.data.full_name || '', phone_number: cr.data.phone_number || '', room_number: cr.data.room_number || '' });
                    if (rr.success && rr.data && cr.data.room_number) {
                        const saved = cr.data.room_number.trim().toLowerCase();
                        const match = (rr.data as RoomOption[]).find(r => r.room_code?.toLowerCase() === saved || r.room_name?.toLowerCase() === saved);
                        if (match) setRoomId(match.room_id);
                    }
                } else if (!cr.success) setAlert({ kind: 'error', text: t('errNoCustomer') });
            } catch (e) { console.error(e); } finally { if (!cancelled) setHydrating(false); }
        }
        void hydrate(); return () => { cancelled = true; };
 
    }, [lineUserId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []); if (!files.length) return;
        setSelectedFiles(prev => [...prev, ...files]);
        files.forEach(f => { const r = new FileReader(); r.onloadend = () => setPreviews(prev => [...prev, r.result as string]); r.readAsDataURL(f); });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const removeFile = (i: number) => {
        setSelectedFiles(prev => { const n = [...prev]; n.splice(i,1); return n; });
        setPreviews(prev => { const n = [...prev]; n.splice(i,1); return n; });
    };

    async function handleSubmit(e: FormEvent) {
        e.preventDefault(); setLoading(true); setAlert(null);
        if (!lineUserId || !customerInfo) { setAlert({ kind:'error', text:t('errNoUser') }); setLoading(false); return; }
        if (roomId === 0) { setAlert({ kind:'error', text:t('errNoRoom') }); setLoading(false); return; }
        try {
            const fd = new FormData();
            fd.append('line_user_id', lineUserId); fd.append('title', title); fd.append('description', description);
            fd.append('room_id', roomId.toString()); fd.append('category', category); fd.append('priority', priority); fd.append('tags', 'ลูกค้า');
            selectedFiles.forEach(f => fd.append('images', f));
            const result = await submitCustomerRepairRequest(fd);
            if (result.success) {
                setAlert({ kind:'success', text:t('successMsg') });
                setTitle(''); setDescription(''); setRoomId(0); setSelectedFiles([]); setPreviews([]);
            } else { setAlert({ kind:'error', text:result.error || t('errGeneric') }); }
        } catch (e) { console.error(e); setAlert({ kind:'error', text:t('errSubmit') }); }
        finally { setLoading(false); }
    }

    const canSubmit = !!customerInfo && title.trim().length > 0 && roomId !== 0 && !loading && !detectingLineId && !hydrating;
    const isWaiting = detectingLineId || hydrating;
    const badgeClass = isWaiting ? 'wait' : customerInfo ? 'ok' : 'no';
    const badgeText = isWaiting ? (detectingLineId ? t('checkingLine') : t('fetchingData')) : customerInfo ? t('verified') : t('notRegistered');

    return (
        <div className="repair-root" style={{ minHeight:'100vh', background:'linear-gradient(150deg,#fff7ef 0%,#fef9f5 55%,#fff 100%)', padding:'28px 14px 52px' }}>
            <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLE }} />
            <div style={{ maxWidth:432, margin:'0 auto' }}>
                <div className="rc">

                    {/* ── Header ── */}
                    <div className="rh">
                        <div className="rh-inner">
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div className="rh-icon"><Wrench size={20} color="#fff" /></div>
                                <div>
                                    <h1 className="rh-title">{t('pageTitle')}</h1>
                                    <p className="rh-sub">{t('pageSubtitle')}</p>
                                </div>
                            </div>
                            <div className="ls">
                                {(['th','en','jp'] as Lang[]).map(l => (
                                    <button key={l} type="button" onClick={() => setLang(l)} className={`lb ${lang===l?'on':''}`}>{LANG_LABELS[l]}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="rb">

                        {/* Status */}
                        <div className="sc">
                            <div className="sc-row">
                                <span className="sc-label"><Globe size={11}/>{t('userStatus')}</span>
                                <span className={`badge ${badgeClass}`}>
                                    {isWaiting ? <><Dots />&nbsp;{badgeText}</> : customerInfo ? <><CheckCircle2 size={11}/>{badgeText}</> : <><AlertCircle size={11}/>{badgeText}</>}
                                </span>
                            </div>
                            {customerInfo && (<>
                                <div className="sc-div" />
                                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                    <div className="cr"><User size={13}/><span>{t('name')}:</span><span className="cv">{customerInfo.full_name}</span></div>
                                    <div className="cr"><Phone size={13}/><span>{t('phone')}:</span><span className="cv">{customerInfo.phone_number}</span></div>
                                </div>
                            </>)}
                        </div>

                        {/* Location */}
                        <div className="fg">
                            <label className="fl"><MapPin size={13}/>{t('locationRequired')}</label>
                            <input type="text" value={customerInfo?.room_number || t('noLocation')} disabled className="fi ro" />
                            {roomId === 0 && customerInfo?.room_number && <p className="fhint"><AlertCircle size={11}/>{t('locationNotFound')}</p>}
                        </div>

                        <div className="sec-div">{t('detailSection')}</div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

                            <div className="fg">
                                <label className="fl">
                                    <Wrench size={13}/>{t('issueTitle')}
                                    <span className="fl-tag req">{t('required')}</span>
                                </label>
                                <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required className="fi" placeholder={t('issuePlaceholder')} disabled={!customerInfo} />
                            </div>

                            <div className="fg">
                                <label className="fl">
                                    {t('description')}
                                    <span className="fl-tag opt">{t('optional')}</span>
                                </label>
                                <textarea value={description} onChange={e=>setDescription(e.target.value)} className="ft" rows={3} placeholder={t('descriptionPlaceholder')} disabled={!customerInfo} />
                            </div>

                            <div className="fg">
                                <label className="fl">
                                    <Camera size={13}/>{t('attachImage')}
                                    <span className="fl-tag opt">{t('optional')}</span>
                                </label>
                                <div className="ig">
                                    {previews.map((src,idx) => (
                                        <div key={idx} className="it">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt="preview"/>
                                            <button type="button" onClick={()=>removeFile(idx)} className="ir"><X size={10}/></button>
                                        </div>
                                    ))}
                                    {previews.length < 4 && customerInfo && (
                                        <button type="button" onClick={()=>fileInputRef.current?.click()} className="ia">
                                            <Upload size={16}/><span>{t('addPhoto')}</span>
                                        </button>
                                    )}
                                </div>
                                {previews.length > 0 && <p className="ic">{previews.length} {t('imagesMax')}</p>}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple style={{ display:'none' }} />
                            </div>

                            <button type="submit" disabled={!canSubmit} className="sb" style={{ marginTop:2 }}>
                                {loading
                                    ? <><Loader2 size={16} className="spin"/>{t('submitting')}</>
                                    : <>{t('submit')}<ChevronRight size={16} className="arr"/></>
                                }
                            </button>

                            {alert?.kind === 'success' && (
                                <button type="button" className="bb" onClick={()=>{ if(window.liff?.closeWindow){window.liff.closeWindow();return;} window.close(); }}>
                                    {t('backToHome')}
                                </button>
                            )}
                        </form>

                        {alert && (
                            <AlertBox kind={alert.kind} onDismiss={()=>setAlert(null)} closeLabel={t('closeAlert')}>
                                {alert.text}
                            </AlertBox>
                        )}
                    </div>
                </div>

                <p style={{ textAlign:'center', fontSize:'0.69rem', color:'var(--text-muted)', marginTop:14, letterSpacing:'0.02em' }}>
                    {t('footer')}
                </p>
            </div>
        </div>
    );
}