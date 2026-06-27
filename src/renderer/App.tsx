import React, { lazy, Suspense, useEffect, useState } from 'react'
import { MainLayout } from './layouts/MainLayout'
import { ToastProvider } from './components/shared/Toast'
import { KeyboardShortcutHandler } from './components/shared/KeyboardShortcuts'
import { useTheme } from './hooks/useTheme'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { logger } from './utils/logger'
import { projectService } from './services/projectService'

// Lazy-loaded views with retry on chunk load failure (max 3 retries)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  let attempts = 0
  return lazy(() => {
    const attempt = (): Promise<{ default: T }> =>
      factory().catch(err => {
        attempts++
        if (attempts >= retries) throw err // Let ErrorBoundary catch it
        logger.error(`Chunk load failed (${attempts}/${retries}), retrying...`, err)
        return new Promise<{ default: T }>(resolve => {
          setTimeout(() => resolve(attempt()), 1000)
        })
      })
    return attempt()
  })
}

const DashboardView = lazyWithRetry(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })))
const EditorView = lazyWithRetry(() => import('./views/EditorView').then(m => ({ default: m.EditorView })))
const ReaderView = lazyWithRetry(() => import('./views/ReaderView').then(m => ({ default: m.ReaderView })))
const StudioView = lazyWithRetry(() => import('./views/StudioView').then(m => ({ default: m.StudioView })))
const WorkshopView = lazyWithRetry(() => import('./views/WorkshopView').then(m => ({ default: m.WorkshopView })))
const AIChatView = lazyWithRetry(() => import('./components/ai-chat/AIChatView').then(m => ({ default: m.AIChatView })))
const SettingsView = lazyWithRetry(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))

export type ViewType = 'dashboard' | 'editor' | 'studio' | 'workshop' | 'ai-chat' | 'settings' | 'reader'

const ViewLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2">⏳</div>
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
)

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string | undefined>()
  const { toggleTheme, isDark } = useTheme()

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectName(undefined)
      return
    }
    const load = async () => {
      try {
        const project = await projectService.get(selectedProjectId)
        if (project) setProjectName(project.name)
      } catch {
        setProjectName(undefined)
      }
    }
    load()
  }, [selectedProjectId])

  const handleNavigate = (view: string) => {
    logger.log(`[MemMonitor] view switch: ${currentView} → ${view}`)
    setCurrentView(view as ViewType)
  }

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    setCurrentView('editor')
  }

  const handleNewProject = () => {
    setCurrentView('dashboard')
  }

  const renderView = () => {
    const view = (() => {
      switch (currentView) {
        case 'editor':
          return <EditorView projectId={selectedProjectId} onSwitchProject={handleSelectProject} />
        case 'studio':
          return <StudioView projectId={selectedProjectId} />
        case 'workshop':
          return <WorkshopView projectId={selectedProjectId} />
        case 'ai-chat':
          return <AIChatView projectId={selectedProjectId} />
        case 'settings':
          return <SettingsView />
        case 'reader':
          return <ReaderView projectId={selectedProjectId} />
        default:
          return <DashboardView onSelectProject={handleSelectProject} onNewProject={handleNewProject} />
      }
    })()
    return <ViewLoader>{view}</ViewLoader>
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <KeyboardShortcutHandler
          onNavigate={handleNavigate}
          onNewProject={handleNewProject}
          onSave={() => {
            // Save is handled by the active view, this is just a fallback
          }}
        />
        <MainLayout
          currentView={currentView}
          onNavigate={handleNavigate}
          projectName={projectName}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        >
          {renderView()}
        </MainLayout>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
