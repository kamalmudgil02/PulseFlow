import type { Metadata } from 'next';
import './globals.css';

/**
 * Root layout component for PulseFlow Web application.
 *
 * Responsibilities:
 * - Provides HTML document structure
 * - Imports global Tailwind CSS styles
 * - Defines application metadata
 * - Wraps all pages with consistent layout
 *
 * Next.js App Router:
 * - This layout applies to all routes
 * - Server Component by default (no 'use client' directive)
 * - Receives children prop (current page content)
 */

export const metadata: Metadata = {
  title: 'PulseFlow',
  description: 'Distributed job processing platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
