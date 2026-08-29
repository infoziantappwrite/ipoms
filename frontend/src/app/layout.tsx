import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { AutoSaveFloatingIndicator } from '@/components/AutoSaveFloatingIndicator';

export const metadata: Metadata = {
  title: 'Infoziant iPOMS — Placement Operations & Management System',
  description: 'Enterprise Placement Operations, Corporate CRM & Analytics Portal for Infoziant',
};

// Inline Anti-FOUC Script to apply theme before DOM paint.
// Splash screen, Login, and Signup pages are ALWAYS guaranteed to be Light Theme by default.
const themeInitScript = `
  (function() {
    try {
      var path = window.location.pathname || '';
      var isAuthPage = path === '/' || path === '/login' || path === '/login/' || path === '/signup' || path === '/signup/';
      if (isAuthPage) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.style.colorScheme = 'light';
        return;
      }

      var saved = localStorage.getItem('ipoms_theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-fg antialiased selection:bg-primary selection:text-primary-foreground flex flex-col transition-colors duration-200">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-toast focus:rounded-control focus:bg-primary focus:px-3 focus:py-2 focus:text-body focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <AppShell>{children}</AppShell>
          <AutoSaveFloatingIndicator />
        </ToastProvider>
      </body>
    </html>
  );
}
