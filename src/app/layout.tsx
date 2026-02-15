// src/app/layout.tsx
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { Inter, Source_Code_Pro } from 'next/font/google';

// Configure fonts
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-code-pro',
});

export const metadata: Metadata = {
  title: 'SousseB Insights',
  description: 'Application de monitoring pour la centrale électrique Sousse B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="fr" className={`dark ${inter.variable} ${sourceCodePro.variable}`} suppressHydrationWarning>
      <head>
        {/* Optimisation TensorFlow.js pour forcer l'accélération GPU */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window['tf'] = window['tf'] || {};
                window['tf']['forceWebGL'] = true;
                window['tf']['WEBGL_VERSION'] = 2;
              }
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
          {children}
          <Toaster />
      </body>
    </html>
  );
}
