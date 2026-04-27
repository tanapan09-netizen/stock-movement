'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Package, UserPlus, Wrench } from 'lucide-react';
import { FloatingInput } from '@/components/FloatingField';

type Locale = 'th' | 'en' | 'jp';
type ErrorCodeKey = 'user_not_found' | 'invalid_password' | 'account_locked' | 'configuration' | 'login_failed' | 'exception' | 'lockout_released' | 'wait_more';

type Messages = {
    languageLabel: string;
    title: string;
    subtitle: string;
    username: string;
    usernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    showPassword: string;
    login: string;
    loggingIn: string;
    loginWithLine: string;
    customerSection: string;
    registerCustomer: string;
    repairRequest: string;
    unknownStatus: string;
    errorPrefix: string;
};

const translations: Record<Locale, Messages> = {
    th: {
        languageLabel: 'ภาษา',
        title: 'Stock Movement',
        subtitle: 'ระบบจัดการคลังสินค้า',
        username: 'ชื่อผู้ใช้ (Username)',
        usernamePlaceholder: 'กรอกชื่อผู้ใช้...',
        password: 'รหัสผ่าน (Password)',
        passwordPlaceholder: 'กรอกรหัสผ่าน...',
        showPassword: 'แสดงรหัสผ่าน',
        login: 'เข้าสู่ระบบ',
        loggingIn: 'กำลังเข้าสู่ระบบ...',
        loginWithLine: 'เข้าสู่ระบบด้วย LINE',
        customerSection: 'บริการสำหรับลูกค้า',
        registerCustomer: 'ลงทะเบียน (สำหรับลูกค้า)',
        repairRequest: 'แจ้งซ่อมออนไลน์ (สำหรับลูกค้า)',
        unknownStatus: 'ไม่ทราบสถานะ',
        errorPrefix: 'เกิดข้อผิดพลาด',
    },
    en: {
        languageLabel: 'Language',
        title: 'Stock Movement',
        subtitle: 'Inventory Management System',
        username: 'Username',
        usernamePlaceholder: 'Enter username...',
        password: 'Password',
        passwordPlaceholder: 'Enter password...',
        showPassword: 'Show password',
        login: 'Sign In',
        loggingIn: 'Signing in...',
        loginWithLine: 'Sign in with LINE',
        customerSection: 'Customer Services',
        registerCustomer: 'Customer Registration',
        repairRequest: 'Online Repair Request',
        unknownStatus: 'Unknown',
        errorPrefix: 'Error',
    },
    jp: {
        languageLabel: '言語',
        title: 'Stock Movement',
        subtitle: '在庫管理システム',
        username: 'ユーザー名',
        usernamePlaceholder: 'ユーザー名を入力...',
        password: 'パスワード',
        passwordPlaceholder: 'パスワードを入力...',
        showPassword: 'パスワードを表示',
        login: 'ログイン',
        loggingIn: 'ログイン中...',
        loginWithLine: 'LINEでログイン',
        customerSection: 'お客様向けサービス',
        registerCustomer: 'お客様登録',
        repairRequest: 'オンライン修理依頼',
        unknownStatus: '不明',
        errorPrefix: 'エラー',
    },
};

const localePickerOptions: Array<{ locale: Locale; flag: string; label: string }> = [
    { locale: 'th', flag: '🇹🇭', label: 'TH' },
    { locale: 'en', flag: '🇺🇸', label: 'EN' },
    { locale: 'jp', flag: '🇯🇵', label: 'JP' },
];

const localeSwipeHint: Record<Locale, string> = {
    th: 'เลื่อนเพื่อเลือก',
    en: 'Swipe to choose',
    jp: 'スワイプして選択',
};

const getErrorMessage = (locale: Locale, code: ErrorCodeKey, params?: { attempts?: string; errCode?: string; detail?: string; timeLeft?: string }) => {
    const dict: Record<Locale, Record<ErrorCodeKey, string>> = {
        th: {
            user_not_found: 'ไม่พบชื่อผู้ใช้นี้ในระบบ',
            invalid_password: `รหัสผ่านไม่ถูกต้อง${params?.attempts ? ` (เหลือโอกาสอีก ${params.attempts} ครั้ง)` : ''}`,
            account_locked: 'บัญชีถูกระงับชั่วคราว',
            configuration: 'เกิดข้อผิดพลาดในการตั้งค่าระบบ (Configuration Error)',
            login_failed: `เข้าสู่ระบบไม่สำเร็จ${params?.errCode ? ` (${params.errCode})` : ''}`,
            exception: `เกิดข้อผิดพลาด: ${params?.detail ?? 'กรุณาลองใหม่'}`,
            lockout_released: 'บัญชีปลดล็อคแล้ว กรุณาลองใหม่',
            wait_more: `กรุณารออีก ${params?.timeLeft ?? ''} นาที`,
        },
        en: {
            user_not_found: 'User not found in the system',
            invalid_password: `Invalid password${params?.attempts ? ` (${params.attempts} attempts left)` : ''}`,
            account_locked: 'Account is temporarily locked',
            configuration: 'System configuration error (Configuration Error)',
            login_failed: `Login failed${params?.errCode ? ` (${params.errCode})` : ''}`,
            exception: `An error occurred: ${params?.detail ?? 'Please try again'}`,
            lockout_released: 'Account unlocked. Please try again.',
            wait_more: `Please wait ${params?.timeLeft ?? ''} minutes`,
        },
        jp: {
            user_not_found: 'ユーザーが見つかりません',
            invalid_password: `パスワードが正しくありません${params?.attempts ? `（残り ${params.attempts} 回）` : ''}`,
            account_locked: 'アカウントは一時的にロックされています',
            configuration: 'システム設定エラーが発生しました (Configuration Error)',
            login_failed: `ログインに失敗しました${params?.errCode ? ` (${params.errCode})` : ''}`,
            exception: `エラーが発生しました: ${params?.detail ?? '再度お試しください'}`,
            lockout_released: 'アカウントのロックが解除されました。もう一度お試しください。',
            wait_more: `あと ${params?.timeLeft ?? ''} 分お待ちください`,
        },
    };

    return dict[locale][code];
};

export default function LoginPage() {
    const [locale, setLocale] = useState<Locale>('th');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const t = useMemo(() => translations[locale], [locale]);
    const customerRegisterLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_CUSTOMER_REGISTER_ID
        || '';
    const repairRequestLiffId =
        process.env.NEXT_PUBLIC_LINE_LIFF_REPAIR_REQUEST_ID
        || '';
    const customerRegisterUrl = customerRegisterLiffId
        ? `https://liff.line.me/${customerRegisterLiffId}`
        : '/line/customer-register';
    const repairRequestUrl = repairRequestLiffId
        ? `https://liff.line.me/${repairRequestLiffId}`
        : '/line/repair-request';

    const openCustomerServicePage = (targetUrl: string) => {
        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
            window.location.href = targetUrl;
            return;
        }

        router.push(targetUrl);
    };

    useEffect(() => {
        if (!lockoutEndTime) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = lockoutEndTime - now;

            if (diff <= 0) {
                setLockoutEndTime(null);
                setTimeLeft('');
                setError(getErrorMessage(locale, 'lockout_released'));
                clearInterval(timer);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [lockoutEndTime, locale]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLockoutEndTime(null);
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                let errorMessage = '';
                let errCode = result.code || result.error;

                // In some NextAuth responses, detailed code is only present in result.url query params.
                if (
                    (!result.code || errCode === 'credentials' || errCode === 'CredentialsSignin')
                    && result.url
                ) {
                    try {
                        const parsedUrl = new URL(result.url, window.location.origin);
                        errCode = parsedUrl.searchParams.get('code')
                            || parsedUrl.searchParams.get('error')
                            || errCode;
                    } catch {
                        // Keep errCode from result when URL parsing fails.
                    }
                }

                if (errCode === 'user_not_found') {
                    errorMessage = getErrorMessage(locale, 'user_not_found');
                } else if (errCode.startsWith('invalid_password')) {
                    const attempts = errCode.split(':')[1];
                    errorMessage = getErrorMessage(locale, 'invalid_password', { attempts });
                } else if (errCode.startsWith('account_locked')) {
                    const timestamp = parseInt(errCode.split(':')[1], 10);
                    if (!Number.isNaN(timestamp)) {
                        setLockoutEndTime(timestamp);
                        errorMessage = getErrorMessage(locale, 'account_locked');
                    } else {
                        errorMessage = `${getErrorMessage(locale, 'account_locked')} (${t.errorPrefix})`;
                    }
                } else if (errCode === 'db_unavailable') {
                    errorMessage = locale === 'th'
                        ? 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
                        : locale === 'jp'
                            ? 'データベースに接続できません。再試行してください。'
                            : 'Database is unavailable. Please try again.';
                } else if (errCode === 'Configuration') {
                    errorMessage = getErrorMessage(locale, 'configuration');
                } else if (errCode === 'credentials' || errCode === 'CredentialsSignin') {
                    errorMessage = locale === 'th'
                        ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
                        : locale === 'jp'
                            ? 'ユーザー名またはパスワードが正しくありません'
                            : 'Invalid username or password';
                } else {
                    errorMessage = getErrorMessage(locale, 'login_failed', { errCode });
                }

                setError(errorMessage);
                setLoading(false);
            } else if (!result?.ok) {
                setError(
                    getErrorMessage(locale, 'login_failed', {
                        errCode: `Status: ${result?.status || t.unknownStatus}`,
                    }),
                );
                setLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            console.error('Login Exception:', err);
            setError(
                getErrorMessage(locale, 'exception', {
                    detail: err instanceof Error ? err.message : undefined,
                }),
            );
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-white">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-cyan-400/12 blur-3xl" />
                <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
                <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-[0_35px_90px_-60px_rgba(2,6,23,0.35)] backdrop-blur-xl lg:grid-cols-2">
                    <div className="border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                        <div className="mb-5">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-600">{t.languageLabel}</span>
                                <span className="text-[11px] text-slate-400">{localeSwipeHint[locale]}</span>
                            </div>
                            <div className="flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {localePickerOptions.map((option) => {
                                    const isActive = option.locale === locale;
                                    return (
                                        <button
                                            key={option.locale}
                                            type="button"
                                            onClick={() => setLocale(option.locale)}
                                            aria-pressed={isActive.toString()}
                                            className={`flex min-w-[92px] snap-start items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-all ${isActive
                                                ? 'border-cyan-300 bg-cyan-50 text-cyan-800 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className="text-base leading-none">{option.flag}</span>
                                            <span className="text-xs font-semibold tracking-wide">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-8 text-center">
                            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-600 shadow-lg shadow-cyan-600/30">
                                <Package className="h-7 w-7 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
                        </div>

                        {error && (
                            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                                <div className="text-sm text-red-700">
                                    <div>{error}</div>
                                    {lockoutEndTime && timeLeft && <div className="mt-1 font-bold">{getErrorMessage(locale, 'wait_more', { timeLeft })}</div>}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <FloatingInput
                                    label={t.username}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                    className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-cyan-200/70"
                                    labelClassName="text-slate-500"
                                    required
                                />

                                <FloatingInput
                                    label={t.password}
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="border-slate-200 bg-white text-slate-900 focus:border-cyan-500 focus:ring-cyan-200/70"
                                    labelClassName="text-slate-500"
                                    required
                                />
                                <div className="mt-2 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="show-password"
                                        checked={showPassword}
                                        onChange={() => setShowPassword(!showPassword)}
                                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <label htmlFor="show-password" className="ml-2 cursor-pointer text-sm text-slate-600">
                                        {t.showPassword}
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-cyan-700/35 transition-all duration-200 hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-700/45 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                                        <span>{t.loggingIn}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{t.login}</span>
                                        <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => signIn('line', { callbackUrl: '/' })}
                                className="flex w-full flex-row items-center justify-center gap-3 rounded-xl bg-[#06C755] py-[12px] font-medium text-white shadow-lg shadow-[#06C755]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#05b34c] hover:shadow-[#06C755]/30 active:scale-[0.985]"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
                                    alt="LINE"
                                    className="h-8 w-8 rounded-full"
                                    style={{ marginTop: '-1px' }}
                                />
                                <span className="text-[16px] tracking-wide">{t.loginWithLine}</span>
                            </button>
                        </form>
                    </div>

<div className="flex flex-col justify-center bg-slate-50/80 p-6 sm:p-8">
                        <h2 className="mb-5 text-center text-lg font-semibold text-slate-900">{t.customerSection}</h2>

                        <div className="space-y-4">
                            <button
                                type="button"
                                disabled // 1. เพิ่ม disabled เพื่อปิดการทำงาน
                                onClick={() => openCustomerServicePage(customerRegisterUrl)}
                                // 2. เพิ่ม disabled:cursor-not-allowed และ disabled:opacity-60 
                                // (พร้อมเคลียร์สีตอน hover ไม่ให้เปลี่ยนสีเมื่อปุ่มถูกปิดใช้งาน)
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 font-medium text-emerald-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-emerald-200 disabled:hover:bg-emerald-50"
                            >
                                <UserPlus className="h-5 w-5" />
                                <span>{t.registerCustomer}</span>
                            </button>

                            <button
                                type="button"
                                disabled // 1. เพิ่ม disabled
                                onClick={() => openCustomerServicePage(repairRequestUrl)}
                                // 2. เพิ่มคลาสสำหรับจัดหน้าตาตอนโดน disable
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-3 font-medium text-amber-700 shadow-sm transition-all duration-200 hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:border-amber-200 disabled:hover:bg-amber-50"
                            >
                                <Wrench className="h-5 w-5" />
                                <span>{t.repairRequest}</span>
                            </button>
                        </div>

                        <div className="relative mt-7 border-t border-slate-200 pt-5 text-center">
                            <p className="text-xs text-slate-400">Stock Movement System v4.0</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}