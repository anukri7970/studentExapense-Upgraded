import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Providers from './components/Providers';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500'],
});

export const metadata = {
  title: 'Student Expense Wallet AI',
  description:
    'Stellar-powered fund transfers between parents, students, and universities — with AI budget guidance built in.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="font-body bg-ink text-parchment min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
