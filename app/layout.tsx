import type { Metadata } from 'next';
import './globals.css';
import MessageCenter from '@/components/MessageCenter';

export const metadata: Metadata = {
  title: 'Russian Roulette - Premium Marketplace',
  description: 'Experience the thrill of a premium marketplace with Russian Roulette. Buy and sell items with cryptocurrency in an exclusive environment.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MessageCenter />
        {children}
      </body>
    </html>
  );
}

