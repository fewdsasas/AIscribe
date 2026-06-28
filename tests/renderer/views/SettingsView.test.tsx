// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsView } from '@renderer/views/SettingsView'
import { projectService } from '@renderer/services'
import type { Project } from '@shared/types'

vi.mock('@renderer/services', () => ({
  projectService: {
    list: vi.fn()
  }
}))

const mockedProjectService = vi.mocked(projectService)

// Mock useTheme hook
vi.mock('@renderer/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  THEMES: [
    { id: 'light', label: '浅色', icon: '☀️' },
    { id: 'dark', label: '深色', icon: '🌙' }
  ]
}))

// Mock Toast
vi.mock('@renderer/components/shared/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock LLMConfig component
vi.mock('@renderer/components/settings/LLMConfig', () => ({
  LLMConfig: () => <div data-testid="llm-config">LLM Config</div>
}))

// Mock EditorPrefs component
vi.mock('@renderer/components/settings/EditorPrefs', () => ({
  EditorPrefs: () => <div data-testid="editor-prefs">Editor Prefs</div>
}))

// Mock ConfirmDialog
vi.mock('@renderer/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, title, message, onConfirm, onCancel }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm}>确认</button>
        <button onClick={onCancel}>取消</button>
      </div>
    ) : null
}))

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedProjectService.list.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render with LLM tab as default', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByTestId('llm-config')).toBeInTheDocument()
  })

  it('should switch to editor tab', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    // Find the editor tab button by its text content using regex
    const editorTab = screen.getByRole('button', { name: /编辑器偏好/ })
    await act(async () => {
      fireEvent.click(editorTab)
    })

    await waitFor(() => {
      expect(screen.getByTestId('editor-prefs')).toBeInTheDocument()
    })
  })

  it('should switch to theme tab', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    const themeTab = screen.getByRole('button', { name: /主题/ })
    await act(async () => {
      fireEvent.click(themeTab)
    })

    // Theme tab content should be visible (no llm-config)
    await waitFor(() => {
      expect(screen.queryByTestId('llm-config')).not.toBeInTheDocument()
    })
  })

  it('should switch to data tab', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    // Data tab content should be visible
    await waitFor(() => {
      expect(screen.queryByTestId('llm-config')).not.toBeInTheDocument()
    })
  })

  it('should handle data export', async () => {
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: 'Project 1' } as Project])
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    // Find export button by text (actual text includes emoji)
    const exportButton = screen.getByRole('button', { name: /导出所有数据/ })
    expect(exportButton).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(exportButton)
    })

    // Should not throw
  })

  it('should show reset confirmation dialog', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    const resetButton = screen.getByRole('button', { name: /重置所有数据/ })
    expect(resetButton).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(resetButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })
  })

  it('should close confirmation dialog when cancelled', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /重置所有数据/ }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('取消'))
    })

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    })
  })

  it('should handle data export with no projects', async () => {
    mockedProjectService.list.mockResolvedValue([])
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    const exportButton = screen.getByRole('button', { name: /导出所有数据/ })
    await act(async () => {
      fireEvent.click(exportButton)
    })

    expect(mockedProjectService.list).toHaveBeenCalled()
  })

  it('should handle data export error', async () => {
    mockedProjectService.list.mockRejectedValue(new Error('list error'))
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    const exportButton = screen.getByRole('button', { name: /导出所有数据/ })
    await act(async () => {
      fireEvent.click(exportButton)
    })

    await waitFor(() => {
      expect(mockedProjectService.list).toHaveBeenCalled()
    })
  })

  it('should handle data import file selection', async () => {
    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    const importButton = screen.getByRole('button', { name: /导入数据/ })
    await act(async () => {
      fireEvent.click(importButton)
    })

    // Should not throw
    expect(importButton).toBeInTheDocument()
  })

  it('should confirm reset and clear localStorage', async () => {
    window.localStorage.setItem('test-key', 'test-value')

    await act(async () => {
      render(<SettingsView />)
    })

    const dataTab = screen.getByRole('button', { name: /数据管理/ })
    await act(async () => {
      fireEvent.click(dataTab)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /重置所有数据/ }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('确认'))
    })

    expect(window.localStorage.getItem('test-key')).toBeNull()
  })

  it('should switch theme when theme option clicked', async () => {
    const setThemeMock = vi.fn()
    vi.doMock('@renderer/hooks/useTheme', () => ({
      useTheme: () => ({ theme: 'light', setTheme: setThemeMock }),
      THEMES: [
        { id: 'light', label: '浅色', icon: '☀️' },
        { id: 'dark', label: '深色', icon: '🌙' }
      ]
    }))

    await act(async () => {
      render(<SettingsView />)
    })

    const themeTab = screen.getByRole('button', { name: /主题/ })
    await act(async () => {
      fireEvent.click(themeTab)
    })

    await act(async () => {
      fireEvent.click(screen.getByText('深色'))
    })

    vi.doUnmock('@renderer/hooks/useTheme')
  })
})
