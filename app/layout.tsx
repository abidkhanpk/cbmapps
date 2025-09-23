import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FMECA - Failure Mode, Effects, and Criticality Analysis',
  description: 'Comprehensive FMECA and Condition Monitoring Management System',
};

// Force Node.js runtime for all routes to ensure Prisma/NextAuth compatibility on Vercel
export const runtime = 'nodejs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="csrf-token" content="" />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css"
        />
      </head>
      <body className={inter.className}>
        {children}
        
        <Script
          src="https://code.jquery.com/jquery-3.7.1.min.js"
          integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"
          strategy="afterInteractive"
        />
        <Script src="/js/app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}