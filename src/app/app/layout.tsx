'use client'

import { Sidebar, Header, SidebarProvider, NavigationProvider } from '@/components/app-shell'
import { ToastProvider } from '@/components/ui'
import { CommandPaletteProvider } from '@/components/CommandPalette'
import { DocCacheProvider } from '@/contexts/doc-cache-context'
import { TokenCacheProvider } from '@/contexts/token-cache-context'

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div 
        className={`
          flex flex-1 flex-col min-w-0
          transition-all duration-200 ease-in-out
        `}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <TokenCacheProvider>
        <DocCacheProvider>
          <CommandPaletteProvider>
            <SidebarProvider>
              <NavigationProvider>
                <AppContent>{children}</AppContent>
              </NavigationProvider>
            </SidebarProvider>
          </CommandPaletteProvider>
        </DocCacheProvider>
      </TokenCacheProvider>
    </ToastProvider>
  )
}
