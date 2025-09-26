import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "CBM Apps",
  description: "Apps and Simulators for CBM and Reliability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
