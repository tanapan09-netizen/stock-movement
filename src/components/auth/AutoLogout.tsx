'use client';

import { useEffect, useCallback, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AutoLogout() {
    const { data: session } = useSession();
    const router = useRouter();
    const timeoutId = useRef<NodeJS.Timeout>(null);
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const shouldAutoLogout = Boolean(session) && userRole !== 'employee';

    // 10 minutes in milliseconds
    const TIMEOUT_MS = 10 * 60 * 1000;

    const handleLogout = useCallback(async () => {
        if (shouldAutoLogout && session) {
            console.log('Use inactive for 10 mins, logging out...');
            await signOut({ redirect: false });
            router.push('/login?reason=timeout');
        }
    }, [shouldAutoLogout, session, router]);

    const resetTimer = useCallback(() => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }

        if (shouldAutoLogout && session) {
            timeoutId.current = setTimeout(handleLogout, TIMEOUT_MS);
        }
    }, [shouldAutoLogout, session, handleLogout, TIMEOUT_MS]);

    useEffect(() => {
        if (!session) return;

        if (!shouldAutoLogout) {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
            return;
        }

        // Events to track activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Add listeners
        events.forEach(event => window.addEventListener(event, resetTimer));

        // Initial start
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [shouldAutoLogout, session, resetTimer]);

    return null;
}
