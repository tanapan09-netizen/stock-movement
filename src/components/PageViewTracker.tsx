'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/actions/pageLogActions';

export default function PageViewTracker() {
    const pathname = usePathname();
    const lastReportedPath = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname) return;

        // Prevent double logging exactly the same path unnecesssarily fast
        if (lastReportedPath.current === pathname) return;

        lastReportedPath.current = pathname;

        // Use a timeout or basic request to log the view off-thread
        logPageView(pathname).catch(console.error);

    }, [pathname]);

    return null;
}
