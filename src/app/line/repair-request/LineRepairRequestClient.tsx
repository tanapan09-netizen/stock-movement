'use client';

import { FormEvent, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLineCustomerByLineId } from '@/actions/lineCustomerActions';
import { getRooms, submitCustomerRepairRequest } from '@/actions/maintenanceActions';
import {
    CheckCircle2, Loader2, Upload, AlertCircle,
    X, MapPin, Wrench, User, Phone, Globe, Camera, ChevronRight,
    RefreshCw, ShieldCheck, Send, FileText
} from 'lucide-react';

// ─── Global styles ────────────────────────────────────────────────────────────
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

/* ── CAPTCHA ── */
.cap-wrap {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-md);
  padding: 14px 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cap-header { display:flex; align-items:center; justify-content:space-between; }
.cap-label { font-size:0.72rem; font-weight:700; color:var(--text-sec); text-transform:uppercase; letter-spacing:0.07em; display:flex; align-items:center; gap:5px; }
.cap-label svg { color:var(--amber); }
.cap-refresh { background:transparent; border:none; cursor:pointer; color:var(--text-muted); padding:4px; border-radius:6px; display:flex; align-items:center; transition:var(--t); }
.cap-refresh:hover { color:var(--amber); background:var(--amber-light); }
.cap-refresh.spinning svg { animation: spin 0.5s linear; }
.cap-row { display:flex; align-items:center; gap:10px; }
.cap-display {
  flex:1;
  background: linear-gradient(135deg, #fdf0e6 0%, #fce8d4 100%);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
  overflow: hidden;
  min-height: 54px;
  user-select: none;
}
.cap-display::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 8px,
      rgba(224,123,57,0.04) 8px,
      rgba(224,123,57,0.04) 9px
    );
}
.cap-digit {
  font-family: 'Sora', monospace;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--amber-dark);
  letter-spacing: 0.08em;
  position: relative;
  z-index: 1;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.6);
  transform: rotate(var(--rot));
  display: inline-block;
  line-height: 1;
}
.cap-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.cap-input-wrap { flex:1; }
.cap-input {
  width: 100%;
  border: 1.5px solid var(--border);
  border-radius: var(--r-sm);
  padding: 12px 13px;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: 'Sora', monospace;
  color: var(--text-primary);
  background: #fff;
  box-shadow: var(--shadow-input);
  transition: var(--t);
  outline: none;
  text-align: center;
  letter-spacing: 0.25em;
}
.cap-input:focus { border-color:var(--amber); box-shadow:0 0 0 3px var(--amber-glow); }
.cap-input:disabled { background:var(--surface); color:var(--text-muted); cursor:not-allowed; }
.cap-input.wrong { border-color:var(--error); box-shadow:0 0 0 3px rgba(196,59,59,0.12); animation: shake 0.35s ease; }
.cap-input.right { border-color:var(--success); box-shadow:0 0 0 3px rgba(45,138,94,0.12); }

@keyframes shake {
  0%,100%{ transform:translateX(0); }
  20%    { transform:translateX(-6px); }
  40%    { transform:translateX(6px); }
  60%    { transform:translateX(-4px); }
  80%    { transform:translateX(4px); }
}

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

/* ── Confirm Dialog ── */
.dlg-backdrop {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(26,18,9,0.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: fadeIn 0.18s ease;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.dlg {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(26,18,9,0.22), 0 4px 16px rgba(26,18,9,0.1);
  width: 100%; max-width: 380px;
  overflow: hidden;
  animation: slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes slideUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
.dlg-header {
  background: linear-gradient(130deg,#e07b39,#c4622a);
  padding: 20px 20px 18px;
  display: flex; align-items: center; gap: 12px;
  position: relative;
}
.dlg-header-icon { width:40px; height:40px; background:rgba(255,255,255,0.22); border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.dlg-header-title { font-family:'Sora',sans-serif; font-size:1rem; font-weight:700; color:#fff; margin:0; }
.dlg-header-sub { font-size:0.72rem; color:rgba(255,255,255,0.75); margin:2px 0 0; }
.dlg-body { padding:18px 20px 0; display:flex; flex-direction:column; gap:10px; }
.dlg-row {
  display: flex; align-items: flex-start;
  gap: 10px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 13px;
  font-size: 0.82rem;
}
.dlg-row-icon { color:var(--amber); flex-shrink:0; margin-top:1px; }
.dlg-row-label { font-weight:700; color:var(--text-muted); font-size:0.69rem; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:2px; }
.dlg-row-value { font-weight:500; color:var(--text-primary); line-height:1.4; }
.dlg-actions { display:flex; gap:8px; padding:16px 20px 20px; }
.dlg-cancel {
  flex:1; background:transparent; color:var(--text-sec); border:1.5px solid var(--border);
  border-radius:var(--r-md); padding:11px; font-size:0.86rem; font-weight:500;
  font-family:inherit; cursor:pointer; transition:var(--t);
}
.dlg-cancel:hover { background:var(--surface); }
.dlg-confirm {
  flex:2; background:linear-gradient(130deg,#e07b39,#c4622a); color:#fff; border:none;
  border-radius:var(--r-md); padding:11px; font-size:0.9rem; font-weight:600;
  font-family:inherit; cursor:pointer; transition:var(--t);
  display:flex; align-items:center; justify-content:center; gap:7px;
  box-shadow: 0 3px 12px rgba(224,123,57,0.3);
}
.dlg-confirm:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 5px 18px rgba(224,123,57,0.4); }
.dlg-confirm:disabled { opacity:0.55; cursor:not-allowed; transform:none; }

/* Dots */
@keyframes dp { 0%,80%,100%{transform:scale(0.5);opacity:0.35} 40%{transform:scale(1);opacity:1} }
.d  { display:inline-block; width:5px; height:5px; border-radius:50%; background:currentColor; margin:0 1.5px; }
.d1 { animation:dp 1.2s ease-in-out infinite 0s; }
.d2 { animation:dp 1.2s ease-in-out infinite 0.2s; }
.d3 { animation:dp 1.2s ease-in-out infinite 0.4s; }

/* Success Dialog */
.sd-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(26,18,9,0.58);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: fadeIn 0.18s ease;
}
.sd {
  width: 100%; max-width: 400px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 26px 70px rgba(26,18,9,0.24), 0 8px 24px rgba(26,18,9,0.12);
  overflow: hidden;
}
.sd-head {
  padding: 24px 22px 18px;
  background: linear-gradient(145deg,#2d8a5e 0%,#246f4b 100%);
  color: #fff;
  text-align: center;
}
.sd-icon {
  width: 58px; height: 58px;
  margin: 0 auto 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
}
.sd-title {
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 1.08rem;
  font-weight: 700;
}
.sd-sub {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.82);
  line-height: 1.55;
}
.sd-body {
  padding: 18px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sd-card {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 12px 14px;
}
.sd-label {
  font-size: 0.69rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sd-value {
  margin-top: 5px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}
.sd-note {
  border-radius: 14px;
  background: var(--success-bg);
  border: 1.5px solid #bde8d1;
  padding: 12px 14px;
  color: var(--success);
  font-size: 0.82rem;
  line-height: 1.55;
}
.sd-actions {
  display: flex;
  gap: 10px;
}
.sd-back {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  background: linear-gradient(130deg,#2d8a5e,#246f4b);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(45,138,94,0.28);
}
.sd-back:hover {
  transform: translateY(-1px);
}

@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.spin { animation: spin 1s linear infinite; }
`;

// ─── LIFF SDK ─────────────────────────────────────────────────────────────────
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

function buildSafeLiffRedirectUri() {
    if (typeof window === 'undefined') return undefined;

    const url = new URL(window.location.href);
    const blockedParams = [
        'access_token',
        'code',
        'error',
        'error_description',
        'friendship_status_changed',
        'id_token',
        'liffClientId',
        'liffRedirectUri',
        'liff.state',
        'state',
    ];

    blockedParams.forEach((key) => url.searchParams.delete(key));
    url.hash = '';

    return url.toString();
}


// ─── i18n ─────────────────────────────────────────────────────────────────────
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
        errNoLiffId:'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_LIFF_REPAIR_REQUEST_ID',
        errSubmit:'เกิดข้อผิดพลาดระหว่างส่งข้อมูล', errGeneric:'แจ้งซ่อมไม่สำเร็จ',
        errCaptcha:'รหัสยืนยันไม่ถูกต้อง กรุณาลองอีกครั้ง',
        closeAlert:'ปิด', required:'จำเป็น', optional:'ไม่บังคับ',
        detailSection:'รายละเอียดปัญหา', footer:'ข้อมูลของท่านปลอดภัยและเป็นความลับ',
        captchaLabel:'รหัสยืนยัน', captchaPlaceholder:'พิมพ์ตัวเลข 4 หลัก', captchaRefresh:'รหัสใหม่', captchaVerified:'ยืนยันรหัสสำเร็จ',
        confirmTitle:'ยืนยันการแจ้งซ่อม', confirmSub:'ตรวจสอบข้อมูลก่อนส่ง',
        confirmLocation:'สถานที่', confirmIssue:'หัวข้อปัญหา',
        confirmDesc:'รายละเอียด', confirmNoDesc:'ไม่ระบุ',
        confirmImages:'รูปภาพ', confirmImagesCount:'{n} รูป',
        confirmCancel:'แก้ไข', confirmSubmit:'ยืนยันส่ง',
        confirmSubmitting:'กำลังส่ง...',
        successTitle:'ส่งเรื่องแจ้งซ่อมเรียบร้อยแล้ว',
        successSub:'ระบบได้รับรายการของท่านแล้ว และจะพากลับไปยังหน้าก่อนหน้าโดยอัตโนมัติ',
        successReference:'เลขที่รายการ',
        successAutoBack:'กำลังย้อนกลับภายใน {n} วินาที',
        successBackNow:'กลับหน้าก่อนทันที',
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
        errNoLiffId:'NEXT_PUBLIC_LINE_LIFF_REPAIR_REQUEST_ID is not configured.',
        errSubmit:'An error occurred while submitting.', errGeneric:'Submission failed.',
        errCaptcha:'Incorrect verification code. Please try again.',
        closeAlert:'Dismiss', required:'Required', optional:'Optional',
        detailSection:'Issue Details', footer:'Your information is safe and confidential.',
        captchaLabel:'Verification Code', captchaPlaceholder:'Enter 4 digits', captchaRefresh:'New code', captchaVerified:'Code verified',
        confirmTitle:'Confirm Repair Request', confirmSub:'Review details before submitting',
        confirmLocation:'Location', confirmIssue:'Issue',
        confirmDesc:'Details', confirmNoDesc:'None provided',
        confirmImages:'Photos', confirmImagesCount:'{n} photo(s)',
        confirmCancel:'Edit', confirmSubmit:'Confirm & Send',
        confirmSubmitting:'Submitting...',
        successTitle:'Repair request submitted',
        successSub:'Your request has been received. This page will return to the previous screen automatically.',
        successReference:'Reference No.',
        successAutoBack:'Returning in {n} seconds',
        successBackNow:'Back now',
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
        errNoLiffId:'NEXT_PUBLIC_LINE_LIFF_REPAIR_REQUEST_ID が設定されていません。',
        errSubmit:'送信中にエラーが発生しました。', errGeneric:'送信に失敗しました。',
        errCaptcha:'認証コードが間違っています。もう一度お試しください。',
        closeAlert:'閉じる', required:'必須', optional:'任意',
        detailSection:'問題の詳細', footer:'情報は安全に保護されます。',
        captchaLabel:'認証コード', captchaPlaceholder:'4桁を入力', captchaRefresh:'更新', captchaVerified:'コード確認済み',
        confirmTitle:'修理リクエストの確認', confirmSub:'送信前に内容をご確認ください',
        confirmLocation:'場所', confirmIssue:'問題',
        confirmDesc:'詳細', confirmNoDesc:'なし',
        confirmImages:'写真', confirmImagesCount:'{n}枚',
        confirmCancel:'修正', confirmSubmit:'確認して送信',
        confirmSubmitting:'送信中...',
        successTitle:'修理依頼を送信しました',
        successSub:'受付が完了しました。まもなく前の画面へ自動で戻ります。',
        successReference:'受付番号',
        successAutoBack:'{n}秒後に前の画面へ戻ります',
        successBackNow:'今すぐ戻る',
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genCaptcha(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Types ────────────────────────────────────────────────────────────────────
type AlertKind = 'success' | 'error' | 'info';
type RoomOption = {
    room_id: number;
    room_code: string;
    room_name: string;
    building?: string | null;
    floor?: string | null;
    zone?: string | null;
    active?: boolean;
};

type LocationRoomOption = {
    roomId: number;
    roomCode: string;
    roomName: string;
    roomLabel: string;
};

type LocationZoneOption = {
    roomId: number;
    roomCode: string;
    zoneCode: string;
    zoneName: string;
    zoneLabel: string;
};

const resolveParentRoomCode = (room: RoomOption): string => {
    if (!room.zone) return room.room_code;
    const parentCode = room.building?.trim();
    if (parentCode && parentCode !== room.room_code) return parentCode;
    return room.room_code;
};

const normalizeRoomLookupValue = (value?: string | null): string =>
    (value || '').trim().toLowerCase();

const roomMatchesLookup = (room: RoomOption, lookup: string): boolean => {
    if (!lookup) return false;
    return (
        normalizeRoomLookupValue(room.room_code) === lookup
        || normalizeRoomLookupValue(room.room_name) === lookup
        || normalizeRoomLookupValue(resolveParentRoomCode(room)) === lookup
    );
};

const findPreferredRoomForLookup = (roomOptions: RoomOption[], lookup: string): RoomOption | null => {
    if (!lookup) return null;

    const exactRoomMatch = roomOptions.find((room) =>
        !room.zone
        && (
            normalizeRoomLookupValue(room.room_code) === lookup
            || normalizeRoomLookupValue(room.room_name) === lookup
        ),
    );

    if (exactRoomMatch) return exactRoomMatch;
    return roomOptions.find((room) => roomMatchesLookup(room, lookup)) || null;
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function Dots() {
    return <span style={{ display:'inline-flex', alignItems:'center' }}><span className="d d1"/><span className="d d2"/><span className="d d3"/></span>;
}

function AlertBox({ kind, children, onDismiss, closeLabel }: { kind: AlertKind; children: ReactNode; onDismiss?: () => void; closeLabel?: string }) {
    return (
        <div role="alert" className={`al ${kind}`}>
            <div className="al-in">
                {kind === 'success' && <CheckCircle2 size={15} style={{ flexShrink:0, marginTop:1 }}/>}
                {kind === 'error' && <AlertCircle size={15} style={{ flexShrink:0, marginTop:1 }}/>}
                <span>{children}</span>
            </div>
            {onDismiss && <button type="button" onClick={onDismiss} className="al-x" aria-label={closeLabel ?? 'Dismiss'}><X size={14}/></button>}
        </div>
    );
}

// ── Captcha Display with SVG noise lines ──
function CaptchaDisplay({ code }: { code: string }) {
    const rotations = ['-4deg', '3deg', '-2deg', '5deg'];
    // SVG noise lines
    const lines = Array.from({ length: 5 }, (_, i) => ({
        x1: 5 + i * 18, y1: Math.random() * 54, x2: 15 + i * 18, y2: Math.random() * 54,
    }));
    return (
        <div className="cap-display">
            <svg className="cap-noise" viewBox="0 0 200 54" preserveAspectRatio="none">
                {/* horizontal noise lines */}
                <line x1="0" y1="12" x2="200" y2="18" stroke="rgba(196,98,42,0.12)" strokeWidth="1.2"/>
                <line x1="0" y1="38" x2="200" y2="32" stroke="rgba(196,98,42,0.10)" strokeWidth="1"/>
                <line x1="10" y1="27" x2="190" y2="24" stroke="rgba(196,98,42,0.07)" strokeWidth="0.8"/>
                {lines.map((l, i) => (
                    <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(196,98,42,0.09)" strokeWidth="1"/>
                ))}
            </svg>
            {code.split('').map((ch, i) => (
                <span key={i} className="cap-digit" style={{ '--rot': rotations[i] } as React.CSSProperties}>{ch}</span>
            ))}
        </div>
    );
}

// ── Confirm Dialog ──
function ConfirmDialog({
    lang, t, customerInfo, roomDisplay, title, description, imageCount, loading,
    onCancel, onConfirm,
}: {
    lang: Lang; t: (k: string) => string;
    customerInfo: { full_name: string } | null;
    roomDisplay: string; title: string; description: string; imageCount: number;
    loading: boolean; onCancel: () => void; onConfirm: () => void;
}) {
    return (
        <div className="dlg-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="dlg" role="dialog" aria-modal="true">
                {/* Header */}
                <div className="dlg-header">
                    <div className="dlg-header-icon"><Send size={18} color="#fff"/></div>
                    <div>
                        <p className="dlg-header-title">{t('confirmTitle')}</p>
                        <p className="dlg-header-sub">{t('confirmSub')}</p>
                    </div>
                </div>

                {/* Summary rows */}
                <div className="dlg-body">
                    <div className="dlg-row">
                        <MapPin size={15} className="dlg-row-icon"/>
                        <div>
                            <p className="dlg-row-label">{t('confirmLocation')}</p>
                            <p className="dlg-row-value">{roomDisplay}</p>
                        </div>
                    </div>
                    <div className="dlg-row">
                        <Wrench size={15} className="dlg-row-icon"/>
                        <div>
                            <p className="dlg-row-label">{t('confirmIssue')}</p>
                            <p className="dlg-row-value">{title}</p>
                        </div>
                    </div>
                    {description && (
                        <div className="dlg-row">
                            <FileText size={15} className="dlg-row-icon"/>
                            <div>
                                <p className="dlg-row-label">{t('confirmDesc')}</p>
                                <p className="dlg-row-value" style={{ whiteSpace:'pre-wrap' }}>{description}</p>
                            </div>
                        </div>
                    )}
                    {imageCount > 0 && (
                        <div className="dlg-row">
                            <Camera size={15} className="dlg-row-icon"/>
                            <div>
                                <p className="dlg-row-label">{t('confirmImages')}</p>
                                <p className="dlg-row-value">{t('confirmImagesCount').replace('{n}', String(imageCount))}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="dlg-actions">
                    <button type="button" className="dlg-cancel" onClick={onCancel} disabled={loading}>
                        {t('confirmCancel')}
                    </button>
                    <button type="button" className="dlg-confirm" onClick={onConfirm} disabled={loading}>
                        {loading
                            ? <><Loader2 size={15} className="spin"/>{t('confirmSubmitting')}</>
                            : <><CheckCircle2 size={15}/>{t('confirmSubmit')}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

function SuccessDialog({
    t, requestNumber, roomDisplay, issueTitle, countdown, onBack,
}: {
    t: (k: string) => string;
    requestNumber?: string | null;
    roomDisplay: string;
    issueTitle: string;
    countdown: number;
    onBack: () => void;
}) {
    return (
        <div className="sd-backdrop">
            <div className="sd" role="dialog" aria-modal="true">
                <div className="sd-head">
                    <div className="sd-icon"><CheckCircle2 size={28} color="#fff"/></div>
                    <h2 className="sd-title">{t('successTitle')}</h2>
                    <p className="sd-sub">{t('successSub')}</p>
                </div>
                <div className="sd-body">
                    {requestNumber && (
                        <div className="sd-card">
                            <div className="sd-label">{t('successReference')}</div>
                            <div className="sd-value">{requestNumber}</div>
                        </div>
                    )}
                    <div className="sd-card">
                        <div className="sd-label">{t('confirmLocation')}</div>
                        <div className="sd-value">{roomDisplay}</div>
                    </div>
                    <div className="sd-card">
                        <div className="sd-label">{t('confirmIssue')}</div>
                        <div className="sd-value">{issueTitle}</div>
                    </div>
                    <div className="sd-note">
                        {t('successAutoBack').replace('{n}', String(countdown))}
                    </div>
                    <div className="sd-actions">
                        <button type="button" className="sd-back" onClick={onBack}>
                            {t('successBackNow')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
type LineRepairRequestClientProps = {
    repairRequestLiffId?: string;
};

export default function LineRepairRequestClient({
    repairRequestLiffId = '',
}: LineRepairRequestClientProps) {
    const LOGIN_REDIRECT_URL = 'https://mpstock.sugoidev.com/login';

    const searchParams = useSearchParams();
    const lineUserIdFromQuery = (searchParams.get('line_user_id') || '').trim();
    const debugLiffEnabled = searchParams.get('debug_liff') === '1';
    const resolvedLiffId = repairRequestLiffId.trim() || '2008227129-RRioS2SM';
    const liffUrl = resolvedLiffId ? `https://liff.line.me/${resolvedLiffId}` : '';
    const safeRedirectUri = buildSafeLiffRedirectUri() || '';

    // Language
    const [lang, setLangState] = useState<Lang>('th');
    const t = useCallback((k: string) => T[lang][k] ?? k, [lang]);
    const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('repair_lang', l); } catch { /**/ } };
    useEffect(() => { try { const s = localStorage.getItem('repair_lang') as Lang | null; if (s && ['th','en','jp'].includes(s)) setLangState(s); } catch { /**/ } }, []);

    // Core state
    const [lineUserId, setLineUserId] = useState('');
    const [customerInfo, setCustomerInfo] = useState<{ full_name: string; phone_number: string; room_number?: string } | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [roomId, setRoomId] = useState<number>(0);
    const [rooms, setRooms] = useState<RoomOption[]>([]);
    const [category] = useState('general');
    const [priority] = useState('normal');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const normalizedRegisteredRoomLookup = useMemo(
        () => normalizeRoomLookupValue(customerInfo?.room_number),
        [customerInfo?.room_number],
    );

    const activeLocationRooms = useMemo(
        () => rooms.filter((room) => room.active !== false),
        [rooms],
    );

    const { locationRoomOptions, locationZoneOptionsByRoom } = useMemo(() => {
        const zoneOptionMap = new Map<string, LocationZoneOption[]>();
        const locationRoomMap = new Map<string, LocationRoomOption>();

        for (const room of activeLocationRooms) {
            if (room.zone) {
                const parentRoomCode = resolveParentRoomCode(room);
                if (!zoneOptionMap.has(parentRoomCode)) {
                    zoneOptionMap.set(parentRoomCode, []);
                }
                zoneOptionMap.get(parentRoomCode)!.push({
                    roomId: room.room_id,
                    roomCode: parentRoomCode,
                    zoneCode: room.room_code,
                    zoneName: room.room_name,
                    zoneLabel: `${room.room_code} - ${room.room_name}`,
                });
                continue;
            }

            locationRoomMap.set(room.room_code, {
                roomId: room.room_id,
                roomCode: room.room_code,
                roomName: room.room_name,
                roomLabel: `${room.room_code} - ${room.room_name}`,
            });
        }

        for (const [roomCode, zones] of zoneOptionMap.entries()) {
            if (!locationRoomMap.has(roomCode)) {
                locationRoomMap.set(roomCode, {
                    roomId: zones[0]?.roomId || 0,
                    roomCode,
                    roomName: roomCode,
                    roomLabel: roomCode,
                });
            }
        }

        const sortedRoomOptions = [...locationRoomMap.values()].sort((left, right) =>
            left.roomCode.localeCompare(right.roomCode),
        );
        const sortedZoneMap = new Map<string, LocationZoneOption[]>();
        for (const [roomCode, zones] of zoneOptionMap.entries()) {
            sortedZoneMap.set(
                roomCode,
                [...zones].sort((left, right) => left.zoneCode.localeCompare(right.zoneCode)),
            );
        }

        return {
            locationRoomOptions: sortedRoomOptions,
            locationZoneOptionsByRoom: sortedZoneMap,
        };
    }, [activeLocationRooms]);

    const registeredRoomRecord = useMemo(
        () => findPreferredRoomForLookup(activeLocationRooms, normalizedRegisteredRoomLookup),
        [activeLocationRooms, normalizedRegisteredRoomLookup],
    );

    const lockedLocationRoomCode = registeredRoomRecord
        ? resolveParentRoomCode(registeredRoomRecord)
        : '';

    const lockedLocationRoomOptions = useMemo(() => {
        if (!customerInfo || !normalizedRegisteredRoomLookup || !lockedLocationRoomCode) {
            return [] as LocationRoomOption[];
        }
        return locationRoomOptions.filter((room) => room.roomCode === lockedLocationRoomCode);
    }, [customerInfo, locationRoomOptions, lockedLocationRoomCode, normalizedRegisteredRoomLookup]);

    useEffect(() => {
        if (!lockedLocationRoomCode || activeLocationRooms.length === 0) return;

        const currentSelectedRoom = roomId
            ? activeLocationRooms.find((room) => room.room_id === roomId) || null
            : null;

        if (currentSelectedRoom && resolveParentRoomCode(currentSelectedRoom) === lockedLocationRoomCode) {
            return;
        }

        const fallbackRoom =
            activeLocationRooms.find((room) => !room.zone && room.room_code === lockedLocationRoomCode)
            || activeLocationRooms.find((room) => resolveParentRoomCode(room) === lockedLocationRoomCode)
            || null;

        if (fallbackRoom) {
            setRoomId(fallbackRoom.room_id);
        }
    }, [activeLocationRooms, lockedLocationRoomCode, roomId]);

    const selectedLocationRoomRecord = roomId
        ? rooms.find((room) => room.room_id === roomId) || null
        : null;
    const selectedLocationRoomCode = selectedLocationRoomRecord
        ? resolveParentRoomCode(selectedLocationRoomRecord)
        : '';
    const selectedLocationRoomOption = selectedLocationRoomCode
        ? lockedLocationRoomOptions.find((room) => room.roomCode === selectedLocationRoomCode) || null
        : null;
    const availableLocationZones = selectedLocationRoomCode
        ? locationZoneOptionsByRoom.get(selectedLocationRoomCode) || []
        : [];
    const selectedLocationZoneId = selectedLocationRoomRecord?.zone
        && availableLocationZones.some((zone) => zone.roomId === selectedLocationRoomRecord.room_id)
        ? selectedLocationRoomRecord.room_id
        : 0;
    const selectedRoomDisplay = selectedLocationRoomRecord
        ? `${selectedLocationRoomRecord.room_code} - ${selectedLocationRoomRecord.room_name}`
        : (customerInfo?.room_number || t('noLocation'));

    // Captcha
    const [captchaCode, setCaptchaCode] = useState(() => genCaptcha());
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaStatus, setCaptchaStatus] = useState<'idle' | 'wrong' | 'right'>('idle');
    const [refreshing, setRefreshing] = useState(false);

    // UI
    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(false);
    const [detectingLineId, setDetectingLineId] = useState(true);
    const [alert, setAlert] = useState<{ kind: AlertKind; text: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [successRequestNumber, setSuccessRequestNumber] = useState<string | null>(null);
    const [successRoomDisplay, setSuccessRoomDisplay] = useState<string | null>(null);
    const [successCountdown, setSuccessCountdown] = useState(3);

    const returnToPreviousPage = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.location.replace(LOGIN_REDIRECT_URL);
    }, [LOGIN_REDIRECT_URL]);

    useEffect(() => {
        if (!successRequestNumber) return;
        setSuccessCountdown(3);

        const intervalId = window.setInterval(() => {
            setSuccessCountdown((prev) => (prev > 1 ? prev - 1 : prev));
        }, 1000);

        const timeoutId = window.setTimeout(() => {
            returnToPreviousPage();
        }, 3000);

        return () => {
            window.clearInterval(intervalId);
            window.clearTimeout(timeoutId);
        };
    }, [returnToPreviousPage, successRequestNumber]);

    const refreshCaptcha = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
        setCaptchaCode(genCaptcha());
        setCaptchaInput('');
        setCaptchaStatus('idle');
    };

    // Captcha input handler
    const handleCaptchaChange = (val: string) => {
        const v = val.replace(/\D/g, '').slice(0, 4);
        setCaptchaInput(v);
        if (v.length === 4) {
            if (v === captchaCode) {
                setCaptchaStatus('right');
            } else {
                setCaptchaStatus('wrong');
                setTimeout(() => { setCaptchaInput(''); setCaptchaStatus('idle'); refreshCaptcha(); }, 600);
            }
        } else {
            setCaptchaStatus('idle');
        }
    };

    const triggerLineLogin = useCallback(() => {
        const redirectUri = buildSafeLiffRedirectUri();
        if (window.liff) {
            window.liff.login(redirectUri ? { redirectUri } : undefined);
            return;
        }
        if (resolvedLiffId) {
            window.location.href = `https://liff.line.me/${resolvedLiffId}`;
        }
    }, [resolvedLiffId]);

    // LIFF
    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!resolvedLiffId) {
                if (!cancelled) {
                    if (lineUserIdFromQuery) {
                        setLineUserId(lineUserIdFromQuery);
                    } else {
                        setAlert({ kind:'info', text:t('errNoLiffId') });
                    }
                    setDetectingLineId(false);
                }
                return;
            }
            try {
                await loadLiffSdk();
                if (!window.liff) throw new Error('LIFF unavailable');
                await window.liff.init({ liffId: resolvedLiffId });
                if (!window.liff.isLoggedIn()) {
                    const redirectUri = buildSafeLiffRedirectUri();
                    window.liff.login(redirectUri ? { redirectUri } : undefined);
                    return;
                }
                const p = await window.liff.getProfile();
                if (!cancelled && p?.userId) setLineUserId(p.userId);
                else if (!cancelled && lineUserIdFromQuery) setLineUserId(lineUserIdFromQuery);
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    if (lineUserIdFromQuery) {
                        setLineUserId(lineUserIdFromQuery);
                    }
                    setAlert({ kind:'error', text:t('errLineId') });
                }
            }
            finally { if (!cancelled) setDetectingLineId(false); }
        }
        void run(); return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineUserIdFromQuery, resolvedLiffId]);

    // Hydrate
    useEffect(() => {
        let cancelled = false;
        async function hydrate() {
            if (!lineUserId) return; setHydrating(true);
            try {
                const [cr, rr] = await Promise.all([getLineCustomerByLineId(lineUserId), getRooms()]);
                if (cancelled) return;
                const nextRooms = rr.success && Array.isArray(rr.data) ? (rr.data as RoomOption[]) : [];
                setRooms(nextRooms);
                if (cr.success && cr.data) {
                    setCustomerInfo({ full_name:cr.data.full_name||'', phone_number:cr.data.phone_number||'', room_number:cr.data.room_number||'' });
                    if (nextRooms.length > 0 && cr.data.room_number) {
                        const savedLookup = normalizeRoomLookupValue(cr.data.room_number);
                        const match = findPreferredRoomForLookup(nextRooms, savedLookup);
                        if (match) setRoomId(match.room_id);
                    }
                } else if (!cr.success) setAlert({ kind:'error', text:t('errNoCustomer') });
            } catch (e) { console.error(e); } finally { if (!cancelled) setHydrating(false); }
        }
        void hydrate(); return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineUserId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files||[]); if (!files.length) return;
        setSelectedFiles(prev=>[...prev,...files]);
        files.forEach(f=>{const r=new FileReader();r.onloadend=()=>setPreviews(prev=>[...prev,r.result as string]);r.readAsDataURL(f);});
        if (fileInputRef.current) fileInputRef.current.value='';
    };
    const removeFile = (i: number) => {
        setSelectedFiles(prev=>{const n=[...prev];n.splice(i,1);return n;});
        setPreviews(prev=>{const n=[...prev];n.splice(i,1);return n;});
    };

    // Step 1: validate form → open confirm dialog
    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setAlert(null);
        if (!lineUserId || !customerInfo) { setAlert({ kind:'error', text:t('errNoUser') }); return; }
        if (roomId === 0) { setAlert({ kind:'error', text:t('errNoRoom') }); return; }
        if (lockedLocationRoomCode && selectedLocationRoomCode !== lockedLocationRoomCode) {
            setAlert({ kind:'error', text:t('errNoRoom') });
            return;
        }
        if (captchaStatus !== 'right') { setAlert({ kind:'error', text:t('errCaptcha') }); return; }
        setShowConfirm(true);
    }

    // Step 2: confirmed → actually submit
    async function handleConfirmedSubmit() {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('line_user_id', lineUserId); fd.append('title', title); fd.append('description', description);
            fd.append('room_id', roomId.toString()); fd.append('category', category); fd.append('priority', priority); fd.append('tags','ลูกค้า');
            selectedFiles.forEach(f=>fd.append('images',f));
            const result = await submitCustomerRepairRequest(fd);
            if (result.success) {
                setShowConfirm(false);
                setAlert(null);
                setSuccessRoomDisplay(selectedRoomDisplay);
                setSuccessRequestNumber(result.data?.request_number ?? null);
                setTitle(''); setDescription(''); setSelectedFiles([]); setPreviews([]);
                setCaptchaInput(''); setCaptchaStatus('idle'); refreshCaptcha();
            } else { setAlert({ kind:'error', text:result.error||t('errGeneric') }); setShowConfirm(false); }
        } catch (e) { console.error(e); setAlert({ kind:'error', text:t('errSubmit') }); setShowConfirm(false); }
        finally { setLoading(false); }
    }

    const captchaVerified = captchaStatus === 'right';
    const canSubmit = !!customerInfo && title.trim().length > 0 && roomId !== 0 && captchaVerified && !loading && !detectingLineId && !hydrating;
    const isWaiting = detectingLineId || hydrating;
    const badgeClass = isWaiting ? 'wait' : customerInfo ? 'ok' : 'no';
    const badgeText = isWaiting ? (detectingLineId ? t('checkingLine') : t('fetchingData')) : customerInfo ? t('verified') : t('notRegistered');

    return (
        <div className="repair-root" style={{ minHeight:'100vh', background:'linear-gradient(150deg,#fff7ef 0%,#fef9f5 55%,#fff 100%)', padding:'28px 14px 52px' }}>
            <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLE }}/>
            <div style={{ maxWidth:432, margin:'0 auto' }}>
                <div className="rc">

                    {/* Header */}
                    <div className="rh">
                        <div className="rh-inner">
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div className="rh-icon"><Wrench size={20} color="#fff"/></div>
                                <div>
                                    <h1 className="rh-title">{t('pageTitle')}</h1>
                                    <p className="rh-sub">{t('pageSubtitle')}</p>
                                </div>
                            </div>
                            <div className="ls">
                                {(['th','en','jp'] as Lang[]).map(l=>(
                                    <button key={l} type="button" onClick={()=>setLang(l)} className={`lb ${lang===l?'on':''}`}>{LANG_LABELS[l]}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="rb">

                        {/* Status */}
                        <div className="sc">
                            <div className="sc-row">
                                <span className="sc-label"><Globe size={11}/>{t('userStatus')}</span>
                                <span className={`badge ${badgeClass}`}>
                                    {isWaiting?<><Dots/>&nbsp;{badgeText}</>:customerInfo?<><CheckCircle2 size={11}/>{badgeText}</>:<><AlertCircle size={11}/>{badgeText}</>}
                                </span>
                            </div>
                            {customerInfo&&(<>
                                <div className="sc-div"/>
                                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                    <div className="cr"><User size={13}/><span>{t('name')}:</span><span className="cv">{customerInfo.full_name}</span></div>
                                    <div className="cr"><Phone size={13}/><span>{t('phone')}:</span><span className="cv">{customerInfo.phone_number}</span></div>
                                </div>
                            </>)}
                        </div>
                        {!detectingLineId && !lineUserId && !!resolvedLiffId && (
                            <button
                                type="button"
                                onClick={triggerLineLogin}
                                className="sb"
                                style={{ marginTop: -2 }}
                            >
                                LINE Login
                            </button>
                        )}

                        {/* Location */}
                        <div className="fg">
                            <label className="fl"><MapPin size={13}/>{t('locationRequired')}</label>
                            {customerInfo?.room_number && (
                                <p className="ic" style={{ textAlign: 'left', marginTop: 0 }}>
                                    ห้องจากโปรไฟล์: {customerInfo.room_number}
                                </p>
                            )}
                            <select
                                value={selectedLocationRoomCode}
                                onChange={(e) => {
                                    const nextRoomOption = lockedLocationRoomOptions.find((room) => room.roomCode === e.target.value) || null;
                                    setRoomId(nextRoomOption?.roomId || 0);
                                }}
                                className="fi"
                                disabled={!customerInfo || lockedLocationRoomOptions.length <= 1}
                            >
                                <option value="">-- เลือกห้อง --</option>
                                {lockedLocationRoomOptions.map((room) => (
                                    <option key={room.roomCode} value={room.roomCode}>
                                        {room.roomLabel}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedLocationZoneId ? String(selectedLocationZoneId) : ''}
                                onChange={(e) => {
                                    const nextZoneRoomId = Number.parseInt(e.target.value, 10);
                                    if (Number.isFinite(nextZoneRoomId) && nextZoneRoomId > 0) {
                                        setRoomId(nextZoneRoomId);
                                        return;
                                    }
                                    setRoomId(selectedLocationRoomOption?.roomId || 0);
                                }}
                                className="fi"
                                style={{ marginTop: 8 }}
                                disabled={!customerInfo || !selectedLocationRoomCode}
                            >
                                <option value="">{selectedLocationRoomCode ? '-- เลือกโซน (ถ้ามี) --' : '-- กรุณาเลือกห้องก่อน --'}</option>
                                {availableLocationZones.map((zone) => (
                                    <option key={zone.roomId} value={zone.roomId}>
                                        {zone.zoneLabel}
                                    </option>
                                ))}
                            </select>
                            {roomId===0&&customerInfo?.room_number&&<p className="fhint"><AlertCircle size={11}/>{t('locationNotFound')}</p>}
                        </div>

                        <div className="sec-div">{t('detailSection')}</div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

                            <div className="fg">
                                <label className="fl"><Wrench size={13}/>{t('issueTitle')}<span className="fl-tag req">{t('required')}</span></label>
                                <input type="text" value={title} onChange={e=>setTitle(e.target.value)} required className="fi" placeholder={t('issuePlaceholder')} disabled={!customerInfo}/>
                            </div>

                            <div className="fg">
                                <label className="fl">{t('description')}<span className="fl-tag opt">{t('optional')}</span></label>
                                <textarea value={description} onChange={e=>setDescription(e.target.value)} className="ft" rows={3} placeholder={t('descriptionPlaceholder')} disabled={!customerInfo}/>
                            </div>

                            <div className="fg">
                                <label className="fl"><Camera size={13}/>{t('attachImage')}<span className="fl-tag opt">{t('optional')}</span></label>
                                <div className="ig">
                                    {previews.map((src,idx)=>(
                                        <div key={idx} className="it">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt="preview"/>
                                            <button type="button" onClick={()=>removeFile(idx)} className="ir"><X size={10}/></button>
                                        </div>
                                    ))}
                                    {previews.length<4&&customerInfo&&(
                                        <button type="button" onClick={()=>fileInputRef.current?.click()} className="ia">
                                            <Upload size={16}/><span>{t('addPhoto')}</span>
                                        </button>
                                    )}
                                </div>
                                {previews.length>0&&<p className="ic">{previews.length} {t('imagesMax')}</p>}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple style={{ display:'none' }}/>
                            </div>

                            {/* ── CAPTCHA ── */}
                            <div className="cap-wrap">
                                <div className="cap-header">
                                    <span className="cap-label"><ShieldCheck size={13}/>{t('captchaLabel')}<span className="fl-tag req" style={{ marginLeft:6 }}>{t('required')}</span></span>
                                    <button
                                        type="button"
                                        onClick={refreshCaptcha}
                                        className={`cap-refresh${refreshing?' spinning':''}`}
                                        title={t('captchaRefresh')}
                                        disabled={!customerInfo}
                                    >
                                        <RefreshCw size={14} style={refreshing?{animation:'spin 0.5s linear'}:{}}/>
                                    </button>
                                </div>
                                <div className="cap-row">
                                    <CaptchaDisplay code={captchaCode}/>
                                    <div className="cap-input-wrap">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={4}
                                            value={captchaInput}
                                            onChange={e=>handleCaptchaChange(e.target.value)}
                                            className={`cap-input${captchaStatus==='wrong'?' wrong':captchaStatus==='right'?' right':''}`}
                                            placeholder={t('captchaPlaceholder')}
                                            disabled={!customerInfo||captchaStatus==='right'}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                {captchaStatus==='right'&&(
                                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.76rem', color:'var(--success)', fontWeight:600 }}>
                                        <CheckCircle2 size={13}/>
                                        {t('captchaVerified')}
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={!canSubmit} className="sb" style={{ marginTop:2 }}>
                                {t('submit')}<ChevronRight size={16} className="arr"/>
                            </button>

                        </form>

                        {alert&&(
                            <AlertBox kind={alert.kind} onDismiss={()=>setAlert(null)} closeLabel={t('closeAlert')}>
                                {alert.text}
                            </AlertBox>
                        )}
                    </div>
                </div>

                <p style={{ textAlign:'center', fontSize:'0.69rem', color:'var(--text-muted)', marginTop:14, letterSpacing:'0.02em' }}>
                    {t('footer')}
                </p>

                {debugLiffEnabled && (
                    <div
                        style={{
                            marginTop: 14,
                            background: '#fff',
                            border: '1px solid #eeddd0',
                            borderRadius: 14,
                            padding: 14,
                            boxShadow: '0 4px 18px rgba(186,120,70,0.08)',
                            fontSize: '0.76rem',
                            color: '#6b5744',
                            wordBreak: 'break-word',
                        }}
                    >
                        <div style={{ fontWeight: 700, color: '#1a1209', marginBottom: 8 }}>LIFF Debug</div>
                        <div><strong>Resolved LIFF ID:</strong> {resolvedLiffId || '-'}</div>
                        <div><strong>LIFF URL:</strong> {liffUrl || '-'}</div>
                        <div><strong>Safe Redirect URI:</strong> {safeRedirectUri || '-'}</div>
                        <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : '-'}</div>
                        <div><strong>Query line_user_id:</strong> {lineUserIdFromQuery || '-'}</div>
                    </div>
                )}
            </div>

            {/* Confirm Dialog */}
            {showConfirm&&(
                <ConfirmDialog
                    lang={lang}
                    t={t}
                    customerInfo={customerInfo}
                    roomDisplay={selectedRoomDisplay}
                    title={title}
                    description={description}
                    imageCount={selectedFiles.length}
                    loading={loading}
                    onCancel={()=>setShowConfirm(false)}
                    onConfirm={handleConfirmedSubmit}
                />
            )}

            {successRequestNumber && (
                <SuccessDialog
                    t={t}
                    requestNumber={successRequestNumber}
                    roomDisplay={successRoomDisplay || selectedRoomDisplay}
                    issueTitle={title || '-'}
                    countdown={successCountdown}
                    onBack={returnToPreviousPage}
                />
            )}
        </div>
    );
}
