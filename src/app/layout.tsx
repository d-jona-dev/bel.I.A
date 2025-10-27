import type { Metadata } from 'next';
import Script from 'next/script'; // Importer le composant Script
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { MedievalSharp } from 'next/font/google'; // Import de la police
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = GeistSans;
const geistMono = GeistMono;

// Configuration de la police médiévale
const medievalSharp = MedievalSharp({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-medieval-sharp',
});

export const metadata: Metadata = {
  title: 'Bel.I.A.',
  description: 'Généré par Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} ${medievalSharp.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Le script AdSense est chargé ici. L'ID d'éditeur est géré
          dans le composant AdBanner et doit être remplacé là-bas.
        */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'grey', 'black']}
        >
          <SidebarProvider defaultOpen>
              {children}
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
