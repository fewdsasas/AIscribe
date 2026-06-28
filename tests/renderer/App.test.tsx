import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { projectService } from '../../src/renderer/services/projectService'
import { logger } from '../../src/renderer/utils/logger'
import { ErrorBoundary } from '../../src/renderer/components/shared/ErrorBoundary'

vi.mock('../../src/renderer/hooks/useTheme', () => ({
  useTheme: () => ({ toggleTheme: vi.fn(), isDark: false })
}))

vi.mock('../../src/renderer/components/shared/KeyboardShortcuts', () => ({
  KeyboardShortcutHandler: () => <div data-testid="shortcuts" />
}))

vi.mock('../../src/renderer/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}))

vi.mock('../../src/renderer/services/projectService', () => ({
  projectService: { get: vi.fn() }
}))

vi.mock('../../src/renderer/views/DashboardView', () => ({
  DashboardView: ({
    onSelectProject,
    onNewProject
  }: {
    onSelectProject: (id: string) => void
    onNewProject: () => void
  }) => (
    <div data-testid="dashboard">
      <button onClick={() => onSelectProject('p1')}>select project</button>
      <button onClick={() => onNewProject()}>new project</button>
    </div>
  )
}))

vi.mock('../../src/renderer/views/EditorView', () => ({
  EditorView: () => <div data-testid="editor" />
}))

vi.mock('../../src/renderer/views/ReaderView', () => ({
  ReaderView: () => <div data-testid="reader" />
}))

vi.mock('../../src/renderer/views/StudioView', () => ({
  StudioView: () => <div data-testid="studio" />
}))

vi.mock('../../src/renderer/views/WorkshopView', () => ({
  WorkshopView: () => <div data-testid="workshop" />
}))

vi.mock('../../src/renderer/components/ai-chat/AIChatView', () => ({
  AIChatView: () => <div data-testid="ai-chat" />
}))

vi.mock('../../src/renderer/views/SettingsView', () => ({
  SettingsView: () => <div data-testid="settings" />
}))

vi.mock('../../src/renderer/layouts/MainLayout', () => ({
  MainLayout: ({
    children,
    onNavigate,
    currentView,
    projectName
  }: {
    children: React.ReactNode
    onNavigate: (view: string) => void
    currentView: string
    projectName?: string
  }) => (
    <div data-testid="layout" data-view={currentView} data-projectname={projectName ?? ''}>
      <button onClick={() => onNavigate('editor')}>go editor</button>
      <button onClick={() => onNavigate('reader')}>go reader</button>
      <button onClick={() => onNavigate('settings')}>go settings</button>
      <button onClick={() => onNavigate('ai-chat')}>go ai-chat</button>
      <button onClick={() => onNavigate('studio')}>go studio</button>
      <button onClick={() => onNavigate('workshop')}>go workshop</button>
      {children}
    </div>
  )
}))

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.mocked(projectService.get).mockReset()
  })

  it('should render dashboard by default', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())
  })

  it('should switch view via navigation', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('go editor'))
    })

    await waitFor(() => expect(screen.getByTestId('editor')).toBeInTheDocument())
  })

  it('should select project and navigate to editor', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('select project'))
    })

    await waitFor(() => expect(screen.getByTestId('editor')).toBeInTheDocument())
  })

  it('should render reader view', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('go reader'))
    })

    await waitFor(() => expect(screen.getByTestId('reader')).toBeInTheDocument())
  })

  it('should render settings view', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('go settings'))
    })

    await waitFor(() => expect(screen.getByTestId('settings')).toBeInTheDocument())
  })

  it('should render studio and workshop views', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('go studio'))
    })
    await waitFor(() => expect(screen.getByTestId('studio')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('go workshop'))
    })
    await waitFor(() => expect(screen.getByTestId('workshop')).toBeInTheDocument())
  })

  it('should load and display project name when selecting project', async () => {
    vi.mocked(projectService.get).mockResolvedValue({ name: 'Test Project' } as any)
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('select project'))
    })

    await waitFor(() => expect(screen.getByTestId('layout')).toHaveAttribute('data-projectname', 'Test Project'))
  })

  it('should clear project name when project load fails', async () => {
    vi.mocked(projectService.get).mockRejectedValue(new Error('db error'))
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('select project'))
    })

    await waitFor(() => expect(screen.getByTestId('editor')).toBeInTheDocument())
    expect(screen.getByTestId('layout')).toHaveAttribute('data-projectname', '')
  })

  it('should handle new project action', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('new project'))
    })

    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())
    expect(screen.getByTestId('layout')).toHaveAttribute('data-view', 'dashboard')
  })

  it('should render ai-chat view', async () => {
    const App = (await import('../../src/renderer/App')).default
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText('go ai-chat'))
    })

    await waitFor(() => expect(screen.getByTestId('ai-chat')).toBeInTheDocument())
  })

  it('lazyWithRetry should retry failed imports and eventually render', async () => {
    const { lazyWithRetry } = await import('../../src/renderer/App')
    let attempts = 0
    const LazyComponent = lazyWithRetry(async () => {
      attempts++
      if (attempts === 1) {
        throw new Error('chunk failed')
      }
      return { default: () => <div data-testid="lazy-ok">loaded</div> }
    })

    render(
      <React.Suspense fallback={<div data-testid="lazy-fallback">loading</div>}>
        <LazyComponent />
      </React.Suspense>
    )

    expect(screen.getByTestId('lazy-fallback')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('lazy-ok')).toBeInTheDocument(), {
      timeout: 3000
    })
    expect(attempts).toBe(2)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Chunk load failed'), expect.any(Error))
  })

  it('lazyWithRetry should give up after max retries and let ErrorBoundary catch', async () => {
    const { lazyWithRetry } = await import('../../src/renderer/App')
    const LazyFail = lazyWithRetry(async () => {
      throw new Error('always fails')
    }, 2)

    render(
      <ErrorBoundary>
        <React.Suspense fallback={<div data-testid="lazy-fallback">loading</div>}>
          <LazyFail />
        </React.Suspense>
      </ErrorBoundary>
    )

    await waitFor(() => expect(screen.getByText('应用出了点问题')).toBeInTheDocument(), {
      timeout: 3000
    })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Chunk load failed'), expect.any(Error))
  })
})
