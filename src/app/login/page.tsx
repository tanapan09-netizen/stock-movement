'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Package, UserPlus, Wrench } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />

            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    <div className="flex justify-end mb-4">
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{t.languageLabel}</span>
                            <select
                                value={locale}
                                onChange={(e) => setLocale(e.target.value as Locale)}
                                className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white"
                            >
                                <option value="th">TH</option>
                                <option value="en">EN</option>
                                <option value="jp">JP</option>
                            </select>
                        </label>
                    </div>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-600/30">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.title}</h1>
                        <p className="text-gray-500 text-sm">{t.subtitle}</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div className="text-red-700 text-sm">
                                <div>{error}</div>
                                {lockoutEndTime && timeLeft && <div className="font-bold mt-1">{getErrorMessage(locale, 'wait_more', { timeLeft })}</div>}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">{t.username}</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                placeholder={t.usernamePlaceholder}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">{t.password}</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                placeholder={t.passwordPlaceholder}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                            <div className="flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    id="show-password"
                                    checked={showPassword}
                                    onChange={() => setShowPassword(!showPassword)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="show-password" className="ml-2 text-sm text-gray-600 cursor-pointer">
                                    {t.showPassword}
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t.loggingIn}</span>
                                </>
                            ) : (
                                <>
                                    <span>{t.login}</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => signIn('line', { callbackUrl: '/' })}
                            className="w-full py-[12px] bg-[#06C755] text-white font-medium rounded-xl shadow-lg shadow-[#06C755]/20 hover:bg-[#05b34c] hover:shadow-xl hover:shadow-[#06C755]/30 active:scale-[0.98] transition-all duration-200 flex flex-row items-center justify-center gap-3"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
                                alt="LINE"
                                className="w-8 h-8 rounded-full"
                                style={{ marginTop: '-1px' }}
                            />
                            <span className="text-[16px] tracking-wide">{t.loginWithLine}</span>
                        </button>

                        <div className="relative flex py-2 mt-2 items-center">
                            <div className="flex-grow border-t border-gray-200" />
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-[11px] uppercase tracking-wider font-semibold">{t.customerSection}</span>
                            <div className="flex-grow border-t border-gray-200" />
                        </div>

                        <button
                            type="button"
                            onClick={() => openCustomerServicePage(customerRegisterUrl)}
                            className="w-full py-3 border border-green-200 bg-green-50 text-green-700 font-medium rounded-xl hover:bg-green-100 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span>{t.registerCustomer}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => openCustomerServicePage(repairRequestUrl)}
                            className="w-full py-3 border border-orange-200 bg-orange-50 text-orange-700 font-medium rounded-xl hover:bg-orange-100 shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <Wrench className="w-5 h-5" />
                            <span>{t.repairRequest}</span>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center relative group">
                        <p className="text-gray-400 text-xs">Stock Movement System v4.0</p>
                    </div>
                </div>

             
            </div>
        </div>
    );
}
