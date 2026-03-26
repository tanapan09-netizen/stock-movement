'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from './ToastProvider';
import { ThemeProvider } from './ThemeProvider';
import AutoLogout from './auth/AutoLogout';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AutoLogout />
            <ThemeProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}

