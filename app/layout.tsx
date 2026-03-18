import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Global Marketing - Modern Marketing Platform',
  description: 'Manage your leads, opportunities, and tasks in one place.',
}

import { ThemeProvider } from '@/components/ThemeProvider'
import { SWRProvider } from '@/components/SWRProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('crm-theme');
                var validThemes = ['light', 'cyber', 'forest'];
                if (theme && validThemes.indexOf(theme) !== -1) {
                  document.documentElement.className = 'theme-' + theme;
                } else if (theme === 'midnight') {
                  document.documentElement.className = '';
                } else if (theme) {
                  // Clean up legacy/removed themes
                  localStorage.removeItem('crm-theme');
                }
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

