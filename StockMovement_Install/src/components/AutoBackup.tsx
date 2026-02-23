'use client';

import { useEffect, useRef } from 'react';
import { performBackup } from '@/actions/backupActions';

export default function AutoBackup() {
    const hasRun = useRef(false);

    useEffect(() => {
        // Only run once per session
        if (hasRun.current) return;
        hasRun.current = true;

        // Check session storage to avoid running multiple times per browser session
        const sessionKey = 'backup_done_' + new Date().toDateString();
        if (sessionStorage.getItem(sessionKey)) return;

        // Perform backup in background
        performBackup()
            .then((result) => {
                if (result.success) {
                    console.log('Auto backup:', result.message);
                    sessionStorage.setItem(sessionKey, 'true');
                } else {
                    console.warn('Auto backup failed:', result.message);
                }
            })
            .catch((error) => {
                console.error('Auto backup error:', error);
            });
    }, []);

    return null; // This component renders nothing
}
