import type { Metadata, Viewport } from 'next';
import './globals.css';
import MessageCenter from '@/components/MessageCenter';

export const metadata: Metadata = {
  title: 'Russian Roulette - Premium Marketplace',
  description: 'Experience the thrill of a premium marketplace with Russian Roulette. Buy and sell items with cryptocurrency in an exclusive environment.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <MessageCenter />
        {children}
      </body>
    </html>
  );
}

