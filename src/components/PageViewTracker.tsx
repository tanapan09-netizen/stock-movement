'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/actions/pageLogActions';

export default function PageViewTracker() {
    const pathname = usePathname();
    const lastReportedPath = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname) return;

        // Prevent double logging exactly the same path
        if (lastReportedPath.current === pathname) return;

        lastReportedPath.current = pathname;

        // Collect browser/device info
        const extra = {
            userAgent: navigator.userAgent,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            referrer: document.referrer || '',
        };

        logPageView(pathname, extra).catch(console.error);

    }, [pathname]);

    return null;
}
