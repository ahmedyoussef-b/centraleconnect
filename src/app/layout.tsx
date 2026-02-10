import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'SousseB Insights',
  description: 'Application de monitoring pour la centrale électrique Sousse B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const heads = headers();
  const pathname = heads.get('next-url') || '';
  const isEmergency = pathname.startsWith('/emergency');

  // The logic to conditionally apply a layout is now handled by Next.js Route Groups.
  // The main layout is in `src/app/(main)/layout.tsx` and is applied automatically.
  // Any page that shouldn't have the main layout (like a potential /emergency page)
  // should be placed outside the `(main)` group.

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
