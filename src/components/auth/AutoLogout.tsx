'use client';

import { useCallback, useEffect, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function AutoLogout() {
    const { data: session } = useSession();
    const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const shouldAutoLogout = Boolean(session) && userRole !== 'employee';
    const timeoutRedirectUrl = '/login?reason=timeout';

    // 10 minutes in milliseconds
    const TIMEOUT_MS = 10 * 60 * 1000;

    const handleLogout = useCallback(async () => {
        if (!shouldAutoLogout || !session) {
            return;
        }

        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
            timeoutId.current = null;
        }

        console.log('User inactive for 10 mins, logging out...');

        try {
            const result = await signOut({
                redirect: false,
                callbackUrl: timeoutRedirectUrl,
            });

            window.location.replace(result?.url || timeoutRedirectUrl);
        } catch {
            window.location.replace(timeoutRedirectUrl);
        }
    }, [shouldAutoLogout, session, timeoutRedirectUrl]);

    const resetTimer = useCallback(() => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }

        if (shouldAutoLogout && session) {
            timeoutId.current = setTimeout(handleLogout, TIMEOUT_MS);
        }
    }, [TIMEOUT_MS, handleLogout, session, shouldAutoLogout]);

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
