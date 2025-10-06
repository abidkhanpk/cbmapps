import type { ReactNode } from 'react';
import Script from 'next/script';

export default function SignalGeneratorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Load Tailwind CSS utilities for this route only to preserve the simulator's original styling */}
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      {children}
    </>
  );
}
