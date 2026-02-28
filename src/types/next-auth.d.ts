import NextAuth, { type DefaultSession } from 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role?: string;
            is_approver?: boolean;
        } & DefaultSession['user'];
    }

    interface User {
        id: string;
        role?: string;
        is_approver?: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role?: string;
        is_approver?: boolean;
    }
}
