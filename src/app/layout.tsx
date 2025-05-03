import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Added Toaster import

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'Aventurier Textuel', // Updated title
  description: 'Généré par Firebase Studio', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply font variables directly to the html tag
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={`antialiased`}>
        {children}
        <Toaster /> {/* Added Toaster component */}
      </body>
    </html>
  );
}
