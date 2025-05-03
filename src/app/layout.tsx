import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Import GeistSans correctly
import { GeistMono } from 'geist/font/mono';   // Import GeistMono correctly
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Added Toaster import

const geistSans = GeistSans; // Assign directly
const geistMono = GeistMono; // Assign directly

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
    <html lang="fr"> {/* Changed lang to fr */}
      {/* Apply font variables directly to the html tag */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster /> {/* Added Toaster component */}
      </body>
    </html>
  );
}
