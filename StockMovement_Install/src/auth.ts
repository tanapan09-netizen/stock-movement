import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

                if (!username || !password) return null;

                const user = await prisma.tbl_users.findUnique({
                    where: { username }
                });

                if (!user) return null;

                // 1. Check if account is locked
                if (user.locked_until && user.locked_until > new Date()) {
                    throw new Error('บัญชีถูกระงับชั่วคราว กรุณาลองใหม่ภายหลัง');
                }

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

                    return null;
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
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                console.log('JWT Callback - User Login:', user);
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
                console.log('Session Callback - Role:', token.role);
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
    secret: process.env.AUTH_SECRET || 'secret', // TODO: Add to .env
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
