import type { Metadata } from 'next';
import './globals.css';
import { AppNavigation } from '@/components/AppNavigation';
import { ToastProvider } from '@/components/ui/Toast';

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
    <html lang="en" className="light">
      <body className="min-h-screen bg-background text-fg antialiased selection:bg-primary selection:text-primary-foreground flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-toast focus:rounded-control focus:bg-primary focus:px-3 focus:py-2 focus:text-body focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <AppNavigation />
          <main id="main" className="flex-1 flex flex-col">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
