
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { MedievalSharp } from 'next/font/google'; // Import de la police
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider

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
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} ${medievalSharp.variable}`}>
      <body className={`antialiased`}>
         {/* Wrap the entire application content with SidebarProvider */}
         <SidebarProvider defaultOpen>
            {children}
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
