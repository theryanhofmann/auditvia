import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Auditvia',
  description: 'Make the web accessible for everyone'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className + ' flex flex-col min-h-screen'}>
        {children}
      </body>
    </html>
  );
}
