import type { Metadata } from 'next';
import { Geist_Sans, Geist_Mono } from 'next/font/google'; // Corrected import
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Added Toaster import

const geistSans = Geist_Sans({ // Corrected font function call
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ // Corrected font function call
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster /> {/* Added Toaster component */}
      </body>
    </html>
  );
}
