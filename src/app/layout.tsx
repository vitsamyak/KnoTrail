import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KnoTrail | Knowledge Never Leaves a Trail Behind',
  description: 'Intelligent Knowledge Handover Platform — Reconstruct verified, evidence-backed project context when key team members depart.',
  keywords: ['knowledge handover', 'project continuity', 'engineering handover', 'documentation', 'audit trail'],
  authors: [{ name: 'Team Deploy_or_Die' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
