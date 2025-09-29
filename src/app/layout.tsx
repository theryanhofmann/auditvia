import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from './components/providers/ClientProviders'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script id="remove-extension-attrs" strategy="beforeInteractive">
          {`
            (function() {
              const body = document.body;
              if (body) {
                // Remove any data-* attributes added by extensions
                Array.from(body.attributes).forEach(attr => {
                  if (attr.name.startsWith('data-') && attr.name !== 'data-theme') { // Preserve known attributes if needed
                    body.removeAttribute(attr.name);
                  }
                });
              }
            })();
          `}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
