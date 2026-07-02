import React from 'react'
import { Sidebar } from '../components/shared/Sidebar'
import { TopBar } from '../components/shared/TopBar'

interface MainLayoutProps {
  currentView: string
  onNavigate: (view: string) => void
  projectName?: string
  isDark?: boolean
  onToggleTheme?: () => void
  children: React.ReactNode
}

const VIEW_MAX_WIDTHS: Record<string, string> = {
  editor: 'max-w-none',
  reader: 'max-w-3xl',
  dashboard: 'max-w-6xl',
  studio: 'max-w-5xl',
  workshop: 'max-w-5xl',
  aiChat: 'max-w-4xl',
  settings: 'max-w-3xl'
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentView,
  onNavigate,
  projectName,
  isDark,
  onToggleTheme,
  children
}) => {
  const maxWidth = VIEW_MAX_WIDTHS[currentView] ?? 'max-w-4xl'

  return (
    <div className="flex h-screen overflow-hidden main-layout">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentView={currentView}
          onNavigate={onNavigate}
          projectName={projectName}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
        />
        <main className="flex-1 flex flex-col min-h-0">
          <div className={`flex-1 overflow-y-auto px-6 md:px-8 lg:px-10 py-6 md:py-8`}>
            <div className={`mx-auto ${maxWidth} flex flex-col min-h-full`}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
