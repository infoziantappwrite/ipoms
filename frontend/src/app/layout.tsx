import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Infoziant iPOMS — Placement Operations Management System',
  description: 'Enterprise Placement Operations, Corporate CRM & Analytics Portal for Infoziant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
