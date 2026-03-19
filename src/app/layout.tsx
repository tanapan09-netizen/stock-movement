import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import PageViewTracker from '@/components/PageViewTracker';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Stock Movement',
  description: 'ระบบจัดการคลังสินค้าและเคลื่อนไหวสต็อก',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <PageViewTracker />
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}