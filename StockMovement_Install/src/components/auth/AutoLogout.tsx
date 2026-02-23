'use client';

import { useEffect, useCallback, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AutoLogout() {
    const { data: session } = useSession();
    const router = useRouter();
    const timeoutId = useRef<NodeJS.Timeout>(null);

    // 30 minutes in milliseconds
    const TIMEOUT_MS = 30 * 60 * 1000;

    const handleLogout = useCallback(async () => {
        if (session) {
            console.log('Use inactive for 30 mins, logging out...');
            await signOut({ redirect: false });
            router.push('/login?reason=timeout');
        }
    }, [session, router]);

    const resetTimer = useCallback(() => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }

        if (session) {
            timeoutId.current = setTimeout(handleLogout, TIMEOUT_MS);
        }
    }, [session, handleLogout, TIMEOUT_MS]);

    useEffect(() => {
        if (!session) return;

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
    }, [session, resetTimer]);

    return null;
}
