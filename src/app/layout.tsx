import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.scss'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'

export const metadata: Metadata = {
  title: 'Groovy Docs',
  description: 'A minimal, fast documentation tool',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning>
          <ConvexClientProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
