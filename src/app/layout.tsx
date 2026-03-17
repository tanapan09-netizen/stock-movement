import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import PageViewTracker from '@/components/PageViewTracker';

export const metadata: Metadata = {
  title: "Stock Movement",
  description: "ระบบจัดการคลังสินค้าและเคลื่อนไหวสต็อก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <PageViewTracker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
