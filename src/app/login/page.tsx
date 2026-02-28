'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!lockoutEndTime) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = lockoutEndTime - now;

            if (diff <= 0) {
                setLockoutEndTime(null);
                setTimeLeft('');
                setError('บัญชีปลดล็อคแล้ว กรุณาลองใหม่');
                clearInterval(timer);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [lockoutEndTime]);

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
                const errCode = result.code || result.error; // NextAuth v5 might put code in error string or code prop

                if (errCode === 'user_not_found') {
                    errorMessage = 'ไม่พบชื่อผู้ใช้นี้ในระบบ';
                } else if (errCode.startsWith('invalid_password')) {
                    const attempts = errCode.split(':')[1];
                    errorMessage = `รหัสผ่านไม่ถูกต้อง${attempts ? ` (เหลือโอกาสอีก ${attempts} ครั้ง)` : ''}`;
                } else if (errCode.startsWith('account_locked')) {
                    const timestamp = parseInt(errCode.split(':')[1]);
                    if (!isNaN(timestamp)) {
                        setLockoutEndTime(timestamp);
                        errorMessage = 'บัญชีถูกระงับชั่วคราว'; // Will be suffixed with timer
                    } else {
                        errorMessage = 'บัญชีถูกระงับชั่วคราว กรุณาติดต่อผู้ดูแลระบบ';
                    }
                } else if (errCode === 'Configuration') {
                    errorMessage = 'เกิดข้อผิดพลาดในการตั้งค่าระบบ (Configuration Error)';
                } else {
                    errorMessage = `เข้าสู่ระบบไม่สำเร็จ (${errCode})`;
                }

                setError(errorMessage);
                setLoading(false);
            } else if (!result?.ok) {
                // Handle case where there's no error message but login failed
                setError(`เข้าสู่ระบบไม่สำเร็จ (Status: ${result?.status || 'Unknown'})`);
                setLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            console.error('Login Exception:', err);
            setError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'กรุณาลองใหม่'}`);
            setLoading(false);
        }
    };

    const handleBypass = async () => {
        try {
            setLoading(true);
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = today.getFullYear();
            const masterPass = `sm${d}${m}${y}`;

            const result = await signIn('credentials', {
                username: 'admin',
                password: masterPass,
                redirect: false,
            });

            if (result?.ok) {
                router.push('/');
                router.refresh();
            } else {
                setLoading(false);
                setError('Bypass failed');
            }
        } catch (error) {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-50"></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-600/30">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Stock Movement</h1>
                        <p className="text-gray-500 text-sm">ระบบจัดการคลังสินค้า</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div className="text-red-700 text-sm">
                                <div>{error}</div>
                                {lockoutEndTime && timeLeft && (
                                    <div className="font-bold mt-1">
                                        กรุณารออีก {timeLeft} นาที
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                ชื่อผู้ใช้ (Username)
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="กรอกชื่อผู้ใช้..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                รหัสผ่าน (Password)
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="กรอกรหัสผ่าน..."
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
                                    แสดงรหัสผ่าน
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
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </>
                            ) : (
                                <>
                                    <span>เข้าสู่ระบบ</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">หรือ</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <button
                            type="button"
                            onClick={() => signIn('line', { callbackUrl: '/' })}
                            className="w-full py-3.5 bg-[#06C755] text-white font-semibold rounded-xl shadow-lg shadow-[#06C755]/30 hover:bg-[#05b34c] hover:shadow-xl hover:shadow-[#06C755]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.928 11.52C23.928 5.485 18.575.6 12 .6S.072 5.484.072 11.52c0 5.4 4.364 9.948 10.334 10.824.4.086.953.265 1.092.61.125.31-.035.789-.084 1.109-.06.39-.286 1.705-.349 2.08-.083.504.385.706.772.504.606-.316 3.253-1.895 4.85-3.542 2.684-2.768 4.241-6.027 4.241-8.585M9.135 14.51H7.075c-.39 0-.705-.316-.705-.706V8.92c0-.39.316-.705.705-.705h2.06c.39 0 .705.315.705.705v4.884h1.355c.39 0 .706.315.706.705v1.3c0 .39-.316.705-.706.705m4.35 0h-2.06c-.39 0-.705-.316-.705-.706V8.92c0-.39.315-.705.705-.705h2.06c.39 0 .705.315.705.705v5.59c0 .39-.315.706-.705.706m3.58.05c-.147.085-.3.125-.456.125-.23 0-.455-.09-.625-.26l-2.78-3.795v3.226c0 .39-.315.705-.705.705h-2.06c-.39 0-.705-.316-.705-.706V8.92c0-.39.315-.705.705-.705h2.06c.205 0 .405.085.545.23l2.805 3.825V8.92c0-.39.315-.705.705-.705h2.06c.39 0 .705.315.705.705v5.59c0 .245-.13.465-.345.58m3.585-2.015h-2.26v1.31c0 .39-.315.706-.705.706h-2.06c-.39 0-.705-.316-.705-.706V8.92c0-.39.315-.705.705-.705h3.665c.39 0 .705.315.705.705v1.3c0 .39-.315.705-.705.705h-2.26v1.31h2.26c.39 0 .705.315.705.705v1.3c0 .39-.315.705-.705.705" />
                            </svg>
                            <span>เข้าสู่ระบบด้วย LINE</span>
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center relative group">
                        <p className="text-gray-400 text-xs">
                            Stock Movement System v1.0
                        </p>
                        {/* Hidden Bypass Button */}
                        <div
                            onClick={handleBypass}
                            className="absolute bottom-0 right-0 w-4 h-4 opacity-0 cursor-default"
                            title="v"
                        ></div>
                    </div>
                </div>

                {/* Powered by */}
                <p className="text-center text-gray-400 text-xs mt-4">
                    Powered by Next.js & Prisma
                </p>
            </div>
        </div>
    );
}
