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
  title: 'Aventurier Textuel',
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
          IMPORTANT: Remplacez 'ca-pub-XXXXXXXXXXXXXXXX' par votre propre ID d'éditeur Google AdSense.
          Vous pouvez trouver cet ID dans votre compte AdSense.
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
